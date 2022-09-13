import { BranchLabellerModuleConfig } from "../Config"
import { EndGroup, GetPullRequestResponse, LogDebug, LogError, LogInfo, StartGroup } from "../Core"
import { LabelState } from "../Core/LabelState"
import { HasBaseOrHeadChanged, StateCache } from "../Core/StateCache";

export async function ProcessBranchLabeller(
    config: BranchLabellerModuleConfig | undefined,
    pullRequest: GetPullRequestResponse,
    labelState: LabelState,
    stateCache: StateCache) {
    StartGroup('Modules/BranchLabeller');

    try {
        if (!config?.enabled) {
            LogInfo(`Modules/BranchLabeller is not enabled. skipping...`);
            return;
        }

        if (!stateCache.firstRun && !HasBaseOrHeadChanged(stateCache, pullRequest)) {
            LogInfo(`Modules/BranchLabeller not first run and base/head has not changed. skipping...`);
            return;
        }

        const { rules } = ValidateAndExtractConfig(config);

        const prBaseRef = pullRequest.base.ref;
        const prHeadRef = pullRequest.head.ref;

        LogInfo(`PrBaseRef: ${prBaseRef}, PrHeadRef: ${prHeadRef}, RulesToProcess: ${rules.length}`);

        for (const { baseRef, headRef, labelToApply } of rules) {
            const applies = CheckIfApplies(prBaseRef, prHeadRef, baseRef, headRef);
            if (!applies) {
                LogDebug(`Ignoring branch label ${labelToApply} rules not matched`);

                const removed = labelState.Remove(labelToApply);
                if (removed) {
                    LogInfo(`Removing existing branch label ${labelToApply} as rules to not match current head/base refs`);
                }

                continue;
            }

            LogInfo(`Adding branch label ${labelToApply} as rules matched current head/base refs`);
            labelState.Add(labelToApply);
        }
    } finally {
        EndGroup();
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
    let isValid = true;

    if (!config.rules || config.rules.length == 0) {
        LogError(`Config Validation failed modules.branchLabeller.rules, at least one rule must be supplied`);
        isValid = false;
    }

    const rules = config.rules
    for (let i = 0; i < rules.length; i++) {
        const rule = rules[i];

        if (!rule.baseRef) {
            LogError(`Config Validation failed modules.branchLabeller.rules[${i}].baseRef, must be supplied`);
            isValid = false;
        }

        if (rule.headRef && rule.baseRef == rule.headRef) {
            LogError(`Config Validation failed modules.branchLabeller.rules[${i}].headRef, if supplied must not match baseRef`);
            isValid = false;
        }

        if (!rule.labelToApply) {
            LogError(`Config Validation failed modules.branchLabeller.rules[${i}].labelToApply, must not be supplied`);
            isValid = false;
        }
    }

    if (!isValid) {
        throw new Error('modules.branchLabeller config failed validation');
    }

    return { rules };
}
