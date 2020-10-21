
export function normalize(str:string) {
  return str.toString().split(',').map(x => x.trim().toLowerCase()).sort().join(",")
}


export function isEqualScope(left:any, right:any) {
  /*
   * Возможно иногда не приходят scope с каких-то клиентов
   * в этом случае надеемся что они выданы
   */
  if (typeof right !== 'string') {
    return true
  }
  if (typeof left !== 'string') {
    return true
  }
  return normalize(left) === normalize(right)
}

export function delay(time:number):Promise<void> {
  return new Promise(resolve => setTimeout(resolve, time))
}

/**
 * @param {object} object
 * @param {string[]|number[]|string} path
 * @return {Object|string|number|any|null}
 */
export function getObjectPath(object:any, path:string):any {
  return path.split('.').reduce((buffer, x) => {
    if (buffer && buffer.hasOwnProperty(x)) {
      return buffer[x]
    } else {
      return null
    }
  }, object)
}

export const gp = getObjectPath


export function getContextId():string {
  return Date.now().toString(36)+ "." + Math.ceil(Math.random()*1000000).toString(36)
}


export function trimAccessToken(token:string) {
  return token.substr(0,5)+'...'+token.substr(-5)
}
