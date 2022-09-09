import { BaseCommandConfig } from "../BaseCommandConfig";
import { BranchToProtect } from "./BranchToProtect";

export interface MergeSafetyCommandConfig extends BaseCommandConfig {
    branchesToProtect: BranchToProtect[];
}
