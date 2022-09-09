import { ApprovalLabellerModuleConfig } from "./ApprovalLabeller";
import { BranchLabellerModuleConfig } from "./BranchLabeller";
import { ReviewerExpanderModuleConfig } from "./ReviewerExpander";

export interface ModuleConfigs {
    approvalLabeller?: ApprovalLabellerModuleConfig;
    branchLabeller?: BranchLabellerModuleConfig;
    reviewerExpander?: ReviewerExpanderModuleConfig;
}
