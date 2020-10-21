import * as qs from "query-string"
import {VkStartParams} from "./VkStartParams";
import VkObserver, {BridgePlusEventCallback, BridgePlusEventName} from "./VkObserver";
import {
  AnyReceiveMethodName,
  AnyRequestMethodName,
  ReceiveData,
  RequestIdProp,
  RequestProps
} from "@vkontakte/vk-bridge/dist/types/src/types/bridge";
import VkBridge, {
  AppCloseStatus,
  AppearanceType,
  TapticNotificationType,
  TapticVibrationPowerType
} from "@vkontakte/vk-bridge"
import {castToError} from "./castToError";
import {
  CommunityWidgetType,
  PersonalCardType,
  VKPayActionParamsMap,
  VKPayActionType,
  WallPostRequestOptions
} from "@vkontakte/vk-bridge/dist/types/src/types/data";
import {Queue} from "./Queue";
import {delay, getContextId} from "./helpers";
import {defaultAccessTokenFetcher} from "./AccessTokenFetcher";
import {retryCall} from "./RetryCall";
import {VkError} from "./VkError";
import {SOFT_ERROR_CODES, VK_API_AUTH_FAIL} from "./const";

export class BridgePlus {
  static startParams: VkStartParams | null = null
  static startSearch: string = ""
  static defaultApiVersion = '5.103'
  static tokenCache = {}

  /**
   * Возвращает объект с параметрами запуска приложения
   * @returns {VkStartParams}
   */
  static getStartParams(): VkStartParams {
    if (BridgePlus.startParams === null) {
      BridgePlus.startParams = new VkStartParams(qs.parse(window.location.search))
      BridgePlus.startSearch = window.location.search
    }
    return BridgePlus.startParams
  }

  /**
   * Подписаться на событие VkBridge
   */
  static subscribe<T extends AnyReceiveMethodName>(eventType: BridgePlusEventName<T>, callback: BridgePlusEventCallback<T>) {
    VkObserver.subscribe(eventType, callback)
  }

  /**
   * Отписаться от события VkBridge
   */
  static unsubscribe<T extends AnyReceiveMethodName>(eventType: BridgePlusEventName<T>, callback: BridgePlusEventCallback<T>) {
    VkObserver.unsubscribe(eventType, callback)
  }

  /**
   * Проверяет, поддерживается ли событие на текущей платформе.
   * @param {string} method
   * @return {boolean}
   */
  static supports(method: string): boolean {
    return VkBridge.supports(method)
  }

  /**
   * Инициализация VK Connect
   * Первое событие, которое Ваше приложение должно отправить официальному приложению, чтобы начать работу с VK Connect.
   * В противном случае сервис может не работать на мобильных клиентах iOS и Android.
   */
  static init() {
    return BridgePlus.send("VKWebAppInit", {}).catch(e => {
      throw castToError(e, "VKWebAppInit")
    })
  }

  /**
   * Получение данных профиля
   * Позволяет получить основные данные о профиле текущего пользователя.
   * @returns {Promise}
   */
  static getUserInfo() {
    return BridgePlus.send('VKWebAppGetUserInfo', {}).catch(e => {
      throw castToError(e, "VKWebAppGetUserInfo")
    })
  }

  /**
   * Получение номера телефона
   * Позволяет получить номер телефона текущего пользователя.
   * Официальное приложение отображает экран с запросом разрешения пользователя на передачу его номера телефона в приложение.
   * @returns {Promise}
   */
  static getPhoneNumber() {
    return BridgePlus.send('VKWebAppGetPhoneNumber', {}).catch(e => {
      throw castToError(e, "VKWebAppGetPhoneNumber")
    })
  }

  /**
   * Получение e-mail
   * Позволяет получить адрес электронной почты пользователя.
   * После вызова отображает экран с запросом прав на доступ к e-mail.
   * @returns {Promise}
   */
  static getEmail() {
    return BridgePlus.send('VKWebAppGetEmail', {}).catch(e => {
      throw castToError(e, "VKWebAppGetEmail")
    })
  }

