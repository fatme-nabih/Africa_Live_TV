export class SupervisedBatchWriter<T> {
  private queue: T[] = [];
  private writing: Promise<void> | null = null;
  private failure: unknown;
  private failed = false;
  written = 0;
  constructor(private size: number, private write: (batch:T[]) => Promise<void>) {}
  get remaining() { return this.queue.length; }
  check() { if (this.failed) throw this.failure; }
  add(item:T) { this.check(); this.queue.push(item); if (this.queue.length >= this.size) this.start(false); }
  private start(force:boolean) {
    if (this.writing) return this.writing;
    this.writing = (async () => {
      while (this.queue.length >= this.size || (force && this.queue.length)) {
        const batch = this.queue.slice(0,this.size);
        await this.write(batch);
        this.queue.splice(0,batch.length);
        this.written += batch.length;
      }
    })().catch(error => { this.failed=true; this.failure=error; }).finally(() => { this.writing=null; });
    return this.writing;
  }
  async flush() { await this.writing; this.check(); await this.start(true); this.check(); }
}
