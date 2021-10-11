import { isBridgeApiScope } from './BridgeApiScope';

export interface ApiCallConfig {
  scope: string | string[];
  retryStrategy: 'none'|'default'|'token-only';
}

export const defaultApiCallConfig: ApiCallConfig = {
  scope: '',
  retryStrategy: 'default',
};

export function isApiCallConfig(x: any): x is ApiCallConfig {
  return !!(x && isBridgeApiScope(x.scope) && x.retryStrategy !== undefined);
}
