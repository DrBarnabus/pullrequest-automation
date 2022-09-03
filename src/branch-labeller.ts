import { endGroup, logDebug, logInfo, startGroup } from "./core"
import { getPullRequestResponse } from "./github-client"
import { BranchLabels } from "./models/config"

type branchLabellerProps = {
    pullRequest: getPullRequestResponse,
    branchLabels: BranchLabels[],
    desiredLabels: string[]
}

export async function processBranchLabeller({
    pullRequest,
    branchLabels,
    desiredLabels
}: branchLabellerProps) {
    startGroup('Branch Labeller');
    
    const prBaseRef = pullRequest.base.ref;
    const prHeadRef = pullRequest.head.ref;

    logInfo(`Processing branch labeller (BaseRef=${prBaseRef}, HeadRef=${prHeadRef})`);

    for (const { baseRef, headRef, labelToApply } of branchLabels) {
        const applies = checkIfApplies(prBaseRef, prHeadRef, baseRef, headRef);
        if (!applies) {
            logDebug(`Ignoring branch label ${labelToApply} rules not matched`);

            removeLabelIfPresent(desiredLabels, labelToApply);
            continue;
        }

        logInfo(`Adding branch label ${labelToApply} as rules matched current head/base refs`);
        addLabelIfMissing(desiredLabels, labelToApply);
    }

    endGroup();
}

function checkIfApplies(prBaseRef: string, prHeadRef: string, baseRef: string, headRef?: string) {
    const baseRefExpression = new RegExp(`^${baseRef}$`);
    if (!baseRefExpression.test(prBaseRef)) {
        return false;
    }

    if (headRef) {
        const headRefExpression = new RegExp(`^${headRef}$`);
        if (!headRefExpression.test(prHeadRef)) {
            return false;
        }
    }

    return true;
}

function removeLabelIfPresent(labels: string[], labelToRemove: string): boolean {
    const index = labels.indexOf(labelToRemove);
    if (index === -1) {
        return false;
    } else {
        labels.splice(index, 1);
        return true;
    }
}

function addLabelIfMissing(labels: string[], labelToAdd: string): boolean {
    const index = labels.indexOf(labelToAdd);
    if (index !== -1) {
        return true;
    } else {
        labels.push(labelToAdd);
        return false;
    }
}