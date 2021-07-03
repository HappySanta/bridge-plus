import { BridgePlus } from './BridgePlus';
import { isGreatOrEqual, trimAccessToken } from './helpers';
import { VkError, VkErrorTypes } from './VkError';
import { USER_ALLOW_NOT_ALL_RIGHTS } from './const';
import { checkIsVkError, exponentialBackoffForApi } from './backoff';

export class AccessTokenFetcher {
  private cache: Record<string, string> = {};
  private readonly promiseCache: Record<string, Promise<string>> = {};

  public async fetch(scope: string, appId: number, requestId: string): Promise<string> {
    const key = `${scope}-${appId}`;
    const cachedToken = this.cache[key];
    if (cachedToken) {
      return cachedToken;
    }

    const cachedPromise = this.promiseCache[key];
    if (cachedPromise !== undefined) {
      return cachedPromise;
    }

    this.promiseCache[key] = this.getToken(scope, appId, requestId)
      .then((access_token) => {
        delete this.promiseCache[key];
        this.cache[key] = access_token;
        return access_token;
      })
      .catch((e) => {
        delete this.promiseCache[key];
        throw e;
      });

    return this.promiseCache[key];
  }

  protected async getToken(scope: string, appId: number, requestId: string) {
    const { access_token, scope: resScope } = await this.fetchWithRetry(scope, appId, requestId);
    if (!isGreatOrEqual(scope, resScope)) {
      throw new VkError(`user allow not all scope request: ${scope} receive:${resScope}`, VkErrorTypes.ACCESS_ERROR, USER_ALLOW_NOT_ALL_RIGHTS);
    }
    BridgePlus.log(`[${requestId}] AccessTokenFetcher receive scope: ${scope} token: ${trimAccessToken(access_token)}`);
    return access_token;
  }

  public drop(token: string) {
    BridgePlus.log(`AccessTokenFetcher drop token ${trimAccessToken(token)}`);
    let drop: string[] = [];
    for (let key in this.cache) {
      if (this.cache.hasOwnProperty(key) && this.cache[key] === token) {
        drop.push(key);
      }
    }
    drop.forEach((k) => {
      delete this.cache[k];
    });
  }

  public dropAll() {
    this.cache = {};
  }

  public async fetchWithRetry(scope: string, appId: number, requestId = '') {
    return await exponentialBackoffForApi(async () => {
      BridgePlus.log(`[${requestId}] AccessTokenFetcher start fetching scope: ${scope}`);
      return await BridgePlus.getAuthToken(scope, appId, requestId);
    }, (e: any) => {
      BridgePlus.log(`[${requestId}] AccessTokenFetcher failed: scope:${scope}`, e.message, e.code, e.type);
      if (checkIsVkError(e)) {
        return e.type !== VkErrorTypes.ACCESS_ERROR;
      }
      return undefined;
    });
  }
}

export const defaultAccessTokenFetcher = new AccessTokenFetcher();
