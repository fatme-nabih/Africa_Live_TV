type StorageLike = Pick<Storage, 'getItem'|'setItem'|'removeItem'>;
export class SafeStorage {
  private memory = new Map<string, string|null>();
  private failed = new Set<string>();
  constructor(private readonly getStorage: () => StorageLike | null) {}
  read(key: string) {
    if (this.failed.has(key)) return { value: this.memory.get(key) ?? null, persisted: false };
    try {
      const storage = this.getStorage();
      if (!storage) throw new Error('unavailable');
      const value = storage.getItem(key); this.memory.set(key, value);
      return { value, persisted: true };
    } catch { this.failed.add(key); return { value: this.memory.get(key) ?? null, persisted: false }; }
  }
  write(key: string, value: string|null) {
    this.memory.set(key, value);
    try {
      const storage = this.getStorage(); if (!storage) throw new Error('unavailable');
      if (value === null) storage.removeItem(key); else storage.setItem(key, value);
      this.failed.delete(key); return true;
    } catch { this.failed.add(key); return false; }
  }
  readJson<T>(key: string, validate: (value: unknown) => T | null, fallback: T) {
    const result = this.read(key);
    try { return { value: result.value === null ? fallback : validate(JSON.parse(result.value)) ?? fallback, persisted: result.persisted }; }
    catch { return { value: fallback, persisted: result.persisted }; }
  }
  writeJson(key: string, value: unknown) {
    try { return this.write(key, JSON.stringify(value)); } catch { return false; }
  }
}
export const localJsonStorage = new SafeStorage(() => typeof window === 'undefined' ? null : window.localStorage);
