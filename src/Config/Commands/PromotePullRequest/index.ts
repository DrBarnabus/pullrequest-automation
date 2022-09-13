import { BaseCommandConfig } from "../BaseCommandConfig";

export interface PromotePullRequestCommandConfig extends BaseCommandConfig {
    baseRef: string;
    headRef?: string;
    label?: string;
    asDraft?: boolean;
}
