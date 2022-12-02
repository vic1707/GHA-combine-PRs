import type { SaveState } from './types';

export const buildBody = (saveState: SaveState): string => {
  const [successBodies, failedBodies, invalidBodies] = Object.entries(saveState).reduce<[string[], string[], string[]]>(
    (acc, [pull_number, { mergeable, mergeable_state, status, title }]) => {
      if (status === 'success') acc[0].push(`#${pull_number} - ${title}`);
      else if (status === 'merge-conflict') acc[1].push(`#${pull_number} - ${title}`);
      else
        acc[2].push(
          mergeable
            ? `#${pull_number} - status: ${mergeable_state} - ${title}`
            : `#${pull_number} - not mergeable - ${title}`
        );
      return acc;
    },
    [[], [], []]
  );

  let PRbody = `✅ This PR was created by combining the following PRs:\n${successBodies.join('\n')}\n\n`;
  if (failedBodies.length) PRbody += `⚠️ The following PRs failed due to conflicts:\n${failedBodies.join('\n')}\n\n`;
  if (invalidBodies.length) PRbody += `❌ The following PRs are not in a valid state:\n${invalidBodies.join('\n')}\n\n`;

  PRbody += `<details><summary>PRs state (do not edit, it's used for future updates)</summary>\n\n\`\`\`json\n${JSON.stringify(
    saveState
  )}\n\`\`\`\n</details>\n`;

  PRbody += `🚨 This was last updated on ${new Date().toLocaleString()}`;
  return PRbody;
};

export const buildUpdateMessage = (TBCsStates: SaveState): string =>
  Object.entries(TBCsStates)
    // sort by status; this is disgusting
    .sort(([_A, { status: statusA }], [_B, { status: statusB }]) => {
      if (statusA === statusB) return 0;
      if (statusA === 'success') return -1;
      if (statusB === 'success') return 1;
      if (statusA === 'merge-conflict') return -1;
      if (statusB === 'merge-conflict') return 1;
      return 0;
    })
    .map(([pull_number, { title, status }]) => {
      if (status === 'success') return `✅ #${pull_number} - ${title} - was just merged`;
      if (status === 'merge-conflict') return `⚠️ #${pull_number} - ${title} - has conflicts`;
      return `❌ #${pull_number} - ${title} - is not in a valid state`;
    })
    .join('\n');

export const parseBody = (body: string): SaveState | Error => {
  // extract the text between '</summary>\n\n```json\n' and '\n```\n\n</details>'
  const state = body.match(/(?<=<\/summary>\n\n```json\n)(.*)(?=\n```\n<\/details>)/);
  const res = state?.at(1);
  if (!res) return Error('Could not parse the body of the PR');
  return JSON.parse(res) as SaveState;
};
