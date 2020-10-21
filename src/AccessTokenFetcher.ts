import {BridgePlus} from "./BridgePlus";
import {isEqualScope, trimAccessToken} from "./helpers";
import {VkError} from "./VkError";
import {USER_ALLOW_NOT_ALL_RIGHTS} from "./const";
import {retryCall} from "./RetryCall";

export class AccessTokenFetcher {

  private cache: Record<string, string> = {}

  public async fetch(scope: string, appId: number, requestId: string): Promise<string> {
    const key = `${scope}-${appId}`
    const cachedToken = this.cache[key]
    if (cachedToken) {
      return cachedToken
    }
    const {access_token, scope: resScope} = await this.fetchWithRetry(scope, appId, 5, requestId)
    if (!isEqualScope(resScope, scope)) {
      throw new VkError(`user allow not all scope request: ${scope} receive:${resScope}`, VkError.ACCESS_ERROR, USER_ALLOW_NOT_ALL_RIGHTS)
    }
    BridgePlus.log(`AccessTokenFetcher [${requestId}] receive token ${trimAccessToken(access_token)}`)
    this.cache[key] = access_token
    return access_token
  }

  public drop(token: string) {
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

  public async fetchWithRetry(scope: string, appId: number, tryCount: number = 5, requestId = "") {
    return await retryCall(async () => {
      return await BridgePlus.getAuthToken(scope, appId)
    }, tryCount, (e: VkError) => {
      BridgePlus.log(`AccessTokenFetcher [${requestId}] retry fetch: ${e.message} \n during fetching token scope:${scope} app:${appId}`)
    })
  }
}

export const defaultAccessTokenFetcher = new AccessTokenFetcher()
