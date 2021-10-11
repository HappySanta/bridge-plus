
export type BridgeApiScope = string | string[];

export function isBridgeApiScope(x: any): x is BridgeApiScope {
  return typeof x === 'string' || Array.isArray(x);
}
