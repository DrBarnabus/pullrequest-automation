import * as core from '@actions/core';
import { getOctokit, context } from '@actions/github';
import { GitHub } from '@actions/github/lib/utils';
import * as yaml from 'js-yaml';

type GitHubClient = InstanceType<typeof GitHub>;

interface BranchLabellerConfiguration {
    target: string;
    startsWith: boolean;
    label: string;
}

interface Configuration {
    requiredApprovals: number;
    labels: { approved: string, rejected: string };
    branchLabeller: BranchLabellerConfiguration[];
}

async function run() {
    try {
        const token = core.getInput('repo-token', { required: true });
        const client: GitHubClient = getOctokit(token);
        
        const configurationPath = core.getInput('configuration-path', { required: true });
        const configuration = await getConfiguration(client, configurationPath);

        core.info(`Triggered by: ${context.eventName}`);

        const prNumber = context.payload.pull_request?.number;
        if (!prNumber) {
            core.error('Could not determine current pull request number from context, exiting...');
            return;
        }

        const { data: pullRequest } = await client.pulls.get({
            owner: context.repo.owner,
            repo: context.repo.repo,
            pull_number: prNumber
        });

        const baseRef = pullRequest.base.ref;
        core.info(`Evaluating: PR #${pullRequest.number} - '${pullRequest.title}' with BaseRef of ${baseRef}`);
        
        const { data: currentLabels } = await client.issues.listLabelsOnIssue({
            owner: context.repo.owner,
            repo: context.repo.repo,
            issue_number: prNumber
        });

        let branchLabelToApply: string | null = null;
        for (let { target, startsWith, label } of configuration.branchLabeller) {
            if ((baseRef == target && !startsWith) || (baseRef.startsWith(target) && startsWith)) {
                branchLabelToApply = label;
                break;
            }
        }
        
        if (branchLabelToApply != null) {
            if (currentLabels.some(l => l.name == branchLabelToApply)) {
                core.info(`Branch Label of ${branchLabelToApply} is already applied.`);
            } else {
                core.info(`Adding Branch Label of ${branchLabelToApply} based on base commit ref.`);
                await client.issues.addLabels({
                    owner: context.repo.owner,
                    repo: context.repo.repo,
                    issue_number: prNumber,
                    labels: [
                        branchLabelToApply
                    ]
                }).catch(_ => {});

                core.info(`Removing Branch Labels that no longer apply.`);

                let labelRemoved = false;
                for (let { label } of configuration.branchLabeller) {
                    if (label == branchLabelToApply)
                        continue;
                    
                    if (currentLabels.some(l => l.name == label)) {
                        await client.issues.removeLabel({
                            owner: context.repo.owner,
                            repo: context.repo.repo,
                            issue_number: prNumber,
                            name: label
                        }).catch(_ => {});

                        labelRemoved = true;
                    }
                }

                if (labelRemoved) {
                    core.warning('An older branch label for a different branch was found and removed, commenting warning.');
                    await client.issues.createComment({
                        owner: context.repo.owner,
                        repo: context.repo.repo,
                        issue_number: prNumber,
                        body: '⚠️ WARNING: It looks like the base ref of the Pull Request has changed. ⚠️\nIf this was intentional then there isn\'t anything to worry about.'
                    }).catch(_ => {});
                }
            }
        }
        
        const { data: pullRequstReviews } = await client.pulls.listReviews({
            owner: context.repo.owner,
            repo: context.repo.repo,
            pull_number: prNumber
        });

        let reviewStateMap = new Map<string, string>();
        for (const pullRequestReview of pullRequstReviews) {
            if (pullRequestReview.user == null) {
                core.warning(`Review ${pullRequestReview.id} had a user of undefined.`);
                continue;
            }

            if (pullRequestReview.commit_id !== pullRequest.head.sha) {
                core.debug(`Review from User ${pullRequestReview.user?.login} was ignored as it was not for current CommitRef.`);
                continue;
            }

            if (pullRequestReview.state === 'APPROVED') {
                reviewStateMap.set(pullRequestReview.user.login, 'APPROVED');
                core.info(`Added APPROVED state from ${pullRequestReview.user.login} reviewed at ${pullRequestReview.submitted_at}`);
            } else if (pullRequestReview.state === 'CHANGES_REQUESTED') {
                reviewStateMap.set(pullRequestReview.user.login, 'CHANGES_REQUESTED');
                core.info(`Added CHANGES_REQUESTED state from ${pullRequestReview.user.login} reviewed at ${pullRequestReview.submitted_at}`);
            } else {
                core.info(`Review from User ${pullRequestReview.user?.login} reviewed at ${pullRequestReview.submitted_at} was not APPROVED/CHANGES_REQUESTED ignoring.`);
            }
        }
        
        let totalApproved = 0;
        let isRejected = false;
        for (let [user, state] of reviewStateMap) {
            core.info(`${user} ended with state of ${state}`);
            if (state === 'CHANGES_REQUESTED') {
                isRejected = true;
                break;
            }

            if (state === 'APPROVED') {
                ++totalApproved;
            }
        }

        let isApproved = totalApproved >= configuration.requiredApprovals;

        core.info(`TotalApproved: ${totalApproved}, ApprovalsRequired: ${configuration.requiredApprovals}, IsApproved ${isApproved}, IsRejected: ${isRejected}`);

        if (isRejected) {
            await client.issues.addLabels({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: prNumber,
                labels: [
                    configuration.labels.rejected
                ]
            }).catch(_ => {});

            await client.issues.removeLabel({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: prNumber,
                name: configuration.labels.approved
            }).catch(_ => {});
        } else if (isApproved) {
            await client.issues.addLabels({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: prNumber,
                labels: [
                    configuration.labels.approved
                ]
            }).catch(_ => {});

            await client.issues.removeLabel({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: prNumber,
                name: configuration.labels.rejected
            }).catch(_ => {});
        } else {
            await client.issues.removeLabel({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: prNumber,
                name: configuration.labels.approved
            }).catch(_ => {});

            await client.issues.removeLabel({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: prNumber,
                name: configuration.labels.rejected
            }).catch(_ => {});

            if (context.eventName === 'pull_request') {
                await client.issues.createComment({
                    owner: context.repo.owner,
                    repo: context.repo.repo,
                    issue_number: prNumber,
                    body: 'A change to this branch reset it\'s review status. 😢\nTo help with the review process, make sure to mention what you changed in a comment.'
                }).catch(_ => {});
            }
        }
    } catch (error) {
        core.error(error);
        core.setFailed(error.message);
    }
}

async function getConfiguration(client: GitHubClient, configurationPath: string): Promise<Configuration> {
    const configurationContent = await fetchContent(client, configurationPath);

    const configObject: any = yaml.load(configurationContent);
    return configObject as Configuration;
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

run();