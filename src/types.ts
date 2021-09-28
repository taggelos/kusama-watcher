import { SessionIndex, ValidatorId } from '@polkadot/types/interfaces';
import { Vec } from '@polkadot/types/codec';

export interface Validator {
    id: string;
    lastSessionOffline: boolean;
}

export interface PromClient {
    setStatusValidatorOffline(name: string): void;
    resetStatusValidatorOffline(name: string): void;
    isValidatorStatusOffline(name: string): boolean;
    setStatusValidatorOfflineOnce(name: string): void;
    resetStatusValidatorOfflineOnce(name: string): void;
    setNumberOfActiveSetValidators(total_num: number): void 
}

export interface ValidatorImOnlineParameters {
  isHeartbeatExpected: boolean;
  sessionIndex: SessionIndex;
  eraIndex: number;
  validatorActiveSet: Vec<ValidatorId>;
}
