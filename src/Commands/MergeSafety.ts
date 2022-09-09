import { MergeSafetyCommandConfig } from "../Config";
import { BranchToProtect } from '../Config/Commands/MergeSafety/BranchToProtect';
import { EndGroup, LogError, LogInfo, LogWarning, SetFailed, GitHubClient, CompareCommitsResponse, GetPullRequestResponse, StartGroup } from "../Core";

export async function ProcessMergeSafety(config: MergeSafetyCommandConfig | undefined, pullRequest: GetPullRequestResponse, comment: any) {
    StartGroup('Commands/MergeSafety');

    try {
        if (!config?.enabled) {
            LogInfo('Commands/MergeSafety is not enabled, skipping...');
            return false;
        }

        const { triggers, branchesToProtect } = ValidateAndExtractConfig(config);

        const normalizedCommentBody = comment.body.toLowerCase();
        const prBaseRef = pullRequest.base.ref;

        const triggered = CheckIfTriggered(normalizedCommentBody, triggers);
        if (!triggered) {
            LogInfo(`Commands/MergeSafety has not been triggered`);
            return false;
        }

        const branchToProtect = MatchBranchToProtect(branchesToProtect, prBaseRef);;
        if (!branchToProtect) {
            await GitHubClient.get().CreateReactionOnIssueComment(comment.id, 'confused');

            LogWarning(`Commands/MergeSafety was triggered but protection was not configured for Pull Request baseRef ${prBaseRef}`);
            return true;
        }

        const compareResponse = await GitHubClient.get().CompareCommits(branchToProtect.comparisonBaseRef, branchToProtect.comparisonHeadRef);
        if (compareResponse.ahead_by >= 1) {
            let body = ConstructChangesCommentBody(branchToProtect, compareResponse);
            await GitHubClient.get().CreateCommentOnIssue(pullRequest.number, body);

            await GitHubClient.get().CreateReactionOnIssueComment(comment.id, '-1');
        } else {
            await GitHubClient.get().CreateReactionOnIssueComment(comment.id, '+1');
        }

        return true;
    } finally {
        EndGroup();
    }
}

function ConstructChangesCommentBody(branchToProtect: BranchToProtect, response: CompareCommitsResponse) {
    let body = `## Outstanding changes in [${branchToProtect.comparisonHeadRef}](${response.html_url})`;

    body += `\n\n<details>\n<summary>View Changes</summary>\n\n`;

    for (const commit of response.commits) {
        body += `- ${commit.commit.message} [${commit.sha.substring(0, 7)}](${commit.html_url}) by [${commit.committer?.login}](${commit.committer?.html_url})\n`;
    }

    body += `\n</details>`;

    return body;
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

function MatchBranchToProtect(branchesToProtect: BranchToProtect[], prBaseRef: string): BranchToProtect | null {
    for (const branchToProtect of branchesToProtect) {
        if (branchToProtect.baseRef === prBaseRef) {
            return branchToProtect;
        }
    }

    return null;
}

function ValidateAndExtractConfig(config: MergeSafetyCommandConfig) {
    let isValid = true;

    if (!config.triggers) {
        LogInfo(`Config Validation commands.mergeSafety.triggers, was empty setting default of 'Safe to merge?'`);
        config.triggers = 'Safe to merge?';
    }

    if (!config.branchesToProtect) {
        LogError(`Config Validation failed commands.mergeSafety.branchesToProtect, at least one branch to protect must be supplied`);
        isValid = false;
    }

    const branchesToProtect = config.branchesToProtect;
    for (let i = 0; i < branchesToProtect.length; i++) {
        const branchToProtect = branchesToProtect[i];

        if (!branchToProtect.baseRef) {
            LogError(`Config Validation failed commands.mergeSafety.branchesToProtect[${i}].baseRef, must be supplied`);
            isValid = false;
        }

        if (!branchToProtect.comparisonBaseRef) {
            LogError(`Config Validation failed commands.mergeSafety.branchesToProtect[${i}].comparisonBaseRef, must be supplied`);
            isValid = false;
        }

        if (!branchToProtect.comparisonHeadRef) {
            LogError(`Config Validation failed commands.mergeSafety.branchesToProtect[${i}].comparisonHeadRef, must be supplied`);
            isValid = false;
        }

        if (branchToProtect.comparisonBaseRef === branchToProtect.comparisonHeadRef) {
            LogError(`Config Validation failed commands.mergeSafety.branchesToProtect[${i}].comparisonBaseRef, must not match comparisonHeadRef`);
            isValid = false;
        }
    }

    if (!isValid) {
        throw new Error('modules.branchLabeller config failed validation');
    }

    return { triggers: config.triggers, branchesToProtect };
}
