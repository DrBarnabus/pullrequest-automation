import { endGroup, logDebug, logInfo, logWarning, startGroup } from "./core";
import { getPullRequestResponse, GitHubClient, listReviewsOnPullRequest, listReviewsOnPullRequestResponse } from "./github-client";
import { ApprovalLabels } from "./models/config";

type approvalLabellerProps = {
    gitHubClient: GitHubClient,
    pullRequest: getPullRequestResponse,
    approvalLabels: ApprovalLabels;
    desiredLabels: string[];
}

export async function processApprovalLabeller({
    gitHubClient,
    pullRequest,
    approvalLabels,
    desiredLabels
}: approvalLabellerProps) {
    startGroup('Approval Labeller');

    const pullRequestReviews = await listReviewsOnPullRequest(gitHubClient, pullRequest.number);

    const reviewStatuses = getReviewStatuses(pullRequest, pullRequestReviews);
    const { totalApproved, isApproved, isRejected } = calculateReviewStatus(reviewStatuses, approvalLabels);

    logInfo(`Approvals: ${totalApproved}/${approvalLabels.requiredApprovals} (IsApproved=${isApproved}, IsRejected=${isRejected})`);

    removeLabelIfPresent(desiredLabels, approvalLabels.labelsToApply.approved);
    removeLabelIfPresent(desiredLabels, approvalLabels.labelsToApply.rejected);
    removeLabelIfPresent(desiredLabels, approvalLabels.labelsToApply.needsReview);

    if (isApproved) {
        addLabelIfMissing(desiredLabels, approvalLabels.labelsToApply.approved);
    } else if (isRejected) {
        addLabelIfMissing(desiredLabels, approvalLabels.labelsToApply.rejected);
    } else {
        addLabelIfMissing(desiredLabels, approvalLabels.labelsToApply.needsReview);
    }

    endGroup();
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

function removeLabelIfPresent(labels: string[], labelToRemove: string): boolean {
    const index = labels.indexOf(labelToRemove);
    if (index === -1) {
        return false;
    } else {
        labels.splice(index, 1);
        return true;
    }
}

function addLabelIfMissing(labels: string[], labelToAdd: string): boolean {
    const index = labels.indexOf(labelToAdd);
    if (index !== -1) {
        return true;
    } else {
        labels.push(labelToAdd);
        return false;
    }
}