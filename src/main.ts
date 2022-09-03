import { context } from '@actions/github';
import { processApprovalLabeller } from './approval-labeller';
import { processBranchLabeller } from './branch-labeller';
import { Config, loadConfig, } from './config';
import { getInput, logError, logInfo, setFailed } from './core';
import { getGitHubClient, getPullRequest, GitHubClient, listLabelsOnIssue, setLabelsOnIssue } from './github-client'

async function main() {
    try {
        const token = getInput('github-token', { required: true });
        const gitHubClient: GitHubClient = getGitHubClient(token);
        
        const configPath = getInput('config-path', { required: true });
        const config = await loadConfig(gitHubClient, configPath);

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

main();

async function processPullRequest(gitHubClient: GitHubClient, config: Config, pullRequestNumber: number) {
    const pullRequest = await getPullRequest(gitHubClient, pullRequestNumber);
    logInfo(`Processing pull request #${pullRequestNumber} - '${pullRequest.title}'`);

    const currentLabels = await listLabelsOnIssue(gitHubClient, pullRequestNumber);
    const desiredLabels: string[] = currentLabels.map((l) => l.name);

    await processApprovalLabeller({ gitHubClient, pullRequest, approvalLabels: config.approvalLabels, desiredLabels });
    await processBranchLabeller({ pullRequest, branchLabels: config.branchLabels, desiredLabels })

    await setLabelsOnIssue(gitHubClient, pullRequestNumber, desiredLabels);

    logInfo('Finished');
}
