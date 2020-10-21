export class Queue {
  private lock: boolean;
  private list: [() => Promise<any>, (a: any) => void, (e: any) => void][];

  constructor() {
    this.lock = false
    this.list = []
  }

  async call<T>(callback: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.list.push([callback, resolve, reject])
      this.runQueue()
    })
  }

  runQueue() {
    if (this.lock) {
      return
    }
    const job = this.list.shift()
    if (!job) {
      return
    }

    this.lock = true

    const [callback, resolve, reject] = job
    callback()
      .then(res => {
        resolve(res)
        this.restartQueue()
      })
      .catch(e => {
        reject(e)
        this.restartQueue()
      })
  }

  restartQueue() {
    this.lock = false
    this.runQueue()
  }

}
