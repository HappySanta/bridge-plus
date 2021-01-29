import VkBridge from '@vkontakte/vk-bridge';
import { AnyReceiveMethodName, VKBridgeEvent } from '@vkontakte/vk-bridge/dist/types/src/types/bridge';
import { AnyEventName, BridgePlusEventCallback } from './extendedTypes';

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export default class VkObserver {
  static subjects: Array<{
    eventType: AnyEventName;
    callback: BridgePlusEventCallback<AnyEventName>;
  }> = [];

  static subscribe<T extends AnyEventName>(eventType: T, callback: BridgePlusEventCallback<T>) {
    if (!VkObserver.subjects.length) {
      VkBridge.subscribe(VkObserver.observerCallback);
    }
    VkObserver.subjects.push({ eventType, callback: callback });
  }

  static unsubscribe<T extends AnyEventName>(eventType: T, callback: BridgePlusEventCallback<T>) {
    VkObserver.subjects = VkObserver.subjects.filter((subject) =>
      subject.eventType !== eventType && callback !== subject.callback);
    if (!VkObserver.subjects.length) {
      VkBridge.unsubscribe(VkObserver.observerCallback);
    }
  }

  static observerCallback = (e: VKBridgeEvent<AnyReceiveMethodName>) => {
    let vkEvent = e.detail;
    if (!vkEvent) {
      return;
    }
    let eventType = vkEvent.type;
    let data = vkEvent.data;
    VkObserver.subjects.forEach((subject) => {
      if (subject.eventType === eventType) {
        subject.callback(data);
      }
    });
  };
}
