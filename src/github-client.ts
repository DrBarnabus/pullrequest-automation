import { getOctokit, context } from '@actions/github';
import { components } from '@octokit/openapi-types'

export type GitHubClient = ReturnType<typeof getOctokit>;

export function getGitHubClient(token: string): GitHubClient {
    return getOctokit(token);
}

type GetRepoContentsResponseDataFile = components['schemas']['content-file'];

export async function fetchContent(gitHubClient: GitHubClient, path: string) {
    try {
        const response = await gitHubClient.rest.repos.getContent({
            owner: context.repo.owner,
            repo: context.repo.repo,
            path: path,
            ref: context.sha
        });
    
        if (Array.isArray(response.data)) return null;
    
        const data = response.data as GetRepoContentsResponseDataFile;
        return Buffer.from(data.content, data.encoding as BufferEncoding).toString();
    } catch (error) {
        throw new Error(`Unable to load content from Path ${path}\n${error}`);
    }
}

export type getPullRequestResponse = Awaited<ReturnType<typeof getPullRequest>>;
export async function getPullRequest(gitHubClient: GitHubClient, pullNumber: number) {
    try {
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
