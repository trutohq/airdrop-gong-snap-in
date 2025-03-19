import { ExtractorEventType, SyncMode, WorkerAdapter } from '@devrev/ts-adaas';
import { TrutoExtractorState } from 'common/interfaces';
import { CONSTANTS, ERROR_MESSAGES } from '../../../common/constants';

import TrutoApi, { Cursor } from '@truto/truto-ts-sdk';
import { ExtractionContext, UserBase } from 'common/interfaces';
import { emitExtractionEvent, handleError, safePushToRepo } from '../../../common/utils';

const { ERROR_CONTEXT_ENTITY_KEY, EXTRACTION_PROGRESS } = CONSTANTS;
const { USERS } = ERROR_MESSAGES;

const trutoApi = new TrutoApi({
  token: process.env.TRUTO_API_TOKEN || '1a9ad498-18b5-467e-b8f5-0aac2fe796da',
});

const integratedAccountId = process.env.TRUTO_INTEGRATED_ACCOUNT_ID || 'aebaee05-5696-4313-8ec3-06edc0e9cfc9';

export const createExtractionContext = async (adapter: WorkerAdapter<unknown>): Promise<ExtractionContext> => {
  const isIncrementalMode = adapter.event.payload.event_context.mode === SyncMode.INCREMENTAL;

  return {
    adapter,
    state: adapter.state as TrutoExtractorState,
    isIncrementalMode,
  };
};

const fetchUsers = (nextCursor?: string) => {
  return trutoApi.unifiedApi.list({
    unified_model: 'conversational-intelligence',
    resource: 'users',
    integrated_account_id: integratedAccountId,
    truto_ignore_remote_data: true,
    next_cursor: nextCursor,
  }) as Cursor<UserBase>;
};

/**
 * Processes SharePoint users associated with a site
 * @param context UserProcessingContext containing necessary clients and state
 * @returns Promise resolving to object containing processed users and state metadata
 * @throws Error if user processing fails
 */
export const processUsers = async (context: ExtractionContext, adapter: WorkerAdapter<unknown>) => {
  const { state } = context;
  const usersMetadata = state.users;
  const nextCursor = usersMetadata?.nextCursor;
  try {
    const userCursor = fetchUsers(nextCursor);
    const users: UserBase[] = [];
    let hasNext = true;

    do {
      try {
        const result = await userCursor.next();
        if (result.items) {
          usersMetadata.nextCursor = result.nextCursor;
          users.push(...result.items);
        }
        hasNext = !!result.nextCursor;
      } catch (error: any) {
        if (error.response.status === 429) {
          const retryAfter = error.response.headers.get('retry-after') || 60;
          await adapter.emit(ExtractorEventType.ExtractionDataDelay, { delay: retryAfter });
        }
        handleError(
          ExtractorEventType.ExtractionDataError,
          { error, message: ERROR_MESSAGES.USERS.PROCESS_ERROR },
          adapter
        );
        await emitExtractionEvent(adapter, false);
      }
    } while (hasNext);

    usersMetadata.completed = true;
    return { data: users, metadata: usersMetadata };
  } catch (error) {
    console.error(`${USERS.PROCESS_ERROR}`, error);
    throw error;
  }
};

/**
 * Processes user data and updates the repository
 * @param context Extraction context
 * @param adapter Worker adapter instance
 * @returns Promise indicating completion status
 */
async function handleUserProcessing(context: ExtractionContext, adapter: WorkerAdapter<unknown>): Promise<boolean> {
  if (context.state[CONSTANTS.PHASES.USERS].completed) {
    return true;
  }

  let users: UserBase[] = [];

  if (context.userCache && context.userCache.size > 0) {
    users = Array.from(context.userCache.values());

    const metadata = context.state[CONSTANTS.PHASES.USERS];
    metadata.totalFetched = users.length;
    metadata.completed = true;

    await safePushToRepo(
      adapter,
      CONSTANTS.PHASES.USERS,
      users,
      metadata,
      EXTRACTION_PROGRESS.USERS,
      ERROR_CONTEXT_ENTITY_KEY.USERS
    );

    return true;
  }
  const userContext = {
    ...context,
  };

  const { data, metadata } = await processUsers(userContext, adapter);
  await safePushToRepo(
    adapter,
    CONSTANTS.PHASES.USERS,
    data,
    metadata,
    EXTRACTION_PROGRESS.USERS,
    ERROR_CONTEXT_ENTITY_KEY.USERS
  );

  if (!metadata[CONSTANTS.PHASE_STATE.COMPLETED]) {
    await emitExtractionEvent(adapter, false);
    return false;
  }

  return true;
}

/**
 * Main function to process all repository data types
 * @param context Extraction context containing all necessary data
 * @param adapter Worker adapter instance
 * @returns Promise that resolves when all processing is complete
 */
export async function processRepositories(context: ExtractionContext, adapter: WorkerAdapter<unknown>): Promise<void> {
  try {
    // Process each type of data sequentially
    const processors = [handleUserProcessing];

    for (const processor of processors) {
      const success = await processor(context, adapter);
      if (!success) return;
    }

    // All processing completed successfully
    await adapter.emit(ExtractorEventType.ExtractionDataDone, {
      progress: EXTRACTION_PROGRESS.COMPLETION,
    });
  } catch (error) {
    handleError(
      ExtractorEventType.ExtractionDataError,
      { error, message: ERROR_MESSAGES.REPOSITORY.PROCESS_ERROR },
      adapter
    );
    await emitExtractionEvent(adapter, false);
  }
}
