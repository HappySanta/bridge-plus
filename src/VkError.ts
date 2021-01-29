export enum VkErrorTypes {
  UNKNOWN_TYPE = 'UNKNOWN_TYPE',
  CLIENT_ERROR = 'client_error',
  API_ERROR = 'api_error',
  NETWORK_ERROR = 'network_error',
  ACCESS_ERROR = 'access_error',
}

export class VkError extends Error {
  public type: string;
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
