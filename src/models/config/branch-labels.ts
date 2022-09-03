export interface BranchLabelRules{
    baseRef: string;
    headRef?: string;
    labelToApply: string;
}

export interface BranchLabels {
    disable?: boolean;
    rules: BranchLabelRules[];
}