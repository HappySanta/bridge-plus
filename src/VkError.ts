export class VkError extends Error {

  static UNKNOWN_TYPE = 'UNKNOWN_TYPE'
  static CLIENT_ERROR = 'client_error'
  static API_ERROR = 'api_error'
  static NETWORK_ERROR = 'network_error'
  static ACCESS_ERROR = 'access_error'
  static USER_REJECT = 'access_error'
  public type: string;
  public code: number = 0;
  public retry: number = 0;
  public origin: any = null;
  public request_params: { key: string, value: string }[] | null = null

  constructor(message: string, type:string = VkError.UNKNOWN_TYPE, code = 0) {
    super(message)
    this.message = message
    this.type = type
    this.code = code
    this.retry = 0
  }
}
