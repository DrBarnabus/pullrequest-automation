import { BaseModuleConfig } from "../BaseModuleConfig";
import { LabelsToApply } from "./LabelsToApply";

export interface ApprovalLabellerModuleConfig extends BaseModuleConfig {
    requiredApprovals: number;
    labelsToApply: LabelsToApply;
}
