/**
 * @jest-environment ./android-test-env.js
 */
import { BridgePlus } from '../BridgePlus';
import { VkError, VkErrorTypes } from '../VkError';
import { BridgePlusEvent } from '../extendedTypes';
import { delay } from '../helpers';

describe('bridgeCall', () => {
  it('test-env-works', () => {
    expect(BridgePlus.supports('FakeTestMethod')).toBe(true);
  });

  it('test-env-response', async (done) => {
    const res = await BridgePlus.getClientVersion();
    expect(res.platform).toBe('jest-test');
    expect(res.version).toBe('1.0.0');
    done();
  });

  it('network error check', async (done) => {
    try {
      await BridgePlus.callAPIMethod('network.fail', { access_token: 'test' });
      throw new Error('fail response');
    } catch (e) {
      expect(e).toBeInstanceOf(VkError);
      if (e instanceof VkError) {
        expect(e.type).toBe(VkErrorTypes.NETWORK_ERROR);
      }
    }
    done();
  });

  it('call api method test', async (done) => {
    const { response: [user] } = await BridgePlus.callAPIMethod('users.get', { access_token: 'test' });
    expect(user.id).toBe(100);
    expect(user.first_name).toBe('Test');
    done();
  });

  it('catch events', async (done) => {
    let allow = true;
    const fn = (e: BridgePlusEvent<'VKWebAppUpdateConfig'>['detail']['data']) => {
      if (!allow) {
        throw new Error('called twice on unsubscribe event');
      }
      expect(e.scheme).toBe('test-scheme-dark');
      BridgePlus.unsubscribe('VKWebAppUpdateConfig', fn);
      allow = false;
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      BridgePlus.init().then(async () => {
        await delay(50);
        done();
      });
    };
    BridgePlus.subscribe('VKWebAppUpdateConfig', fn);
    BridgePlus.subscribe('VKWebAppAccelerometerStopResult', () => {
      throw new Error('called subscription mistakly');
    });
    await BridgePlus.init();
  });

  it('work fine with api', async (done) => {
    const { response: user } = await BridgePlus.api<{response: {id: number}}>('users.getGetById', { id: 555 }, '');
    expect(user.id).toBe(555);
    done();
  });

  it('work fine with api and network-fail', async (done) => {
    const { response: user } = await BridgePlus.api<{response: {id: number}}>('users.getGetByIdFailNetwork', { id: 555 }, 'network-fail');
    expect(user.id).toBe(555);
    done();
  });

  it('call api method with #5 error', async (done) => {
    const { response: user } = await BridgePlus.api<{response: {id: number}}>('users.getGetByIdFailAuth', { id: 666 }, '');
    expect(user.id).toBe(666);
    done();
  });

  it('access dined error call api one time', async (done) => {
    jest.setTimeout(30000);
    let apiWasRepeatCall = 0;
    BridgePlus.addLogCallback( (msg) => {
      if (msg.includes('retry fetch')) {
        // 1 раз такое сообщение будет получено
        // но повтора запроса не будет
        apiWasRepeatCall++;
      }
    } );
    try {
      await BridgePlus.api('test.accessDined', {}, '');
    } catch (e) {

    }
    expect(apiWasRepeatCall).toBeLessThanOrEqual(1);
    done();
  });
});
