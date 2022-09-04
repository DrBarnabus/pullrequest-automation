import { MergeSafety } from "./config";
import { endGroup, logDebug, logInfo, logWarning, startGroup } from "./core";
import { compareCommits, createCommentOnIssue, createReactionForIssueComment, getPullRequestResponse, GitHubClient } from "./github-client";
import { BranchToProtect } from "./models/config/merge-safety";

type processMergeSafetyCommandProperties = {
    gitHubClient: GitHubClient,
    config: MergeSafety,
    comment: any, // TODO: Add a strong type
    pullRequest: getPullRequestResponse
}

export async function processMergeSafetyCommand({ gitHubClient, config, comment, pullRequest }: processMergeSafetyCommandProperties): Promise<boolean> {
    startGroup('Command: MergeSafety');

    try {
        if (config.disable) {
            logInfo('Command is disabled. Skipping...');
            return false;
        }

        if (!config.branchesToProtect) {
            logWarning(`Command is enabled but no branches are configured for protection, add branches or disable`);
            return false;
        }

        if (!config.triggers) {
            logDebug(`Command is enabled but no triggers configured, adding default trigger of 'Safe to merge?'`);
            config.triggers = 'Safe to merge?';
        }

        const normalizedCommentBody = comment.body.toLowerCase();
        const prBaseRef = pullRequest.base.ref;

        const triggered = checkIfTriggered(normalizedCommentBody, config.triggers);
        if (!triggered) {
            logDebug(`Command has not been triggered`);
            return false;
        }

        logDebug(`Command has been triggerred, checking config for protections...`);

        const branchToProtect = getBranchToProtect(config, prBaseRef);;
        if (!branchToProtect) {
            logWarning(`Command was triggered but no protections were configured for Pull Request baseRef ${prBaseRef}`);

            await createReactionForIssueComment(gitHubClient, comment.id, 'confused');
            return true;
        }

        logInfo(`Pull Request baseRef ${prBaseRef} is configured with branch protections\n${JSON.stringify(branchToProtect, null, 2)}`);

        const response = await compareCommits(gitHubClient, branchToProtect.comparisonBaseRef, branchToProtect.comparisonHeadRef);
        if (response.ahead_by >= 1) {
            let body = `### Outstanding changes in [${branchToProtect.comparisonHeadRef}](${response.html_url})`;
            body += `\n\n`;

            for (const commit of response.commits) {
                body += `- ${commit.commit.message} [${commit.sha.substring(0, 7)}](${commit.html_url}) by [${commit.committer?.login}](${commit.committer?.html_url})\n`;
            }

            await createCommentOnIssue(gitHubClient, pullRequest.number, body);
            await createReactionForIssueComment(gitHubClient, comment.id, '-1');
        } else {
            await createReactionForIssueComment(gitHubClient, comment.id, '+1');
        }

        return true;
    } finally {
        endGroup();
    }
}

function checkIfTriggered(normalizedCommentBody: string, triggers: string | string[]): boolean {
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

function getBranchToProtect(config: MergeSafety, prBaseRef: string): BranchToProtect | null {
    for (const potentialBranchToProtect of config.branchesToProtect) {
        if (potentialBranchToProtect.baseRef === prBaseRef) {
            return potentialBranchToProtect;
        }
    }

    return null;
}
