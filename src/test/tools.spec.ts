import { isBridgeApiScope } from '../BridgeApiScope';
import { isApiCallConfig } from '../ApiCallConfig';

describe('tools', () => {
  it('isBridgeApiScope 1', () => {
    expect(isBridgeApiScope('')).toBeTruthy();
  });
  it('isBridgeApiScope 2', () => {
    expect(isBridgeApiScope('friends')).toBeTruthy();
  });
  it('isBridgeApiScope 3', () => {
    expect(isBridgeApiScope('friends,wall')).toBeTruthy();
  });
  it('isBridgeApiScope 4', () => {
    expect(isBridgeApiScope([])).toBeTruthy();
  });
  it('isBridgeApiScope 5', () => {
    expect(isBridgeApiScope(['friends'])).toBeTruthy();
  });
  it('isBridgeApiScope 6', () => {
    expect(isBridgeApiScope(['friends', 'wall'])).toBeTruthy();
  });
  it('isBridgeApiScope 7', () => {
    expect(isBridgeApiScope(5)).toBeFalsy();
  });
  it('isBridgeApiScope 8', () => {
    expect(isBridgeApiScope(undefined)).toBeFalsy();
  });

  it('isApiCallConfig 1', () => {
    expect(isApiCallConfig({ scope: '', retryStrategy: 'default' })).toBeTruthy();
  });
  it('isApiCallConfig 2', () => {
    expect(isApiCallConfig({})).toBeFalsy();
  });
});
