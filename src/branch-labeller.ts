import { endGroup, logDebug, logInfo, startGroup } from "./core"
import { DesiredLabels } from "./desired-labels"
import { getPullRequestResponse } from "./github-client"
import { BranchLabels } from "./models/config"

type branchLabellerProps = {
    pullRequest: getPullRequestResponse,
    branchLabels: BranchLabels,
    desiredLabels: DesiredLabels
}

export async function processBranchLabeller({
    pullRequest,
    branchLabels,
    desiredLabels
}: branchLabellerProps) {
    startGroup('Branch Labeller');
    
    try {
        if (branchLabels.disable) {
            logInfo('Approval labeller is disabled in config. Skipping...');
        }

        const prBaseRef = pullRequest.base.ref;
        const prHeadRef = pullRequest.head.ref;

        logInfo(`Processing branch labeller (BaseRef=${prBaseRef}, HeadRef=${prHeadRef})`);

        for (const { baseRef, headRef, labelToApply } of branchLabels.rules) {
            const applies = checkIfApplies(prBaseRef, prHeadRef, baseRef, headRef);
            if (!applies) {
                logDebug(`Ignoring branch label ${labelToApply} rules not matched`);

                const removed = desiredLabels.remove(labelToApply);
                if (removed) {
                    logInfo(`Removing existing branch label ${labelToApply} as rules to not match current head/base refs`);
                }

                continue;
            }

            logInfo(`Adding branch label ${labelToApply} as rules matched current head/base refs`);
            desiredLabels.remove(labelToApply);
        }
    } finally {
        endGroup();
    }
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
