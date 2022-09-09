import { parse as parseYaml } from "yaml";
import { endGroup, getInput, logInfo, startGroup, GitHubClient } from "../Core";
import { Config } from "./Config";

export async function LoadConfig(): Promise<Config> {
    startGroup('Core/LoadConfig');

    try {
        const configPath = getInput('config-path', { required: true });

        let configRef: string | undefined = getInput('config-ref');
        if (configRef === '') {
            configRef = undefined;
            logInfo(`Loading config from ${configPath} in current branch`);
        } else {
            logInfo(`Loading config from ${configPath} in ${configRef}`);
        }

        const configFileContents = await GitHubClient.get().FetchContent(configPath, configRef);
        if (configFileContents === null) {
            throw new Error(`Unable to load config from ${configPath}`);
        }

        const config = parseYaml(configFileContents) as Config;
        logInfo(`Loaded config from ${configPath}\n${JSON.stringify(config)}`);

        return config;
    } finally {
        endGroup();
    }
}