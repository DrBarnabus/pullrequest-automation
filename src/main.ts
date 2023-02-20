import { context } from '@actions/github';
import { WebhookPayload } from '@actions/github/lib/interfaces';
import { ProcessApprovalLabeller } from './Modules/ApprovalLabeller';
import { ProcessBranchLabeller } from './Modules/BranchLabeller';
import { LoadConfig } from './Config/LoadConfig';
import { EndGroup, GitHubClient, LogDebug, LogInfo, SetFailed, StartGroup } from './Core';
import { LabelState } from './Core/LabelState';
import { ProcessReviewerExpander } from './Modules/ReviewerExpander';
import { Command, Modules } from './Config/ConfigSchema';
import { ProcessCommand } from './ProcessCommand';

async function main() {
  try {
    await GitHubClient.get().InitializeClient();
    const config = await LoadConfig();

    const eventName = context.eventName;
    LogDebug(`Workflow triggered by ${eventName}`);
    LogDebug(`Event Payload: ${JSON.stringify(context.payload, null, 2)}`);

    if (eventName === 'pull_request_target' || eventName === 'pull_request_review') {
      if (!config?.modules) {
        throw new Error(
          `Config Validation failed modules, must be supplied when handling pull_request_target and pull_request_review events.`
        );
      }

      await ProcessModules(config.modules, context.payload);
    } else if (eventName === 'issue_comment' && context.payload.issue?.pull_request != null) {
      if (!config.commands || config.commands.length === 0) {
        throw new Error(
          `No commands configured, at least one command must be configured when handling pull_request_target and pull_request_review events.`
        );
      }

      await ProcessCommands(config.commands, context.payload);
    } else {
      throw new Error('Unable to determine correct action based on triggering event');
    }
  } catch (error: any) {
    SetFailed(error.message);
  }
}

async function ProcessModules(modules: Modules, payload: WebhookPayload) {
  const pullRequestNumber = payload.pull_request?.number;
  if (!pullRequestNumber) {
    throw new Error('Unable to determine pull request number from context');
  }

  const pullRequest = await GitHubClient.get().GetPullRequest(pullRequestNumber);
  LogInfo(`Processing pull request #${pullRequestNumber} - '${pullRequest.title}'`);

  const existingLabels = await GitHubClient.get().ListLabelsOnIssue(pullRequestNumber);
  const labelState = new LabelState(existingLabels.map((l) => l.name));

  await ProcessApprovalLabeller(modules.approvalLabeller, pullRequest, labelState);
  await ProcessBranchLabeller(modules.branchLabeller, pullRequest, labelState);
  await ProcessReviewerExpander(modules.reviewerExpander, pullRequest);

  await labelState.Apply(pullRequestNumber);

  LogInfo('Finished processing');
}

async function ProcessCommands(commands: Command[], payload: WebhookPayload) {
  StartGroup('Commands');
  try {
    if (!payload.comment) {
      throw new Error(`Unable to extract comment from context payload`);
    }

    if (!payload.issue?.pull_request) {
      throw new Error(`Unable to extract issue.pull_request from context payload`);
    }

    const comment = payload.comment;

    LogInfo(`Processing comment ${comment.html_url}`);
    LogInfo(`Comment body:\n${comment.body}`);

    const pullRequestNumber = payload.issue?.number;
    if (!pullRequestNumber) {
      throw new Error('Unable to determine pull request number from context');
    }

    const pullRequest = await GitHubClient.get().GetPullRequest(pullRequestNumber);
    LogInfo(`Processing comment on pull request #${pullRequestNumber} - '${pullRequest.title}'`);

    LogDebug(`There are ${commands.length} commands to process`);
    for (const command of commands) {
      const handled = await ProcessCommand(command, pullRequest, comment);
      if (handled) {
        return;
      }
    }

    LogInfo(`Finished Processing`);
  } finally {
    EndGroup();
  }
}

main();
