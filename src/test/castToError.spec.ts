import { castToError } from '../castToError';
import { VkErrorTypes } from '../VkError';

describe('castToError', () => {
  const errors = [
    {
      platform: 'web',
      name: 'User reject request: VKWebAppGetEmail',
      raw: { 'error_type': 'client_error', 'error_data': { 'error_code': 4, 'error_reason': 'User denied' } },
      match: {
        type: VkErrorTypes.ACCESS_ERROR,
        code: 4,
      },
    },
    {
      platform: 'mobile_iphone',
      name: 'VKWebAppGetAuthToken without network',
      raw: {
        'request_id': 8,
        'error_type': 'auth_error',
        'error_data': {
          'error_code': -1009,
          'error_domain': 'NSURLErrorDomain',
          'error_description': 'Вероятно, соединение с интернетом прервано.',
        },
      },
      match: {
        type: VkErrorTypes.NETWORK_ERROR,
      },
    },
    {
      platform: 'mobile_android',
      name: 'VKWebAppGetAuthToken without network',
      raw: { 'error_type': 'auth_error', 'error_data': { 'error': '', 'error_description': '', 'error_reason': '' } },
      match: {
        type: VkErrorTypes.NETWORK_ERROR,
      },
    },
    {
      platform: 'mobile_iphone',
      name: 'VKWebAppGetAuthToken without network',
      raw: { 'error_type': 'auth_error', 'error_data': { 'error_code': 0 } },
      match: {
        type: VkErrorTypes.NETWORK_ERROR,
      },
    },
    {
      platform: 'mobile_android',
      name: 'Потеря соединения при выполнении запроса к апи',
      raw: { 'error_type': 'client_error', 'error_data': { 'error_code': 3, 'error_reason': 'Connection lost' } },
      match: {
        type: VkErrorTypes.NETWORK_ERROR,
      },
    },
    {
      platform: 'mobile_iphone',
      name: 'Обрыв соединения во время VKWebAppGetAuthToken',
      raw: {
        'error_type': 'auth_error',
        'error_data': {
          'error_code': 53,
          'error_domain': 'NSPOSIXErrorDomain',
          'error_description': 'Не удалось завершить операцию. Программа вызвала разрыв подключения',
        },
      },
      match: {
        type: VkErrorTypes.NETWORK_ERROR,
      },
    },
    {
      platform: 'mobile_iphone',
      name: 'VKWebAppGetAuthToken с косячным токеном',
      raw: {
        'error_type': 'auth_error',
        'error_data': { 'error': 'invalid_token', 'error_description': 'token is incorrect' },
      },
      match: {
        type: VkErrorTypes.CLIENT_ERROR,
      },
    },
    {
      platform: 'desktop_web',
      name: 'VKWebAppOpenPayForm пользователь закрыл окно оплаты',
      raw: {
        'error_type': 'client_error',
        'error_data': {
          'error_code': 1,
          'error_reason': {
            'type': 'transaction',
            'action': 'pay-to-group',
            'status': false,
            'transaction_id': null,
            'amount': null,
            'extra': null,
            'error_msg': 'VK Pay payment failed',
          },
        },
      },
      match: {
        type: VkErrorTypes.ACCESS_ERROR,
      },
    },
    {
      platform: 'mobile_iphone',
      name: 'VKWebAppOpenPayForm пользователь закрыл окно оплаты',
      raw: {
        'request_id': 2,
        'error_type': 'client_error',
        'error_data': { 'error_code': 4, 'error_reason': 'User denied' },
      },
      match: {
        type: VkErrorTypes.ACCESS_ERROR,
      },
    },
    {
      platform: 'desktop_web',
      name: 'VKWebAppCallApiMethod different ip',
      raw: {
        'error_type': 'client_error',
        'error_data': {
          'error_code': 1,
          'error_reason': {
            'error_code': 5,
            'error_msg': 'User authorization failed: access_token was given to another ip address.',
            'request_params': [{ 'key': 'method', 'value': 'users.get' }, {
              'key': 'oauth',
              'value': '1',
            }, { 'key': '?api_id', 'value': '6703670' }, { 'key': 'format', 'value': 'json' }, {
              'key': 'v',
              'value': '5.101',
            }, { 'key': 'user_ids', 'value': '1,2,3' }, { 'key': 'request_id', 'value': '12345' }],
          },
        },
      },
      match: {
        type: VkErrorTypes.API_ERROR,
        code: 5,
      },
    },
    {
      platform: 'mobile_iphone',
      name: 'VKWebAppCallApiMethod network error',
      raw: {
        'error_type': 'api_error',
        'error_data': {
          'error_code': 53,
          'error_domain': 'NSPOSIXErrorDomain',
          'error_description': 'Не удалось завершить операцию. Программа вызвала разрыв подключения',
        },
      },
      match: {
        type: VkErrorTypes.NETWORK_ERROR,
      },
    },
    {
      platform: 'mobile_web',
      name: 'VkWebAppCallApiMethod access dined',
      raw: {
        'error_type': 'client_error',
        'error_data': {
          'error_code': 1,
          'error_reason': {
            'error_code': 15,
            'error_msg': 'Access denied',
            'request_params': [
              {
                'key': 'method',
                'value': 'loyaltyTeen.getBalance',
              },
              {
                'key': 'oauth',
                'value': '1',
              },
              {
                'key': '?api_id',
                'value': '7561073',
              },
              {
                'key': 'format',
                'value': 'json',
              },
              {
                'key': 'v',
                'value': '5.103',
              },
              {
                'key': 'request_id',
                'value': '4',
              },
            ],
          },
        },
      },
      match: {
        code: 15,
        type: VkErrorTypes.API_ERROR,
      },
    },
    {
      platform: 'mobile_iphone',
      name: 'VKWebAppGetAuthToken',
      raw: {
        'error_type': 'client_error',
        'error_data': {
          'error_code': 1,
          'error_reason': 'Network error',
        },
      },
      match: {
        code: 1,
        type: VkErrorTypes.NETWORK_ERROR,
      },
    },
    {
      platform: 'desktop_web',
      name: 'VKWebAppCallApiMethod bad request',
      raw: {
        'error_type': 'client_error',
        'error_data': {
          'error_code': 1,
          'error_reason': {
            'error_code': 15,
            'error_msg': 'Access denied: no access to call this method',
            'request_params': [{ 'key': 'method', 'value': 'messages.send' }, {
              'key': 'oauth',
              'value': '1',
            }, { 'key': '?api_id', 'value': '6703670' }, { 'key': 'format', 'value': 'json' }, {
              'key': 'v',
              'value': '5.120',
            }, { 'key': 'request_id', 'value': '6' }],
          },
        },
      },
      match: {
        code: 15,
        type: VkErrorTypes.API_ERROR,
      },
    },
    {
      platform: 'mobile_iphone',
      name: 'VKWebAppCallApiMethod bad request',
      raw: {
        'error_type': 'api_error',
        'error_data': {
          'error_code': 113,
          'request_params': [{ 'key': 'user_ids', 'value': '-123' }, { 'key': 'v', 'value': '5.120' }, {
            'key': 'method',
            'value': 'users.get',
          }, { 'key': 'oauth', 'value': '1' }],
          'error_msg': 'Invalid user id',
        },
      },
      match: {
        code: 113,
        type: VkErrorTypes.API_ERROR,
      },
    },
    {
      platform: 'mobile_android',
      name: 'VKWebAppCallApiMethod bad request',
      raw: {
        'error_type': 'api_error',
        'error_data': {
          'error_code': 5004,
          'error_msg': 'Invalid user id',
          'request_params': [{ 'key': 'v', 'value': '5.120' }, { 'key': 'user_ids', 'value': '-123' }],
        },
      },
      match: {
        code: 5004,
        type: VkErrorTypes.API_ERROR,
      },
    },
  ];

  errors.forEach(({ platform, name, raw, match }) => {
    test(`[${platform}] ${name}`, () => {
      const error = castToError(raw, 'test');
      expect(error).toMatchObject(match);
    });
  });
});
