import { restoreCache as RestoreCache, saveCache as SaveCache } from '@actions/cache';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { EndGroup, GetPullRequestResponse, LogDebug, LogInfo, StartGroup } from '..';
import * as fs from 'fs';

const cachePath = '.pullrequest-automation.cache.yml'

export interface StateCache {
    firstRun: boolean;
    pullRequestNumber: number;
    baseRef: string;
    headRef: string;
    branchProtection?: { requiredApprovals: number };
}

export async function RestoreStateCache(pullRequest: GetPullRequestResponse) {
    StartGroup('Core/StateCache');

    try {
        const paths = [cachePath];
        const key = `pullrequest-automation-${pullRequest.number}`;

        const restoredKey = await RestoreCache(paths, key);
        if (restoredKey === key) {
            const fileContents = await fs.promises.readFile(cachePath, 'utf-8');
            const stateCache = parseYaml(fileContents) as StateCache;

            LogInfo(`Core/StateCache restored \n---\n${stringifyYaml(stateCache, null, 2)}\n---`);

            return stateCache;
        }

        LogInfo(`Core/StateCache not found, determining default values`);
        return {
            firstRun: true,
            pullRequestNumber: pullRequest.number,
            baseRef: pullRequest.base.ref,
            headRef: pullRequest.head.ref
        };
    } finally {
        EndGroup();
    }
}

export async function SaveStateCache(pullRequestNumber: number, stateCache: StateCache) {
    StartGroup('Core/StateCache');

    stateCache.firstRun = false;

    try {
        const stateCacheString = stringifyYaml(stateCache, null, 2);
        await fs.promises.writeFile(cachePath, stateCacheString, 'utf-8');

        const paths = [cachePath];
        const key = `pullrequest-automation-${pullRequestNumber}`;
        const cacheId = await SaveCache(paths, key);

        LogInfo(`Core/StateCache saved with CacheId ${cacheId}`);
    } finally {
        EndGroup();
    }
}

export function HasBaseOrHeadChanged(stateCache: StateCache, pullRequest: GetPullRequestResponse) {
    if (stateCache.baseRef !== pullRequest.base.ref) {
        LogDebug(`Core/StateCache baseRef is ${stateCache.baseRef} but PR is currently ${pullRequest.base.ref}`);
        return true;
    }

    if (stateCache.headRef !== pullRequest.head.ref) {
        LogDebug(`Core/StateCache headRef is ${stateCache.headRef} but PR is currently ${pullRequest.head.ref}`);
        return true;
    }

    return false;
}
