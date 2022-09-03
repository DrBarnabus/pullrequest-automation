import { FeatureConfig } from "./feature-config";

export interface BranchLabelRules {
    baseRef: string;
    headRef?: string;
    labelToApply: string;
}

export interface BranchLabels extends FeatureConfig {
    rules: BranchLabelRules[];
}