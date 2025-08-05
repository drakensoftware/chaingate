export abstract class BroadcastedTransaction {
    abstract readonly transactionId: string

    abstract isConfirmed(): Promise<boolean>
    waitToBeConfirmed(): Promise<void> {
        // eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve) => {
            // First check before starting the interval
            if (await this.isConfirmed()) {
                resolve()
            } else {
                const intervalId = setInterval(async () => {
                    if (await this.isConfirmed()) {
                        clearInterval(intervalId)
                        resolve()
                    }
                }, 10000)
            }
        })
    }
}
