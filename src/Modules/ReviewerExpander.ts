import { ReviewerExpanderModuleConfig } from "../Config";
import { EndGroup, GetPullRequestResponse, GitHubClient, LogError, LogInfo, LogWarning, StartGroup } from "../Core"
import { StateCache } from "../Core/StateCache";

export async function ProcessReviewerExpander(
    config: ReviewerExpanderModuleConfig | undefined,
    pullRequest: GetPullRequestResponse,
    stateCache: StateCache) {
    StartGroup('Modules/ReviewerExpander');

    try {
        if (!config?.enabled) {
            LogInfo(`Modules/ReviewerExpander is not enabled. skipping...`);
            return;
        }

        if (!stateCache.firstRun) {
            LogInfo(`Modules/ReviewerExpander not first run. skipping...`);
            return;
        }

        if (!pullRequest.requested_teams || pullRequest.requested_teams.length == 0) {
            LogInfo(`Nothing to expand as no requested_teams on the pull request`);
            return;
        }

        if (pullRequest.requested_teams.length > 1) {
            LogWarning(`More than one team requested for review which is not currently supported`);
            return;
        }

        const requestedTeam = pullRequest.requested_teams[0];
        const teamMembers = await GitHubClient.get().ListMembersOfTeam(requestedTeam.slug);

        let reviewersToRequest: string[] = [];
        for (const teamMember of teamMembers) {
            const existingReviewer = pullRequest.requested_reviewers?.findIndex((r) => r.login == teamMember.login);
            if (existingReviewer === -1 ) {
                reviewersToRequest.push(teamMember.login);
            }
        }

        if (reviewersToRequest.length > 0) {
            LogInfo(`Expanded team ${requestedTeam.name} to ${reviewersToRequest.length} individual reviewers`);
            await GitHubClient.get().RequestReviewersOnPullRequest(pullRequest.number, reviewersToRequest);
        }
    } catch (err) {
        LogError(`An error ocurred while processing reviewer expander: ${err}`);
        throw err;
    } finally {
        EndGroup();
    }
}
