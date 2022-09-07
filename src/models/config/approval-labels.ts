import { FeatureConfig } from "./feature-config";

export interface LabelsToApply {
    approved: string;
    rejected: string;
    needsReview: string
    draft?: string;
}

export interface ApprovalLabels extends FeatureConfig {
    requiredApprovals: number;
    labelsToApply: LabelsToApply;
}
