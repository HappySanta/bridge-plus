
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

export function normalizeScope(scope:string|string[]):string {
  if (typeof scope === 'string') {
    return normalizeScope(scope.split(",").map(s => s.trim()))
  } else {
    return scope.concat([]).sort( (a,b) => a.localeCompare(b) ).join(',')
  }
}


export function printValue(value:any, req:number = 0):string {
  const type = typeof value
  const isNull = value === null
  if (isNull) {
    return `(null) null`
  } else if (type === "object") {
    return `(Object[${value.constructor.name}]) ${recursivePrintObject(value, req + 1)}`
  } else {
    return `(${type}) ${value.toString()}`
  }
}

export function recursivePrintObject(obj:any, req:number = 0): string {
  if (req > 3) {
    return 'Object'
  }
  if (typeof obj === "object") {
    let res = `{`
    for (let key in obj) {
      if (!obj.hasOwnProperty(key)) continue;
      const value = (obj as { [key: string]: any })[key]
      res += `${key}: ${printValue(value)} \n`
    }
    res += `}`
    return res
  } else {
    return printValue(obj)
  }
}

export function prettyPrintAny(x: any):string {
  try {
    const res = JSON.stringify(x);
    if (res === '{}') {
      const objectPrint = recursivePrintObject(x);
      if (objectPrint.length > res.length) {
        return objectPrint
      } else {
        return res
      }
    } else {
      return res
    }
  } catch (e) {
    const castError = e?.message || "Unknown cast error";
    const constructor = x.constructor.name;
    return `Unknown error: castError ${castError} ${constructor} ${prettyPrintAny(x)}`
  }
}
