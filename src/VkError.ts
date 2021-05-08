export enum VkErrorTypes {
  UNKNOWN_TYPE = 'UNKNOWN_TYPE',
  CLIENT_ERROR = 'client_error',
  API_ERROR = 'api_error',
  NETWORK_ERROR = 'network_error',
  ACCESS_ERROR = 'access_error',
}

export class VkError extends Error {
  public type: VkErrorTypes;
  public code = 0;
  public retry = 0;
  public origin: any = null;
  public request_params: Array<{ key: string; value: string }> | null = null;

  constructor(message: string, type: VkErrorTypes, code = 0) {
    super(message);
    this.message = message;
    this.type = type;
    this.code = code;
    this.retry = 0;
  }
}

export function isVkError(e: any): e is VkError {
  return e instanceof VkError;
}

export function isUserError(e: any): boolean {
  return isVkError(e) && e.type === VkErrorTypes.ACCESS_ERROR;
}

export function matchErrorTypeOrUnknown(errorType: string): VkErrorTypes {
  errorType = (errorType || '').toString().toLocaleLowerCase();
  if (errorType === VkErrorTypes.ACCESS_ERROR) {
    return VkErrorTypes.ACCESS_ERROR;
  }
  if (errorType === VkErrorTypes.API_ERROR) {
    return VkErrorTypes.API_ERROR;
  }
  if (errorType === VkErrorTypes.NETWORK_ERROR) {
    return VkErrorTypes.NETWORK_ERROR;
  }
  if (errorType === VkErrorTypes.CLIENT_ERROR) {
    return VkErrorTypes.CLIENT_ERROR;
  }
  return VkErrorTypes.UNKNOWN_TYPE;
}
