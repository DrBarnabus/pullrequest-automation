import { context } from '@actions/github';
import { WebhookPayload } from '@actions/github/lib/interfaces';
import { processApprovalLabeller } from './approval-labeller';
import { processBranchLabeller } from './branch-labeller';
import { Config, loadConfig, } from './config';
import { endGroup, logDebug, logError, logInfo, setFailed, startGroup } from './core';
import { DesiredLabels } from './desired-labels';
import { getGitHubClient, getPullRequest, GitHubClient, listLabelsOnIssue, setLabelsOnIssue } from './github-client'
import { processMergeSafetyCommand } from './merge-safety-command';
import { processReviewerExpander } from './reviewer-expander';

async function main() {
    try {
        const gitHubClient: GitHubClient = getGitHubClient();
        const config = await loadConfig(gitHubClient);

        const eventName = context.eventName;
        logInfo(`Workflow triggered by ${eventName}`);
        logDebug(`Payload: ${JSON.stringify(context.payload, null, 2)}`);

        if (eventName === 'pull_request_target' || eventName === 'pull_request_review') {
            await processPullRequest(gitHubClient, config, context.payload);
        } else if (eventName === 'issue_comment' && context.payload.issue?.pull_request != null) {
            await processCommentCommands(gitHubClient, config, context.payload);
        } else {
            throw new Error('Unable to determine correct action based on triggering event');
        }
    } catch (error: any) {
        logError(error.message);
        setFailed(error.message);
    }
}

async function processPullRequest(gitHubClient: GitHubClient, config: Config, payload: WebhookPayload) {
    const pullRequestNumber = payload.pull_request?.number;
    if (!pullRequestNumber) {
        throw new Error('Unable to determine pull request number from context');
    }

    const pullRequest = await getPullRequest(gitHubClient, pullRequestNumber);
    logInfo(`Processing pull request #${pullRequestNumber} - '${pullRequest.title}'`);

    const existingLabels = await listLabelsOnIssue(gitHubClient, pullRequestNumber);
    const desiredLabels = new DesiredLabels(existingLabels.map((l) => l.name));

    await processApprovalLabeller({ gitHubClient, pullRequest, approvalLabels: config.approvalLabels, desiredLabels });
    await processBranchLabeller({ pullRequest, branchLabels: config.branchLabels, desiredLabels });
    await processReviewerExpander({ gitHubClient, pullRequest, config: config.reviewerExpander });

    await applyLabelState(gitHubClient, pullRequestNumber, desiredLabels);

    logInfo('Finished processing');
}

async function applyLabelState(gitHubClient: GitHubClient, pullRequestNumber: number, desiredLabels: DesiredLabels) {
    startGroup('Apply Labels');

    logInfo(`Current State of Labels: ${JSON.stringify(desiredLabels.existingLabels)}`);
    logInfo(`Desired State of Labels: ${JSON.stringify(desiredLabels.labels)}`);

    await setLabelsOnIssue(gitHubClient, pullRequestNumber, desiredLabels.labels);

    logInfo('Labels have been set');

    endGroup();
}

async function processCommentCommands(gitHubClient: GitHubClient, config: Config, payload: WebhookPayload) {
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

    const pullRequest = await getPullRequest(gitHubClient, pullRequestNumber);
    logInfo(`Processing pull request #${pullRequestNumber} - '${pullRequest.title}'`);

    await processMergeSafetyCommand({ gitHubClient, config: config.commands.mergeSafety, comment, pullRequest });

    logInfo('Finished processing');
}

main();

