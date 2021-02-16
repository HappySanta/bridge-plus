import { VkError, VkErrorTypes } from './VkError';
import { backOff } from 'exponential-backoff';
import { SOFT_ERROR_CODES } from './const';

export function checkIsVkError(e: any): e is VkError {
  return e instanceof VkError;
}

export function checkErrorIsNetwork(e: VkError): boolean {
  return e.type === VkErrorTypes.NETWORK_ERROR;
}

export function checkErrorIsSoftApiError(e: VkError): boolean {
  return e.type === VkErrorTypes.API_ERROR && SOFT_ERROR_CODES.includes(e.code);
}

export async function exponentialBackoffForApi<T>(fn: () => Promise<T>, onError?: (e: any) => undefined|boolean): Promise<T> {
  return await backOff(fn, {
    delayFirstAttempt: false,
    jitter: 'full',
    maxDelay: 10000,
    numOfAttempts: 10,
    startingDelay: 500,
    timeMultiple: 2,
    retry: (e: any) => {
      if (onError) {
        return !onError(e);
      } else if (checkIsVkError(e)) {
        return checkErrorIsNetwork(e) || checkErrorIsSoftApiError(e);
      } else {
        return false;
      }
    },
  });
}

export async function exponentialBackoffAnyError<T>(fn: () => Promise<T>, onError?: (e: any) => boolean): Promise<T> {
  return await backOff(fn, {
    delayFirstAttempt: false,
    jitter: 'full',
    maxDelay: 10000,
    numOfAttempts: 10,
    startingDelay: 500,
    timeMultiple: 2,
    retry: (e: any) => {
      return !(onError && onError(e));
    },
  });
}
