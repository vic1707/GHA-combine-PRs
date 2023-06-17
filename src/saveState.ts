import type { PRInfos, SaveState } from './types';

export const removeKnownState = (newState: SaveState, oldState: SaveState): SaveState =>
  Object.entries(newState).reduce<SaveState>((acc, [key, value]) => {
    const old = oldState[key];
    // the next line is not perfect and could false positive if the keys are not in the same order
    if (old && Object.entries(old).toString() === Object.entries(value).toString()) return acc;
    acc[key] = value;
    return acc;
  }, {});

export const removeOutDatedNonBreakingChanges = (state: SaveState, TBCs: PRInfos[]): SaveState =>
  // this is disgusting but I don't know how to do it better
  Object.fromEntries(
    Object.entries(state).filter(([pull_number, { status }]) => {
      const outdated =
        status !== 'success' && !TBCs.find((tbc) => tbc.pull_number === /* is a string because parsing */ +pull_number);
      if (outdated) console.log(`PR #${pull_number} is outdated and will be removed from the state.`);
      return !outdated;
    })
  );
