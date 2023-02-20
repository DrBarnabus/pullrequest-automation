import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { EndGroup, GetInput, GitHubClient, LogInfo, StartGroup } from '../Core';
import { Config, ConfigSchema } from './ConfigSchema';

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

    return ParseAndValidateConfig(configPath, configFileContents);
  } finally {
    EndGroup();
  }
}

export async function ParseAndValidateConfig(configPath: string, configFileContents: string): Promise<Config> {
  const config = parseYaml(configFileContents) as unknown;
  LogInfo(`Loaded config from ${configPath}\n---\n${stringifyYaml(config, null, 2)}\n---`);

  return await ConfigSchema.parseAsync(config);
}
