import { logInfo, startGroup, endGroup, getInput } from './core';
import { parse as parseYaml } from 'yaml';
import { fetchContent, GitHubClient } from "./github-client";
import { Config } from './models/config';

export async function loadConfig(client: GitHubClient): Promise<Config> {
    startGroup('Load Config');

    try {
        const configPath = getInput('config-path', { required: true });
        logInfo(`Loading config from ${configPath}`);

        let configRef: string | undefined = getInput('config-ref');
        if (configRef === '') {
            configRef = undefined;
        }

        const configFileContents = await fetchContent(client, configPath, configRef);
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

export * from './models/config';
