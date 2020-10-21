/**
 * @jest-environment ./android-test-env.js
 */
import {BridgePlus} from "../BridgePlus";
import {VkError} from "../VkError";

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
        expect(e.type).toBe(VkError.NETWORK_ERROR)
      }
    }
    done()
  })

  it("call api method test", async (done) => {
    const {response:[user]} = await BridgePlus.callAPIMethod("users.get", {})
    expect(user.id).toBe(100)
    expect(user.first_name).toBe("Test")
    done()
  })
})
