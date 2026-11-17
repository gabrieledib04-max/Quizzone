import { create } from 'zustand';
import confetti from 'canvas-confetti';
import { socket } from '../services/socket';
import { storage } from '../services/storage';
import { soundManager } from '../services/audio';
import {
  categoryApi,
  getAdminPassword,
  setAdminPassword,
} from '../services/categoryApi';
import {
  BuzzerQueueItem,
  BuzzerState,
  ClientRole,
  NetworkInfo,
  Question,
  Room,
  RoomSettings,
  RoomStatus,
  SavedQuestion,
  Team,
} from '../types/shared';

interface NotificationState {
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

interface LaunchSavedOptions {
  categoryId?: string;
  categoryName?: string;
  categoryColor?: string;
  questionIndex?: number;
  totalQuestionsInCategory?: number;
  armImmediately?: boolean;
}

interface GameState {
  room: Room | null;
  currentTeam: Team | null;
  role: ClientRole | null;
  isAdmin: boolean;
  isDisplay: boolean;
  connected: boolean;
  buzzerState: BuzzerState;
  buzzerQueue: BuzzerQueueItem[];
  myBuzzPosition: number | null;
  notification: NotificationState | null;
  networkInfo: NetworkInfo | null;
  initialPinFromUrl: string;
  isInitialized: boolean;

  init: () => void;
  fetchNetworkInfo: () => Promise<void>;
  createRoom: (password?: string) => Promise<boolean>;
  joinRoom: (
    roomCode: string,
    teamId?: string
  ) => Promise<{ success: boolean; error?: string }>;
  joinDisplay: (
    roomCode: string,
    persistSession?: boolean
  ) => Promise<{ success: boolean; error?: string }>;
  registerTeam: (
    name: string,
    color: string
  ) => Promise<{ success: boolean; error?: string }>;
  kickTeam: (teamId: string) => void;
  setStatus: (status: RoomStatus) => void;
  updateSettings: (settings: Partial<RoomSettings>) => void;
  armBuzzer: (question?: Partial<Question>) => void;
  lockBuzzer: () => void;
  resetBuzzer: () => void;
  buzz: () => Promise<{ success: boolean; position?: number; error?: string }>;
  evaluateBuzz: (teamId: string, result: 'CORRECT' | 'WRONG') => void;
  launchSavedQuestion: (
    saved: SavedQuestion,
    options?: LaunchSavedOptions
  ) => void;
  setQuestion: (question: Question, armImmediately?: boolean) => void;
  revealAnswer: () => void;
  triggerConfetti: () => void;
  leaveRoom: () => void;
  clearNotification: () => void;
}

function getQueryParams(): { displayCode: string | null; pinCode: string } {
  if (typeof window === 'undefined') {
    return { displayCode: null, pinCode: '' };
  }
  const params = new URLSearchParams(window.location.search);
  const display = params.get('display')?.trim().toUpperCase() || null;
  const pin = params.get('pin')?.trim().toUpperCase() || '';
  return { displayCode: display, pinCode: pin };
}

export const useGameStore = create<GameState>((set, get) => ({
  room: null,
  currentTeam: null,
  role: null,
  isAdmin: false,
  isDisplay: false,
  connected: socket.connected,
  buzzerState: 'LOCKED',
  buzzerQueue: [],
  myBuzzPosition: null,
  notification: null,
  networkInfo: null,
  initialPinFromUrl: getQueryParams().pinCode,
  isInitialized: false,

  fetchNetworkInfo: async () => {
    try {
      const info = await categoryApi.getNetworkInfo();
      set({ networkInfo: info });
    } catch {
      // Ignora silenziosamente se non raggiungibile
    }
  },

  init: () => {
    if (get().isInitialized) return;

    const handleConnectOrReconnect = () => {
      set({ connected: true });

      const { displayCode } = getQueryParams();
      if (displayCode) {
        socket.emit('display:join_room', { roomCode: displayCode }, (res) => {
          if (res.success && res.room) {
            set({
              room: res.room,
              role: 'display',
              isAdmin: false,
              isDisplay: true,
              currentTeam: null,
              buzzerQueue: res.room.buzzerQueue,
              buzzerState: res.room.currentQuestion?.buzzerState || 'LOCKED',
            });
          } else {
            set({
              notification: {
                type: 'error',
                message: res.error || 'Stanza non trovata per il Tabellone.',
              },
            });
          }
        });
        return;
      }

      const savedSession = storage.getSession();
      if (savedSession && savedSession.roomCode) {
        if (savedSession.role === 'admin') {
          socket.emit(
            'admin:reconnect',
            { roomCode: savedSession.roomCode },
            (res) => {
              if (res.success && res.room) {
                set({
                  room: res.room,
                  role: 'admin',
                  isAdmin: true,
                  isDisplay: false,
                  buzzerQueue: res.room.buzzerQueue,
                  buzzerState: res.room.currentQuestion?.buzzerState || 'LOCKED',
                });
              } else {
                storage.clearSession();
              }
            }
          );
        } else if (savedSession.role === 'display') {
          socket.emit(
            'display:join_room',
            { roomCode: savedSession.roomCode },
            (res) => {
              if (res.success && res.room) {
                set({
                  room: res.room,
                  role: 'display',
                  isAdmin: false,
                  isDisplay: true,
                  buzzerQueue: res.room.buzzerQueue,
                  buzzerState: res.room.currentQuestion?.buzzerState || 'LOCKED',
                });
              } else {
                storage.clearSession();
              }
            }
          );
        } else {
          socket.emit(
            'team:join_room',
            { roomCode: savedSession.roomCode, teamId: savedSession.teamId },
            (res) => {
              if (res.success && res.room && res.team) {
                const teamInQueue = res.room.buzzerQueue.findIndex(
                  (q) => q.teamId === res.team?.id
                );
                set({
                  room: res.room,
                  currentTeam: res.team,
                  role: 'player',
                  isAdmin: false,
                  isDisplay: false,
                  buzzerQueue: res.room.buzzerQueue,
                  buzzerState:
                    teamInQueue !== -1
                      ? 'BUZZED'
                      : res.room.currentQuestion?.buzzerState || 'LOCKED',
                  myBuzzPosition: teamInQueue !== -1 ? teamInQueue + 1 : null,
                });
              } else {
                storage.clearSession();
              }
            }
          );
        }
      }
    };

    socket.on('connect', handleConnectOrReconnect);

    // Riconnessione immediata al rientro da background su iOS Safari
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && !socket.connected) {
          socket.connect();
        }
      });
    }

