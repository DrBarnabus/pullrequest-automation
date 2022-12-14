import { PromotePullRequestCommandConfig } from "../Config/Commands/PromotePullRequest";
import { EndGroup, GetPullRequestResponse, GitHubClient, LogInfo, LogWarning, StartGroup } from "../Core";

export async function ProcessPromotePullRequest(config: PromotePullRequestCommandConfig | undefined, currentPullRequest: GetPullRequestResponse, comment: any) {
    StartGroup('Commands/PromotePullRequest');

    try {
        if (!config?.enabled) {
            LogInfo('Commands/PromotePullRequest is not enabled, skipping...');
            return false;
        }

        const { triggers, baseRef, headRef, label, asDraft } = ValidateAndExtractConfig(config);

        const normalizedCommentBody = comment.body.toLowerCase();
        const triggered = CheckIfTriggered(normalizedCommentBody, triggers);
        if (!triggered) {
            LogInfo(`Commands/PromotePullRequest has not been triggered`);
            return false;
        }

        if (!currentPullRequest.merged) {
            await GitHubClient.get().CreateReactionOnIssueComment(comment.id, 'confused');

            LogWarning(`Commands/PromotePullRequest was triggered but the pull request has not been merged yet so no action can be taken`);
            return true;
        }

        if (headRef) {
            const headRefExpression = new RegExp(`^${headRef}$`);
            if (!headRefExpression.test(currentPullRequest.base.ref)) {
                await GitHubClient.get().CreateReactionOnIssueComment(comment.id, 'confused');

                LogWarning(`Commands/PromotePullRequest was triggered but the pull request has a base of ${currentPullRequest.base.ref} which does not match expression ${headRef}`);
                return true;
            }
        }

        const creatorLogin = currentPullRequest.user?.login;

        let body = currentPullRequest.body ?? '';
        if (body !== '') {
            body += '\n\n---\n\n';
        }
        body += `Created on behalf of @${creatorLogin} from #${currentPullRequest.number}`;

        const createdPullRequest = await GitHubClient.get().CreatePullRequest(currentPullRequest.base.ref, baseRef, currentPullRequest.title, body, asDraft);
        if (creatorLogin) {
            await GitHubClient.get().AddAssigneesOnIssue(createdPullRequest.number, [creatorLogin]);
        }
        if (label) {
            await GitHubClient.get().AddLabelsOnIssue(createdPullRequest.number, [label]);
        }

        await GitHubClient.get().CreateReactionOnIssueComment(comment.id, 'rocket');
        LogInfo(`Commands/PromotePullRequest was triggered and #${createdPullRequest.number} was created for the user ${comment.user.login}`);
        return true;
    } finally {
        EndGroup();
    }
}

function CheckIfTriggered(normalizedCommentBody: string, triggers: string | string[]): boolean {
    if (typeof triggers === 'string') {
        return normalizedCommentBody.includes(triggers.toLowerCase());
    } else if (Array.isArray(triggers)) {
        for (const trigger of triggers) {
            const triggered = normalizedCommentBody.includes(trigger.toLowerCase());
            if (triggered) {
                return true;
            }
        }
    }

    return false;
}

function ValidateAndExtractConfig(config: PromotePullRequestCommandConfig) {
    let isValid = true;

    if (!config.triggers) {
        LogInfo(`Config Validation commands.promotePullRequest.triggers, was empty setting default of 'Promote to main!'`);
        config.triggers = 'Promote to main!';
    }

    if (!config.baseRef) {
        LogInfo(`Config Validation commands.promotePullRequest.base, was not supplied setting default of 'main'`);
        config.baseRef = 'main';
    }

    if (!config.asDraft) {
        LogInfo(`Config Validation commands.promotePullRequest.asDraft, was not supplied setting default of 'false'`);
        config.asDraft = false;
    }

    if (!isValid) {
        throw new Error('modules.promotePullRequest config failed validation');
    }

    return { triggers: config.triggers, baseRef: config.baseRef, headRef: config.headRef, label: config.label, asDraft: config.asDraft };
}
