import {BridgePlus} from "../BridgePlus";


describe("VkStartParams", () => {
  it("parse ok", () => {
    expect(BridgePlus.getStartParams().appId).toBe(6739175)
    expect(BridgePlus.getStartParams().userId).toBe(19039187)
    expect(BridgePlus.getStartParams().groupId).toBe(0)
    expect(BridgePlus.getStartParams().ref).toBe("other")
    expect(BridgePlus.getStartParams().platform).toBe("desktop_web")
    expect(BridgePlus.getStartParams().language).toBe("ru")
  })
})
