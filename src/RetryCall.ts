import {VkError} from "./VkError";
import {delay} from "./helpers";

const nullFn:(e:VkError) => void = (e:VkError) => {}

export async function retryCall<T>(fn: () => Promise<T>, tryCount = 5, onRetry = nullFn) {
  let retry = 0
  do {
    try {
      return await fn()
    } catch (e) {
      if (retry >= tryCount) {
        throw e
      }
      if (!(e instanceof VkError)) {
        throw e
      }
      e.retry = retry
      if (e.type !== VkError.NETWORK_ERROR) {
        throw e
      }
      await delay(retry * 1000 + 100 + Math.random() * 2000)
      onRetry(e)
    }

    retry++
  } while (retry <= tryCount)

  throw new VkError("IMPOSSIBLE retryCall ERROR")
}
