import { ApprovalLabels } from "./approval-labels";
import { BranchLabels } from "./branch-labels";
import { FeatureConfig } from "./feature-config";
import { MergeSafety } from "./merge-safety";
import { ReviewerExpander } from "./reviewer-expander";

interface Commands {
    mergeSafety: MergeSafety;
}

interface Config {
    approvalLabels: ApprovalLabels;
    branchLabels: BranchLabels;
    reviewerExpander: ReviewerExpander;
    commands: Commands;
}

export {
    Config,
    Commands,
    ApprovalLabels,
    BranchLabels,
    ReviewerExpander,
    MergeSafety,
    FeatureConfig
}