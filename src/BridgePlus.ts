import * as qs from 'query-string';
import { VkStartParams } from './VkStartParams';
import VkObserver from './VkObserver';
import {
  AnyReceiveMethodName,
  AnyRequestMethodName,
  ReceiveData,
  RequestIdProp,
  RequestProps,
} from '@vkontakte/vk-bridge/dist/types/src/types/bridge';
import VkBridge, {
  AppCloseStatus,
  AppearanceType,
  TapticNotificationType,
  TapticVibrationPowerType,
} from '@vkontakte/vk-bridge';
import { castToError } from './castToError';
import {
  CommunityWidgetType,
  PersonalCardType,
  VKPayActionParamsMap,
  VKPayActionType,
  WallPostRequestOptions,
} from '@vkontakte/vk-bridge/dist/types/src/types/data';
import { Queue } from './Queue';
import { getContextId, normalizeScope } from './helpers';
import { defaultAccessTokenFetcher } from './AccessTokenFetcher';
import { exponentialBackoffAnyError, exponentialBackoffForApi } from './backoff';
import { VkError, VkErrorTypes } from './VkError';
import { VK_API_AUTH_FAIL } from './const';
import { AnyEventName, BridgePlusEventCallback } from './extendedTypes';
import { defaultStat } from './Stat';

type ApiParams = Record<'access_token' | 'v', string> & Record<string, string | number>;

