import {BridgePlus} from "./BridgePlus";
import {isEqualScope, trimAccessToken} from "./helpers";
import {VkError, VkErrorTypes} from "./VkError";
import {USER_ALLOW_NOT_ALL_RIGHTS} from "./const";
import {exponentialBackoffForApi} from "./backoff";

export class AccessTokenFetcher {

  private cache: Record<string, string> = {}

  public async fetch(scope: string, appId: number, requestId: string): Promise<string> {
    const key = `${scope}-${appId}`
    const cachedToken = this.cache[key]
    if (cachedToken) {
      return cachedToken
    }

    BridgePlus.log(`AccessTokenFetcher [${requestId}] start fetching`)
    const {access_token, scope: resScope} = await this.fetchWithRetry(scope, appId, requestId)
    if (!isEqualScope(resScope, scope)) {
      throw new VkError(`user allow not all scope request: ${scope} receive:${resScope}`, VkErrorTypes.ACCESS_ERROR, USER_ALLOW_NOT_ALL_RIGHTS)
    }
    BridgePlus.log(`AccessTokenFetcher [${requestId}] receive token ${trimAccessToken(access_token)}`)
    this.cache[key] = access_token
    return access_token
  }

  public drop(token: string) {
    BridgePlus.log(`AccessTokenFetcher drop token ${trimAccessToken(token)}`)
    let drop: string[] = []
    for (let key in this.cache) {
      if (this.cache.hasOwnProperty(key) && this.cache[key] === token) {
        drop.push(key)
      }
    }
    drop.forEach(k => {
      delete this.cache[k]
    })
  }

  public async fetchWithRetry(scope: string, appId: number, requestId = "") {
    return await exponentialBackoffForApi(async () => {
      return await BridgePlus.getAuthToken(scope, appId)
    }, (e: any) => {
      BridgePlus.log(`AccessTokenFetcher [${requestId}] retry fetch: ${e.message} \n during fetching token scope:${scope} app:${appId}`)
      return false;
    })
  }
}

export const defaultAccessTokenFetcher = new AccessTokenFetcher()
