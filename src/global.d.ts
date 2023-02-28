export declare global {
  // this version provides autocomplete for the ommited properties
  type KeyedOmit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

  interface ObjectConstructor {
    entries<T extends Record<string, unknown>, K extends keyof T>(o: T): [keyof T, T[K]][];
    keys<T extends Record<string, unknown>>(o: T): (keyof T)[];
    values<T extends Record<string, unknown>, K extends keyof T>(o: T): T[K][];
  }

  // env declaration
  namespace NodeJS {
    interface ProcessEnv {
      BRANCH_PREFIX: string;
      COMBINE_BRANCH_NAME: string;
      DRAFT: string; // technically a boolean but dotenv parses it as a string
      MIN_PRS: string; // technically a number but dotenv parses it as a string
      TOKEN: string;
      filter_always_recreate: string; // technically a boolean but dotenv parses it as a string
      filter_ignore_label: string;
      filter_must_be_green: string; // technically a boolean but dotenv parses it as a string
      filter_survive_delete: string; // technically a boolean but dotenv parses it as a string
      owner: string;
      repo: string;
    }
  }
}
