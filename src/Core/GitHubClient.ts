import { context } from "@actions/github";
import { GitHub } from "@actions/github/lib/utils";
import { createAppAuth } from "@octokit/auth-app";
import { OctokitOptions } from "@octokit/core/dist-types/types";
import { components } from '@octokit/openapi-types'
import { GetInput, LogDebug, LogInfo } from ".";

export type Octokit = ReturnType<typeof getOctokit>;
function getOctokit(options?: OctokitOptions): InstanceType<typeof GitHub> {
    return new GitHub(options);
}

export type CompareCommitsResponse = Awaited<ReturnType<GitHubClient['CompareCommits']>>;
export type GetPullRequestResponse = Awaited<ReturnType<GitHubClient['GetPullRequest']>>;
export type CreatePullRequestResponse = Awaited<ReturnType<GitHubClient['CreatePullRequest']>>;
export type ListReviewsOnPullRequestResponse = Awaited<ReturnType<GitHubClient['ListReviewsOnPullRequest']>>;
export type RequestReviewersOnPullRequestResponse = Awaited<ReturnType<GitHubClient['RequestReviewersOnPullRequest']>>;
export type ListLabelsOnIssueResponse = Awaited<ReturnType<GitHubClient['ListLabelsOnIssue']>>;
export type SetLabelsOnIssueResponse = Awaited<ReturnType<GitHubClient['SetLabelsOnIssue']>>;
export type AddLabelsOnIssueResponse = Awaited<ReturnType<GitHubClient['AddLabelsOnIssue']>>;
export type AddAssigneesOnIssueResponse = Awaited<ReturnType<GitHubClient['AddAssigneesOnIssue']>>;
export type CreateCommentOnIssueResponse = Awaited<ReturnType<GitHubClient['CreateCommentOnIssue']>>;
export type CreateReactionOnIssueCommentResponse = Awaited<ReturnType<GitHubClient['CreateReactionOnIssueComment']>>;
export type ListMembersOfTeamCommentResponse = Awaited<ReturnType<GitHubClient['ListMembersOfTeam']>>;

export class GitHubClient {
    private static instance: GitHubClient;
    private client: Octokit | undefined;

    private constructor() {
    }

    public static get(): GitHubClient {
        if (!GitHubClient.instance) {
            GitHubClient.instance = new GitHubClient();
        }

        return GitHubClient.instance;
    }

    public async FetchContent(path: string, ref?: string) {
        ref = ref ?? context.sha;

        try {
            LogDebug(`GitHubClient - FetchContent: ${path}, ${ref}`);

            const response = await this.client!.rest.repos.getContent({
                owner: context.repo.owner,
                repo: context.repo.repo,
                path: path,
                ref: ref
            });

            if (Array.isArray(response.data)) {
                throw new Error('response contained a directory not a file');
            }

            type GetRepoContentsResponseDataFile = components['schemas']['content-file'];
            const data = response.data as GetRepoContentsResponseDataFile;
            return Buffer.from(data.content, data.encoding as BufferEncoding).toString();
        } catch (error) {
            throw new Error(`GitHubClient - Unable to fetch content\n${error}`);
        }
    }

    public async CompareCommits(base: string, head: string) {
        try {
            LogDebug(`GitHubClient - CompareCommits: ${base}, ${head}`);

            const { data } = await this.client!.rest.repos.compareCommits({
                owner: context.repo.owner,
                repo: context.repo.repo,
                base,
                head
            });

            return data;
        } catch (error) {
            throw new Error(`GitHubClient - Unable to compare commits\n${error}`);
        }
    }

    public async GetPullRequest(pullNumber: number) {
        try {
            LogDebug(`GitHubClient - GetPullRequest: ${pullNumber}`);

            const { data } = await this.client!.rest.pulls.get({
                owner: context.repo.owner,
                repo: context.repo.repo,
                pull_number: pullNumber
            });

            return data;
        } catch (error) {
            throw new Error(`GitHubClient - Unable to get pull request\n${error}`);
        }
    }

    public async CreatePullRequest(head: string, base: string, title: string, body: string | undefined, draft: boolean) {
        try {
            LogDebug(`GitHubClient - CreatePullRequest: ${head}, ${base}, ${title}, ${draft}, ---\n${body}\n---`);

            const { data } = await this.client!.rest.pulls.create({
                owner: context.repo.owner,
                repo: context.repo.repo,
                head,
                base,
                title,
                body,
                draft
            });

            return data;
        } catch (error) {
            throw new Error(`GitHubClient - Unable to create pull request\n${error}`);
        }
    }

    public async ListReviewsOnPullRequest(pullNumber: number) {
        try {
            LogDebug(`GitHubClient - ListReviewsOnPullRequest: ${pullNumber}`);

            const { data } = await this.client!.rest.pulls.listReviews({
                owner: context.repo.owner,
                repo: context.repo.repo,
                pull_number: pullNumber
            });

            return data;
        } catch (error) {
            throw new Error(`GitHubClient - Unable to list reviews pull request\n${error}`);
        }
    }

