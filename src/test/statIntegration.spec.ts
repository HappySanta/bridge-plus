/**
 * @jest-environment ./android-test-env.js
 */
import { BridgePlus } from '../BridgePlus';
import { defaultStat } from '../Stat';

describe('stat Integration', () => {
  it('work with api ok', async (done) => {
    await BridgePlus.callAPIMethod('users.get', { access_token: 'test' });
    const data = defaultStat.toPlainObject();
    expect(!!data['users.get']).toBeTruthy();
    expect(!!data['users.get_success']).toBeTruthy();
    done();
  });

  it('work with api fail', async (done) => {
    try {
      await BridgePlus.callAPIMethod('network.fail', { access_token: 'test' });
    } catch (e) {

    }
    const data = defaultStat.toPlainObject();
    expect(!!data['network.fail']).toBeTruthy();
    expect(!!data['network.fail_failed']).toBeTruthy();
    done();
  });

  it('work with custom methods', async (done) => {
    await BridgePlus.getUserInfo();
    const data = defaultStat.toPlainObject();
    expect(!!data['VKWebAppGetUserInfo']).toBeTruthy();
    expect(!!data['VKWebAppGetUserInfo_success']).toBeTruthy();
    done();
  });
});