  /**
   * Получение геопозиции
   * Позволяет получить данные о геопозиции пользователя. Событие не принимает параметров.
   * Официальное приложение показывает окно с запросом разрешения на передачу местоположения.
   * @returns {Promise}
   */
  static getGeodata() {
    return BridgePlus.send('VKWebAppGetGeodata', {}).catch(e => {
      throw castToError(e, "VKWebAppGetGeodata")
    })
  }

  /**
   * Выбор контакта из телефонной книги
   * Открывает окно выбора контактов из телефонной книги на устройстве пользователя.
   * @returns {Promise<{phone:string,first_name:string}>}
   */
  static openContacts() {
    return BridgePlus.send('VKWebAppOpenContacts', {}).catch(e => {
      throw castToError(e, "VKWebAppOpenContacts")
    })
  }

  /**
   * Авторизация пользователя
   * Позволяет запросить права доступа у пользователя и получить ключ для работы с API.
   * Для получения токена без дополнительных прав передайте в параметре пустую строку.
   * @param {string} scope - Список прав доступа, перечисленных через запятую. {@url  https://vk.com/dev/permissions}
   * @param {number|null} appId
   * @returns {Promise}
   */
  static getAuthToken(scope = '', appId?: number) {
    /*
    На iOS замечен баг: не надо вызывать этот метод дважды надо подождать пока предыдуий звершится
     */
    const params = {
      app_id: appId || this.getStartParams().appId,
      scope: scope
    }
    return BridgePlus.getRequestTokenQueue().call(() => BridgePlus.send<"VKWebAppGetAuthToken">('VKWebAppGetAuthToken', params))
  }

  static getRequestTokenQueue(): Queue {
    if (!BridgePlus.tokenQueue) {
      BridgePlus.tokenQueue = new Queue()
    }
    return BridgePlus.tokenQueue
  }

  static tokenQueue = new Queue()

  /**
   * Вызов методов API
   * Позволяет получить результат вызова метода API ВКонтакте.
   * Обратите внимание, что для работы с API нужно передать ключ доступа пользователя с соответствующими правами,
   * полученный с помощью VKWebAppGetAuthToken {@see getAuthToken}
   * @param {string} method - название метода API. {@url https://vk.com/dev/methods}
   * @param {Object} params - параметры метода v lang access_token и так далее
   * @returns {Promise}
   */
  static callAPIMethod(method: string, params: Record<string, string | number> = {}) {
    BridgePlus.log("VKWebAppCallAPIMethod: " + method)
    if (params.v === undefined) {
      params.v = BridgePlus.defaultApiVersion
    }
    return BridgePlus.send<'VKWebAppCallAPIMethod'>('VKWebAppCallAPIMethod', {method, params})
  }

