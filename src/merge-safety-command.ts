import { MergeSafety } from "./config";
import { endGroup, logDebug, logInfo, logWarning, startGroup } from "./core";
import { createReactionForIssueComment, getPullRequestResponse, GitHubClient } from "./github-client";
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
            logInfo(`Command was triggered but no protections were configured for Pull Request baseRef ${prBaseRef}`);
            return true;
        }

        logInfo(`Pull Request baseRef ${prBaseRef} is configured with branch protections\n${JSON.stringify(branchToProtect, null, 2)}`);

        // TODO: Check for commits in baseRef that are not in, if any then thumbs down otherwise thumbs up

        // TODO: If thumbs down, then add a comment with the outstanding commits

        await createReactionForIssueComment(gitHubClient, comment.id, '+1');

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
