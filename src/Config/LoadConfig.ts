import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { EndGroup, GetInput, GitHubClient, LogInfo, StartGroup } from '../Core';
import { Config } from './Config';

export async function LoadConfig(): Promise<Config> {
  StartGroup('Core/LoadConfig');

  try {
    const configPath = GetInput('config-path', { required: true });

    let configRef: string | undefined = GetInput('config-ref');
    if (configRef === '') {
      configRef = undefined;
      LogInfo(`Loading config from ${configPath} in current branch`);
    } else {
      LogInfo(`Loading config from ${configPath} in ${configRef}`);
    }

    const configFileContents = await GitHubClient.get().FetchContent(configPath, configRef);
    if (configFileContents === null) {
      throw new Error(`Unable to load config from ${configPath}`);
    }

    const config = parseYaml(configFileContents) as Config;
    LogInfo(`Loaded config from ${configPath}\n---\n${stringifyYaml(config, null, 2)}\n---`);

    return config;
  } finally {
    EndGroup();
  }
}
