import * as core from '@actions/core';
import { getOctokit, context } from '@actions/github';
import { GitHub } from '@actions/github/lib/utils';
import * as yaml from 'js-yaml';
import { Z_NO_COMPRESSION } from 'node:zlib';

type GitHubClient = InstanceType<typeof GitHub>;

interface Configuration
{
    requiredApprovals: number;
    labels: { approved: string, rejected: string };
}

async function run() {
    try {
        const token = core.getInput('repo-token', { required: true });
        const configurationPath = core.getInput('configuration-path', { required: true });

        const client: GitHubClient = getOctokit(token);
        const configuration = await getConfiguration(client, configurationPath);

        const prNumber = getCurrentPrNumber();
        if (!prNumber) {
            core.error('Could not determine current pull request number from context, exiting...');
            return;
        }

        const { data: pullRequest } = await client.pulls.get({
            owner: context.repo.owner,
            repo: context.repo.repo,
            pull_number: prNumber
        });
        core.info(`Evaluating PR #${pullRequest.number} - '${pullRequest.title}'`);
        core.info(`PR Target is: ${pullRequest.base.ref}`);
        
        const { data: pullRequstReviews } = await client.pulls.listReviews({
            owner: context.repo.owner,
            repo: context.repo.repo,
            pull_number: prNumber
        });

        let totalApproved = 0;
        let isRejected = false;
        for (const pullRequestReview of pullRequstReviews) {
            if (pullRequestReview.state === "APPROVED") {
                totalApproved += 1;
                core.info(`Review from User ${pullRequestReview.user?.login} was APPROVED adding one to total.`);
            } else if (pullRequestReview.state === "REJECTED") {
                isRejected = true;
                core.warning(`Review from User ${pullRequestReview.user?.login} was REJECTED rejecting PR.`);
            } else {
                core.info(`Review from User ${pullRequestReview.user?.login} was not APPROVED/REJECTED ignoring.`);
            }
        }

        core.info(`Total Approved: ${totalApproved}, Approvals Required: ${configuration.requiredApprovals}, Is Rejected: ${isRejected}`);
    } catch (error) {
        core.error(error);
        core.setFailed(error.message);
    }
}

async function getConfiguration(client: GitHubClient, configurationPath: string): Promise<Configuration> {
    const configurationContent = await fetchContent(client, configurationPath);

    const configObject: any = yaml.load(configurationContent);
    return configObject.labels as Configuration;
}

async function fetchContent(client: GitHubClient, repoPath: string): Promise<string> {
    const response = await client.repos.getContent({
        owner: context.repo.owner,
        repo: context.repo.repo,
        path: repoPath,
        ref: context.sha
    });

    response.data

    return Buffer.from((response.data as any).content, (response.data as any).encoding).toString();
}

function getCurrentPrNumber(): number | undefined {
    const currentPullRequest = context.payload.pull_request;
    if (!currentPullRequest) {
        return undefined;
    }

    return currentPullRequest.number;
}

run();