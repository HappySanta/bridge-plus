import { Stat } from '../Stat';
import { delay } from '../helpers';

describe('stat', () => {
  it('test 1', async (done) => {
    const stat = new Stat();
    stat.begin('VKWebAppGetAuthToken', { scope: '', app_id: 15 }, '1');
    await delay(1);
    stat.end('VKWebAppGetAuthToken', { scope: '', app_id: 15 }, '1');
    const data = stat.toPlainObject();
    expect(!!data['VKWebAppGetAuthToken']).toBeTruthy();
    expect(data['VKWebAppGetAuthToken'].count).toBe(1);
    expect(data['VKWebAppGetAuthToken'].sum).toBeGreaterThan(0);
    expect(data['VKWebAppGetAuthToken'].avg).toBeGreaterThan(0);
    expect(data['VKWebAppGetAuthToken'].max).toBeGreaterThan(0);
    done();
  });

  it('test 2', async (done) => {
    const stat = new Stat();
    stat.begin('VKWebAppCallAPIMethod', { method: 'users.get', params: { access_token: 'x', v: '5.103' } }, '1');
    stat.begin('VKWebAppCallAPIMethod', { method: 'users.get', params: { access_token: 'x', v: '5.103' } }, '2');
    await delay(2);
    stat.end('VKWebAppCallAPIMethod', { method: 'users.get', params: { access_token: 'x', v: '5.103' } }, '2');
    await delay(2);
    stat.end('VKWebAppCallAPIMethod', { method: 'users.get', params: { access_token: 'x', v: '5.103' } }, '1');
    const data = stat.toPlainObject();
    expect(!!data['users.get']).toBeTruthy();
    expect(data['users.get'].count).toBe(2);
    expect(data['users.get'].sum).toBeGreaterThanOrEqual(data['users.get'].avg);
    expect(data['users.get'].avg).toBeGreaterThan(0);
    expect(data['users.get'].max).toBeGreaterThan(0);
    done();
  });

  it('test 3', async (done) => {
    const stat = new Stat();

    stat.begin('VKWebAppGetAuthToken', { scope: '', app_id: 15 }, '1');
    await delay(1);
    stat.end('VKWebAppGetAuthToken', { scope: '', app_id: 15 }, '1', true);
    await delay(1);
    stat.begin('VKWebAppCallAPIMethod', { method: 'users.get', params: { access_token: 'x', v: '5.103' } }, '1');
    await delay(2);
    stat.end('VKWebAppCallAPIMethod', { method: 'users.get', params: { access_token: 'x', v: '5.103' } }, '1');

    stat.begin('VKWebAppCallAPIMethod', { method: 'wall.get', params: { access_token: 'x', v: '5.103' } }, '1');
    await delay(2);
    stat.end('VKWebAppCallAPIMethod', { method: 'wall.get', params: { access_token: 'x', v: '5.103' } }, '1', true);
    const data = stat.toPlainObject();
    expect(!!data['users.get']).toBeTruthy();
    expect(!!data['wall.get']).toBeTruthy();
    expect(!!data['VKWebAppGetAuthToken']).toBeTruthy();
    expect(!!data['users.get_failed']).toBeTruthy();
    expect(!!data['wall.get_success']).toBeTruthy();
    expect(!!data['VKWebAppGetAuthToken_success']).toBeTruthy();
    done();
  });
});
