import {VkError} from "./VkError";
import {gp} from "./helpers";


export function castToError(object:any, description:string) {
  if (object instanceof Error) {
    return object
  }
  const objectType = (typeof object)
  const objectIsNull = (object === null)
  const error = new VkError(JSON.stringify(object) || `Receive unknown error message from vk-bridge: ${object}\n type: ${objectType} isNull: ${objectIsNull ? 'yes' : 'no'} see @happysanta/vk-apps-sdk`)
  error.origin = object

  error.type = gp(object, 'error_type') || error.type

  if (gp(object, 'error_data.error_reason')) {
    if (typeof gp(object, 'error_data.error_reason') === 'string') {
      error.message = `#${object.error_data.error_code} ${object.error_data.error_reason}`
      error.code = gp(object, 'error_data.error_code') || error.code
    } else if (object.error_data.error_reason.error_msg) {
      error.message = `API ERROR: #${object.error_data.error_reason.error_code} ${object.error_data.error_reason.error_msg}`
      error.code = object.error_data.error_reason.error_code
      error.request_params = object.error_data.error_reason.request_params as { key: string, value: string }[]
      error.type = VkError.API_ERROR
      if (Array.isArray(error.request_params)) {
        error.request_params.forEach(node => {
          if (node && node.key === "method") {
            error.message += ' \nmethod: ' + node.value
          }
        })
      }
    }
  }
  if (gp(object, 'error_data.error_code')) {
    error.code = gp(object, 'error_data.error_code')
  }
  if (object && object.error_type) {
    error.type = object.error_type
    //На андроиде такая ошибка приходит при остуствии интернета и запросе токена
    if (error.type === 'auth_error') {
      error.type = VkError.CLIENT_ERROR
    }
  }

  //iOS ошибка сети во время вызова GetAuthToken
  if (gp(object, "error_type") === 'auth_error' && gp(object, 'error_data.error_code') === 0) {
    error.type = VkError.NETWORK_ERROR
  }

  //На iOS такой набор ошибок в случае пропажи интернета во время вызова метода апи
  if (error.code === 3 && error.type === 'client_error') {
    error.type = VkError.NETWORK_ERROR
  }
  //Пользователь что-то запретил
  if (error.code === 4 && error.type === 'client_error') {
    error.type = VkError.ACCESS_ERROR
  }


  //Пользователь что-то запретил (такое приходи когда на вебе отказаться от публикации записи на стене)
  if (error.message.indexOf('Operation denied by user') !== -1) {
    error.type = VkError.ACCESS_ERROR
  }

  //VKWebAppOpenPayForm пользователь закрыл окно оплаты на вебе
  if (gp(object, "error_type") === "client_error") {
    if (gp(object, "error_data.error_code") === 1) {
      if (gp(object, "error_data.error_reason.type") === "transaction") {
        if (gp(object, "error_data.error_reason.error_msg") === "VK Pay payment failed") {
          error.type = VkError.ACCESS_ERROR
        }
      }
    }
  }

  // Кастуем ситацию запроса токена и отстуствия интернета на андроид
  if (object && object.error_type && object.error_type === 'auth_error') {
    if (object && object.error_data) {
      const data = object.error_data
      if (data.error_reason === "" && data.error === "") {
        error.type = VkError.NETWORK_ERROR
        error.message = "Network error"
      }
    }
  }

  // Обработка ситации запроса токена и отстуствия интернета на iOS https://vk.com/bug204658
  if (object && object.error_type && object.error_type === 'auth_error') {
    if (object && object.error_data) {
      const data = object.error_data
      // Коды ошибок подсмотрели тут https://github.com/apple/swift/blob/3a75394c670bb7143397327ac7bf5b5fe8d50588/stdlib/public/SDK/Foundation/NSError.swift#L642
      if (data.error_code > -4000) {
        error.type = VkError.NETWORK_ERROR
        error.message = data.error_description || error.message
      }
    }
  }
  if (description) {
    error.message += " " + description
  }
  error.message += " type:" + error.type + " code:" + error.code
  return error
}
