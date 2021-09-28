import { ApiPromise } from '@polkadot/api';
import { Event } from '@polkadot/types/interfaces/system';
import { SessionIndex, BlockNumber } from '@polkadot/types/interfaces';
import { ZeroBN } from './constants';

export const isNewSessionEvent = (event: Event): boolean => {
  return event.section == 'session' && event.method == 'NewSession';
}

export const hasValidatorProvedOnline = async (account: string, validatorIndex: number, sessionIndex: SessionIndex, api: ApiPromise): Promise<boolean> => {
  return await _hasValidatorAuthoredBlocks(account,sessionIndex,api) || await _hasValidatorSentHeartbeats(validatorIndex,sessionIndex,api)
}

export const getActiveEraIndex = async (api: ApiPromise): Promise<number> => {
  return (await api.query.staking.activeEra()).toJSON()['index'] as number;
}

export const getHeartbeatBlockThreshold = async (api: ApiPromise): Promise<BlockNumber> => {
  return api.query.imOnline.heartbeatAfter()
}

export async function asyncForEach<T>(array: Array<T>, callback: (arg0: T, arg1: number, arg2: Array<T>) => void): Promise<void> {
  for (let index = 0; index < array.length; index++) {
      await callback(array[index], index, array);
  }
}

const _hasValidatorAuthoredBlocks = async (validator: string, sessionIndex: SessionIndex, api: ApiPromise): Promise<boolean> => {
  const numBlocksAuthored = await api.query.imOnline.authoredBlocks(sessionIndex,validator)
  return numBlocksAuthored.cmp(ZeroBN) > 0
}

const _hasValidatorSentHeartbeats = async (validatorIndex: number, sessionIndex: SessionIndex, api: ApiPromise): Promise<boolean> => {
  if (validatorIndex < 0) return false;
  const hb = await api.query.imOnline.receivedHeartbeats(sessionIndex,validatorIndex) 
  return hb.toHuman() ? true : false
}