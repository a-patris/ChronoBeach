import { STORAGE_KEY } from "./storage";

const CHANNEL_NAME = "chronobeach-sync";

type SyncListener = () => void;

/** Synchronisation temps réel entre onglets (admin ↔ display). */
export class TournamentSync {
  private channel: BroadcastChannel | null = null;
  private listeners = new Set<SyncListener>();
  private storageHandler: ((e: StorageEvent) => void) | null = null;

  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    this.ensureChannel();

    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) this.teardown();
    };
  }

  /** Notifie les autres onglets (et rafraîchit localStorage ping) après une écriture. */
  broadcast(): void {
    if (this.channel) {
      this.channel.postMessage({ type: "update", at: Date.now() });
      // Ping storage pour onglets en repli storage-only
      try {
        localStorage.setItem(`${STORAGE_KEY}-ping`, String(Date.now()));
      } catch {
        /* ignore */
      }
      return;
    }
    // Fallback : déclencher storage event sur les autres onglets
    try {
      const current = localStorage.getItem(STORAGE_KEY);
      localStorage.setItem(`${STORAGE_KEY}-ping`, String(Date.now()));
      if (current !== null) {
        localStorage.setItem(STORAGE_KEY, current);
      }
    } catch {
      /* ignore */
    }
  }

  private ensureChannel(): void {
    if (typeof BroadcastChannel !== "undefined" && !this.channel) {
      try {
        this.channel = new BroadcastChannel(CHANNEL_NAME);
        this.channel.onmessage = () => this.notify();
      } catch {
        this.channel = null;
        this.setupStorageFallback();
      }
    } else if (!this.channel && typeof BroadcastChannel === "undefined") {
      this.setupStorageFallback();
    }
  }

  private setupStorageFallback(): void {
    if (this.storageHandler) return;
    this.storageHandler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY || e.key === `${STORAGE_KEY}-ping`) {
        this.notify();
      }
    };
    window.addEventListener("storage", this.storageHandler);
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }

  private teardown(): void {
    this.channel?.close();
    this.channel = null;
    if (this.storageHandler) {
      window.removeEventListener("storage", this.storageHandler);
      this.storageHandler = null;
    }
  }
}

export const tournamentSync = new TournamentSync();
