# Bridge plus

Набор инструментов для упрощения взаимодействия с vk-bridge.

### Получение параметров запуска

```ts
import {BridgePlus} from "@happysanta/bridge-plus";

const userId = BridgePlus.getStartParams().userId;
const groupId = BridgePlus.getStartParams().groupId;
const appId = BridgePlus.getStartParams().appId;

// true/false флаг если поиложение открыть на vk.com/appXXXX
const isDesktop = BridgePlus.getStartParams().isDesktop();
```

### Запрос к апи вк 
библиотека сама получит access_token и обновит его если 
сменился ip, также повторит запрос до 10 раз с exponental backoff в случае 
ошибок сети или недоступности сервера

```ts
import {BridgePlus,isUserError,VkErrorTypes} from "@happysanta/bridge-plus";

try {
  const user = await BridgePlus.api("users.get", {})
} catch(e) {
  if (isUserError(e)) {
    // Пользователь запретил доступ
    // т.е e у него появилось окно "Разрешить приложению досутп к общей инфоммации"
    // и в нем от надал нет
  } else {
    // Произошла какая-то другая ошибка
    // в e.type находится тип ошибки: network_error api_error client_error access_error
    if (e.type === VkErrorTypes.NETWORK_ERROR) {
      // Ошбика сети -- у пользователя пропал интернет
      // такое бывает если включить режим полета или ехать в метро
      console.error('Ошибка сети')
    } else {
      console.error(`Api error code:${e.code} message:${e.message}`)
    }
  }
}
```

Если требуется токен со специальными правами, то scope прав можно передать 3 аргументом.

```ts
import {BridgePlus} from "@happysanta/bridge-plus";


try {
  const user = await BridgePlus.api("friends.search", {}, "friends")
} catch(e) {
  console.error(`Api error code:${e.code} message:${e.message}`)
}
```

Рекомендуется всегда вызывать BridgePlus.api с одинаковым 3 аргументом, чтобы у пользователя не появлялось несколько окон с запросом доступа.
Например: если у вас есть вызовы для которых нужны права friends и вызовы с правами groups то необходимо всегда передавать 4 аргумент `"friends,groups"`. Даже если вы делаете запрос users.get для которого эти права не нужны. В противном случае пользователь может несколько раз увидеть окно с запросом доступа отдельно для групп и отдельно для друзей.   


### Вызов методов VkBridge

```typescript

import {BridgePlus} from "@happysanta/bridge-plus";

if (BridgePlus.supports("VKWebAppOpenCodeReader")) {
  const code = await BridgePlus.send("VKWebAppOpenCodeReader");
} else {
  console.log("VKWebAppOpenCodeReader not supported");
}
```

### Обработка ошибок

Все асинхронные методы BridgePlus возвращают объект ошибки `VkError`.

```typescript
import {BridgePlus, VkError, VkErrorTypes, isUserError} from "@happysanta/bridge-plus";

try {
  const {email,sign} = await BridgePlus.getEmail()
} catch (e) {
  // Тип ошибки сообщает о том что именно произошло
  // network_error -- у пользоавтеля пропал интернет
  // api_error -- ошибка апи, например неправильно указаны параметры или нет досутпов к методу
  // client_error -- ошибка клиента вк, например мы неправильно указали прараметы запроса
  // access_error -- пользователь запретил досутп или, например, закрыл окно публикации поста
  // UNKNOWN_TYPE -- произошло непонятно что, надо смотреть code и message
  if (e.type === VkErrorTypes.NETWORK_ERROR) {
    console.log("Network problem");
  }
  
  // Если бы мы вызыали диалог шаринга, то пользователь мог отказаться от него
  // в этом случае придет такой тип ошибки
  if (e.type === VkErrorTypes.ACCESS_ERROR) {
    console.log("User reject request");
  }
  
  // вместо e.type === VkErrorTypes.ACCESS_ERROR можно воспользоваться функцией
  // isUserError
  if (isUserError(e)) {
    // пользователь что-то запретил или отказался от чего-то
    // как правило в этом случае никаких действий не требуется
  } else {
    // Произошла какая-то техническая ошибка
    // В этом случае можно показать пользователю сообщение об ошибке
    console.log(`Bridge call error code:${e.code} message:${e.message}`)
  }
}
```

### Логирование вызовов к bridge-plus

```typescript
BridgePlus.addLogCallback((msg, ...args) => {
    console.log(`Bridge plus: ${msg}`, args);
    
    // Пример интегарции с Sentry 
    Sentry.addBreadcrumb({
      type: 'bridge',
      level: Sentry.Severity.Info,
      message: msg,
      data: { args },
    });
  });
```


### Работа со storage

- storage - это хранилище данных типа ключ значение, данные хранятся на серверах ВКонтакте
- ключ - это строка из латинских символов [a-zA-Z_\-0-9] максимум 100 символов
- значение это строка длиной 4096 байт, если вы хотите сохранять json или текс, то рекомендуется оборачивать его в base64 чтобы избежать проблем с кодировкой. 
- https://vk.com/dev/storage.set
- https://vk.com/dev/storage.get

Поскольку данные хранятся на сервере, любая операция чтения/записи может завершиться с ошибкой, например из-за проблем с сетью.
Поэтому при чтении ключей из стора необходимо всегда указывать значение по умолчанию, которое будет возвращено в случе если возникнет сетевая ошибка.
Функции `storageGetKey` `storageSet` `storageGetKeyMap` повторяют запросы в случае кратковременных сетевых проблем.

```typescript
import {BridgePlus} from "@happysanta/bridge-plus";


// Получение значение одного ключа, если во время запроса возникнет ошибка сети будет возвращена пустая строка
const lastEnter = await BridgePlus.storageGetKey("LAST_ENTER", "");

// Записть значения ключа
await BridgePlus.storageSet("LAST_ENTER", Date.now());

// Получение нескольких ключей, в случае ошибки storageGetKeyMap возвращает пустой объект
const { HAS_ORDER = '', LAST_ORDER_ID = '' } = await BridgePlus.storageGetKeyMap(['HAS_ORDER', 'LAST_ORDER_ID']);
```

Рекомендуется использовать эти методы для работы со storage вместо прямого вызова метода `VKWebAppStorageGet` и ему подобных. 
