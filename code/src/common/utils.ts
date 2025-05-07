import { ExtractorEventType, WorkerAdapter } from '@devrev/ts-adaas';
import { CONSTANTS, ERROR_MESSAGES } from './constants';
import { EntityData, ExtractionPhaseState, PushConfig, TrutoExtractorState } from './interfaces';

const { PROGRESS_COUNT, PHASES } = CONSTANTS;

/**
 * Emits an extraction event with progress information
 * @param adapter The worker adapter instance to use for emission
 * @param completed Whether the extraction process is completed
 * @returns Promise that resolves when the event has been emitted
 */
export const emitExtractionEvent = async (adapter: WorkerAdapter<unknown>, completed: boolean): Promise<void> => {
  const progress = completed ? PROGRESS_COUNT.HIGH : PROGRESS_COUNT.MEDIUM;
  const eventType = completed ? ExtractorEventType.ExtractionDataDone : ExtractorEventType.ExtractionDataProgress;

  await adapter.emit(eventType, { progress });
};

/**
 * Resets the extraction state for incremental synchronization
 * @param state The current SharePoint extractor state
 */
export const resetStateForIncrementalSync = (state: TrutoExtractorState): void => {
  const phases: (keyof TrutoExtractorState)[] = [PHASES.USERS];

  phases.forEach((phase) => {
    state[phase] = createInitialExtractionPhaseState() as ExtractionPhaseState & string;
  });
};

/**
 * Creates an initial extraction phase state object.
 * This is used to track the progress of different phases during extraction.
 *
 * @returns An object representing the initial state of an extraction phase.
 */
export const createInitialExtractionPhaseState = (): ExtractionPhaseState => ({
  completed: false,
  nextCursor: undefined,
  lastProcessedId: undefined,
  totalFetched: 0,
  rateLimited: false,
});

/**
 * Represents the initial state for SharePoint extraction.
 * This state maintains progress tracking for different extraction phases.
 */
export const initialState: TrutoExtractorState = {
  users: createInitialExtractionPhaseState(),
};

/**
 * Handles errors during the extraction process by logging the error and emitting an event.
 *
 * @param type The type of extractor event to emit.
 * @param errorData The error details including message and error object.
 * @param adapter The worker adapter instance for emitting the error event.
 */
export const handleError = async (
  type: ExtractorEventType,
  errorData: { message: string; error: unknown },
  adapter: WorkerAdapter<unknown>
) => {
  const errorMessage = errorData.error instanceof Error ? errorData.error.message : errorData.message;
  console.error('Extraction process failed:', errorMessage);
  await adapter.emit(type, {
    error: { message: errorMessage },
  });
};

/**
 * Safely pushes data to a repository and updates state with progress tracking
 * @param adapter The worker adapter instance
 * @param entityKey The key identifying the entity type (must be a valid phase key)
 * @param data The array of entities to push
 * @param metadata The metadata containing phase state
 * @param progress The progress percentage to emit (optional)
 * @param errorContext Context string for error messages
 * @returns Promise that resolves when the push and state update are complete
 * @throws Error if the repository is not found or operations fail
 */
export async function safePushToRepo(
  adapter: WorkerAdapter<unknown>,
  entityKey: keyof Omit<TrutoExtractorState, typeof CONSTANTS.PHASE_STATE.LAST_SUCCESSFUL_SYNC_STARTED>,
  data: EntityData,
  metadata: ExtractionPhaseState,
  progress?: number,
  errorContext: string = entityKey
): Promise<void> {
  try {
    const repo = adapter.getRepo(entityKey);
    if (!repo) {
      throw new Error(ERROR_MESSAGES.REPOSITORY.NOT_FOUND_ERROR(entityKey));
    }

    await repo.push(data);

    const state = adapter.state as TrutoExtractorState;
    state[entityKey] = metadata;

    if (typeof progress === 'number' && !metadata[CONSTANTS.PHASE_STATE.COMPLETED]) {
      await adapter.emit(ExtractorEventType.ExtractionDataProgress, { progress });
    }
  } catch (error) {
    handleError(
      ExtractorEventType.ExtractionDataError,
      { error, message: ERROR_MESSAGES.REPOSITORY.PUSH_ERROR(errorContext) },
      adapter
    );
    throw error;
  }
}

/**
 * Handles pushing data to multiple repositories simultaneously
 * @param adapter Worker adapter instance
 * @param data The data to push to repositories
 * @param metadata The metadata for the push operation
 * @param pushConfigs Array of configurations for each repository push
 * @returns Promise that resolves when all pushes are complete
 */
export async function handleMultipleRepoPushes(
  adapter: WorkerAdapter<unknown>,
  data: EntityData,
  metadata: ExtractionPhaseState,
  pushConfigs: PushConfig[]
): Promise<void> {
  const pushPromises = pushConfigs.map((config) =>
    safePushToRepo(adapter, config.phase, data, metadata, config.progressValue, config.errorContext)
  );

  await Promise.all(pushPromises);
}
