export class TTLCache<T> {
  private readonly fn: () => Promise<T>;
  private cache: T | null;
  private lastUpdate: number | null;
  public readonly ttl: number;

  constructor(fn: () => Promise<T>, ttl: number) {
    this.fn = fn;
    this.ttl = ttl;
    this.cache = null;
    this.lastUpdate = null;
  }

  public async fetch(): Promise<T> {
    // Refresh if cache is empty or TTL has expired
    if (!this.lastUpdate || Date.now() > this.lastUpdate + this.ttl) {
      const result = await this.fn();
      this.cache = result;
      this.lastUpdate = Date.now();
      return result;
    }

    return this.cache!;
  }
}
