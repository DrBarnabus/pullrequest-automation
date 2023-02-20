import { ApprovalLabeller, ApprovalLabellerModule, LabelsToApply, RequiredApprovals } from '../Config/ConfigSchema';
import {
  EndGroup,
  GetPullRequestResponse,
  GitHubClient,
  LogDebug,
  LogError,
  LogInfo,
  LogWarning,
  StartGroup,
} from '../Core';
import { LabelState } from '../Core/LabelState';

export async function ProcessApprovalLabeller(
  config: ApprovalLabellerModule | undefined,
  pullRequest: GetPullRequestResponse,
  labelState: LabelState
) {
  StartGroup('Modules/ApprovalLabeller');

  try {
    if (!config?.enabled) {
      LogInfo(`Modules/ApprovalLabeller is not enabled. skipping...`);
      return;
    }

    const {
      requiredApprovals: configRequiredApprovals,
      labelsToApply,
      useLegacyMethod,
    } = ValidateAndExtractConfig(config);

    if (pullRequest.state === 'closed') {
      LogInfo(`Pull request is closed`);

      removeExistingLabels(labelState, labelsToApply);
      return;
    }

    if (pullRequest.draft) {
      removeExistingLabels(labelState, labelsToApply);

      if (labelsToApply.draft) {
        LogInfo(`Adding draft label ${labelsToApply.draft} as pull request is currently a draft`);
        labelState.Add(labelsToApply.draft);
      } else {
        LogInfo(`Pull request is currently a draft and no draft label is configured`);
      }

      return;
    }

    let isApproved: boolean;
    let isRejected: boolean;
    if (useLegacyMethod) {
      LogWarning('Using Legacy Method to determine Pull Request Approval');

      const requiredApprovals = await ExtractRequiredApprovals(configRequiredApprovals, pullRequest);
      if (requiredApprovals === 0) {
        LogWarning(`Modules/ApprovalLabeller is enabled but not configured for branch ${pullRequest.base.ref}`);
        return;
      }

      const reviewStatus = await GetReviewStatus(pullRequest);
      const evaluatedStatus = EvaluateReviewStatus(reviewStatus, requiredApprovals);
      LogInfo(
        `Approvals: ${evaluatedStatus.totalApproved}/${requiredApprovals}, IsApproved: ${evaluatedStatus.isApproved}, IsRejected: ${evaluatedStatus.isRejected}`
      );

      isApproved = evaluatedStatus.isApproved;
      isRejected = evaluatedStatus.isRejected;
    } else {
      const reviewDecision = await GitHubClient.get().GetPullRequestReviewDecision(pullRequest.number);

      isApproved = reviewDecision === 'APPROVED';
      isRejected = reviewDecision === 'CHANGES_REQUESTED';

      LogInfo(`ReviewDecision: ${reviewDecision}, IsApproved: ${isApproved}, IsRejected: ${isRejected}`);
    }

    removeExistingLabels(labelState, labelsToApply);
    if (isRejected) {
      LogInfo(`State is rejected adding label ${labelsToApply.rejected}`);
      labelState.Add(labelsToApply.rejected);
    } else if (isApproved) {
      LogInfo(`State is approved adding label ${labelsToApply.approved}`);
      labelState.Add(labelsToApply.approved);
    } else {
      LogInfo(`State is neither rejected or approved adding label ${labelsToApply.needsReview}`);
      labelState.Add(labelsToApply.needsReview);
    }
  } finally {
    EndGroup();
  }
}

async function GetReviewStatus(pullRequest: GetPullRequestResponse) {
  const pullRequestReviews = await GitHubClient.get().ListReviewsOnPullRequest(pullRequest.number);

  const reviewStatus = new Map<string, string>();
  for (const pullRequestReview of pullRequestReviews) {
    if (pullRequestReview.user == null) {
      LogWarning(`Ignorning review with Id ${pullRequestReview.id} as User was null`);
      continue;
    }

    if (pullRequestReview.commit_id !== pullRequest.head.sha) {
      LogDebug(`Ignoring review as it is not for the current commit reference`);
      continue;
    }

    if (pullRequestReview.state === 'APPROVED' || pullRequestReview.state === 'CHANGES_REQUESTED') {
      reviewStatus.set(pullRequestReview.user.login, pullRequestReview.state);
      LogDebug(`Adding review from User ${pullRequestReview.user.login} at ${pullRequestReview.submitted_at}`);
    } else {
      LogDebug(
        `Ignoring review from User ${pullRequestReview.user.login} as it is not in the state APPROVED or CHANGES_REQUESTED`
      );
    }
  }

  return reviewStatus;
}

