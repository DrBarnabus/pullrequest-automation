import { ApprovalLabels } from "./approval-labels";
import { BranchLabels } from "./branch-labels";
import { FeatureConfig } from "./feature-config";
import { MergeSafety } from "./merge-safety";

interface Commands {
    mergeSafety: MergeSafety;
}

interface Config {
    approvalLabels: ApprovalLabels;
    branchLabels: BranchLabels;
    commands: Commands;
}

export {
    Config,
    Commands,
    ApprovalLabels,
    BranchLabels,
    MergeSafety,
    FeatureConfig
}