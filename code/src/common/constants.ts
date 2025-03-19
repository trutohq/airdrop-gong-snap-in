export const CONSTANTS = {
  PHASES: {
    USERS: 'users',
  },

  PHASE_STATE: {
    COMPLETED: 'completed',
    NEXT_CURSOR: 'nextCursor',
    RATE_LIMITED: 'rateLimited',
    LAST_PROCESSED_ID: 'lastProcessedId',
    TOTAL_FETCHED: 'totalFetched',
    LAST_SUCCESSFUL_SYNC_STARTED: 'lastSuccessfulSyncStarted',
  },

  PROGRESS_COUNT: {
    HIGH: 100,
    MEDIUM: 50,
  },

  EXTRACTION_PROGRESS: {
    USERS: 50,
    COMPLETION: 100,
  },

  ENTITY_KEY: {
    USERS: 'users',
  },
  ERROR_CONTEXT_ENTITY_KEY: {
    USERS: 'users',
  },
} as const;

export const ERROR_MESSAGES = {
  USERS: {
    PROCESS_ERROR: 'Error processing users for site:',
  },

  EXTERNAL_SYNC_UNIT: {
    FAILED: 'Failed to extract external sync units',
    TIMEOUT: 'Failed to extract external sync units. Lambda timeout.',
  },
  DATA_EXTRACTION: {
    ERROR: 'Error while extracting data',
  },
  REPOSITORY: {
    NOT_FOUND_ERROR: (entityKey: string) => `Repository not found for ${entityKey}`,
    PUSH_ERROR: (errorContext: string) => `Error while pushing ${errorContext} data to repository`,
    PROCESS_ERROR: 'Error processing repositories',
  },
} as const;
