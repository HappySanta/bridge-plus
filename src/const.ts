
export const VK_API_AUTH_FAIL = 5
export const VK_API_UNKNOWN_ERROR = 1
export const VK_API_TOO_MANY_REQUEST = 6
export const VK_API_TOO_MANY_SAME_ACTIONS = 9

export const USER_ALLOW_NOT_ALL_RIGHTS = 10000

/*
Считается @in что если вызов апи вернулся с этим кодом, то запрос можно повторить
 */
export const SOFT_ERROR_CODES = [
  VK_API_UNKNOWN_ERROR, //Произошла неизвестная ошибка.
  VK_API_TOO_MANY_REQUEST, //Слишком много запросов в секунду.
  VK_API_TOO_MANY_SAME_ACTIONS, //Слишком много однотипных действий.
]
