import { MergeSafetyCommandConfig } from "./MergeSafety";
import { PromotePullRequestCommandConfig } from "./PromotePullRequest";

export interface CommandConfigs {
    mergeSafety?: MergeSafetyCommandConfig;
    promotePullRequest?: PromotePullRequestCommandConfig;
}
