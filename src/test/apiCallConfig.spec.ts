/**
 * @jest-environment ./android-test-env.js
 */

import { BridgePlus } from '../BridgePlus';

describe('apiCallConfig', () => {
  test('retryStrategy: none args', async (done) => {
    (window as any).mockBridgeCleanUp();
    let apiWasRepeatCall = 0;
    BridgePlus.addLogCallback( (msg) => {
      if (msg.includes('retry fetch')) {
        apiWasRepeatCall++;
      }
    } );
    let wasError = false;
    try {
      await BridgePlus.api<{ response: { id: number } }>('users.getGetByIdFailAuth', { id: 666 }, {
        retryStrategy: 'none',
      });
    } catch (e) {
      wasError = true;
    }
    expect(apiWasRepeatCall).toBeLessThanOrEqual(0);
    expect(wasError).toBeTruthy();
    done();
  });

  test('retryStrategy: none defaultApiCallConfig', async (done) => {
    (window as any).mockBridgeCleanUp();
    BridgePlus.defaultApiCallConfig.retryStrategy = 'none';
    let apiWasRepeatCall = 0;
    BridgePlus.addLogCallback( (msg) => {
      if (msg.includes('retry fetch')) {
        // 1 раз такое сообщение будет получено
        // но повтора запроса не будет
        apiWasRepeatCall++;
      }
    } );
    let wasError = false;
    try {
      await BridgePlus.api<{ response: { id: number } }>('users.getGetByIdFailAuth', { id: 666 });
    } catch (e) {
      wasError = true;
    }
    expect(apiWasRepeatCall).toBeLessThanOrEqual(0);
    expect(wasError).toBeTruthy();
    done();
    BridgePlus.defaultApiCallConfig.retryStrategy = 'default';
  });

  test('retryStrategy: token-only', async (done) => {
    (window as any).mockBridgeCleanUp();
    BridgePlus.defaultApiCallConfig.retryStrategy = 'token-only';
    let apiWasRepeatCall = 0;
    BridgePlus.addLogCallback( (msg) => {
      if (msg.includes('retry fetch')) {
        // 1 раз такое сообщение будет получено
        // но повтора запроса не будет
        apiWasRepeatCall++;
      }
    } );
    let wasError = false;
    try {
      await BridgePlus.api<{ response: { id: number } }>('users.getGetByIdFailAuth', { id: 666 });
    } catch (e) {
      wasError = true;
    }
    expect(apiWasRepeatCall).toBeLessThanOrEqual(1);
    expect(wasError).toBeFalsy();
    done();
    BridgePlus.defaultApiCallConfig.retryStrategy = 'default';
  });
});
