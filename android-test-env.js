const NodeEnvironment = require('jest-environment-jsdom');

class CustomEnvironment extends NodeEnvironment {
  constructor(config, context) {
    super(config, context);
    this.testPath = context.testPath;
    this.docblockPragmas = context.docblockPragmas;
  }

  async setup() {
    await super.setup();
    // await someSetupTasks(this.testPath);
    // this.global.someGlobalObject = {}

    const getRequestId = args => {
      const x = JSON.parse(args);
      return x.request_id;
    };

    const response = (type, data, request_id) => {
      data.request_id = request_id;
      this.global.window.dispatchEvent(new this.global.window.CustomEvent('VKWebAppEvent', {
        detail: {
          type,
          data,
        },
      }));
    };

    this.global.window.AndroidBridge = {
      VKWebAppInit: (args) => {
        response('VKWebAppUpdateConfig', {
          scheme: 'test-scheme-dark',
        });
        setTimeout(() => {
          response('VKWebAppInitResult', {}, getRequestId(args));
        }, 1);
      },
      FakeTestMethod: (args) => {

      },
      VKWebAppGetClientVersion: (args) => {
        response('VKWebAppGetClientVersionResult', {
          platform: 'jest-test',
          version: '1.0.0',
        }, getRequestId(args));
      },
      VKWebAppCallAPIMethod: (args) => {
        const data = JSON.parse(args);
        if (data.method === 'network.fail') {
          return response('VKWebAppCallAPIMethodFailed', {
            'error_type': 'client_error',
            'error_data': { 'error_code': 3, 'error_reason': 'Connection lost' },
          }, getRequestId(args));
        }

        if (data.method === 'users.get') {
          return response('VKWebAppCallAPIMethodResult', {
            response: [
              { id: 100, first_name: 'Test' },
            ],
          }, getRequestId(args));
        }

        if (data.method === 'users.getGetById') {
          return response('VKWebAppCallAPIMethodResult', {
            response: { id: data.params.id, first_name: 'Test' },
          }, getRequestId(args));
        }

        if (data.method === 'users.getGetByIdFailNetwork') {
          if (!this.failed_getGetByIdFailNetwork) {
            this.failed_getGetByIdFailNetwork = true;
            return response('VKWebAppCallAPIMethodFailed', {
              'error_type': 'client_error',
              'error_data': { 'error_code': 3, 'error_reason': 'Connection lost' },
            }, getRequestId(args));
          }
          return response('VKWebAppCallAPIMethodResult', {
            response: { id: data.params.id, first_name: 'Test' },
          }, getRequestId(args));
        }

        response('VKWebAppCallAPIMethodFailed', {
          'error_type': 'client_error',
          'error_data': { 'error_code': 9999, 'error_reason': 'Test env not support method: ' + data.method },
        }, getRequestId(args));
      },
      VKWebAppGetAuthToken: args => {

        const data = JSON.parse(args);
        if (data.scope === 'network-fail' && !this.failed) {
          this.failed = true;
          return response('VKWebAppGetAuthTokenFailed', {
            'error_type': 'auth_error', 'error_data':
              { 'error': '', 'error_description': '', 'error_reason': '' },
          }, getRequestId(args));
        }

        response('VKWebAppGetAuthTokenResult', {
          scope: data.scope,
          access_token: 'test-token-12',
        }, getRequestId(args));
      },
    };
  }

  async teardown() {
    this.global.someGlobalObject = null;
    await super.teardown();
  }

  runScript(script) {
    return super.runScript(script);
  }
}

module.exports = CustomEnvironment;
