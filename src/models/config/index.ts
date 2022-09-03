import { ApprovalLabels } from "./approval-labels";
import { BranchLabels } from "./branch-labels";
import { FeatureConfig } from "./feature-config";

interface Config {
    approvalLabels: ApprovalLabels;
    branchLabels: BranchLabels;
}

export {
    Config,
    ApprovalLabels,
    BranchLabels,
    FeatureConfig
}