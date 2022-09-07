import { endGroup, logDebug, logInfo, logWarning, startGroup } from "./core";
import { DesiredLabels } from "./desired-labels";
import { getPullRequestResponse, GitHubClient, listReviewsOnPullRequest, listReviewsOnPullRequestResponse } from "./github-client";
import { ApprovalLabels } from "./models/config";

type approvalLabellerProps = {
    gitHubClient: GitHubClient,
    pullRequest: getPullRequestResponse,
    approvalLabels: ApprovalLabels;
    desiredLabels: DesiredLabels;
}

export async function processApprovalLabeller({
    gitHubClient,
    pullRequest,
    approvalLabels,
    desiredLabels
}: approvalLabellerProps) {
    startGroup('Approval Labeller');

    try {
        if (approvalLabels.disable) {
            logInfo('Approval labeller is disabled in config. Skipping...');
            return;
        }

        if (pullRequest.draft) {
            if (approvalLabels.labelsToApply.draft) {
                logInfo(`Adding draft label ${approvalLabels.labelsToApply.draft} as pull request is currently a draft`);
                desiredLabels.add(approvalLabels.labelsToApply.draft);
            } else {
                logInfo(`Pull request is currently a draft and no draft label is configured`);
            }

            return;
        }

        const pullRequestReviews = await listReviewsOnPullRequest(gitHubClient, pullRequest.number);

        const reviewStatuses = getReviewStatuses(pullRequest, pullRequestReviews);
        const { totalApproved, isApproved, isRejected } = calculateReviewStatus(reviewStatuses, approvalLabels);

        logInfo(`Approvals: ${totalApproved}/${approvalLabels.requiredApprovals} (IsApproved=${isApproved}, IsRejected=${isRejected})`);

        const labelsToApply = approvalLabels.labelsToApply;
        desiredLabels.remove(labelsToApply.approved);
        desiredLabels.remove(labelsToApply.rejected);
        desiredLabels.remove(labelsToApply.needsReview);
        if (labelsToApply.draft) {
            desiredLabels.remove(labelsToApply.draft);
        }

        if (isApproved) {
            logInfo(`Adding approval label ${labelsToApply.approved} as number of required APPROVED reviews was met`);
            desiredLabels.add(labelsToApply.approved);
        } else if (isRejected) {
            logInfo(`Adding rejected label ${labelsToApply.rejected} as a review contained CHANGES_REQUESTED`);
            desiredLabels.add(labelsToApply.rejected);
        } else {
            logInfo(`Adding needsReview label ${labelsToApply.needsReview} as required reviews not met`);
            desiredLabels.add(labelsToApply.needsReview);
        }
    } finally {
        endGroup();
    }
}

function getReviewStatuses(pullRequest: getPullRequestResponse, pullRequestReviews: listReviewsOnPullRequestResponse) {
    const reviewStatuses = new Map<string, string>();
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
            reviewStatuses.set(pullRequestReview.user.login, pullRequestReview.state);
            logDebug(`Adding review from User ${pullRequestReview.user.login} at ${pullRequestReview.submitted_at}`);
        } else {
            logDebug(`Ignoring review from User ${pullRequestReview.user.login} as it is not in the state APPROVED or CHANGES_REQUESTED`);
        }
    }

    return reviewStatuses;
}

function calculateReviewStatus(reviewStatuses: Map<string, string>, approvalLabels: ApprovalLabels) {
    let totalApproved = 0, isApproved = false, isRejected = false;
    for (let [user, state] of reviewStatuses) {
        logDebug(`${user} ended in state of ${state}`);

        switch (state) {
            case 'CHANGES_REQUESTED':
                isRejected = true;
                break;
            case 'APPROVED':
                ++totalApproved;
                isApproved = totalApproved >= approvalLabels.requiredApprovals;
                break;
        }

        if (isApproved || isRejected) {
            break;
        }
    }

    return { totalApproved, isApproved, isRejected };
}
