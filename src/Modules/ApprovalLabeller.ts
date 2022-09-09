import { endGroup, GetPullRequestResponse, GitHubClient, logDebug, logError, logInfo, logWarning, startGroup } from "../Core";
import { LabelState } from "../Core/LabelState";
import { ApprovalLabellerModuleConfig } from "../Config";

export async function ProcessApprovalLabeller(config: ApprovalLabellerModuleConfig | undefined, pullRequest: GetPullRequestResponse, labelState: LabelState) {
    startGroup('Modules/ApprovalLabeller');

    try {
        if (!config?.enabled) {
            logInfo(`Modules/ApprovalLabeller is not enabled. skipping...`);
            return;
        }

        const { requiredApprovals, labelsToApply } = ValidateAndExtractConfig(config)

        if (pullRequest.draft) {
            if (labelsToApply.draft) {
                logInfo(`Adding draft label ${labelsToApply.draft} as pull request is currently a draft`);
                labelState.Add(labelsToApply.draft);
            } else {
                logInfo(`Pull request is currently a draft and no draft label is configured`);
            }

            return;
        }

        const reviewStatus = await GetReviewStatus(pullRequest);
        const { totalApproved, isApproved, isRejected } = EvaluateReviewStatus(reviewStatus, requiredApprovals);

        logInfo(`Approvals: ${totalApproved}/${requiredApprovals}, IsApproved: ${isApproved}, IsRejected: ${isRejected}`);

        logDebug(`Removing existing approval labels if present`)
        labelState.Remove(labelsToApply.approved);
        labelState.Remove(labelsToApply.rejected);
        labelState.Remove(labelsToApply.needsReview);
        if (labelsToApply.draft) {
            labelState.Remove(labelsToApply.draft);
        }

        if (isRejected) {
            logInfo(`State is rejected adding label ${labelsToApply.rejected}`);
            labelState.Add(labelsToApply.rejected);
        } else if (isApproved) {
            logInfo(`State is approved adding label ${labelsToApply.approved}`);
            labelState.Add(labelsToApply.approved);
        } else {
            logInfo(`State is neither rejected or approved adding label ${labelsToApply.needsReview}`);
            labelState.Add(labelsToApply.needsReview);
        }
    } finally {
        endGroup();
    }
}

async function GetReviewStatus(pullRequest: GetPullRequestResponse) {
    const pullRequestReviews = await GitHubClient.get().ListReviewsOnPullRequest(pullRequest.number);

    const reviewStatus = new Map<string, string>();
    for (const pullRequestReview of pullRequestReviews) {
        if (pullRequestReview.user == null) {
            logWarning(`Ignorning review with Id ${pullRequestReview.id} as User was null`);
            continue;
        }

        if (pullRequestReview.commit_id !== pullRequest.head.sha) {
            logDebug(`Ignoring review as it is not for the current commit reference`);
            continue;
        }

        if (pullRequestReview.state === 'APPROVED' || pullRequestReview.state === 'CHANGES_REQUESTED') {
            reviewStatus.set(pullRequestReview.user.login, pullRequestReview.state);
            logDebug(`Adding review from User ${pullRequestReview.user.login} at ${pullRequestReview.submitted_at}`);
        } else {
            logDebug(`Ignoring review from User ${pullRequestReview.user.login} as it is not in the state APPROVED or CHANGES_REQUESTED`);
        }
    }

    return reviewStatus;
}

function EvaluateReviewStatus(reviewStatuses: Map<string, string>, requiredApprovals: number) {
    let totalApproved = 0, isApproved = false, isRejected = false;
    for (const [user, state] of reviewStatuses) {
        logDebug(`${user} ended in state of ${state}`);

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

    if (config.requiredApprovals == 0) {
        logError(`Config Validation failed modules.approvalLabeller.requiredApprovals, must be greater than or equal to 1`);
        isValid = false;
    }

    if (!config.labelsToApply) {
        logError(`Config Validation failed modules.approvalLabeller.labelsToApply, must be supplied`);
        isValid = false;
    }

    if (!config.labelsToApply.approved) {
        logError(`Config Validation failed modules.approvalLabeller.labelsToApply.approved, must be supplied`);
        isValid = false;
    }

    if (!config.labelsToApply.rejected) {
        logError(`Config Validation failed modules.approvalLabeller.labelsToApply.rejected, must be supplied`);
        isValid = false;
    }

    if (!config.labelsToApply.needsReview) {
        logError(`Config Validation failed modules.approvalLabeller.labelsToApply.needsReview, must be supplied`);
        isValid = false;
    }

    if (!isValid) {
        throw new Error('Config Validation for modules.approvalLabeller has failed');
    }

    return { requiredApprovals: config.requiredApprovals, labelsToApply: config.labelsToApply };
}
