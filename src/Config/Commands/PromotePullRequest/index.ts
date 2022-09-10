import { BaseCommandConfig } from "../BaseCommandConfig";

export interface PromotePullRequestCommandConfig extends BaseCommandConfig {
    baseRef: string;
    headRef?: string;
    asDraft?: boolean;
}