  /**
   * Вызов методов API с запросов токена если нужно
   * Позволяет получить результат вызова метода API ВКонтакте.
   * @param {string} method - название метода API. {@url https://vk.com/dev/methods}
   * @param {Object} params - параметры метода в виде JSON
   * @param {string} scope - права необходимые для этого запроса, через запятую
   * @throws BridgePlusError
   * @returns {Promise<Object>}
   */
  static async api(method: string, params: Record<string, string | number> = {}, scope = "") {
    const requestId = getContextId()
    const p = {...params}

    BridgePlus.log(`api [${requestId}] start call ${method}`)

    if (!p.access_token) {
      p.access_token = await defaultAccessTokenFetcher.fetch(scope, BridgePlus.getStartParams().appId, requestId)
    }

    const MAX_RETRY = 7
    let retry = 0

    do {
      try {
        return await retryCall(async () => await BridgePlus.callAPIMethod(method, p), 5, (e: VkError) => {
          BridgePlus.log(`api [${requestId}] retry fetch ${e.message}`)
        })
      } catch (e) {
        if (!(e instanceof VkError)) {
          throw e
        }
        if (retry >= MAX_RETRY) {
          throw e
        }
        if (e.code === VK_API_AUTH_FAIL) {
          // протух access_token
          defaultAccessTokenFetcher.drop((p.access_token || "").toString())
          p.access_token = await defaultAccessTokenFetcher.fetch(scope, BridgePlus.getStartParams().appId, requestId)
          BridgePlus.log(`api [${requestId}] token lost ${e.message}`)
          await delay(retry * 1000 + 100 + Math.random() * 2000)
        } else if (SOFT_ERROR_CODES.indexOf(e.code) !== -1) {
          BridgePlus.log(`api [${requestId}] soft api error ${e.message}`)
          // незначительная ошибка от апи, можно попробовать еще раз
          await delay(retry * 1000 + 100 + Math.random() * 2000)
        } else {
          throw e
        }
      }

      retry++
    } while (retry <= MAX_RETRY)

    throw new VkError("IMPOSSIBLE api error")
  }

  /**
   * Вызов диалога Share
   * Позволяет поделиться ссылкой
   * @returns {Promise}
   */
  static share(link = "") {
    return BridgePlus.send('VKWebAppShare', {link}).catch(e => {
      throw castToError(e, "VKWebAppShare")
    })
  }

  /**
   * Публикация записей на стене
   * @param {Object} params - См. описание метода wall.post. {@url https://vk.com/dev/wall.post}
   * Позволяет пользователю опубликовать запись на стене
   * @returns {Promise}
   */
  static showWallPostBox(params: WallPostRequestOptions) {
    return BridgePlus.send('VKWebAppShowWallPostBox', params).catch(e => {
      throw castToError(e, "VKWebAppShowWallPostBox")
    })
  }

  /**
   * Нативный просмотр изображений iOS, Android
   * @param {string[]} images
   * @param {number} start_index
   * @return {Promise}
   */
  static showImages(images: string[], start_index = 0) {
    return BridgePlus.send("VKWebAppShowImages", {images, start_index}).catch(e => {
      throw castToError(e, "VKWebAppShowImages")
    })
  }

  static canShowImage() {
    return VkBridge.supports("VKWebAppShowImages")
  }

  /**
   * Получение версии официального приложения
   * Возвращает номер версии официального приложения ВКонтакте.
   * @returns {Promise}
   */
  static getClientVersion() {
    return BridgePlus.send('VKWebAppGetClientVersion', {})
  }

  /**
   * Платёж VK Pay
   * Поднимает экран VK Pay для платежа
   * @param {"pay-to-service"|"pay-to-user"|"pay-to-group"|"transfer-to-group"|"transfer-to-user"} action -
   * @param {{amount:number,description:string,data:object,group_id:number}|{amount:number,description:string,user_id:number}|{description:string,user_id:number}|{description:string,group_id:number}} params - параметры платёжной формы VK Pay
   * @param {number|null} appId
   * @returns {Promise}
   */
  static openPayForm<ActionType extends VKPayActionType>(action: ActionType, params: VKPayActionParamsMap[ActionType], appId = null) {
    return BridgePlus.send('VKWebAppOpenPayForm', {
      app_id: appId || BridgePlus.getStartParams().appId,
      action,
      params
    })
  }

  /**
   * Включение уведомлений
   * Позволяет запросить у пользователя разрешение на отправку уведомлений от приложения.
   * @returns {Promise}
   */
  static allowNotifications() {
    return BridgePlus.send("VKWebAppAllowNotifications", {})
  }

  /**
   * Выключение уведомлений
   * Позволяет отключить уведомления от приложения.
   * @returns {Promise}
   */
  static denyNotifications() {
    return BridgePlus.send('VKWebAppDenyNotifications', {})
  }

