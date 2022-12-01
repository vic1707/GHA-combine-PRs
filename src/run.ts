import { setFailed } from '@actions/core';

import { getCombinePRInfos, getMainInfos } from './branchUtils';
import { createCombineBranch, manageCombinePR } from './combineBranch';
import { LOGGER } from './Logger';
import { removeKnownState, removeOutDatedNonBreakingChanges } from './saveState';
import { breakingChanges, filterTBCs, mergeTBCs, parseTBCs, separateValidInvalidTBCs } from './TBC';
import type { Setup } from './types';

export const run = async (s: Setup): Promise<void> => {
  const mainInfos = await getMainInfos(s);
  // combinePRInfos is null if the PR of the combine branch doesn't exist
  let combinePRInfos = await getCombinePRInfos(s);

  LOGGER.section('PARSING PRs');
  let TBCs = await parseTBCs(s);

  if (combinePRInfos?.state && !breakingChanges(TBCs, combinePRInfos.state, s)) {
    combinePRInfos.state = removeOutDatedNonBreakingChanges(combinePRInfos.state, TBCs);
    TBCs = filterTBCs(TBCs, combinePRInfos.state);
  }

  // invalidTBCs hold PRs that are not mergeable or have a status that is not clean
  // validTBCs hold PRs that are mergeable and have a clean status
  // PRs not matching the other criteria are ignored
  const [invalidTBCs, validTBCs] = separateValidInvalidTBCs(TBCs, s);

  LOGGER.section('MANGAGING COMBINE BRANCH');

  if (s.settings.filters['always-recreate'] && combinePRInfos) {
    // delete the combine PR if it exists and the option is enabled
    // doing it here to avoid keeping a potentially open PR if there is no valid TBC
    await s.github.git.deleteRef({ owner: s.owner, ref: `heads/${s.settings.COMBINE_BRANCH_NAME}`, repo: s.repo });
    LOGGER.combineBranchDeleted(s.settings.COMBINE_BRANCH_NAME);
    combinePRInfos = null;
  }

  // should be `setNeutral` when it will be available
  if (!validTBCs.length) return setFailed('No valid PRs found. Please check your filters and try again.');

  await createCombineBranch(mainInfos, s);

  LOGGER.section('MERGING TBCs');
  const currState = await mergeTBCs(validTBCs, s);

  const stateToNotify = removeKnownState({ ...invalidTBCs, ...currState }, combinePRInfos?.state ?? {});

  // should be `setNeutral` when it will be available
  if (!Object.keys(stateToNotify).length) return setFailed('No new PRs to notify.');

  LOGGER.section('NOTIFYING COMBINE PR');
  await manageCombinePR(mainInfos, combinePRInfos, stateToNotify, s);
};
