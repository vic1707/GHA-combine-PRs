type Action = 'PARSING' | 'MERGING' | 'COMBINE' | 'COMMENT';
// we create methods for each log and make sure that the logs look the same
class Logger {
  public readonly logError = console.error;
  private readonly log = console.log;

  public readonly TBCForceRecreatePRDeleted = (pull_number: number, title: string): void =>
    this.logAction('PARSING', pull_number)(`[FORCE RECREATE] ${title} (✅ PR deleted)`);

  public readonly TBCForceRecreatePRUpdated = (pull_number: number, title: string): void =>
    this.logAction('PARSING', pull_number)(`[FORCE RECREATE] ${title} (✅ PR updated)`);

  public readonly TBCIgnored = (pull_number: number, title: string, reason: string): void =>
    this.logAction('PARSING', pull_number)(`[IGNORED] [${reason}] ${title}`);

  public readonly TBCMergeError = (pull_number: number, title: string, err: string): void =>
    this.logAction('MERGING', pull_number)(`[${err}] ${title}`);

  public readonly TBCMergeSuccess = (pull_number: number, title: string): void =>
    this.logAction('MERGING', pull_number)(`[SUCCESS] ${title}`);

  public readonly combineBranchCreated = (name: string): void => this.logAction('COMBINE')(`[BRANCH CREATED] ${name}`);
  public readonly combineBranchDeleted = (name: string): void => this.logAction('COMBINE')(`[BRANCH DELETED] ${name}`);

  public readonly combineBranchNotUpdated = (name: string): void =>
    this.logAction('COMBINE')(`[BRANCH NOT UPDATED] ${name}`);

  public readonly combineBranchUpdated = (name: string): void => this.logAction('COMBINE')(`[BRANCH UPDATED] ${name}`);

  public readonly combinePRCommented = (pull_number: number): void =>
    this.logAction('COMMENT', pull_number)('[COMMENTED]');

  public readonly combinePRCreated = (pull_number: number): void =>
    this.logAction('COMBINE', pull_number)('[PR CREATED]');

  public readonly combinePRNothing = (pull_number: number): void =>
    this.logAction('COMBINE', pull_number)('[NOTHING TO DO]');

  public readonly combinePRUpdated = (pull_number: number): void =>
    this.logAction('COMBINE', pull_number)('[PR UPDATED]');

  public readonly forceRecreateError = (reason: string): void =>
    this.logAction('PARSING')(`[FORCE RECREATE ERROR] ${reason}`);

  public readonly section = (message: string): void => this.log(`🤖 ${message} 🤖`);

  private readonly logAction =
    (action: Action, pull_number?: number) =>
    (message: string): void =>
      this.log(this.prefix(action, pull_number), message);

  private readonly prefix = (action: Action, pull_number?: number): string =>
    `[${action}] ${pull_number ? `[#${pull_number}]`.padStart(7) : ''}`;
}

export const LOGGER = new Logger();
