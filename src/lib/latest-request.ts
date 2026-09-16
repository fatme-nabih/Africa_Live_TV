export type LatestRequest = {
  id: number;
  signal: AbortSignal;
};

export class LatestRequestController {
  private controller: AbortController | null = null;
  private sequence = 0;

  begin(): LatestRequest {
    this.controller?.abort();
    this.controller = new AbortController();
    this.sequence += 1;
    return { id: this.sequence, signal: this.controller.signal };
  }

  isCurrent(id: number) {
    return id === this.sequence && this.controller?.signal.aborted === false;
  }

  finish(id: number) {
    if (id === this.sequence) this.controller = null;
  }

  abort() {
    this.controller?.abort();
    this.controller = null;
    this.sequence += 1;
  }
}

export class SingleFlightGate {
  private active = false;

  enter() {
    if (this.active) return false;
    this.active = true;
    return true;
  }

  leave() {
    this.active = false;
  }

  isActive() {
    return this.active;
  }
}
