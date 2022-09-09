import { CommandConfigs } from "./Commands/CommandConfigs";
import { ModuleConfigs } from "./Modules/ModuleConfigs";

export interface Config {
    modules?: ModuleConfigs;
    commands?: CommandConfigs;
}
