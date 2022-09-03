export interface LabelsToApply {
    approved: string;
    rejected: string;
    needsReview: string
}

export interface ApprovalLabels {
    disable?: boolean;
    requiredApprovals: number;
    labelsToApply: LabelsToApply;
}
