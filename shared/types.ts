export type RoomStatus = 'LOBBY' | 'QUESTION_ACTIVE' | 'BUZZER_OPEN';

export type BuzzerState = 'LOCKED' | 'ARMED' | 'BUZZED';

export type QuestionType = 'MULTIPLE_CHOICE' | 'VOICE_ONLY';

export type QuestionMode = 'BUZZER_FIRST';

export type ClientRole = 'admin' | 'display' | 'player';

export interface RoomSettings {
  allowMultipleAttempts: boolean;
  autoAdvanceQueueOnWrong: boolean;
}

export interface Team {
  id: string;
  name: string;
  color: string;
  connected: boolean;
  registered: boolean;
  lastActive: number;
}

export interface BuzzerQueueItem {
  teamId: string;
  teamName: string;
  teamColor: string;
  serverTimestamp: number;
  sequence: number;
  status: 'ACTIVE' | 'WRONG' | 'CORRECT';
  responseTimeMs: number;
}

export interface SavedQuestion {
  id: string;
  type: QuestionType;
  text: string;
  options: string[];
  correctOptionIndex: number;
  hostNote?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  color: string;
  questions: SavedQuestion[];
  createdAt: number;
  updatedAt: number;
}

export interface Question {
  id: string;
  type: QuestionType;
  mode: QuestionMode;
  text: string;
  options: string[];
  correctOptionIndex: number;
  hostNote?: string;
  buzzerState: BuzzerState;
  revealedAnswer?: boolean;
  categoryId?: string;
  categoryName?: string;
  categoryColor?: string;
  questionIndex?: number;
  totalQuestionsInCategory?: number;
}

export interface Room {
  code: string;
  adminSocketId: string | null;
  status: RoomStatus;
  settings: RoomSettings;
  teams: Record<string, Team>;
  currentQuestion: Question | null;
  buzzerQueue: BuzzerQueueItem[];
  buzzerOpenedAt: number | null;
  allowedColors: string[];
}

export interface NetworkInfo {
  ips: string[];
  serverPort: number;
  clientPort: number;
}

export const PRESET_COLORS = [
  '#EF4444', // Red
  '#3B82F6', // Blue
  '#10B981', // Emerald Green
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#84CC16', // Lime
  '#6366F1', // Indigo
  '#14B8A6', // Teal
  '#E11D48', // Rose
] as const;

export const CATEGORY_COLORS = [
  '#6366F1', // Indigo
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#F97316', // Orange
] as const;

export interface ClientToServerEvents {
  'admin:create_room': (
    data: { password?: string },
    ack: (res: { success: boolean; room?: Room; error?: string }) => void
  ) => void;
  'admin:reconnect': (
    data: { roomCode: string },
    ack: (res: { success: boolean; room?: Room; error?: string }) => void
  ) => void;
  'display:join_room': (
    data: { roomCode: string },
    ack: (res: { success: boolean; room?: Room; error?: string }) => void
  ) => void;
  'team:join_room': (
    data: { roomCode: string; teamId?: string },
    ack: (res: {
      success: boolean;
      room?: Room;
      team?: Team;
      error?: string;
    }) => void
  ) => void;
  'team:register': (
    data: { roomCode: string; teamId: string; name: string; color: string },
    ack: (res: { success: boolean; team?: Team; error?: string }) => void
  ) => void;
  'admin:kick_team': (
    data: { roomCode: string; teamId: string },
    ack?: (res: { success: boolean; error?: string }) => void
  ) => void;
  'admin:set_status': (data: { roomCode: string; status: RoomStatus }) => void;
  'admin:update_settings': (data: {
    roomCode: string;
    settings: Partial<RoomSettings>;
  }) => void;
  'admin:arm_buzzer': (data: {
    roomCode: string;
    question?: Partial<Question>;
  }) => void;
  'admin:lock_buzzer': (data: { roomCode: string }) => void;
  'admin:reset_buzzer': (data: { roomCode: string }) => void;
  'team:buzz': (
    data: { roomCode: string; teamId: string },
    ack: (res: { success: boolean; position?: number; error?: string }) => void
  ) => void;
  'admin:evaluate_buzz': (data: {
    roomCode: string;
    teamId: string;
    result: 'CORRECT' | 'WRONG';
  }) => void;
  'admin:set_question': (data: {
    roomCode: string;
    question: Question;
    armImmediately?: boolean;
  }) => void;
  'admin:reveal_answer': (data: { roomCode: string }) => void;
  'admin:trigger_confetti': (data: { roomCode: string }) => void;
}

export interface ServerToClientEvents {
  'room:updated': (room: Room) => void;
  'buzzer:queue_updated': (queue: BuzzerQueueItem[]) => void;
  'buzzer:state_changed': (state: {
    buzzerState: BuzzerState;
    openedAt: number | null;
  }) => void;
  'team:kicked': (reason: string) => void;
  'game:sound': (
    soundName: 'buzz' | 'correct' | 'wrong' | 'tick' | 'victory'
  ) => void;
  'game:confetti': () => void;
  'game:notification': (notif: {
    type: 'info' | 'success' | 'warning' | 'error';
    message: string;
  }) => void;
}
