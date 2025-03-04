import {mockFunction} from '@drakensoftware/magicmock'

const maximumSecondsRetryAfter = 120
const intervalSecondsBetweenExhaustedMessages = 60
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
        super('You have exceeded your current rate limit. ' +
            'To continue making requests, either register for a free API key ' +
            'or upgrade your existing API tier at https://chaingate.dev/')
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
                        Date.now() >= lastExhaustedMessageShownTimestamp + (intervalSecondsBetweenExhaustedMessages * 1000)
                        &&
                        !process.env.DISABLE_EXHAUSTED_TIER_MESSAGE){
                        console.warn(
                            'You have exceeded your current rate limit, and ChainGate is currently operating beyond its capacity.' +
                            ' To increase your request capacity and reduce delays, please upgrade your API tier at https://chaingate.dev')
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

    return await func.call(api, ...args)
}
