import { ClientRole } from '../types/shared';

export interface StoredSession {
  roomCode: string;
  role: ClientRole;
  teamId?: string;
  teamName?: string;
  teamColor?: string;
}

const STORAGE_KEY = 'livequiz_session';

export const storage = {
  saveSession(session: StoredSession): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch (e) {
      console.warn('Impossibile salvare la sessione nel localStorage:', e);
    }
  },

  getSession(): StoredSession | null {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return null;
      return JSON.parse(data) as StoredSession;
    } catch (e) {
      console.warn('Impossibile leggere la sessione dal localStorage:', e);
      return null;
    }
  },

  updateSession(partial: Partial<StoredSession>): void {
    const current = this.getSession();
    if (current) {
      this.saveSession({ ...current, ...partial });
    }
  },

  clearSession(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn('Impossibile rimuovere la sessione:', e);
    }
  },
};
