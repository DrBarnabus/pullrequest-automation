import { EndGroup, GetPullRequestResponse, GitHubClient, LogDebug, LogError, LogInfo, LogWarning, StartGroup } from "../Core";
import { LabelState } from "../Core/LabelState";
import { ApprovalLabellerModuleConfig } from "../Config";

export async function ProcessApprovalLabeller(config: ApprovalLabellerModuleConfig | undefined, pullRequest: GetPullRequestResponse, labelState: LabelState) {
    StartGroup('Modules/ApprovalLabeller');

    try {
        if (!config?.enabled) {
            LogInfo(`Modules/ApprovalLabeller is not enabled. skipping...`);
            return;
        }

        const { smartMode, requiredApprovals: configuredRequiredApprovals, labelsToApply } = ValidateAndExtractConfig(config)

        if (pullRequest.draft) {
            if (labelsToApply.draft) {
                LogInfo(`Adding draft label ${labelsToApply.draft} as pull request is currently a draft`);
                labelState.Add(labelsToApply.draft);
            } else {
                LogInfo(`Pull request is currently a draft and no draft label is configured`);
            }

            return;
        }

        let requiredApprovals = configuredRequiredApprovals;
        if (smartMode) {
            const branchProtection = await GitHubClient.get().GetBranchProtection(pullRequest.base.ref);
            requiredApprovals = branchProtection.required_pull_request_reviews?.required_approving_review_count;
        }

        if (requiredApprovals === undefined) {
            LogWarning(`Unable to determine requiredApprovals for this pull request. ConfiguredRequiredApprovals: ${configuredRequiredApprovals}, SmartMode: ${smartMode}`);
            return;
        }

        const reviewStatus = await GetReviewStatus(pullRequest);
        const { totalApproved, isApproved, isRejected } = EvaluateReviewStatus(reviewStatus, requiredApprovals);

        LogInfo(`Approvals: ${totalApproved}/${requiredApprovals}, IsApproved: ${isApproved}, IsRejected: ${isRejected}`);

        LogDebug(`Removing existing approval labels if present`)
        labelState.Remove(labelsToApply.approved);
        labelState.Remove(labelsToApply.rejected);
        labelState.Remove(labelsToApply.needsReview);
        if (labelsToApply.draft) {
            labelState.Remove(labelsToApply.draft);
        }

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
            LogDebug(`Ignoring review from User ${pullRequestReview.user.login} as it is not in the state APPROVED or CHANGES_REQUESTED`);
        }
    }

    return reviewStatus;
}

function EvaluateReviewStatus(reviewStatuses: Map<string, string>, requiredApprovals: number) {
    let totalApproved = 0, isApproved = false, isRejected = false;
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

function ValidateAndExtractConfig(config: ApprovalLabellerModuleConfig) {
    let isValid = true;

    if (!config.requiredApprovals) {
        LogError(`Config Validation failed modules.approvalLabeller.requiredApprovals, must be either 'smart' or a number greater than or equal to 1`);
        isValid = false;
    }

    let smartMode = false;
    if (typeof config.requiredApprovals === 'string') {
        if (config.requiredApprovals !== 'smart') {
            LogError(`Config Validation failed modules.approvalLabeller.requiredApprovals, must be 'smart' when value is a string`);
            isValid = false;
        }

        if (isValid) {
            smartMode = true;
        }
    }

    let requiredApprovals = undefined;
    if (typeof config.requiredApprovals === 'number') {
        if (config.requiredApprovals == 0) {
            LogError(`Config Validation failed modules.approvalLabeller.requiredApprovals, must be greater than or equal to 1 when valid is a number`);
            isValid = false;
        }

        if (isValid) {
            requiredApprovals = config.requiredApprovals;
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

    return { smartMode, requiredApprovals, labelsToApply: config.labelsToApply };
}
