import { getBooleanInput, getInput } from '@actions/core';
import { context, getOctokit } from '@actions/github';

import type { Filters, Setup } from './types';

export const parseInput = (): Setup => {
  /* Inputs */
  const TOKEN = getInput('github-token', { required: true });
  const COMBINE_BRANCH_NAME = getInput('combine-branch-name', { required: false, trimWhitespace: true });
  const BRANCH_PREFIX = getInput('branch-prefix', { required: false, trimWhitespace: true });
  const DRAFT = getBooleanInput('draft', { required: false, trimWhitespace: true });

  /* Filters */
  const filters: Filters = {
    'always-recreate': getBooleanInput('always-recreate', { required: false, trimWhitespace: true }),
    'ignore-label': getInput('ignore-label', { required: false, trimWhitespace: true }),
    'must-be-green': getBooleanInput('must-be-green', { required: false, trimWhitespace: true }),
    'survive-delete': getBooleanInput('survive-delete', { required: false, trimWhitespace: true })
  };

  /* Octokit */
  const github = getOctokit(TOKEN).rest;
  return { github, ...context.repo, settings: { BRANCH_PREFIX, COMBINE_BRANCH_NAME, DRAFT, filters } };
};
