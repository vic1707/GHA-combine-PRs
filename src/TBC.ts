import { getMergeableState } from './branchUtils';
import { LOGGER } from './Logger';
import type { PRInfos, RestResponsePRs, SaveState, Setup } from './types';

export const parseTBCs = async ({
  settings: { BRANCH_PREFIX, filters },
  github,
  owner,
  repo
}: Setup): Promise<PRInfos[]> => {
  /* Get the list of PRs */
  const { data: pullsData } = await github.pulls.list({ owner, repo, state: 'open' });

  /* Filter PRs that aren't doesn't matcch the prefix and aren't drafted */
  let potentialsTBCs = pullsData
    .filter(({ head: { ref: branchName }, draft }) => !draft && branchName.startsWith(BRANCH_PREFIX))
    .sort((a, b) => a.number - b.number);

  /* Filter TBCs with the ignore label */
  if (filters['ignore-label']) potentialsTBCs = potentialsTBCs.filter(filterByLabel(filters['ignore-label']));

  return await addMergeableState(potentialsTBCs, { github, owner, repo });
};

const addMergeableState = async (
  TBCs: RestResponsePRs,
  { github, owner, repo }: KeyedOmit<Setup, 'settings'>
): Promise<PRInfos[]> =>
  await Promise.all(
    TBCs.map(async ({ head: { ref: branchName }, title, number: pull_number, base: { sha } }) => ({
      branchName,
      pull_number,
      sha,
      ...(await getMergeableState({ github, owner, repo }, pull_number)),
      title
    }))
  );

const filterByLabel =
  (label: string) =>
  ({ labels, title, number }: RestResponsePRs[number]): boolean => {
    const ignored = !labels.some(({ name }) => name === label);
    if (!ignored) LOGGER.TBCIgnored(number, title, `LABEL: ${label}`);
    return ignored;
  };

export const breakingChanges = (TBCs: PRInfos[], previousState: SaveState, { settings: { filters } }: Setup): boolean =>
  // we look for keys present in the previousState but not in the TBCs
  // if we find one, it means that the PR has been closed
  // therefore we need to set the `always-recreate` filter to true
  Object.entries(previousState)
    .filter(([_, { status }]) => status === 'success')
    .some(([key, { title, mergeable, mergeable_state, sha }]) => {
      const el = TBCs.find(({ pull_number }) => pull_number === /* is a string because parsing */ +key);
      if (!el && !filters['survive-delete']) {
        filters['always-recreate'] = true;
        LOGGER.TBCForceRecreatePRDeleted(key, title);
        return true;
      } else if (el && (el.mergeable !== mergeable || el.mergeable_state !== mergeable_state || el.sha !== sha)) {
        filters['always-recreate'] = true;
        LOGGER.TBCForceRecreatePRUpdated(key, title);
        return true;
      }
      return false;
    });

export const filterTBCs = (TBCs: PRInfos[], previousState: SaveState): PRInfos[] =>
  TBCs.filter(({ sha, mergeable, mergeable_state, pull_number, title }) => {
    const hasChanged =
      previousState[pull_number]?.sha !== sha ||
      previousState[pull_number]?.mergeable_state !== mergeable_state ||
      previousState[pull_number]?.mergeable !== mergeable;

    if (!hasChanged) LOGGER.TBCIgnored(pull_number, title, 'NOT BEEN UPDATED');
    return hasChanged;
  });

export const separateValidInvalidTBCs = (
  TBCsToCombine: PRInfos[],
  { settings: { filters } }: Setup
): [SaveState, PRInfos[]] =>
  TBCsToCombine.reduce<[SaveState, PRInfos[]]>(
    (acc, cur) => {
      if (filters['must-be-green'] && (!cur.mergeable || cur.mergeable_state !== 'clean')) {
        !cur.mergeable
          ? LOGGER.TBCIgnored(cur.pull_number, cur.title, 'NOT MERGEABLE')
          : LOGGER.TBCIgnored(cur.pull_number, cur.title, `STATUS: ${cur.mergeable_state.toUpperCase()}`);
        acc[0] = {
          ...acc[0],
          [cur.pull_number]: {
            mergeable: cur.mergeable,
            mergeable_state: cur.mergeable_state,
            sha: cur.sha,
            status: 'invalid',
            title: cur.title
          }
        };
      } else acc[1].push(cur);
      return acc;
    },
    [{}, []]
  );

export const mergeTBCs = async (
  TBCsToCombine: PRInfos[],
  { settings: { COMBINE_BRANCH_NAME }, github, owner, repo }: Setup
): Promise<SaveState> => {
  const res: SaveState = {};
  for (const TBC of TBCsToCombine) {
    try {
      await github.repos.merge({
        base: COMBINE_BRANCH_NAME,
        commit_message: `Merge branch '${TBC.title}' into ${COMBINE_BRANCH_NAME}`,
        head: TBC.branchName,
        owner,
        repo
      });
      LOGGER.TBCMergeSuccess(TBC.pull_number, TBC.title);
      res[TBC.pull_number] = {
        mergeable: TBC.mergeable,
        mergeable_state: TBC.mergeable_state,
        sha: TBC.sha,
        status: 'success',
        title: TBC.title
      };
    } catch (error) {
      if (error instanceof Error) {
        LOGGER.TBCMergeError(TBC.pull_number, TBC.title, error.message);
        // TODO: handle error
      } else {
        LOGGER.TBCMergeError(TBC.pull_number, TBC.title, 'unknown error');
        LOGGER.logError(error);
      }
      res[TBC.pull_number] = {
        mergeable: TBC.mergeable,
        mergeable_state: TBC.mergeable_state,
        sha: TBC.sha,
        status: 'merge-conflict',
        title: TBC.title
      };
    }
  }
  return res;
};