  /**
   * Добавление сервиса в избранные
   * вызывает окно запроса на добавление сервиса в избранное.
   * @return {Promise<{result:boolean}>}
   */
  static addToFavorites() {
    return BridgePlus.send("VKWebAppAddToFavorites", {}).catch(e => {
      throw castToError(e, "VKWebAppAddToFavorites")
    })
  }

  /**
   * Сканирование QR-кода
   * позволяет открыть камеру для считывания QR-кода и получить результат сканирования. (только для мобильных устройств)
   * @return {Promise<{code_data:string}>}
   */
  static openCodeReader() {
    return BridgePlus.send("VKWebAppOpenCodeReader", {}).catch(e => {
      throw castToError(e, "VKWebAppOpenCodeReader")
    })
  }

  static canOpenCodeReader() {
    return VkBridge.supports("VKWebAppOpenCodeReader")
  }

  /**
   * Сканирование QR-кода
   * Позволяет открыть камеру для считывания QR-кода и получить результат сканирования.
   * @deprecated openCodeReader
   * @returns {Promise}
   */
  static openQR() {
    return BridgePlus.send('VKWebAppOpenQR', {}).catch(e => {
      throw castToError(e, "VKWebAppOpenQR")
    })
  }

  /**
   * Установка хэша
   * Позволяет установить новое значение хэша
   * @returns {Promise}
   */
  static setLocation(location: string) {
    return BridgePlus.send('VKWebAppSetLocation', {location}).catch(e => {
      throw castToError(e, "VKWebAppSetLocation")
    })
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
    return BridgePlus.send('VKWebAppAllowMessagesFromGroup', {group_id: groupId, key}).catch(e => {
      throw castToError(e, "VKWebAppAllowMessagesFromGroup")
    })
  }

  /**
   * Получение токена сообщества
   * @param {string} scope stories,photos,app_widget,messages,docs,manage
   * @param {number|null} groupId
   * @param {number|null} appId
   */
  static getCommunityAuthToken(scope = "messages", groupId = null, appId = null) {
    return BridgePlus.send("VKWebAppGetCommunityToken", {
      scope,
      app_id: appId || BridgePlus.getStartParams().appId,
      group_id: groupId || BridgePlus.getStartParams().groupId
    }).catch(e => {
      throw castToError(e, 'VKWebAppGetCommunityAuthToken')
    })
  }

  /**
   * Добавление сервиса в сообщество
   * Обратите внимание: для вызова в управлении приложением https://vk.com/editapp?id={app_id}
   * должна быть установлена галочка напротив "Разрешить установку в сообществах".
   * Приложение должно быть включено и доступно всем.
   * @return {Promise<{group_id:number}>}
   */
  static addToCommunity() {
    return BridgePlus.send("VKWebAppAddToCommunity", {}).catch(e => {
      throw castToError(e, "VKWebAppAddToCommunity")
    })
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
    return BridgePlus.send("VKWebAppShowCommunityWidgetPreviewBox", {
      type, code, group_id: groupId || BridgePlus.getStartParams().groupId
    }).catch(e => {
      throw castToError(e, 'VKWebAppShowCommunityWidgetPreviewBox')
    })
  }


  /**
   * Отправка события в сообщество
   * @param payload
   * @param {number|null} groupId
   * @return {Promise<{result:boolean}>}
   */
  static sendPayload(payload: string, groupId = null) {
    return BridgePlus.send("VKWebAppSendPayload", {
      group_id: groupId || BridgePlus.getStartParams().groupId,
      payload
    }).catch(e => {
      throw castToError(e, 'VKWebAppSendPayload')
    })
  }

  /**
   * Вступление в сообщество
   * Позволяет пользователю вступить в сообщество.
   * @param {int} groupId - идентификатор сообщества
   * @returns {Promise}
   */
  static joinGroup(groupId: number) {
    return BridgePlus.send('VKWebAppJoinGroup', {group_id: groupId}).catch(e => {
      throw castToError(e, "VKWebAppJoinGroup")
    })
  }

