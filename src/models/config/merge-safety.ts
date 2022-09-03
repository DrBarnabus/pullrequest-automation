import { FeatureConfig } from "./feature-config";

export interface BranchToProtect {
    baseRef: string;
    comparisonBaseRef: string;
    comparisonHeadRef: string;
}

export interface MergeSafety extends FeatureConfig {
    triggers: string | string[];
    branchesToProtect: BranchToProtect[];
}