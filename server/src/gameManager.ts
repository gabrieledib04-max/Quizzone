import { v4 as uuidv4 } from 'uuid';
import {
  Room,
  RoomStatus,
  RoomSettings,
  Team,
  Question,
  BuzzerQueueItem,
  PRESET_COLORS,
} from '../../shared/types.js';

interface SocketSession {
  roomCode: string;
  teamId?: string;
  isAdmin?: boolean;
  isDisplay?: boolean;
}

export class GameManager {
  private rooms: Map<string, Room> = new Map();
  private socketSessions: Map<string, SocketSession> = new Map();
  private teamSockets: Map<string, string> = new Map();
  private roomOpenedHrTime: Map<string, bigint> = new Map();
  private buzzSequenceCounter: number = 0;

  private generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    do {
      code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    } while (this.rooms.has(code));
    return code;
  }

  public createRoom(adminSocketId: string): Room {
    const code = this.generateRoomCode();
    const defaultSettings: RoomSettings = {
      allowMultipleAttempts: true,
      autoAdvanceQueueOnWrong: true,
    };

    const room: Room = {
      code,
      adminSocketId,
      status: 'LOBBY',
      settings: defaultSettings,
      teams: {},
      currentQuestion: null,
      buzzerQueue: [],
      buzzerOpenedAt: null,
      allowedColors: [...PRESET_COLORS],
    };

    this.rooms.set(code, room);
    this.socketSessions.set(adminSocketId, { roomCode: code, isAdmin: true });
    return room;
  }

  public getRoom(roomCode: string): Room | undefined {
    return this.rooms.get(roomCode.trim().toUpperCase());
  }

  /**
   * Sanitizzazione per telefoni:
   * - Vedono SOLO il testo della domanda, l'eventuale categoria e lo stato del buzzer.
   * - MAI le opzioni A/B/C/D, MAI la risposta corretta e MAI le note dell'Admin.
   */
  public sanitizeRoomForPlayers(room: Room): Room {
    return {
      ...room,
      teams: { ...room.teams },
      buzzerQueue: [...room.buzzerQueue],
      currentQuestion: room.currentQuestion
        ? {
            ...room.currentQuestion,
            options: [],
            correctOptionIndex: -1,
            hostNote: undefined,
          }
        : null,
    };
  }

  /**
   * Sanitizzazione per Tabellone PC:
   * - Mostra domanda, categoria e le opzioni A/B/C/D.
   * - Nasconde correctOptionIndex (-1) finché revealedAnswer non è true.
   */
  public sanitizeRoomForDisplay(room: Room): Room {
    return {
      ...room,
      teams: { ...room.teams },
      buzzerQueue: [...room.buzzerQueue],
      currentQuestion: room.currentQuestion
        ? {
            ...room.currentQuestion,
            options: [...room.currentQuestion.options],
            correctOptionIndex: room.currentQuestion.revealedAnswer
              ? room.currentQuestion.correctOptionIndex
              : -1,
            hostNote: undefined,
          }
        : null,
    };
  }

  public reconnectAdmin(roomCode: string, newSocketId: string): Room | null {
    const room = this.getRoom(roomCode);
    if (!room) return null;

    room.adminSocketId = newSocketId;
    this.socketSessions.set(newSocketId, { roomCode: room.code, isAdmin: true });
    return room;
  }

  public joinDisplay(
    roomCode: string,
    socketId: string
  ): { success: boolean; room?: Room; error?: string } {
    const room = this.getRoom(roomCode);
    if (!room) {
      return {
        success: false,
        error: 'Stanza non trovata. Controlla il codice PIN.',
      };
    }

    this.socketSessions.set(socketId, {
      roomCode: room.code,
      isDisplay: true,
    });

    return { success: true, room: this.sanitizeRoomForDisplay(room) };
  }

  public joinRoom(
    roomCode: string,
    socketId: string,
    requestedTeamId?: string
  ): { success: boolean; room?: Room; team?: Team; error?: string } {
    const room = this.getRoom(roomCode);
    if (!room) {
      return { success: false, error: 'Stanza non trovata. Controlla il codice.' };
    }

    if (requestedTeamId && room.teams[requestedTeamId]) {
      const existingTeam = room.teams[requestedTeamId];
      existingTeam.connected = true;
      existingTeam.lastActive = Date.now();

      this.socketSessions.set(socketId, {
        roomCode: room.code,
        teamId: existingTeam.id,
        isAdmin: false,
      });
      this.teamSockets.set(existingTeam.id, socketId);

      return {
        success: true,
        room: this.sanitizeRoomForPlayers(room),
        team: existingTeam,
      };
    }

    const newTeamId = uuidv4();
    const newTeam: Team = {
      id: newTeamId,
      name: '',
      color: '',
      connected: true,
      registered: false,
      lastActive: Date.now(),
    };

    room.teams[newTeamId] = newTeam;
    this.socketSessions.set(socketId, {
      roomCode: room.code,
      teamId: newTeamId,
      isAdmin: false,
    });
    this.teamSockets.set(newTeamId, socketId);

    return {
      success: true,
      room: this.sanitizeRoomForPlayers(room),
      team: newTeam,
    };
  }

  public registerTeam(
    roomCode: string,
    teamId: string,
    name: string,
    color: string
  ): { success: boolean; team?: Team; error?: string } {
    const room = this.getRoom(roomCode);
    if (!room) {
      return { success: false, error: 'Stanza non trovata.' };
    }

    const team = room.teams[teamId];
    if (!team) {
      return { success: false, error: 'Giocatore non trovato.' };
    }

    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length > 20) {
      return {
        success: false,
        error: 'Il nome deve essere compreso tra 1 e 20 caratteri.',
      };
    }

    const nameConflict = Object.values(room.teams).some(
      (t) =>
        t.id !== teamId &&
        t.registered &&
        t.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (nameConflict) {
      return {
        success: false,
        error: 'Nome già utilizzato da un altro giocatore/squadra.',
      };
    }

    if (!PRESET_COLORS.includes(color as (typeof PRESET_COLORS)[number])) {
      return {
        success: false,
        error: 'Colore non valido tra quelli consentiti.',
      };
    }

    const colorConflict = Object.values(room.teams).some(
      (t) => t.id !== teamId && t.registered && t.color === color
    );
    if (colorConflict) {
      return {
        success: false,
        error: 'Colore già scelto. Scegli un altro colore.',
      };
    }

    team.name = trimmedName;
    team.color = color;
    team.registered = true;
    team.lastActive = Date.now();

    return { success: true, team };
  }

  public kickTeam(
    roomCode: string,
    teamId: string
  ): { success: boolean; socketId?: string; error?: string } {
    const room = this.getRoom(roomCode);
    if (!room) {
      return { success: false, error: 'Stanza non trovata.' };
    }

    if (!room.teams[teamId]) {
      return { success: false, error: 'Giocatore non trovato.' };
    }

    room.buzzerQueue = room.buzzerQueue.filter((item) => item.teamId !== teamId);

    const socketId = this.teamSockets.get(teamId);
    if (socketId) {
      this.socketSessions.delete(socketId);
      this.teamSockets.delete(teamId);
    }

    delete room.teams[teamId];
    return { success: true, socketId };
  }

  public handleDisconnect(socketId: string): {
    roomCode?: string;
    teamId?: string;
    isAdmin?: boolean;
    room?: Room;
  } | null {
    const session = this.socketSessions.get(socketId);
    if (!session) return null;

    const { roomCode, teamId, isAdmin } = session;
    const room = this.getRoom(roomCode);

    if (isAdmin && room) {
      if (room.adminSocketId === socketId) {
        room.adminSocketId = null;
      }
    } else if (teamId && room && room.teams[teamId]) {
      if (this.teamSockets.get(teamId) === socketId) {
        room.teams[teamId].connected = false;
        room.teams[teamId].lastActive = Date.now();
        this.teamSockets.delete(teamId);
      }
    }

    this.socketSessions.delete(socketId);
    return { roomCode, teamId, isAdmin, room };
  }

  public setStatus(
    roomCode: string,
    status: RoomStatus
  ): { success: boolean; room?: Room; error?: string } {
    const room = this.getRoom(roomCode);
    if (!room) return { success: false, error: 'Stanza non trovata.' };

    room.status = status;
    return { success: true, room };
  }

  public updateSettings(
    roomCode: string,
    settings: Partial<RoomSettings>
  ): { success: boolean; room?: Room; error?: string } {
    const room = this.getRoom(roomCode);
    if (!room) return { success: false, error: 'Stanza non trovata.' };

    room.settings = { ...room.settings, ...settings };
    return { success: true, room };
  }

  public armBuzzer(
    roomCode: string,
    questionPartial?: Partial<Question>
  ): { success: boolean; room?: Room; error?: string } {
    const room = this.getRoom(roomCode);
    if (!room) return { success: false, error: 'Stanza non trovata.' };

    room.buzzerOpenedAt = Date.now();
    this.roomOpenedHrTime.set(room.code, process.hrtime.bigint());
    room.buzzerQueue = [];

    if (questionPartial) {
      const targetType = questionPartial.type || 'VOICE_ONLY';
      room.status =
        targetType === 'MULTIPLE_CHOICE' ? 'QUESTION_ACTIVE' : 'BUZZER_OPEN';

      if (
        room.currentQuestion &&
        !questionPartial.id &&
        room.currentQuestion.type === targetType
      ) {
        room.currentQuestion = {
          ...room.currentQuestion,
          ...questionPartial,
          mode: 'BUZZER_FIRST',
          buzzerState: 'ARMED',
        };
      } else {
        room.currentQuestion = {
          id: questionPartial.id || uuidv4(),
          type: targetType,
          mode: 'BUZZER_FIRST',
          text: questionPartial.text || 'Domanda a voce del conduttore',
          options: questionPartial.options || [],
          correctOptionIndex: questionPartial.correctOptionIndex ?? -1,
          hostNote: questionPartial.hostNote,
          buzzerState: 'ARMED',
          revealedAnswer: false,
          categoryId: questionPartial.categoryId,
          categoryName: questionPartial.categoryName,
          categoryColor: questionPartial.categoryColor,
        };
      }
    } else if (room.currentQuestion) {
      room.currentQuestion.buzzerState = 'ARMED';
      room.status =
        room.currentQuestion.type === 'MULTIPLE_CHOICE'
          ? 'QUESTION_ACTIVE'
          : 'BUZZER_OPEN';
    } else {
      room.status = 'BUZZER_OPEN';
      room.currentQuestion = {
        id: uuidv4(),
        type: 'VOICE_ONLY',
        mode: 'BUZZER_FIRST',
        text: 'Domanda a voce del conduttore',
        options: [],
        correctOptionIndex: -1,
        buzzerState: 'ARMED',
        revealedAnswer: false,
      };
    }

    return { success: true, room };
  }

  public lockBuzzer(
    roomCode: string
  ): { success: boolean; room?: Room; error?: string } {
    const room = this.getRoom(roomCode);
    if (!room) return { success: false, error: 'Stanza non trovata.' };

    if (room.currentQuestion) {
      room.currentQuestion.buzzerState = 'LOCKED';
    }
    return { success: true, room };
  }

  public resetBuzzer(
    roomCode: string
  ): { success: boolean; room?: Room; error?: string } {
    const room = this.getRoom(roomCode);
    if (!room) return { success: false, error: 'Stanza non trovata.' };

    room.buzzerQueue = [];
    room.buzzerOpenedAt = null;
    this.roomOpenedHrTime.delete(room.code);
    if (room.currentQuestion) {
      room.currentQuestion.buzzerState = 'LOCKED';
    }
    return { success: true, room };
  }

  public handleBuzz(
    roomCode: string,
    teamId: string
  ): {
    success: boolean;
    position?: number;
    queue?: BuzzerQueueItem[];
    error?: string;
  } {
    const room = this.getRoom(roomCode);
    if (!room) return { success: false, error: 'Stanza non trovata.' };

    const team = room.teams[teamId];
    if (!team || !team.registered) {
      return { success: false, error: 'Giocatore non registrato o non autorizzato.' };
    }

    if (
      !room.currentQuestion ||
      room.currentQuestion.buzzerState !== 'ARMED'
    ) {
      return { success: false, error: 'Il Buzzer non è attivo in questo momento!' };
    }

    const alreadyInQueue = room.buzzerQueue.some((item) => item.teamId === teamId);
    if (alreadyInQueue) {
      return { success: false, error: 'Ti sei già prenotato!' };
    }

    const serverTimestamp = Date.now();
    const openedHr = this.roomOpenedHrTime.get(room.code);
    const responseTimeMs = openedHr
      ? Math.max(0, Number((process.hrtime.bigint() - openedHr) / 1_000_000n))
      : room.buzzerOpenedAt
      ? Math.max(0, serverTimestamp - room.buzzerOpenedAt)
      : 0;

    const sequence = ++this.buzzSequenceCounter;

    const queueItem: BuzzerQueueItem = {
      teamId: team.id,
      teamName: team.name,
      teamColor: team.color,
      serverTimestamp,
      sequence,
      status: 'ACTIVE',
      responseTimeMs,
    };

    room.buzzerQueue.push(queueItem);
    room.buzzerQueue.sort(
      (a, b) => a.serverTimestamp - b.serverTimestamp || a.sequence - b.sequence
    );

    const position = room.buzzerQueue.findIndex((i) => i.teamId === teamId) + 1;

    return {
      success: true,
      position,
      queue: room.buzzerQueue,
    };
  }

  public evaluateBuzz(
    roomCode: string,
    teamId: string,
    result: 'CORRECT' | 'WRONG'
  ): {
    success: boolean;
    room?: Room;
    nextTeam?: BuzzerQueueItem | null;
    error?: string;
  } {
    const room = this.getRoom(roomCode);
    if (!room) return { success: false, error: 'Stanza non trovata.' };

    const queueIndex = room.buzzerQueue.findIndex(
      (item) => item.teamId === teamId && item.status === 'ACTIVE'
    );
    if (queueIndex === -1) {
      return {
        success: false,
        error: 'Prenotazione non trovata, resettata o già valutata.',
      };
    }

    const currentItem = room.buzzerQueue[queueIndex];

    if (result === 'CORRECT') {
      currentItem.status = 'CORRECT';
      if (room.currentQuestion) {
        room.currentQuestion.buzzerState = 'LOCKED';
        if (room.currentQuestion.type === 'MULTIPLE_CHOICE') {
          room.currentQuestion.revealedAnswer = true;
        }
      }
      return { success: true, room, nextTeam: null };
    } else {
      currentItem.status = 'WRONG';

      const nextActive =
        room.buzzerQueue.find((item) => item.status === 'ACTIVE') || null;

      if (!nextActive && !room.settings.allowMultipleAttempts) {
        if (room.currentQuestion) {
          room.currentQuestion.buzzerState = 'LOCKED';
        }
      }

      return { success: true, room, nextTeam: nextActive };
    }
  }

  public setQuestion(
    roomCode: string,
    question: Question,
    armImmediately = false
  ): { success: boolean; room?: Room; error?: string } {
    const room = this.getRoom(roomCode);
    if (!room) return { success: false, error: 'Stanza non trovata.' };

    room.status =
      question.type === 'VOICE_ONLY' ? 'BUZZER_OPEN' : 'QUESTION_ACTIVE';
    room.currentQuestion = {
      ...question,
      mode: 'BUZZER_FIRST',
      buzzerState: armImmediately ? 'ARMED' : 'LOCKED',
      revealedAnswer: false,
    };
    room.buzzerQueue = [];

    if (armImmediately) {
      room.buzzerOpenedAt = Date.now();
      this.roomOpenedHrTime.set(room.code, process.hrtime.bigint());
    } else {
      room.buzzerOpenedAt = null;
      this.roomOpenedHrTime.delete(room.code);
    }

    return { success: true, room };
  }

  public revealAnswer(
    roomCode: string
  ): { success: boolean; room?: Room; error?: string } {
    const room = this.getRoom(roomCode);
    if (!room || !room.currentQuestion) {
      return { success: false, error: 'Nessuna domanda attiva.' };
    }

    room.currentQuestion.revealedAnswer = true;
    room.currentQuestion.buzzerState = 'LOCKED';
    return { success: true, room };
  }
}