  /**
   * Открытие другого приложения
   * @param {int} appId - идентификатор приложения, которое должно быть открыто
   * @param {string} location - хэш, строка после # в URL вида https://vk.com/app123456#
   * @returns {Promise}
   */
  static openApp(appId: number, location = '') {
    return BridgePlus.send('VKWebAppOpenApp', {app_id: appId, location}).catch(e => {
      throw castToError(e, "VKWebAppOpenApp")
    })
  }

  /**
   * @return {boolean}
   */
  static canOpenApp() {
    return VkBridge.supports('VKWebAppOpenApp')
  }


  /**
   * Закрытие приложения
   * @param {"success"|"failed"} status
   * @param {object} payload
   * @return {Promise}
   */
  static close(status: AppCloseStatus = "success", payload = {}) {
    return BridgePlus.send("VKWebAppClose", {status, payload}).catch(e => {
      throw castToError(e, "VKWebAppClose")
    })
  }

  static canClose() {
    return VkBridge.supports("VKWebAppClose")
  }

  /**
   * Копирование текста в буфер обмена
   * @param text
   * @return {Promise<{result:boolean}>}
   */
  static copyText(text: string) {
    return BridgePlus.send("VKWebAppCopyText", {text}).catch(e => {
      throw castToError(e, "VKWebAppCopyText")
    })
  }

  /**
   *
   * @return {boolean}
   */
  static canCopyText() {
    return VkBridge.supports("VKWebAppCopyText")
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
    let params: { status_bar_style: AppearanceType; action_bar_color?: string | undefined; navigation_bar_color?: string | undefined; } = {status_bar_style: statusBarStyle}
    if (actionBarColor) {
      params.action_bar_color = actionBarColor
    }
    if (navigation_bar_color) {
      params.navigation_bar_color = navigation_bar_color
    }
    return BridgePlus.send('VKWebAppSetViewSettings', params).catch(e => {
      throw castToError(e, "VKWebAppSetViewSettings")
    })
  }

  static supportSetViewSettings() {
    return VkBridge.supports("VKWebAppSetViewSettings")
  }

