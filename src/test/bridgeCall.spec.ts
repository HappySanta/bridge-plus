/**
 * @jest-environment ./android-test-env.js
 */
import {BridgePlus} from "../BridgePlus";
import {VkError, VkErrorTypes} from "../VkError";
import {BridgePlusEvent} from "../extendedTypes";
import {delay} from "../helpers";

describe("bridgeCall", () => {

  it("test-env-works", () => {
    expect(BridgePlus.supports("FakeTestMethod")).toBe(true)
  })

  it("test-env-response", async (done) => {
    const res = await BridgePlus.getClientVersion()
    expect(res.platform).toBe("jest-test")
    expect(res.version).toBe("1.0.0")
    done()
  })

  it("network error check", async (done) => {
    try {
      await BridgePlus.callAPIMethod("network.fail", {})
      throw new Error("fail response")
    } catch (e) {
      expect(e).toBeInstanceOf(VkError)
      if (e instanceof VkError) {
        expect(e.type).toBe(VkErrorTypes.NETWORK_ERROR)
      }
    }
    done()
  })

  it("call api method test", async (done) => {
    const {response: [user]} = await BridgePlus.callAPIMethod("users.get", {})
    expect(user.id).toBe(100)
    expect(user.first_name).toBe("Test")
    done()
  })

  it("catch events", async (done) => {
    let allow = true
    const fn = (e: BridgePlusEvent<"VKWebAppUpdateConfig">["detail"]["data"]) => {
      if (!allow) {
        throw new Error("called twice on unsubscribe event")
      }
      expect(e.scheme).toBe("test-scheme-dark")
      BridgePlus.unsubscribe("VKWebAppUpdateConfig", fn)
      allow = false;
      BridgePlus.init().then(async () => {
        await delay(50)
        done()
      })
    }
    BridgePlus.subscribe("VKWebAppUpdateConfig", fn)
    BridgePlus.subscribe("VKWebAppAccelerometerStopResult", () => {
      throw new Error("called subscription mistakly")
    })
    await BridgePlus.init()
  })

  it("work fine with api", async (done) => {
    const {response:user} = await BridgePlus.api<{response:{id:number}}>("users.getGetById", {id:555}, "")
    expect(user.id).toBe(555);
    done();
  })

  it("work fine with api and network-fail", async (done) => {
    const {response:user} = await BridgePlus.api<{response:{id:number}}>("users.getGetByIdFailNetwork", {id:555}, "network-fail")
    expect(user.id).toBe(555);
    done();
  })
})
