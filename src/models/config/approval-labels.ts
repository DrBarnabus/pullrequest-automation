export interface LabelsToApply {
    approved: string;
    rejected: string;
    needsReview: string
}

export interface ApprovalLabels {
    requiredApprovals: number;
    labelsToApply: LabelsToApply;
}
