import { BranchLabellerModuleConfig } from "../Config"
import { endGroup, GetPullRequestResponse, logDebug, logError, logInfo, startGroup } from "../Core"
import { LabelState } from "../Core/LabelState"

export async function ProcessBranchLabeller(config: BranchLabellerModuleConfig | undefined, pullRequest: GetPullRequestResponse, labelState: LabelState) {
    startGroup('Modules/BranchLabeller');
    
    try {
        if (!config?.enabled) {
            logInfo(`Modules/BranchLabeller is not enabled. skipping...`);
            return;
        }

        const { rules } = ValidateAndExtractConfig(config);

        const prBaseRef = pullRequest.base.ref;
        const prHeadRef = pullRequest.head.ref;

        logInfo(`PrBaseRef: ${prBaseRef}, PrHeadRef: ${prHeadRef}, RulesToProcess: ${rules.length}`);

        for (const { baseRef, headRef, labelToApply } of rules) {
            const applies = CheckIfApplies(prBaseRef, prHeadRef, baseRef, headRef);
            if (!applies) {
                logDebug(`Ignoring branch label ${labelToApply} rules not matched`);

                const removed = labelState.Remove(labelToApply);
                if (removed) {
                    logInfo(`Removing existing branch label ${labelToApply} as rules to not match current head/base refs`);
                }

                continue;
            }

            logInfo(`Adding branch label ${labelToApply} as rules matched current head/base refs`);
            labelState.Add(labelToApply);
        }
    } finally {
        endGroup();
    }
}

function CheckIfApplies(prBaseRef: string, prHeadRef: string, baseRef: string, headRef?: string) {
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

function ValidateAndExtractConfig(config: BranchLabellerModuleConfig) {
    let isValid = false;

    if (!config.rules || config.rules.length == 0) {
        logError(`Config Validation failed modules.branchLabeller.rules, at least one rule must be supplied`);
        isValid = false;
    }

    const rules = config.rules
    for (let i = 0; i < rules.length; i++) {
        const rule = rules[i];

        if (!rule.baseRef) {
            logError(`Config Validation failed modules.branchLabeller.rules[${i}].baseRef, must be supplied`);
            isValid = false;
        }

        if (rule.headRef && rule.baseRef == rule.headRef) {
            logError(`Config Validation failed modules.branchLabeller.rules[${i}].headRef, if supplied must not match baseRef`);
            isValid = false;
        }

        if (!rule.labelToApply) {
            logError(`Config Validation failed modules.branchLabeller.rules[${i}].labelToApply, must not be supplied`);
            isValid = false;
        }
    }

    if (!isValid) {
        throw new Error('modules.branchLabeller config failed validation');
    }

    return { rules };
}
