import { ReceiveDataMap, ReceiveEventMap, VKBridgeErrorEvent, VKBridgeResultEvent } from '@vkontakte/vk-bridge';

export type AnyResultEvent = ReceiveEventMap[keyof ReceiveEventMap]['result'];
export type AnyErrorEvent = ReceiveEventMap[keyof ReceiveEventMap]['failed'];
export type AnyEventName = AnyErrorEvent | AnyResultEvent | keyof ReceiveDataMap;

type MapMethodToResult = {
  [K in keyof ReceiveEventMap]: {key: K; value: ReceiveEventMap[K]['result']}
}[keyof ReceiveEventMap];

type MapMethodToError = {
  [K in keyof ReceiveEventMap]: {key: K; value: ReceiveEventMap[K]['failed']}
}[keyof ReceiveEventMap];

type InvertMapMethodToResult = {
  [P in MapMethodToResult['value']]: Extract<MapMethodToResult, { value: P }>['key']
};

type InvertMapMethodToError = {
  [P in MapMethodToError['value']]: Extract<MapMethodToError, { value: P }>['key']
};

export declare type BridgePlusEvent<M extends AnyEventName> = M extends keyof ReceiveDataMap ? VKBridgeResultEvent<M>
  : M extends AnyResultEvent ? VKBridgeResultEvent<InvertMapMethodToResult[M]>
    : M extends AnyErrorEvent ? VKBridgeErrorEvent<InvertMapMethodToError[M]> : never;

export type BridgePlusEventCallback<T extends AnyEventName> = (ev: BridgePlusEvent<T>['detail']['data']) => void;
