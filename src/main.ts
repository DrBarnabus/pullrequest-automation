import { context } from '@actions/github';
import { processApprovalLabeller } from './approval-labeller';
import { processBranchLabeller } from './branch-labeller';
import { Config, loadConfig, } from './config';
import { endGroup, logError, logInfo, setFailed, startGroup } from './core';
import { DesiredLabels } from './desired-labels';
import { getGitHubClient, getPullRequest, GitHubClient, listLabelsOnIssue, setLabelsOnIssue } from './github-client'

async function main() {
    try {
        const gitHubClient: GitHubClient = getGitHubClient();
        const config = await loadConfig(gitHubClient);

        logInfo(`Workflow triggered by ${context.eventName}`);

        const pullRequestNumber = context.payload.pull_request?.number;
        if (!pullRequestNumber) {
            throw new Error('Unable to determine pull request number from context');
        }
        
        await processPullRequest(gitHubClient, config, pullRequestNumber);
    } catch (error: any) {
        logError(error.message);
        setFailed(error.message);
    }
}

async function processPullRequest(gitHubClient: GitHubClient, config: Config, pullRequestNumber: number) {
    const pullRequest = await getPullRequest(gitHubClient, pullRequestNumber);
    logInfo(`Processing pull request #${pullRequestNumber} - '${pullRequest.title}'`);

    const existingLabels = await listLabelsOnIssue(gitHubClient, pullRequestNumber);
    const desiredLabels = new DesiredLabels(existingLabels.map((l) => l.name));

    await processApprovalLabeller({ gitHubClient, pullRequest, approvalLabels: config.approvalLabels, desiredLabels });
    await processBranchLabeller({ pullRequest, branchLabels: config.branchLabels, desiredLabels });

    await applyLabelState(gitHubClient, pullRequestNumber, desiredLabels);

    logInfo('Finished processing');
}

async function applyLabelState(gitHubClient: GitHubClient, pullRequestNumber: number, desiredLabels: DesiredLabels) {
    startGroup('Apply Labels');

    logInfo(`Current State of Labels: ${JSON.stringify(desiredLabels.existingLabels)}`);
    logInfo(`Desired State of Labels: ${JSON.stringify(desiredLabels.labels)}`);

    await setLabelsOnIssue(gitHubClient, pullRequestNumber, desiredLabels.labels);

    logInfo('Labels have been set')

    endGroup();
}

main();
