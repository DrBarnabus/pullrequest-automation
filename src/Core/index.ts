import { debug, info, warning, error, getInput, setFailed, startGroup, endGroup } from '@actions/core';

export {
  debug as LogDebug,
  info as LogInfo,
  warning as LogWarning,
  error as LogError,
  setFailed as SetFailed,
  startGroup as StartGroup,
  endGroup as EndGroup,
  getInput as GetInput,
};

export * from './GitHubClient';
export * from './LabelState';
