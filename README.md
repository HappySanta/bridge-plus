# Bridge plus

Набор инструментов для упрощения взаимодействия с vk-bridge

Получение параметров запуска

```ts
import {BridgePlus} from "@happysanta/bridge-plus";

const userId = BridgePlus.getStartParams().userId;
const groupId = BridgePlus.getStartParams().groupId;
const appId = BridgePlus.getStartParams().appId;

// true/false флаг если поиложение открыть на vk.com/appXXXX
const isDesktop = BridgePlus.getStartParams().isDesktop();
```

Запрос к апи вк, библиотека сама получит access_token и обновит его если 
сменился ip, также повторит запрос до 10 раз с exponental backoff в случае 
ошибок сети или недоступности сервера

```ts
import {BridgePlus} from "@happysanta/bridge-plus";


BridgePlus.api("users.get", {})
.then( ({response:[user]}) => {
  console.log(user.id)
} )
.catch(e => {
  // приходит типизрованная ошибка VkError
  // e.type может быть один из типов VkErrorTypes UNKNOWN_TYPE client_error api_error network_error access_error
})
```

Если требуется токен со специальными правами, то scope прав можно передать 3 аргументом

```ts
import {BridgePlus} from "@happysanta/bridge-plus";


BridgePlus.api("friends.search", {}, "friends")
.then( ({response}) => {
  console.log(response)
} )
.catch(e => {
  // приходит типизрованная ошибка VkError
  // e.type может быть один из типов VkErrorTypes UNKNOWN_TYPE client_error api_error network_error access_error
})
```
