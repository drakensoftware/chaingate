import {mockFunction} from '@drakensoftware/magicmock'

const maximumSecondsRetryAfter = 120
const intervalSecondsBetweenExchaustedMessages = 60
let lastExhaustedMessageShownTimestamp = 0

export class InvalidApiKeyError extends Error {
    constructor() {
        super('The provided API KEY is invalid')
        if (Error.captureStackTrace) Error.captureStackTrace(this, InvalidApiKeyError)
        this.name = this.constructor.name
    }
}

export class ExhaustedApiKey extends Error {
    constructor() {
        super('You have reached the limit of your API key. Please upgrade to a higher tier.')
        if (Error.captureStackTrace) Error.captureStackTrace(this, InvalidApiKeyError)
        this.name = this.constructor.name
    }
}

export async function ConsumeFunction<T>(
    api: unknown,
    endpoint: (...args: unknown[]) => Promise<{ data: T }>,
    ...args: unknown[]
): Promise<T> {
    try{
        return await callMocked(api, endpoint, ...args)
    }catch (ex){
        if('name' in ex && ex.name == 'AxiosError'){
            if(ex.response?.status == 401) throw new InvalidApiKeyError()
            if(ex.response?.status == 429){

                const retryAfter = parseInt(ex.response.headers['retry-after'])
                if(retryAfter <= maximumSecondsRetryAfter){

                    if(
                        Date.now() >= lastExhaustedMessageShownTimestamp + (intervalSecondsBetweenExchaustedMessages * 1000)
                        &&
                        !process.env.DISABLE_EXHAUSTED_TIER_MESSAGE){
                        console.warn(
                            'You have exhausted your API tier limit, and ChainGate is operating beyond its capacity. ' +
                            'Consider upgrading to a higher tier.\nWaiting for a few seconds...')
                        lastExhaustedMessageShownTimestamp = Date.now()
                    }

                    await new Promise(r => setTimeout(r, retryAfter * 1000))
                    return await ConsumeFunction(api, endpoint, ...args)
                }else throw new ExhaustedApiKey()

            }
            throw ex
        }else throw ex
    }
}

async function callMocked<T>(
    api: unknown,
    endpoint: (...args: unknown[]) => Promise<{ data: T }>,
    ...args: unknown[]
): Promise<T> {
    async function getData<T>(endpoint: (..._: unknown[]) => Promise<{ data: T }>): Promise<T> {
        return (await endpoint()).data
    }

    const funcNamespace = `${api.constructor.name}`
    const funcName = endpoint.toString().match('configuration\\)\\.([^\\(]+)\\(')[1]
    let func = () => getData<T>(endpoint.bind(api, ...args))
    func = mockFunction(api, `ChainGate_${funcNamespace}_${funcName}`, func)

    const res = await func.call(api, ...args)
    return res
}
