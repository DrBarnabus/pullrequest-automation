import { ApprovalLabels } from "./approval-labels";
import { BranchLabels } from "./branch-labels";

interface Config {
    approvalLabels: ApprovalLabels;
    branchLabels: BranchLabels;
}

export {
    Config,
    ApprovalLabels,
    BranchLabels
}