function isApiParams(x: Record<string, string | number>): x is ApiParams {
  return !!x.v && !!x.access_token;
}

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class BridgePlus {
  static startParams: VkStartParams | null = null;
  static startSearch = '';
  static defaultApiVersion = '5.103';

  /**
   * Возвращает объект с параметрами запуска приложения
   * @returns {VkStartParams}
   */
  static getStartParams(): VkStartParams {
    if (BridgePlus.startParams === null) {
      BridgePlus.startParams = new VkStartParams(qs.parse(window.location.search));
      BridgePlus.startSearch = window.location.search;
    }
    return BridgePlus.startParams;
  }

  /**
   * Подписаться на событие VkBridge
   */
  static subscribe<T extends AnyEventName>(eventType: T, callback: BridgePlusEventCallback<T>) {
    VkObserver.subscribe(eventType, callback);
  }

  /**
   * Отписаться от события VkBridge
   */
  static unsubscribe<T extends AnyEventName>(eventType: T, callback: BridgePlusEventCallback<T>) {
    VkObserver.unsubscribe(eventType, callback);
  }

  /**
   * Проверяет, поддерживается ли событие на текущей платформе.
   * @param {string} method
   * @return {boolean}
   */
  static supports(method: string): boolean {
    return VkBridge.supports(method);
  }

  /**
   * Инициализация VK Connect
   * Первое событие, которое Ваше приложение должно отправить официальному приложению, чтобы начать работу с VK Connect.
   * В противном случае сервис может не работать на мобильных клиентах iOS и Android.
   */
  static init() {
    return BridgePlus.send('VKWebAppInit', {});
  }

  /**
   * Получение данных профиля
   * Позволяет получить основные данные о профиле текущего пользователя.
   * @returns {Promise}
   */
  static getUserInfo() {
    const contextId = getContextId();
    return exponentialBackoffAnyError(() => BridgePlus.send('VKWebAppGetUserInfo', {}, contextId), (e) => {
      BridgePlus.log(`[${contextId}] VKWebAppGetUserInfo retrying`, e.message, e.code, e.type);
      return false;
    });
  }

  /**
   * Получение номера телефона
   * Позволяет получить номер телефона текущего пользователя.
   * Официальное приложение отображает экран с запросом разрешения пользователя на передачу его номера телефона в приложение.
   * @returns {Promise}
   */
  static getPhoneNumber() {
    return BridgePlus.send('VKWebAppGetPhoneNumber', {});
  }

  /**
   * Получение e-mail
   * Позволяет получить адрес электронной почты пользователя.
   * После вызова отображает экран с запросом прав на доступ к e-mail.
   * @returns {Promise}
   */
  static getEmail() {
    return BridgePlus.send('VKWebAppGetEmail', {});
  }

  /**
   * Получение геопозиции
   * Позволяет получить данные о геопозиции пользователя. Событие не принимает параметров.
   * Официальное приложение показывает окно с запросом разрешения на передачу местоположения.
   * @returns {Promise}
   */
  static getGeodata() {
    return BridgePlus.send('VKWebAppGetGeodata', {});
  }

  /**
   * Выбор контакта из телефонной книги
   * Открывает окно выбора контактов из телефонной книги на устройстве пользователя.
   * @returns {Promise<{phone:string,first_name:string}>}
   */
  static openContacts() {
    return BridgePlus.send('VKWebAppOpenContacts', {});
  }

  /**
   * Авторизация пользователя
   * Позволяет запросить права доступа у пользователя и получить ключ для работы с API.
   * Для получения токена без дополнительных прав передайте в параметре пустую строку.
   * @param {string} scope - Список прав доступа, перечисленных через запятую. {@url  https://vk.com/dev/permissions}
   * @param {number|null} appId
   * @param {string} requestId for log only
   * @returns {Promise}
   */
  static getAuthToken(scope = '', appId?: number, requestId?: string) {
    /*
     * На iOS замечен баг: не надо вызывать этот метод дважды надо подождать пока предыдущий завершится
     * поэтому тут очередь запросов
     */
    const params = {
      app_id: appId || this.getStartParams().appId,
      scope: scope,
    };
    return BridgePlus.getRequestTokenQueue().call(() => BridgePlus.send<'VKWebAppGetAuthToken'>('VKWebAppGetAuthToken', params, requestId));
  }

  static getRequestTokenQueue(): Queue {
    if (!BridgePlus.tokenQueue) {
      BridgePlus.tokenQueue = new Queue();
    }
    return BridgePlus.tokenQueue;
  }

  static tokenQueue = new Queue();

  /**
   * Вызов методов API
   * Позволяет получить результат вызова метода API ВКонтакте.
   * Обратите внимание, что для работы с API нужно передать ключ доступа пользователя с соответствующими правами,
   * полученный с помощью VKWebAppGetAuthToken {@see getAuthToken}
   * @param {string} method - название метода API. {@url https://vk.com/dev/methods}
   * @param {Object} params - параметры метода v lang access_token и так далее
   * @param requestId id запроса для логов
   * @returns {Promise}
   */
  static async callAPIMethod(method: string, params: Record<string, string | number> = {}, requestId?: string) {
    if (params.v === undefined) {
      params.v = BridgePlus.defaultApiVersion;
    }
    if (isApiParams(params)) {
      return await BridgePlus.send<'VKWebAppCallAPIMethod'>('VKWebAppCallAPIMethod', { method, params }, requestId);
    } else {
      throw new VkError('API ERROR: #5 no access_token or version (v) passed', VkErrorTypes.API_ERROR);
    }
  }

  /**
   * Вызов методов API с запросом токена, если нужно
   * Позволяет получить результат вызова метода API ВКонтакте.
   * @param {string} method - название метода API. {@url https://vk.com/dev/methods}
   * @param {Object} params - параметры метода в виде JSON
   * @param {string} scope - права необходимые для этого запроса, через запятую
   * @throws BridgePlusError
   * @returns {Promise<Object>}
   */
  static async api<T extends { response: any }>(method: string, params: Record<string, string | number> = {}, scope: string | string[] = ''): Promise<T> {
    const requestId = getContextId();
    // Чтобы не портить params потому что мы туда запишем токен
    const p = { ...params };
    const needAccessToken = !p.access_token;
    const appId = BridgePlus.getStartParams().appId;
    const normalizedScope = normalizeScope(scope);
    let lastFetchedToken = '';
    return await exponentialBackoffForApi<T>(async () => {
      BridgePlus.log(`[${requestId}] api ${method} start call`, params);
      if (needAccessToken) {
        lastFetchedToken = await defaultAccessTokenFetcher.fetch(normalizedScope, appId, requestId);
        p.access_token = lastFetchedToken;
      }
      return await BridgePlus.callAPIMethod(method, p, requestId) as T;
    }, (e: any) => {
      BridgePlus.log(`[${requestId}] api ${method} failed`, e.message, e.code, e.type);

      // Ошибка о том что токен протух, такое бывает когда у пользователя меняется ip
      if (e instanceof VkError && e.code === VK_API_AUTH_FAIL) {
        // Если мы сами запрашивали токен, то удалим его при следующем вызове к апи
        // он создастся снова
        if (needAccessToken) {
          defaultAccessTokenFetcher.drop(lastFetchedToken);
          return true;
        } else {
          // Если токен пришел из параметров вызова
          // то выкидываем ошибку во вне
          return false;
        }
      }
      return undefined;
    })
      .then((res) => {
        BridgePlus.log(`[${requestId}] api ${method} done`);
        return res;
      }).catch((e) => {
        BridgePlus.log(`[${requestId}] api ${method} reject`, e.message, e.code, e.type);
        throw e;
      });
  }

  /**
   * Вызов диалога Share
   * Позволяет поделиться ссылкой
   * @returns {Promise}
   */
  static share(link = '') {
    return BridgePlus.send('VKWebAppShare', { link });
  }

  /**
   * Публикация записей на стене
   * @param {Object} params - См. описание метода wall.post. {@url https://vk.com/dev/wall.post}
   * Позволяет пользователю опубликовать запись на стене
   * @returns {Promise}
   */
  static showWallPostBox(params: WallPostRequestOptions) {
    return BridgePlus.send('VKWebAppShowWallPostBox', params);
  }

  /**
   * Нативный просмотр изображений iOS, Android
   * @param {string[]} images
   * @param {number} start_index
   * @return {Promise}
   */
  static showImages(images: string[], start_index = 0) {
    return BridgePlus.send('VKWebAppShowImages', { images, start_index });
  }

  static canShowImage() {
    return VkBridge.supports('VKWebAppShowImages');
  }

  /**
   * Получение версии официального приложения
   * Возвращает номер версии официального приложения ВКонтакте.
   * @returns {Promise}
   */
  static getClientVersion() {
    return BridgePlus.send('VKWebAppGetClientVersion', {});
  }

  /**
   * Платёж VK Pay
   * Поднимает экран VK Pay для платежа
   */
  static openPayForm<ActionType extends VKPayActionType>(action: ActionType, params: VKPayActionParamsMap[ActionType], appId = null) {
    return BridgePlus.send('VKWebAppOpenPayForm', {
      app_id: appId || BridgePlus.getStartParams().appId,
      action,
      params,
    });
  }

  /**
   * Включение уведомлений
   * Позволяет запросить у пользователя разрешение на отправку уведомлений от приложения.
   * @returns {Promise}
   */
  static allowNotifications() {
    return BridgePlus.send('VKWebAppAllowNotifications', {});
  }

  /**
   * Выключение уведомлений
   * Позволяет отключить уведомления от приложения.
   * @returns {Promise}
   */
  static denyNotifications() {
    return BridgePlus.send('VKWebAppDenyNotifications', {});
  }

  /**
   * Добавление сервиса в избранные
   * вызывает окно запроса на добавление сервиса в избранное.
   * @return {Promise<{result:boolean}>}
   */
  static addToFavorites() {
    return BridgePlus.send('VKWebAppAddToFavorites', {});
  }

  /**
   * Сканирование QR-кода
   * позволяет открыть камеру для считывания QR-кода и получить результат сканирования. (только для мобильных устройств)
   * @return {Promise<{code_data:string}>}
   */
  static openCodeReader() {
    return BridgePlus.send('VKWebAppOpenCodeReader', {});
  }

  static canOpenCodeReader() {
    return VkBridge.supports('VKWebAppOpenCodeReader');
  }

  /**
   * Сканирование QR-кода
   * Позволяет открыть камеру для считывания QR-кода и получить результат сканирования.
   * @deprecated openCodeReader
   * @returns {Promise}
   */
  static openQR() {
    return BridgePlus.send('VKWebAppOpenQR', {});
  }

  /**
   * Установка хэша
   * Позволяет установить новое значение хэша
   * @returns {Promise}
   */
  static setLocation(location: string) {
    return BridgePlus.send('VKWebAppSetLocation', { location });
  }

  /**
   * Подписка на сообщения сообщества
   * Позволяет запросить у пользователя разрешение на отправку сообщений от имени сообщества.
   * @param {int} groupId - идентификатор сообщества
   * @param {string} key - произвольная строка. Этот параметр можно использовать для идентификации пользователя.
   * Его значение будет возвращено в событии message_allow Callback API.
   * @returns {Promise}
   */
  static allowMessagesFromGroup(groupId: number, key: string) {
    return BridgePlus.send('VKWebAppAllowMessagesFromGroup', { group_id: groupId, key });
  }

  /**
   * Получение токена сообщества
   * @param {string} scope stories,photos,app_widget,messages,docs,manage
   * @param {number|null} groupId
   * @param {number|null} appId
   */
  static getCommunityAuthToken(scope = 'messages', groupId = null, appId = null) {
    return BridgePlus.send('VKWebAppGetCommunityToken', {
      scope,
      app_id: appId || BridgePlus.getStartParams().appId,
      group_id: groupId || BridgePlus.getStartParams().groupId,
    });
  }

  /**
   * Добавление сервиса в сообщество
   * Обратите внимание: для вызова в управлении приложением https://vk.com/editapp?id={app_id}
   * должна быть установлена галочка напротив "Разрешить установку в сообществах".
   * Приложение должно быть включено и доступно всем.
   * @return {Promise<{group_id:number}>}
   */
  static addToCommunity() {
    return BridgePlus.send('VKWebAppAddToCommunity', {});
  }

  /**
   * Предпросмотр виджета сообщества
   * Виджетам приложений сообществ посвящено отдельное руководство. (https://vk.com/dev/objects/appWidget) (https://vk.com/dev/apps_widgets)
   * @param {"text" | "list" | "table" | "tiles" | "compact_list" | "cover_list" | "match" | "matches"} type
   * @param {string} code
   * @param {number|null}groupId
   * @throws BridgePlusError
   * @return {Promise<{result:boolean}>}
   */
  static showCommunityWidgetPreviewBox(type: CommunityWidgetType, code: string, groupId = null) {
    return BridgePlus.send('VKWebAppShowCommunityWidgetPreviewBox', {
      type, code, group_id: groupId || BridgePlus.getStartParams().groupId,
    });
  }

  /**
   * Отправка события в сообщество
   * @param payload
   * @param {number|null} groupId
   * @return {Promise<{result:boolean}>}
   */
  static sendPayload(payload: string, groupId = null) {
    return BridgePlus.send('VKWebAppSendPayload', {
      group_id: groupId || BridgePlus.getStartParams().groupId,
      payload,
    });
  }

  /**
   * Вступление в сообщество
   * Позволяет пользователю вступить в сообщество.
   * @param {int} groupId - идентификатор сообщества
   * @returns {Promise}
   */
  static joinGroup(groupId: number) {
    return BridgePlus.send('VKWebAppJoinGroup', { group_id: groupId });
  }

  /**
   * Открытие другого приложения
   * @param {int} appId - идентификатор приложения, которое должно быть открыто
   * @param {string} location - хэш, строка после # в URL вида https://vk.com/app123456#
   * @returns {Promise}
   */
  static openApp(appId: number, location = '') {
    return BridgePlus.send('VKWebAppOpenApp', { app_id: appId, location });
  }

  /**
   * @return {boolean}
   */
  static canOpenApp() {
    return VkBridge.supports('VKWebAppOpenApp');
  }

  /**
   * Закрытие приложения
   * @param {"success"|"failed"} status
   * @param {object} payload
   * @return {Promise}
   */
  static close(status: AppCloseStatus = 'success', payload = {}) {
    return BridgePlus.send('VKWebAppClose', { status, payload });
  }

  static canClose() {
    return VkBridge.supports('VKWebAppClose');
  }

  /**
   * Копирование текста в буфер обмена
   * @param text
   * @return {Promise<{result:boolean}>}
   */
  static copyText(text: string) {
    return BridgePlus.send('VKWebAppCopyText', { text });
  }

  /**
   *
   * @return {boolean}
   */
  static canCopyText() {
    return VkBridge.supports('VKWebAppCopyText');
  }

  /**
   * Изменение внешнего вида клиента
   * Клиент устанавливает тему для иконок в статус-баре исходя из параметра
   * status_bar_style и цвет статус-бара исходя из параметра action_bar_color.
   * @param {"light" | "dark"} statusBarStyle - тема для иконок статус-бара. Возможные варианты: "light", "dark"
   * @param {string} actionBarColor -  цвет экшн-бара. Возможные варианты: hex-код (#00ffff), "none" - прозрачный.
   * @param {string} navigation_bar_color цвет нав-бара. Возможные варианты: hex-код (#00ffff). Работает только на Android
   * Параметр работает только на Android
   * @returns {Promise}
   */
  static setViewSettings(statusBarStyle: AppearanceType, actionBarColor?: string, navigation_bar_color?: string) {
    let params: { status_bar_style: AppearanceType; action_bar_color?: string | undefined; navigation_bar_color?: string | undefined } = { status_bar_style: statusBarStyle };
    if (actionBarColor) {
      params.action_bar_color = actionBarColor;
    }
    if (navigation_bar_color) {
      params.navigation_bar_color = navigation_bar_color;
    }
    return BridgePlus.send('VKWebAppSetViewSettings', params).catch((e) => {
      throw castToError(e, 'VKWebAppSetViewSettings');
    });
  }

  static supportSetViewSettings() {
    return VkBridge.supports('VKWebAppSetViewSettings');
  }

  static setViewSettingsIf(statusBarStyle: AppearanceType, actionBarColor?: string, navigation_bar_color?: string) {
    if (BridgePlus.supportSetViewSettings()) {
      return BridgePlus.setViewSettings(statusBarStyle, actionBarColor, navigation_bar_color);
    } else {
      return Promise.resolve();
    }
  }

  /**
   * Прокрутка окна приложения
   * Инициирует скроллинг окна браузера по вертикали.
   * @param {int} top - смещение скролла относительно нулевой координаты окна. Верх страницы: top === 0
   * @param {int} speed
   * @returns {Promise}
   */
  static scroll(top: number, speed = 100) {
    return BridgePlus.send('VKWebAppScroll', { top, speed });
  }

  /**
   *
   * @return {boolean}
   */
  static supportScroll() {
    return VkBridge.supports('VKWebAppScroll');
  }

  /**
   * Изменение размеров окна приложения
   * Инициирует изменение ширины и высоты элемента IFrame.
   * @param {int} width - ширина окна. Может принимать значения от 600px до 1000px
   * @param {int} height - высота окна. Может принимать значения от 500px до 4050px.
   * @returns {Promise}
   */
  static resizeWindow(width: number, height: number) {
    return BridgePlus.send('VKWebAppResizeWindow', { width, height });
  }

  /**
   * Вызов карточки контактов
   * «Карточка контактов» — это то место, где пользователь указывает контактные данные (номер телефона, адрес, e-mail),
   * которыми он готов поделиться с сервисами сторонних разработчиков.
   * @param {"phone"|"email"|"address"[]} type - массив строк. Возможные значения: phone, email, address
   * @returns {Promise}
   */
  static getPersonalCard(type: PersonalCardType[]) {
    return BridgePlus.send('VKWebAppGetPersonalCard', { type });
  }

  /**
   * Вызов списка друзей пользователя
   * @param multi
   * @return {Promise<{users:{id:number,first_name:string,last_name:string}[]}>}
   */
  static getFriends(multi: boolean) {
    return BridgePlus.send('VKWebAppGetFriends', { multi });
  }

  static getVkBridge() {
    return VkBridge;
  }

  /**
   * Получение значения ключей
   * @param {string[]} keys
   * @return {Promise<{keys:{key:string,value:string}[]}>}
   */
  static storageGet(keys: string[]) {
    return exponentialBackoffAnyError(() => BridgePlus.send('VKWebAppStorageGet', { keys }), (e) => {
      BridgePlus.log('VKWebAppStorageGetFailed retrying', e);
      return false;
    });
  }

  /**
   * Установка значения переменной
   * @param {string} key
   * @param {string} value
   * @return {Promise<{result:boolean}>}
   */
  static storageSet(key: string, value: string) {
    return exponentialBackoffAnyError(() => BridgePlus.send('VKWebAppStorageSet', { key, value }), (e) => {
      BridgePlus.log('VKWebAppStorageSetFailed retrying', e);
      return false;
    });
  }

  /**
   * Получение списка ключей
   * @param {number} count
   * @param {number} offset
   */
  static storageGetKeys(count = 20, offset = 0) {
    return exponentialBackoffAnyError(() => BridgePlus.send('VKWebAppStorageGetKeys', { count, offset }), (e) => {
      BridgePlus.log('VKWebAppStorageGetKeysFailed retrying', e);
      return false;
    });
  }

  /**
   * Получение значения ключа
   * @param key
   * @param defaultValue
   * @return {Promise<string>} пустая строка если ключа нет
   */
  static async storageGetKey(key: string, defaultValue = '') {
    try {
      const data = await BridgePlus.storageGet([key]);
      if (data.keys.length) {
        return data.keys[0].value;
      }
      return '';
    } catch (e) {
      return defaultValue;
    }
  }

  /**
   * @param keys
   */
  static async storageGetKeyMap(keys: string[]) {
    try {
      const data = await BridgePlus.storageGet(keys);
      const res: { [key: string]: string } = {};
      keys.forEach((name) => res[name] = '');
      data.keys.forEach((item) => res[item.key] = item.value);
      return res;
    } catch (e) {
      return {};
    }
  }

  /**
   * @param method
   * @param props
   * @param contextId строка для записи в логи
   * @return {Promise}
   */
  // eslint-disable-next-line max-len
  static send<K extends AnyRequestMethodName>(method: K, props?: RequestProps<K> & RequestIdProp, contextId?: string): Promise<K extends AnyReceiveMethodName ? ReceiveData<K> : void> {
    const requestId = contextId || getContextId();
    BridgePlus.log(`[${requestId}] ${method} start`, props);
    defaultStat.begin(method, props, requestId);
    const saveStack = new Error('saved error stack');
    return VkBridge.send(method, props)
      .then((res) => {
        BridgePlus.log(`[${requestId}] ${method} done`, props);
        defaultStat.end(method, props, requestId, true);
        return res;
      })
      .catch((e) => {
        const err = castToError(e, method);
        if (!e.stack && err.stack && saveStack.stack) {
          err.stack += `\n${saveStack.stack.substr(saveStack.stack.indexOf('\n') + 1)}`;
        }
        BridgePlus.log(`[${requestId}] ${method} failed`, props, err.message, err.code, err.type);
        defaultStat.end(method, props, requestId, false);
        throw err;
      });
  }

  /**
   * Публикация истории
   * @param {object} params
   * @return {Promise}
   */
  static showStoryBox(params: RequestProps<'VKWebAppShowStoryBox'> & RequestIdProp) {
    return BridgePlus.send('VKWebAppShowStoryBox', params);
  }

  /**
   * @return {boolean}
   */
  static supportShowStoryBox() {
    return VkBridge.supports('VKWebAppShowStoryBox');
  }

  static tapticImpactOccurred(params: { style: TapticVibrationPowerType } = { 'style': 'light' }) {
    return BridgePlus.send('VKWebAppTapticImpactOccurred', params);
  }

  static tapticNotificationOccurred(params: { type: TapticNotificationType } = { 'type': 'success' }) {
    return BridgePlus.send('VKWebAppTapticNotificationOccurred', params);
  }

  /**
   *
   * @return {boolean}
   */
  static supportTapticNotificationOccurred() {
    return VkBridge.supports('VKWebAppTapticNotificationOccurred');
  }

  /**
   *
   * @return {boolean}
   */
  static supportTapticImpactOccurred() {
    return VkBridge.supports('VKWebAppTapticImpactOccurred');
  }

  /**
   * @param {function(string)} callback
   */
  static addLogCallback(callback: (msg: string, ...rest: any[]) => void) {
    BridgePlus.logCallback = callback;
  }

  static log(message: string, ...rest: any[]) {
    if (BridgePlus.logCallback) {
      BridgePlus.logCallback(message, ...rest);
    }
  }

  static logCallback: ((msg: string, ...rest: any[]) => void) | null = null;
}
