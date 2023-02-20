import { Command } from './Config/ConfigSchema';
import { GetPullRequestResponse, LogDebug, LogInfo } from './Core';

export async function ProcessCommand(
  command: Command,
  pullRequest: GetPullRequestResponse,
  comment: any
): Promise<boolean> {
  if (!CheckIfTriggered(comment.body, command.trigger)) {
    return false;
  }

  LogDebug(`There are ${command.actions.length} actions to process for this command`);
  for (const action of command.actions) {
    switch (action.action) {
      case 'check-for-merge-conflict':
        break;
      case 'merge-pull-request':
        break;
      case 'create-pull-request':
        break;
      default:
        throw new Error(`Unrecognized command action of ${(action as any).action} unable to proceed`);
    }
  }

  LogDebug(`Command with trigger ${command.trigger} has been handled successfully`);
  return true;
}

function CheckIfTriggered(commentBody: string, trigger: string): boolean {
  const isTriggered = commentBody.toLowerCase().includes(trigger.toLowerCase());
  LogInfo(`Command with trigger '${trigger}' ${isTriggered ? 'has triggered' : 'has not been triggered'}`);

  return isTriggered;
}
