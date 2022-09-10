import { PromotePullRequestCommandConfig } from "../Config/Commands/PromotePullRequest";
import { EndGroup, GetPullRequestResponse, GitHubClient, LogInfo, LogWarning, StartGroup } from "../Core";

export async function ProcessPromotePullRequest(config: PromotePullRequestCommandConfig | undefined, currentPullRequest: GetPullRequestResponse, comment: any) {
    StartGroup('Commands/PromoteToMain');

    try {
        if (!config?.enabled) {
            LogInfo('Commands/PromoteToMain is not enabled, skipping...');
            return false;
        }

        const { triggers, baseRef, headRef, asDraft } = ValidateAndExtractConfig(config);

        const normalizedCommentBody = comment.body.toLowerCase();
        const triggered = CheckIfTriggered(normalizedCommentBody, triggers);
        if (!triggered) {
            LogInfo(`Commands/PromoteToMain has not been triggered`);
            return false;
        }

        if (!currentPullRequest.merged) {
            await GitHubClient.get().CreateReactionOnIssueComment(comment.id, 'confused');

            LogWarning(`Commands/PromoteToMain was triggered but the pull request has not been merged yet so no action can be taken`);
            return true;
        }

        if (headRef) {
            const headRefExpression = new RegExp(`^${headRef}$`);
            if (!headRefExpression.test(currentPullRequest.base.ref)) {
                await GitHubClient.get().CreateReactionOnIssueComment(comment.id, 'confused');

                LogWarning(`Commands/PromoteToMain was triggered but the pull request has a base of ${currentPullRequest.base.ref} which does not match expression ${headRef}`);
                return true;
            }
        }

        const createdPullRequest = await GitHubClient.get().CreatePullRequest(currentPullRequest.base.ref, baseRef, currentPullRequest.title, currentPullRequest.body ?? undefined, asDraft);

        await GitHubClient.get().CreateCommentOnIssue(createdPullRequest.number, `Created on behalf of @${comment.user.login} from #${currentPullRequest.number}`);

        await GitHubClient.get().CreateReactionOnIssueComment(comment.id, 'rocket');
        await GitHubClient.get().CreateCommentOnIssue(currentPullRequest.number, `Created #${createdPullRequest.number} on behalf of @${comment.user.login}`);

        LogInfo(`Commands/PromoteToMain was triggered and #${createdPullRequest.number} was created for the user ${comment.user.login}`);

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
        LogInfo(`Config Validation commands.promoteToMain.triggers, was empty setting default of 'Promote to main!'`);
        config.triggers = 'Promote to main!';
    }

    if (!config.baseRef) {
        LogInfo(`Config Validation commands.promoteToMain.base, was not supplied setting default of 'main'`);
        config.baseRef = 'main';
    }

    if (!config.asDraft) {
        LogInfo(`Config Validation commands.promoteToMain.createAsDraft, was not supplied setting default of 'true'`);
        config.asDraft = true;
    }

    if (!isValid) {
        throw new Error('modules.promoteToMain config failed validation');
    }

    return { triggers: config.triggers, baseRef: config.baseRef, headRef: config.headRef, asDraft: config.asDraft };
}
