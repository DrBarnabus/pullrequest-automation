import { endGroup, GitHubClient, logInfo, startGroup } from ".";

export class LabelState
{
    existingLabels: string[];
    labels: string[];

    constructor(existingLabels: string[]) {
        this.existingLabels = existingLabels;
        this.labels = [...existingLabels];
    }

    Add(labelToAdd: string): boolean {
        const index = this.labels.indexOf(labelToAdd);
        if (index !== -1) {
            // Label already added
            return false;
        } else {
            // Label must be added
            this.labels.push(labelToAdd);
            return true;
        }
    }

    Remove(labelToRemove: string): boolean {
        const index = this.labels.indexOf(labelToRemove);
        if (index === -1) {
            // Label already removed
            return false;
        } else {
            // Label must be removed
            this.labels.splice(index, 1);
            return true;
        }
    }

    async Apply(pullRequestNumber: number) {
        startGroup('Core/ApplyLabelState');

        logInfo(`Current State of Labels: ${JSON.stringify(this.existingLabels)}`);
        logInfo(`Target State of Labels: ${JSON.stringify(this.labels)}`);

        await GitHubClient.get().SetLabelsOnIssue(pullRequestNumber, this.labels);

        logInfo('Label state has been applied');

        endGroup();
    }
}