function EvaluateReviewStatus(reviewStatuses: Map<string, string>, requiredApprovals: number) {
  let totalApproved = 0,
    isApproved = false,
    isRejected = false;
  for (const [user, state] of reviewStatuses) {
    LogDebug(`${user} ended in state of ${state}`);

    switch (state) {
      case 'CHANGES_REQUESTED':
        isRejected = true;
        break;
      case 'APPROVED':
        ++totalApproved;
        isApproved = totalApproved >= requiredApprovals;
        break;
    }

    if (isApproved || isRejected) {
      break;
    }
  }

  return { totalApproved, isApproved, isRejected };
}

async function ExtractRequiredApprovals(
  configRequiredApprovals: RequiredApprovals,
  pullRequest: GetPullRequestResponse
) {
  if (typeof configRequiredApprovals === 'number') {
    return configRequiredApprovals;
  }

  if (typeof configRequiredApprovals === 'string') {
    const branchProtection = await GitHubClient.get().GetBranchProtection(pullRequest.base.ref);
    return branchProtection.required_pull_request_reviews?.required_approving_review_count ?? 0;
  }

  const prBaseRef = pullRequest.base.ref;
  for (const requiredApproval of configRequiredApprovals) {
    const baseRefExpression = new RegExp(`^${requiredApproval.baseRef}$`);
    if (baseRefExpression.test(prBaseRef)) {
      return requiredApproval.requiredApprovals;
    }
  }

  return 0;
}

function removeExistingLabels(labelState: LabelState, labelsToApply: LabelsToApply) {
  LogDebug(`Removing existing approval labels if present`);
  labelState.Remove(labelsToApply.approved);
  labelState.Remove(labelsToApply.rejected);
  labelState.Remove(labelsToApply.needsReview);
  if (labelsToApply.draft) {
    labelState.Remove(labelsToApply.draft);
  }
}

function ValidateAndExtractConfig(config: ApprovalLabeller) {
  let isValid = true;

  const isGitHubApp = GitHubClient.get().IsInitializedAsGitHubApp();
  let useLegacyMethod = config?.useLegacyMethod ?? !isGitHubApp;

  let requiredApprovals: RequiredApprovals = 0;

  if (useLegacyMethod) {
    if (!config.requiredApprovals) {
      LogError(`Config Validation failed modules.approvalLabeller.requiredApprovals, must be number or array`);
      isValid = false;
    } else {
      if (typeof config.requiredApprovals === 'number') {
        if (config.requiredApprovals == 0) {
          LogError(
            `Config Validation failed modules.approvalLabeller.requiredApprovals, must be greater than or equal to 1`
          );
          isValid = false;
        }

        if (isValid) {
          requiredApprovals = config.requiredApprovals;
        }
      } else if (typeof config.requiredApprovals === 'string') {
        if (config.requiredApprovals !== 'smart') {
          LogError(
            `Config Validation failed modules.approvalLabeller.requiredApprovals, must be 'smart' when the value is a string`
          );
          isValid = false;
        }

        if (isValid) {
          requiredApprovals = config.requiredApprovals;
        }
      } else {
        let i = 0;
        for (const requiredApproval of config.requiredApprovals) {
          if (!requiredApproval.baseRef) {
            LogError(
              `Config Validation failed modules.approvalLabeller.requiredApprovals[${i}].baseRef, must be supplied`
            );
            isValid = false;
          }

          if (!requiredApproval.requiredApprovals) {
            LogError(
              `Config Validation failed modules.approvalLabeller.requiredApprovals, must be greater than or equal to 1`
            );
            isValid = false;
          }
        }

        if (isValid) {
          requiredApprovals = config.requiredApprovals;
        }
      }
    }
  }

  if (!config.labelsToApply) {
    LogError(`Config Validation failed modules.approvalLabeller.labelsToApply, must be supplied`);
    isValid = false;
  }

  if (!config.labelsToApply.approved) {
    LogError(`Config Validation failed modules.approvalLabeller.labelsToApply.approved, must be supplied`);
    isValid = false;
  }

  if (!config.labelsToApply.rejected) {
    LogError(`Config Validation failed modules.approvalLabeller.labelsToApply.rejected, must be supplied`);
    isValid = false;
  }

  if (!config.labelsToApply.needsReview) {
    LogError(`Config Validation failed modules.approvalLabeller.labelsToApply.needsReview, must be supplied`);
    isValid = false;
  }

  if (!isValid) {
    throw new Error('Config Validation for modules.approvalLabeller has failed');
  }

  return { useLegacyMethod, requiredApprovals, labelsToApply: config.labelsToApply };
}
