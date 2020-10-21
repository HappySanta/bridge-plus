import VkBridge from "@vkontakte/vk-bridge"
import {AnyReceiveMethodName, VKBridgeEvent} from "@vkontakte/vk-bridge/dist/types/src/types/bridge";

export declare type BridgePlusEventName<T extends AnyReceiveMethodName> = VKBridgeEvent<T>["detail"]["type"]
export declare type BridgePlusEventCallback<T extends AnyReceiveMethodName> = (e: VKBridgeEvent<T>["detail"]["data"], t: BridgePlusEventName<T>) => void

export default class VkObserver {

  static subjects: {
    eventType: BridgePlusEventName<AnyReceiveMethodName>,
    callback: BridgePlusEventCallback<AnyReceiveMethodName>
  }[] = []

  static subscribe<T extends AnyReceiveMethodName>(eventType: BridgePlusEventName<T>, callback: BridgePlusEventCallback<T>) {
    if (!VkObserver.subjects.length) {
      VkBridge.subscribe(VkObserver.observerCallback)
    }
    VkObserver.subjects.push({eventType, callback: callback as any as BridgePlusEventCallback<AnyReceiveMethodName>})
  }

  static unsubscribe<T extends AnyReceiveMethodName>(eventType: BridgePlusEventName<T>, callback: BridgePlusEventCallback<T>) {
    VkObserver.subjects = VkObserver.subjects.filter(subject =>
      subject.eventType !== eventType && (callback as any as BridgePlusEventCallback<AnyReceiveMethodName>) !== subject.callback)
    if (!VkObserver.subjects.length) {
      VkBridge.unsubscribe(VkObserver.observerCallback)
    }
  }

  static observerCallback = (e: VKBridgeEvent<AnyReceiveMethodName>) => {
    let vkEvent = e.detail
    if (!vkEvent) {
      return
    }
    let eventType = vkEvent.type
    let data = vkEvent.data
    VkObserver.subjects.forEach(subject => {
      if (subject.eventType === eventType) {
        subject.callback(data, eventType)
      }
    })
  }
}
