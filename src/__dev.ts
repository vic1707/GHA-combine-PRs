import { GitHub } from '@actions/github/lib/utils';
import { config as ENVconfig } from 'dotenv';

import { run } from './run';
import type { Setup } from './types';

ENVconfig({ path: `${__dirname}/../.env` });

const dotEnvParseBoolean = (value: string): boolean => value === 'true' || value === '1';

/* For testing */
export const parseInput = (): Setup => ({
  github: new (GitHub.plugin())({ auth: process.env.TOKEN }).rest,
  owner: process.env.owner,
  repo: process.env.repo,
  settings: {
    BRANCH_PREFIX: process.env.BRANCH_PREFIX || 'dependabot/',
    COMBINE_BRANCH_NAME: process.env.COMBINE_BRANCH_NAME || 'combine-PRs',
    filters: {
      'always-recreate': dotEnvParseBoolean(process.env.filter_always_recreate || 'false'),
      'ignore-label': process.env.filter_ignore_label || 'nocombine',
      'must-be-green': dotEnvParseBoolean(process.env.filter_must_be_green || 'true'),
      'survive-delete': dotEnvParseBoolean(process.env.filter_survive_delete || 'false')
    }
  }
});

run(parseInput()).catch(console.log);
