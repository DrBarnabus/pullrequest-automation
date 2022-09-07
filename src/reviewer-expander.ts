import { ReviewerExpander } from "./config";
import { endGroup, logError, logInfo, logWarning, startGroup } from "./core"
import { getPullRequestResponse, GitHubClient, listMembersOfTeam, requestReviewersOnPullRequest } from "./github-client"

type reviewerExpanderProps = {
    gitHubClient: GitHubClient,
    pullRequest: getPullRequestResponse,
    config?: ReviewerExpander
}

export async function processReviewerExpander({
    gitHubClient,
    pullRequest,
    config
}: reviewerExpanderProps) {
    startGroup('Reviewer Expander');

    try {
        if (config?.disable) {
            logInfo(`Reviewer Expander is disabled, skipping...`);
            return;
        }

        if (!pullRequest.requested_teams || pullRequest.requested_teams.length == 0) {
            logInfo(`Nothing to expand as no requested_teams on the pull request`);
            return;
        }

        if (pullRequest.requested_teams.length > 1) {
            logWarning(`More than one team requested for review which is not currently supported`);
            return;
        }

        const requestedTeam = pullRequest.requested_teams[0];
        const teamMembers = await listMembersOfTeam(gitHubClient, requestedTeam.slug);

        let reviewersToRequest: string[] = [];
        for (const teamMember of teamMembers) {
            const existingReviewer = pullRequest.requested_reviewers?.findIndex((r) => r.login == teamMember.login);
            if (existingReviewer === -1 ) {
                reviewersToRequest.push(teamMember.login);
            }
        }

        if (reviewersToRequest.length > 0) {
            logInfo(`Expanded team ${requestedTeam.name} to ${reviewersToRequest.length} individual reviewers`);
            await requestReviewersOnPullRequest(gitHubClient, pullRequest.number, reviewersToRequest);
        }
    } catch (err) {
        logError(`An error ocurred while processing reviewer expander: ${err}`);
        throw err;
    } finally {
        endGroup();
    }
}