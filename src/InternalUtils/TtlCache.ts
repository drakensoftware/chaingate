type Fetcher<T> = () => Promise<T> | T
const NOT_CACHED = Symbol('not-cached')

export class TtlCache<T> {
    private readonly fetcher: Fetcher<T>
    private readonly ttlMs: number

    private cachedValue: T | typeof NOT_CACHED = NOT_CACHED
    private expiresAt: number = 0
    private pendingPromise: Promise<T> | null = null

    constructor(fetcher: Fetcher<T>, ttlSeconds: number) {
        this.fetcher = fetcher
        this.ttlMs = ttlSeconds * 1000
    }

    /**
     * Fetches a value, optionally using the cache.
     *
     * @param useCache – if true, return the cached value when still fresh;
     *                   if false, always re-fetch, cache & return the new value.
     */
    async get(useCache: boolean): Promise<T> {
        const now = Date.now()

        // 1) If we’re allowed to use cache, and it’s still valid, just return it.
        if (useCache && this.cachedValue !== NOT_CACHED && now < this.expiresAt) {
            return this.cachedValue as T
        }

        // 2) If there’s already a fetch in flight, join it (no double-fetch).
        if (this.pendingPromise) {
            return this.pendingPromise
        }

        // 3) Kick off a (new or forced) fetch, cache the result & reset TTL.
        this.pendingPromise = (async () => {
            try {
                const result = await this.fetcher()
                this.cachedValue = result
                this.expiresAt = Date.now() + this.ttlMs
                return result
            } finally {
                this.pendingPromise = null
            }
        })()

        return this.pendingPromise
    }

    /** Clear both the cached value and any in-flight fetch. */
    clear(): void {
        this.cachedValue = NOT_CACHED
        this.expiresAt = 0
        this.pendingPromise = null
    }
}
