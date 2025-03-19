import { EventType, ExtractorEventType, processTask, SyncMode } from '@devrev/ts-adaas';
import { CONSTANTS, ERROR_MESSAGES } from '../../../common/constants';
import { TrutoExtractorState, UserBase } from '../../../common/interfaces';
import { emitExtractionEvent, handleError, resetStateForIncrementalSync } from '../../../common/utils';
import { normalizeUser } from '../../external-system/data-normalization';
import { createExtractionContext, processRepositories } from './extraction-helper';

const { ENTITY_KEY } = CONSTANTS;
const { DATA_EXTRACTION } = ERROR_MESSAGES;

const repos = [
  {
    itemType: ENTITY_KEY.USERS,
    normalize: (record: object) => normalizeUser(record as UserBase),
  },
];

processTask({
  task: async ({ adapter }) => {
    try {
      adapter.initializeRepos(repos);
      const isIncrementalMode = adapter.event.payload.event_context.mode === SyncMode.INCREMENTAL;
      const context = await createExtractionContext(adapter);
      if (adapter.event.payload.event_type === EventType.ExtractionDataStart) {
        adapter.state.lastSyncStarted = new Date().toISOString();
        if (isIncrementalMode) {
          resetStateForIncrementalSync(adapter.state as TrutoExtractorState);
        }
      }
      await processRepositories(context, adapter);
    } catch (error) {
      handleError(ExtractorEventType.ExtractionDataError, { error, message: DATA_EXTRACTION.ERROR }, adapter);
      await emitExtractionEvent(adapter, false);
    }
  },
  onTimeout: async ({ adapter }) => {
    await adapter.postState();
    await emitExtractionEvent(adapter, false);
  },
});