    socket.on('disconnect', () => {
      set({ connected: false });
    });

    socket.on('room:updated', (updatedRoom: Room) => {
      const state = get();
      const currentTeamId = state.currentTeam?.id;
      const updatedTeam = currentTeamId
        ? updatedRoom.teams[currentTeamId] || null
        : null;

      let myPos: number | null = null;
      let buzzState: BuzzerState =
        updatedRoom.currentQuestion?.buzzerState || 'LOCKED';

      if (currentTeamId) {
        const qIndex = updatedRoom.buzzerQueue.findIndex(
          (q) => q.teamId === currentTeamId
        );
        if (qIndex !== -1) {
          myPos = qIndex + 1;
          buzzState = 'BUZZED';
        }
      }

      set({
        room: updatedRoom,
        currentTeam: updatedTeam,
        buzzerQueue: updatedRoom.buzzerQueue,
        myBuzzPosition: myPos,
        buzzerState: buzzState,
      });
    });

    socket.on('buzzer:queue_updated', (queue: BuzzerQueueItem[]) => {
      const state = get();
      const currentTeamId = state.currentTeam?.id;
      let myPos: number | null = null;
      let buzzState = state.buzzerState;

      if (currentTeamId) {
        const qIndex = queue.findIndex((q) => q.teamId === currentTeamId);
        if (qIndex !== -1) {
          myPos = qIndex + 1;
          buzzState = 'BUZZED';
        } else if (buzzState === 'BUZZED') {
          buzzState = state.room?.currentQuestion?.buzzerState || 'LOCKED';
        }
      }

      set({
        buzzerQueue: queue,
        myBuzzPosition: myPos,
        buzzerState: buzzState,
      });
    });