  static setViewSettingsIf(statusBarStyle: AppearanceType, actionBarColor?: string, navigation_bar_color?: string) {
    if (BridgePlus.supportSetViewSettings()) {
      return BridgePlus.setViewSettings(statusBarStyle, actionBarColor, navigation_bar_color)
    } else {
      return Promise.resolve()
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
    return BridgePlus.send('VKWebAppScroll', {top, speed}).catch(e => {
      throw castToError(e, "VKWebAppScroll")
    })
  }

  /**
   *
   * @return {boolean}
   */
  static supportScroll() {
    return VkBridge.supports('VKWebAppScroll')
  }

  /**
   * Изменение размеров окна приложения
   * Инициирует изменение ширины и высоты элемента IFrame.
   * @param {int} width - ширина окна. Может принимать значения от 600px до 1000px
   * @param {int} height - высота окна. Может принимать значения от 500px до 4050px.
   * @returns {Promise}
   */
  static resizeWindow(width: number, height: number) {
    return BridgePlus.send('VKWebAppResizeWindow', {width, height}).catch(e => {
      throw castToError(e, "VKWebAppResizeWindow")
    })
  }

  /**
   * Вызов карточки контактов
   * «Карточка контактов» — это то место, где пользователь указывает контактные данные (номер телефона, адрес, e-mail),
   * которыми он готов поделиться с сервисами сторонних разработчиков.
   * @param {"phone"|"email"|"address"[]} type - массив строк. Возможные значения: phone, email, address
   * @returns {Promise}
   */
  static getPersonalCard(type: PersonalCardType[]) {
    return BridgePlus.send('VKWebAppGetPersonalCard', {type}).catch(e => {
      throw castToError(e, "VKWebAppGetPersonalCard")
    })
  }


  /**
   * Вызов списка друзей пользователя
   * @param multi
   * @return {Promise<{users:{id:number,first_name:string,last_name:string}[]}>}
   */
  static getFriends(multi: boolean) {
    return BridgePlus.send("VKWebAppGetFriends", {multi}).catch(e => {
      throw castToError(e, "VKWebAppGetFriends")
    })
  }


  static getVkBridge() {
    return VkBridge
  }

  /**
   * Получение значения ключа
   * @param {string[]} keys
   * @return {Promise<{keys:{key:string,value:string}[]}>}
   */
  static storageGet(keys: string[]) {
    return BridgePlus.send("VKWebAppStorageGet", {keys}).catch(e => {
      throw castToError(e, "VKWebAppStorageGet")
    })
  }

  /**
   * Установка значения переменной
   * @param {string} key
   * @param {string} value
   * @return {Promise<{result:boolean}>}
   */
  static storageSet(key: string, value: string) {
    return BridgePlus.send("VKWebAppStorageSet", {key, value}).catch(e => {
      throw castToError(e, "VKWebAppStorageSet")
    })
  }

  /**
   * Получение ключей
   * @param {number} count
   * @param {number} offset
   */
  static storageGetKeys(count = 20, offset = 0) {
    return BridgePlus.send("VKWebAppStorageGetKeys", {count, offset}).catch(e => {
      throw castToError(e, "VKWebAppStorageGetKeys")
    })
  }

  /**
   * @param method
   * @param props
   * @return {Promise}
   */
  static send<K extends AnyRequestMethodName>(method: K, props?: RequestProps<K> & RequestIdProp): Promise<K extends AnyReceiveMethodName ? ReceiveData<K> : void> {
    const saveStack = new Error("saved error stack")
    return VkBridge.send(method, props).catch(e => {
      const err = castToError(e, method)
      if (!e.stack && err.stack && saveStack.stack) {
        err.stack += "\n"+ saveStack.stack.substr(saveStack.stack.indexOf("\n")+1)
      }
      throw err
    })
  }

  /**
   * Публикация истории
   * @param {object} params
   * @return {Promise}
   */
  static showStoryBox(params: RequestProps<"VKWebAppShowStoryBox"> & RequestIdProp) {
    return BridgePlus.send('VKWebAppShowStoryBox', params).catch(e => {
      throw castToError(e, "VKWebAppShowStoryBox")
    })
  }

  /**
   * @return {boolean}
   */
  static supportShowStoryBox() {
    return VkBridge.supports('VKWebAppShowStoryBox')
  }

  static tapticImpactOccurred(params: { style: TapticVibrationPowerType } = {"style": "light"}) {
    return BridgePlus.send('VKWebAppTapticImpactOccurred', params).catch(e => {
      throw castToError(e, "VKWebAppTapticImpactOccurred")
    })
  }

  static tapticNotificationOccurred(params: { type: TapticNotificationType } = {"type": "success"}) {
    return BridgePlus.send('VKWebAppTapticNotificationOccurred', params).catch(e => {
      throw castToError(e, "VKWebAppTapticNotificationOccurred")
    })
  }

  /**
   *
   * @return {boolean}
   */
  static supportTapticNotificationOccurred() {
    return VkBridge.supports('VKWebAppTapticNotificationOccurred')
  }

  /**
   *
   * @return {boolean}
   */
  static supportTapticImpactOccurred() {
    return VkBridge.supports('VKWebAppTapticImpactOccurred')
  }

  /**
   * @param {function(string)} callback
   */
  static addLogCallback(callback: (msg: string) => void) {
    BridgePlus.logCallback = callback
  }

  static log(message: string) {
    if (BridgePlus.logCallback) {
      BridgePlus.logCallback(message)
    }
  }

  static logCallback: ((msg: string) => void) | null = null
}
