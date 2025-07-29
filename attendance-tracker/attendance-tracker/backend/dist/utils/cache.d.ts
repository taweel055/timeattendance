declare class CacheService {
    private client;
    private isConnected;
    constructor();
    private initializeClient;
    get<T>(key: string): Promise<T | null>;
    set(key: string, value: any, ttlSeconds?: number): Promise<boolean>;
    del(key: string): Promise<boolean>;
    delPattern(pattern: string): Promise<boolean>;
    flush(): Promise<boolean>;
    isAvailable(): boolean;
    disconnect(): Promise<void>;
}
declare const _default: CacheService;
export default _default;
//# sourceMappingURL=cache.d.ts.map