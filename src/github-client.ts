import { getOctokit, context } from '@actions/github';
import { components } from '@octokit/openapi-types'
import { getInput, logDebug } from './core';

export type GitHubClient = ReturnType<typeof getOctokit>;

export function getGitHubClient(): GitHubClient {
    const token = getInput('github-token', { required: true });
    return getOctokit(token);
}

export async function fetchContent(gitHubClient: GitHubClient, path: string, ref?: string) {
    try {
        logDebug(`GitHubClient repos.getContent: ${path}, ${ref ?? context.sha}`);
        const response = await gitHubClient.rest.repos.getContent({
            owner: context.repo.owner,
            repo: context.repo.repo,
            path: path,
            ref: ref ?? context.sha
        });
    
        if (Array.isArray(response.data)) {
            throw new Error('Expected file not directory');
        }
    
        type GetRepoContentsResponseDataFile = components['schemas']['content-file'];
        const data = response.data as GetRepoContentsResponseDataFile;
        return Buffer.from(data.content, data.encoding as BufferEncoding).toString();
    } catch (error) {
        throw new Error(`Unable to load content from Path ${path}\n${error}`);
    }
}

export type getPullRequestResponse = Awaited<ReturnType<typeof getPullRequest>>;
export async function getPullRequest(gitHubClient: GitHubClient, pullNumber: number) {
    try {
        logDebug(`GitHubClient pulls.get: ${pullNumber}`);
        const { data } = await gitHubClient.rest.pulls.get({
            owner: context.repo.owner,
            repo: context.repo.repo,
            pull_number: pullNumber
        });
    
        return data;
    } catch (error) {
        throw new Error(`Unable to load pull request with PullNumber ${pullNumber}\n${error}`);
    }
}

export type listReviewsOnPullRequestResponse = Awaited<ReturnType<typeof listReviewsOnPullRequest>>;
export async function listReviewsOnPullRequest(gitHubClient: GitHubClient, pullNumber: number) {
    try {
        logDebug(`GitHubClient pulls.listReviews: ${pullNumber}`);
        const { data } = await gitHubClient.rest.pulls.listReviews({
            owner: context.repo.owner,
            repo: context.repo.repo,
            pull_number: pullNumber
        });

        return data;
    } catch (error) {
        throw new Error(`Unable to retrieve reviews from pull request with PullNumber ${pullNumber}\n${error}`);
    }
}

export type listLabelsOnIssueResponse = Awaited<ReturnType<typeof listLabelsOnIssue>>;
export async function listLabelsOnIssue(gitHubClient: GitHubClient, issueNumber: number) {
    try {
        logDebug(`GitHubClient issues.listLabelsOnIssue: ${issueNumber}`);
        const { data } = await gitHubClient.rest.issues.listLabelsOnIssue({
            owner: context.repo.owner,
            repo: context.repo.repo,
            issue_number: issueNumber
        });

        return data;
    } catch (error) {
        throw new Error(`Unable to retrieve labels from Issue ${issueNumber}\n${error}`);
    }
}

export type setLabelsOnIssueResponse = Awaited<ReturnType<typeof setLabelsOnIssue>>;
export async function setLabelsOnIssue(gitHubClient: GitHubClient, issueNumber: number, labels: string[]) {
    try {
        logDebug(`GitHubClient issues.setLabels: ${issueNumber}, ${JSON.stringify(labels)}`);
        const { data } = await gitHubClient.rest.issues.setLabels({
            owner: context.repo.owner,
            repo: context.repo.repo,
            issue_number: issueNumber,
            labels
        });

        return data;
    } catch (error) {
        throw new Error(`Unable to set labels on Issue ${issueNumber}\n${error}`);
    }
}
