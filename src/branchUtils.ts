import { parseBody } from './body';
import { LOGGER } from './Logger';
import type { BranchInfos, CombinePRInfos, MergeableState, Setup } from './types';

export const getMergeableState = async (
  { github, owner, repo }: KeyedOmit<Setup, 'settings'>,
  pull_number: number
): Promise<MergeableState> => {
  const {
    data: { mergeable, mergeable_state }
  } = await github.pulls.get({
    owner,
    pull_number,
    repo
  });
  return { mergeable, mergeable_state };
};

export const getMainInfos = async ({ github, owner, repo }: Setup): Promise<BranchInfos> => {
  const {
    data: { default_branch: branchName }
  } = await github.repos.get({ owner, repo });
  const {
    data: {
      object: { sha }
    }
  } = await github.git.getRef({ owner, ref: `heads/${branchName}`, repo });
  return { branchName, sha };
};

export const getCombinePRInfos = async ({
  github,
  owner,
  repo,
  settings: { COMBINE_BRANCH_NAME, filters }
}: Setup): Promise<CombinePRInfos | null> => {
  const { data: pullsData } = await github.pulls.list({ owner, repo, state: 'open' });
  const combinePR = pullsData.find(({ head: { ref } }) => ref === COMBINE_BRANCH_NAME);
  if (combinePR?.body) {
    const state = parseBody(combinePR.body);
    if (state instanceof Error) {
      filters['always-recreate'] = true;
      LOGGER.forceRecreateError('parsing failed');
      return null;
    } else
      return {
        body: combinePR.body,
        pull_number: combinePR.number,
        state
      };
  }
  return null;
};