    public async RequestReviewersOnPullRequest(pullNumber: number, reviewers: string[]) {
        try {
            LogDebug(`GitHubClient - RequestReviewersOnPullRequest: ${pullNumber}, ${JSON.stringify(reviewers)}`);

            const { data } = await this.client!.rest.pulls.requestReviewers({
                owner: context.repo.owner,
                repo: context.repo.repo,
                pull_number: pullNumber,
                reviewers
            });

            return data;
        } catch (error) {
            throw new Error(`GitHubClient - Unable to request reviewers pull request\n${error}`);
        }
    }

    public async ListLabelsOnIssue(issueNumber: number) {
        try {
            LogDebug(`GitHubClient - ListLabelsOnIssue: ${issueNumber}`);

            const { data } = await this.client!.rest.issues.listLabelsOnIssue({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: issueNumber
            });

            return data;
        } catch (error) {
            throw new Error(`GitHubClient - Unable to list labels on issue\n${error}`);
        }
    }

    public async SetLabelsOnIssue(issueNumber: number, labels: string[]) {
        try {
            LogDebug(`GitHubClient - SetLabelsOnIssue: ${issueNumber}, ${JSON.stringify(labels)}`);

            const { data } = await this.client!.rest.issues.setLabels({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: issueNumber,
                labels
            });

            return data;
        } catch (error) {
            throw new Error(`GitHubClient - Unable to set labels on issue\n${error}`);
        }
    }

    public async AddLabelsOnIssue(issueNumber: number, labels: string[]) {
        try {
            LogDebug(`GitHubClient - AddLabelsOnIssue: ${issueNumber}, ${JSON.stringify(labels)}`);

            const { data } = await this.client!.rest.issues.addLabels({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: issueNumber,
                labels
            });

            return data;
        } catch (error) {
            throw new Error(`GitHubClient - Unable to add labels on issue\n${error}`);
        }
    }

    public async AddAssigneesOnIssue(issueNumber: number, assignees: string[]) {
        try {
            LogDebug(`GitHubClient - AddAssigneesOnIssue: ${issueNumber}, ${JSON.stringify(assignees)}`);

            const { data } = await this.client!.rest.issues.addAssignees({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: issueNumber,
                assignees
            });

            return data;
        } catch (error) {
            throw new Error(`GitHubClient - Unable to add assignees on issue\n${error}`);
        }
    }

    public async CreateCommentOnIssue(issueNumber: number, body: string) {
        try {
            LogDebug(`GitHubClient - CreateCommentOnIssue: ${issueNumber}, ---\n${body}\n---`);

            const { data } = await this.client!.rest.issues.createComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: issueNumber,
                body
            });

            return data;
        } catch (error) {
            throw new Error(`GitHubClient - Unable to create comment on issue\n${error}`);
        }
    }

    public async CreateReactionOnIssueComment(commentId: number, content: '+1' | '-1' | 'laugh' | 'confused' | 'heart' | 'hooray' | 'rocket' | 'eyes') {
        try {
            LogDebug(`GitHubClient - CreateReactionOnIssueComment: ${commentId}, ${content}`);

            const { data } = await this.client!.rest.reactions.createForIssueComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                comment_id: commentId,
                content
            });

            return data;
        } catch (error) {
            throw new Error(`GitHubClient - Unable to create reaction for issue comment\n${error}`);
        }
    }

    public async ListMembersOfTeam(teamSlug: string) {
        try {
            LogDebug(`GitHubClient - ListMembersOfTeam: ${teamSlug}`);

            const { data } = await this.client!.rest.teams.listMembersInOrg({
                org: context.repo.owner,
                team_slug: teamSlug
            });

            return data;
        } catch (error) {
            throw new Error(`GitHubClient - Unable to list members of team\n${error}`);
        }
    }

    async InitializeClient() {
        const token = GetInput('github-token', { required: false });
        if (token) {
            LogInfo(`Initializing API via Token using provided 'github-token' value`);
            this.client = getOctokit({ auth: `token ${token}` });
            return;
        }

        const appId = GetInput('github-app-id', { required: false });
        const appKey = GetInput('github-app-key', { required: false });
        if (appId && appKey) {
            LogInfo(`Initializing API via GitHub App using provided 'github-app-id' and 'github-app-key' values`);
            this.client = await this.InitializeClientViaApp(appId, appKey);
            return;
        }

        throw new Error(`No other authentication methods are supported yet.`);
    }

    private async InitializeClientViaApp(appId: string, appKey: string) {
        const privateKey = Buffer.from(appKey, 'base64').toString();
        const appClient = getOctokit({
            authStrategy: createAppAuth,
            auth: {
                appId,
                privateKey
            }
        });

        const installationId = await this.GetRepoInstallationId(appClient);
        LogDebug(`InstallationID is ${installationId}`);

        return getOctokit({
            authStrategy: createAppAuth,
            auth: {
                appId,
                privateKey,
                installationId
            }
        });
    }

    private async GetRepoInstallationId(appClient: InstanceType<typeof GitHub>) {
        try {
            LogDebug(`GitHubClient - GetRepoInstallationId`);
            const { data } = await appClient.rest.apps.getRepoInstallation({
                owner: context.repo.owner,
                repo: context.repo.repo
            });

            return data.id;
        } catch (error) {
            throw new Error(`GitHubClient - Unable to get repo installation id\n${error}`);
        }
    }
}
