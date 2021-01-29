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
  
})
```