    socket.on('buzzer:state_changed', ({ buzzerState }) => {
      const state = get();
      const currentTeamId = state.currentTeam?.id;
      const isAlreadyInQueue =
        currentTeamId &&
        state.buzzerQueue.some((item) => item.teamId === currentTeamId);

      set({
        buzzerState: isAlreadyInQueue ? 'BUZZED' : buzzerState,
      });
    });

    socket.on('team:kicked', (reason: string) => {
      storage.clearSession();
      set({
        room: null,
        currentTeam: null,
        role: null,
        isAdmin: false,
        isDisplay: false,
        notification: { type: 'error', message: reason },
      });
    });

    socket.on('game:notification', (notif) => {
      set({ notification: notif });
    });

    socket.on('game:confetti', () => {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
      });
    });

    socket.on('game:sound', (soundName) => {
      if (soundName === 'buzz') soundManager.playBuzz();
      else if (soundName === 'correct') soundManager.playCorrect();
      else if (soundName === 'wrong') soundManager.playWrong();
      else if (soundName === 'tick') soundManager.playTick();
      else if (soundName === 'victory') soundManager.playVictory();
    });

    if (socket.connected) {
      handleConnectOrReconnect();
    }

    get().fetchNetworkInfo();
    set({ isInitialized: true });
  },

  createRoom: (password?: string) => {
    return new Promise((resolve) => {
      const pass = password || getAdminPassword();
      socket.emit('admin:create_room', { password: pass }, (res) => {
        if (res.success && res.room) {
          if (pass) {
            setAdminPassword(pass);
          }
          storage.saveSession({
            roomCode: res.room.code,
            role: 'admin',
          });
          set({
            room: res.room,
            role: 'admin',
            isAdmin: true,
            isDisplay: false,
            currentTeam: null,
            buzzerQueue: [],
            buzzerState: 'LOCKED',
          });
          resolve(true);
        } else {
          set({
            notification: {
              type: 'error',
              message: res.error || 'Impossibile creare la stanza.',
            },
          });
          resolve(false);
        }
      });
    });
  },

  joinDisplay: (roomCode: string, persistSession = true) => {
    return new Promise((resolve) => {
      const normalizedCode = roomCode.trim().toUpperCase();
      socket.emit('display:join_room', { roomCode: normalizedCode }, (res) => {
        if (res.success && res.room) {
          if (persistSession) {
            storage.saveSession({
              roomCode: res.room.code,
              role: 'display',
            });
          }
          set({
            room: res.room,
            role: 'display',
            isAdmin: false,
            isDisplay: true,
            currentTeam: null,
            buzzerQueue: res.room.buzzerQueue,
            buzzerState: res.room.currentQuestion?.buzzerState || 'LOCKED',
          });
          resolve({ success: true });
        } else {
          resolve({
            success: false,
            error: res.error || 'Impossibile collegare il Tabellone.',
          });
        }
      });
    });
  },

  joinRoom: (roomCode: string, teamId?: string) => {
    return new Promise((resolve) => {
      const normalizedCode = roomCode.trim().toUpperCase();
      socket.emit('team:join_room', { roomCode: normalizedCode, teamId }, (res) => {
        if (res.success && res.room && res.team) {
          storage.saveSession({
            roomCode: res.room.code,
            role: 'player',
            teamId: res.team.id,
            teamName: res.team.name,
            teamColor: res.team.color,
          });
          set({
            room: res.room,
            currentTeam: res.team,
            role: 'player',
            isAdmin: false,
            isDisplay: false,
            buzzerQueue: res.room.buzzerQueue,
            buzzerState: res.room.currentQuestion?.buzzerState || 'LOCKED',
          });
          resolve({ success: true });
        } else {
          resolve({
            success: false,
            error: res.error || "Errore durante l'accesso alla stanza.",
          });
        }
      });
    });
  },

  registerTeam: (name: string, color: string) => {
    return new Promise((resolve) => {
      const state = get();
      if (!state.room || !state.currentTeam) {
        resolve({ success: false, error: 'Sessione non valida.' });
        return;
      }

      socket.emit(
        'team:register',
        {
          roomCode: state.room.code,
          teamId: state.currentTeam.id,
          name,
          color,
        },
        (res) => {
          if (res.success && res.team) {
            storage.updateSession({
              teamName: res.team.name,
              teamColor: res.team.color,
            });
            set({ currentTeam: res.team });
            resolve({ success: true });
          } else {
            resolve({
              success: false,
              error: res.error || 'Errore nella registrazione.',
            });
          }
        }
      );
    });
  },

  kickTeam: (teamId: string) => {
    const { room } = get();
    if (!room) return;
    socket.emit('admin:kick_team', { roomCode: room.code, teamId });
  },

  setStatus: (status: RoomStatus) => {
    const { room } = get();
    if (!room) return;
    socket.emit('admin:set_status', { roomCode: room.code, status });
  },

  updateSettings: (settings: Partial<RoomSettings>) => {
    const { room } = get();
    if (!room) return;
    socket.emit('admin:update_settings', { roomCode: room.code, settings });
  },

  armBuzzer: (question?: Partial<Question>) => {
    const { room } = get();
    if (!room) return;
    socket.emit('admin:arm_buzzer', { roomCode: room.code, question });
  },

  lockBuzzer: () => {
    const { room } = get();
    if (!room) return;
    socket.emit('admin:lock_buzzer', { roomCode: room.code });
  },

  resetBuzzer: () => {
    const { room } = get();
    if (!room) return;
    socket.emit('admin:reset_buzzer', { roomCode: room.code });
  },

  buzz: () => {
    return new Promise((resolve) => {
      const state = get();
      if (!state.room || !state.currentTeam) {
        resolve({ success: false, error: 'Non sei connesso ad alcuna stanza.' });
        return;
      }

      socket.emit(
        'team:buzz',
        {
          roomCode: state.room.code,
          teamId: state.currentTeam.id,
        },
        (res) => {
          if (res.success && res.position !== undefined) {
            set({
              buzzerState: 'BUZZED',
              myBuzzPosition: res.position,
            });
            resolve({ success: true, position: res.position });
          } else {
            resolve({
              success: false,
              error: res.error || 'Impossibile prenotarsi.',
            });
          }
        }
      );
    });
  },

  evaluateBuzz: (teamId: string, result: 'CORRECT' | 'WRONG') => {
    const { room } = get();
    if (!room) return;
    socket.emit('admin:evaluate_buzz', {
      roomCode: room.code,
      teamId,
      result,
    });
  },

  launchSavedQuestion: (saved, options) => {
    const { room } = get();
    if (!room) return;

    const fullQuestion: Question = {
      id: saved.id,
      type: saved.type,
      mode: 'BUZZER_FIRST',
      text: saved.text,
      options: [...saved.options],
      correctOptionIndex: saved.correctOptionIndex,
      hostNote: saved.hostNote,
      buzzerState: options?.armImmediately ? 'ARMED' : 'LOCKED',
      revealedAnswer: false,
      categoryId: options?.categoryId,
      categoryName: options?.categoryName,
      categoryColor: options?.categoryColor,
      questionIndex: options?.questionIndex,
      totalQuestionsInCategory: options?.totalQuestionsInCategory,
    };

    socket.emit('admin:set_question', {
      roomCode: room.code,
      question: fullQuestion,
      armImmediately: Boolean(options?.armImmediately),
    });
  },

  setQuestion: (question: Question, armImmediately = false) => {
    const { room } = get();
    if (!room) return;
    socket.emit('admin:set_question', {
      roomCode: room.code,
      question,
      armImmediately,
    });
  },

  revealAnswer: () => {
    const { room } = get();
    if (!room) return;
    socket.emit('admin:reveal_answer', {
      roomCode: room.code,
    });
  },

  triggerConfetti: () => {
    const { room } = get();
    if (!room) return;
    socket.emit('admin:trigger_confetti', { roomCode: room.code });
  },

  leaveRoom: () => {
    const { displayCode } = getQueryParams();
    if (!displayCode) {
      storage.clearSession();
    } else if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', window.location.pathname);
    }
    set({
      room: null,
      currentTeam: null,
      role: null,
      isAdmin: false,
      isDisplay: false,
      buzzerQueue: [],
      myBuzzPosition: null,
      buzzerState: 'LOCKED',
    });
  },

  clearNotification: () => {
    set({ notification: null });
  },
}));
