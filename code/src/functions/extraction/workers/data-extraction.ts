import { EventType, ExtractorEventType, processTask } from '@devrev/ts-adaas';

import TrutoApi, { Cursor } from '@truto/truto-ts-sdk';
import { normalizeUser } from '../../external-system/data-normalization';
import { User } from '../../external-system/types';

const trutoApi = new TrutoApi({
  token: process.env.TRUTO_API_TOKEN || '',
});

const integratedAccountId = process.env.TRUTO_INTEGRATED_ACCOUNT_ID || '';

const repos = [
  {
    itemType: 'users',
    normalize: normalizeUser,
  },
];

const fetchUsers = async () => {
  return (await trutoApi.unifiedApi.list({
    unified_model: 'conversational-intelligence',
    resource: 'users',
    integrated_account_id: integratedAccountId,
    truto_ignore_remote_data: true,
  })) as Cursor<User>;
};

processTask({
  task: async ({ adapter }) => {
    adapter.initializeRepos(repos);
    if (adapter.event.payload.event_type === EventType.ExtractionDataStart) {
      try {
        const userCursor = await fetchUsers();
        const users: User[] = [];

        for await (const user of userCursor) {
          users.push(user);
        }

        console.log('Fetched users:', users.length);

        // Push the normalized data to the repository
        const normalizedUsers = users.map((user) => normalizeUser(user));
        await adapter.getRepo('users')?.push(normalizedUsers);

        // Emit progress event
        await adapter.emit(ExtractorEventType.ExtractionDataProgress, {
          progress: 100,
        });

        // Mark extraction as complete
        await adapter.emit(ExtractorEventType.ExtractionDataDone);
      } catch (error) {
        console.error('Error during data extraction:', error);
        await adapter.emit(ExtractorEventType.ExtractionDataError, {
          error: {
            message: error instanceof Error ? error.message : 'Unknown error occurred',
          },
        });
      }
    } else {
      await adapter.emit(ExtractorEventType.ExtractionDataDone, {
        progress: 100,
      });
    }
  },
  onTimeout: async ({ adapter }) => {
    await adapter.postState();
    await adapter.emit(ExtractorEventType.ExtractionDataProgress, {
      progress: 50,
    });
  },
});
