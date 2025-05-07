import { WorkerAdapter } from '@devrev/ts-adaas';
import { CONSTANTS } from './constants';

interface UserEmail {
  email: string;
  is_primary: boolean;
}

// Base Types
interface BaseEntity {
  id: string;
  name: string;
}

// User Related
interface UserBase extends BaseEntity {
  emails?: UserEmail[];
}

// State Related
interface GlobalState {
  users: Map<string, UserBase>;
}

interface ExtractionPhaseState {
  [CONSTANTS.PHASE_STATE.COMPLETED]: boolean;
  [CONSTANTS.PHASE_STATE.NEXT_CURSOR]: string | undefined;
  [CONSTANTS.PHASE_STATE.LAST_PROCESSED_ID]: string | undefined;
  [CONSTANTS.PHASE_STATE.TOTAL_FETCHED]: number;
  [CONSTANTS.PHASE_STATE.RATE_LIMITED]: boolean;
}

interface TrutoExtractorState {
  [CONSTANTS.PHASES.USERS]: ExtractionPhaseState;
  [CONSTANTS.PHASE_STATE.LAST_SUCCESSFUL_SYNC_STARTED]?: string;
}

//extraction-related
interface ExtractionContext {
  adapter: WorkerAdapter<unknown>;
  state: TrutoExtractorState;
  isIncrementalMode: boolean;
  userCache?: Map<string, UserBase>;
}

//Entity-related
type EntityData = UserBase[];

// Type for valid entity keys
type EntityKey = 'users';

interface PushConfig {
  phase: 'users';
  progressValue: number;
  errorContext: string;
}

export type {
  BaseEntity,
  ExtractionPhaseState,
  GlobalState,
  UserBase,
  ExtractionContext,
  TrutoExtractorState,
  EntityData,
  EntityKey,
  PushConfig,
};
