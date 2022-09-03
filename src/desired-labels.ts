export class DesiredLabels
{
    existingLabels: string[];
    labels: string[];

    constructor(existingLabels: string[]) {
        this.existingLabels = existingLabels;
        this.labels = [...existingLabels];
    }

    add(labelToAdd: string): boolean {
        const index = this.labels.indexOf(labelToAdd);
        if (index !== 1) {
            // Label already added
            return false;
        } else {
            // Label must be added
            this.labels.push(labelToAdd);
            return true;
        }
    }

    remove(labelToRemove: string): boolean {
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
}