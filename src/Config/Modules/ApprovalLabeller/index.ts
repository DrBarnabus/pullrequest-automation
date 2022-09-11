import { BaseModuleConfig } from "../BaseModuleConfig";
import { LabelsToApply } from "./LabelsToApply";

export interface RequiredApprovals {
    baseRef: string;
    requiredApprovals: number;
}

export interface ApprovalLabellerModuleConfig extends BaseModuleConfig {
    requiredApprovals: RequiredApprovals[] | number;
    labelsToApply: LabelsToApply;
}
