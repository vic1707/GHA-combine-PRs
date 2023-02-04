import { buildBody, buildUpdateMessage } from './body';
import { LOGGER } from './Logger';
import type { BranchInfos, CombinePRInfos, SaveState, Setup } from './types';

export const createCombineBranch = async (
  { branchName: head, sha: mainSHA }: BranchInfos,
  { settings: { COMBINE_BRANCH_NAME }, github, owner, repo }: Setup
): Promise<void> => {
  // get all branches and check if the combine branch exists
  const { data: branchesData } = await github.repos.listBranches({ owner, repo });
  const combineBranch = branchesData.find(({ name }) => name === COMBINE_BRANCH_NAME);

  if (!combineBranch) {
    // if it doesn't exist, create it based on the main branch
    await github.git.createRef({ owner, ref: `refs/heads/${COMBINE_BRANCH_NAME}`, repo, sha: mainSHA });
    LOGGER.combineBranchCreated(COMBINE_BRANCH_NAME);
  } else if (combineBranch.commit.sha !== mainSHA) {
    // else we merge the main branch into the combine branch if necessary
    await github.repos.merge({ base: COMBINE_BRANCH_NAME, head, owner, repo });
    LOGGER.combineBranchUpdated(COMBINE_BRANCH_NAME);
  } else LOGGER.combineBranchNotUpdated(COMBINE_BRANCH_NAME);
};

export const manageCombinePR = async (
  { branchName: base }: BranchInfos,
  combinePRInfos: CombinePRInfos | null,
  currState: SaveState,
  { settings: { BRANCH_PREFIX, COMBINE_BRANCH_NAME, DRAFT }, github, owner, repo }: Setup
): Promise<void> => {
  if (!combinePRInfos) {
    // create the combine PR
    const {
      data: { number }
    } = await github.pulls.create({
      base,
      body: buildBody(currState),
      draft: DRAFT,
      head: COMBINE_BRANCH_NAME,
      owner,
      repo,
      title: `Combine '${BRANCH_PREFIX}' PRs`
    });
    LOGGER.combinePRCreated(number);
  } else {
    // we need to update the PR body with the new state of the PRs
    const {
      data: { number }
    } = await github.pulls.update({
      // we keep as much as possible from previous state because some parts were not updated
      body: buildBody({ ...combinePRInfos.state, ...currState }),
      owner,
      pull_number: combinePRInfos.pull_number,
      repo
    });
    LOGGER.combinePRUpdated(number);
    // we send a comment to the PR to notify the user that the PR has been updated
    await github.issues.createComment({
      body: buildUpdateMessage(currState),
      issue_number: combinePRInfos.pull_number,
      owner,
      repo
    });
    LOGGER.combinePRCommented(combinePRInfos.pull_number);
  }
};
