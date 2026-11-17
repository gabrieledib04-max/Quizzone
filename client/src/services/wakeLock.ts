class WakeLockManager {
  private sentinel: WakeLockSentinel | null = null;
  private isRequested: boolean = false;

  constructor() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && this.isRequested) {
          this.requestLock();
        }
      });
    }
  }

  public async requestLock(): Promise<boolean> {
    this.isRequested = true;
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
      try {
        this.sentinel = await navigator.wakeLock.request('screen');
        this.sentinel.addEventListener('release', () => {
          this.sentinel = null;
        });
        return true;
      } catch (err) {
        console.warn('Wake Lock non disponibile o rifiutato:', err);
        return false;
      }
    }
    return false;
  }

  public async releaseLock(): Promise<void> {
    this.isRequested = false;
    if (this.sentinel) {
      await this.sentinel.release();
      this.sentinel = null;
    }
  }
}

export const wakeLockManager = new WakeLockManager();
