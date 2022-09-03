import { FeatureConfig } from "./feature-config";

export interface LabelsToApply {
    approved: string;
    rejected: string;
    needsReview: string
}

export interface ApprovalLabels extends FeatureConfig {
    requiredApprovals: number;
    labelsToApply: LabelsToApply;
}
