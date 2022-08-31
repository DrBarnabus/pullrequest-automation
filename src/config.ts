import { info as logInfo, debug as logDebug } from '@actions/core';
import { parse as parseYaml } from 'yaml';
import { fetchContent, GitHubClient } from "./github-client";
import { Config } from './models/config';

export async function loadConfig(client: GitHubClient, configPath: string): Promise<Config> {
    logInfo(`Loading config from ${configPath}`);
    const configFileContents = await fetchContent(client, configPath);
    if (configFileContents === null) {
        throw new Error(`Unable to load config from ${configPath}`);
    }

    const config = parseYaml(configFileContents) as Config;
    logDebug(`Loaded config from ${configPath}\n${JSON.stringify(config)}`);

    return config;
}

export {
    Config
}