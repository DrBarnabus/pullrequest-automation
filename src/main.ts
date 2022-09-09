import { context } from '@actions/github';
import { WebhookPayload } from '@actions/github/lib/interfaces';
import { ProcessApprovalLabeller } from './Modules/ApprovalLabeller';
import { ProcessBranchLabeller } from './Modules/BranchLabeller';
import { CommandConfigs, ModuleConfigs, } from './Config';
import { LoadConfig } from "./Config";
import { GitHubClient, logDebug, logError, logInfo, setFailed } from './Core';
import { LabelState } from './Core/LabelState';
import { ProcessMergeSafety } from './Commands/MergeSafety';
import { ProcessReviewerExpander } from './Modules/ReviewerExpander';

async function main() {
    try {
        const config = await LoadConfig();

        const eventName = context.eventName;
        logDebug(`Workflow triggered by ${eventName}`);
        logDebug(`Event Payload: ${JSON.stringify(context.payload, null, 2)}`);

        if (eventName === 'pull_request_target' || eventName === 'pull_request_review') {
            if (!config?.modules) {
                throw new Error(`Config Validation failed modules, must be supplied when handling pull_request_target and pull_request_review events.\nSee: https://github.com/DrBarnabus/pullrequest-automation/blob/main/v3-CHANGES.md`);
            }

            await ProcessModules(config.modules, context.payload);
        } else if (eventName === 'issue_comment' && context.payload.issue?.pull_request != null) {
            if (!config?.commands) {
                throw new Error(`Config Validation failed commands, must be supplied when handling issue_comment events.\nSee: https://github.com/DrBarnabus/pullrequest-automation/blob/main/v3-CHANGES.md`);
            }
            
            await ProcessCommands(config.commands, context.payload);
        } else {
            throw new Error('Unable to determine correct action based on triggering event');
        }
    } catch (error: any) {
        logError(error.message);
        setFailed(error.message);
    }
}

async function ProcessModules(config: ModuleConfigs, payload: WebhookPayload) {
    const pullRequestNumber = payload.pull_request?.number;
    if (!pullRequestNumber) {
        throw new Error('Unable to determine pull request number from context');
    }

    const pullRequest = await GitHubClient.get().GetPullRequest(pullRequestNumber);
    logInfo(`Processing pull request #${pullRequestNumber} - '${pullRequest.title}'`);

    const existingLabels = await GitHubClient.get().ListLabelsOnIssue(pullRequestNumber);
    const labelState = new LabelState(existingLabels.map((l) => l.name));

    await ProcessApprovalLabeller(config.approvalLabeller, pullRequest, labelState);
    await ProcessBranchLabeller(config.branchLabeller, pullRequest, labelState);
    await ProcessReviewerExpander(config.reviewerExpander, pullRequest);

    await labelState.Apply(pullRequestNumber);

    logInfo('Finished processing');
}

async function ProcessCommands(config: CommandConfigs, payload: WebhookPayload) {
    if (!payload.comment) {
        throw new Error(`Unable to extract comment from context payload`);
    }

    if (!payload.issue?.pull_request) {
        throw new Error(`Unable to extract issue.pull_request from context payload`);
    }

    const comment = payload.comment;

    logInfo(`Processing comment ${comment.html_url}`);
    logDebug(`Comment body:\n${comment.body}`);

    const pullRequestNumber = payload.issue?.number;
    if (!pullRequestNumber) {
        throw new Error('Unable to determine pull request number from context');
    }

    const pullRequest = await GitHubClient.get().GetPullRequest(pullRequestNumber);
    logInfo(`Processing pull request #${pullRequestNumber} - '${pullRequest.title}'`);

    await ProcessMergeSafety(config.mergeSafety, pullRequest, comment);

    logInfo('Finished processing');
}

main();

