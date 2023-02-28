import type { RestEndpointMethods } from '@octokit/plugin-rest-endpoint-methods/dist-types/generated/method-types';
import type { RestEndpointMethodTypes } from '@octokit/plugin-rest-endpoint-methods/dist-types/generated/parameters-and-response-types';

export type RestResponsePRs = RestEndpointMethodTypes['pulls']['list']['response']['data'];

export interface Filters {
  'always-recreate': boolean;
  'ignore-label': string;
  'min-prs': number;
  'must-be-green': boolean;
  'survive-delete': boolean;
}

interface Settings {
  BRANCH_PREFIX: string;
  COMBINE_BRANCH_NAME: string;
  DRAFT: boolean;
  filters: Filters;
}

export interface Setup {
  github: RestEndpointMethods;
  owner: string;
  repo: string;
  settings: Settings;
}

export interface BranchInfos {
  branchName: string;
  sha: string;
}

export interface MergeableState {
  mergeable: boolean | null;
  mergeable_state: string;
}

export interface PRInfos extends BranchInfos, MergeableState {
  pull_number: number;
  title: string;
}

export type TBCsStatus = 'invalid' | 'merge-conflict' | 'success';

export type SaveState = Record<number, { sha: string; status: TBCsStatus; title: string } & MergeableState>;

export interface CombinePRInfos {
  body: string;
  pull_number: number;
  state: SaveState;
}
