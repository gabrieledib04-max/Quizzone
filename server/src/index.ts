import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import os from 'os';
import { GameManager } from './gameManager.js';
import {
  CreateQuestionInput,
  QuestionStore,
  UpdateQuestionInput,
} from './questionStore.js';
import {
  ClientToServerEvents,
  NetworkInfo,
  Room,
  ServerToClientEvents,
} from '../../shared/types.js';

const PORT = Number(process.env.PORT) || 4000;
const CLIENT_PORT = Number(process.env.CLIENT_PORT) || 5173;

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingInterval: 10000,
  pingTimeout: 5000,
});

const gameManager = new GameManager();
const questionStore = new QuestionStore();

function broadcastRoom(room: Room): void {
  io.to(`${room.code}:admin`).emit('room:updated', room);
  io.to(`${room.code}:display`).emit(
    'room:updated',
    gameManager.sanitizeRoomForDisplay(room)
  );
  io.to(`${room.code}:players`).emit(
    'room:updated',
    gameManager.sanitizeRoomForPlayers(room)
  );
}

function getLocalIPs(): string[] {
  const interfaces = os.networkInterfaces();
  const ips: string[] = [];
  for (const name of Object.keys(interfaces)) {
    const netList = interfaces[name];
    if (!netList) continue;
    for (const net of netList) {
      if (net.family === 'IPv4' && !net.internal) {
        ips.push(net.address);
      }
    }
  }
  return ips;
}

// ======================= AUTH & CONFIG =======================

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'quizadmin2026';

function requireAdminAuth(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void {
  const headerPassword = req.headers['x-admin-password'];
  const queryPassword = req.query.adminPassword;
  const provided =
    typeof headerPassword === 'string'
      ? headerPassword
      : typeof queryPassword === 'string'
      ? queryPassword
      : '';

  if (provided === ADMIN_PASSWORD) {
    next();
    return;
  }

  res.status(401).json({
    error: 'Accesso negato: password amministratore mancante o non corretta.',
  });
}

// ======================= REST API CATEGORIE & DOMANDE =======================

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.post('/api/admin/verify', (req, res) => {
  const { password } = req.body as { password?: string };
  if (password === ADMIN_PASSWORD) {
    res.json({ success: true, valid: true });
  } else {
    res.status(401).json({
      success: false,
      valid: false,
      error: 'Password amministratore non corretta.',
    });
  }
});

app.get('/api/network-info', (_req, res) => {
  const info: NetworkInfo = {
    ips: getLocalIPs(),
    serverPort: PORT,
    clientPort: CLIENT_PORT,
  };
  res.json(info);
});

app.get('/api/categories', async (_req, res) => {
  try {
    await questionStore.init();
    res.json({ categories: questionStore.getCategories() });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Errore interno';
    res.status(500).json({ error: message });
  }
});

app.post('/api/categories', requireAdminAuth, async (req, res) => {
  try {
    const { name, description, color } = req.body as {
      name?: string;
      description?: string;
      color?: string;
    };
    const category = await questionStore.createCategory(
      name || '',
      description || '',
      color
    );
    res
      .status(201)
      .json({ category, categories: questionStore.getCategories() });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Dati non validi';
    res.status(400).json({ error: message });
  }
});

app.put('/api/categories/:categoryId', requireAdminAuth, async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { name, description, color } = req.body as {
      name?: string;
      description?: string;
      color?: string;
    };
    const category = await questionStore.updateCategory(categoryId, {
      name,
      description,
      color,
    });
    res.json({ category, categories: questionStore.getCategories() });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Errore aggiornamento';
    res.status(400).json({ error: message });
  }
});

app.delete('/api/categories/:categoryId', requireAdminAuth, async (req, res) => {
  try {
    const { categoryId } = req.params;
    await questionStore.deleteCategory(categoryId);
    res.json({ categories: questionStore.getCategories() });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Errore eliminazione';
    res.status(404).json({ error: message });
  }
});

app.post('/api/categories/:categoryId/questions', requireAdminAuth, async (req, res) => {
  try {
    const { categoryId } = req.params;
    const input = req.body as CreateQuestionInput;
    const result = await questionStore.addQuestion(categoryId, input);
    res.status(201).json({
      question: result.question,
      category: result.category,
      categories: questionStore.getCategories(),
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Errore salvataggio domanda';
    res.status(400).json({ error: message });
  }
});

app.put(
  '/api/categories/:categoryId/questions/:questionId',
  requireAdminAuth,
  async (req, res) => {
    try {
      const { categoryId, questionId } = req.params;
      const updates = req.body as UpdateQuestionInput;
      const result = await questionStore.updateQuestion(
        categoryId,
        questionId,
        updates
      );
      res.json({
        question: result.question,
        category: result.category,
        categories: questionStore.getCategories(),
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Errore modifica domanda';
      res.status(400).json({ error: message });
    }
  }
);

app.delete(
  '/api/categories/:categoryId/questions/:questionId',
  requireAdminAuth,
  async (req, res) => {
    try {
      const { categoryId, questionId } = req.params;
      const category = await questionStore.deleteQuestion(
        categoryId,
        questionId
      );
      res.json({ category, categories: questionStore.getCategories() });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Errore eliminazione domanda';
      res.status(404).json({ error: message });
    }
  }
);

app.post('/api/categories/:categoryId/reorder', requireAdminAuth, async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { questionIds } = req.body as { questionIds?: string[] };
    if (!Array.isArray(questionIds)) {
      res.status(400).json({ error: 'questionIds deve essere un array.' });
      return;
    }
    const category = await questionStore.reorderQuestions(
      categoryId,
      questionIds
    );
    res.json({ category, categories: questionStore.getCategories() });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Errore riordino';
    res.status(400).json({ error: message });
  }
});

// ======================= SOCKET.IO =======================

io.on(
  'connection',
  (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
    // 1. Admin crea la stanza (richiede password)
    socket.on('admin:create_room', (dataOrAck: unknown, maybeAck?: unknown) => {
      const ack = (
        typeof dataOrAck === 'function' ? dataOrAck : maybeAck
      ) as
        | ((res: { success: boolean; room?: Room; error?: string }) => void)
        | undefined;
      const data = (
        typeof dataOrAck === 'object' && dataOrAck !== null ? dataOrAck : {}
      ) as { password?: string };

      if (data.password !== ADMIN_PASSWORD) {
        if (ack) {
          ack({
            success: false,
            error: 'Password amministratore non corretta o mancante.',
          });
        }
        return;
      }

      try {
        const room = gameManager.createRoom(socket.id);
        socket.join(room.code);
        socket.join(`${room.code}:admin`);
        if (ack) ack({ success: true, room });
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Errore sconosciuto';
        if (ack) ack({ success: false, error: message });
      }
    });

    // 2. Admin riconnessione
    socket.on('admin:reconnect', ({ roomCode }, ack) => {
      const room = gameManager.reconnectAdmin(roomCode, socket.id);
      if (room) {
        socket.join(room.code);
        socket.join(`${room.code}:admin`);
        ack({ success: true, room });
      } else {
        ack({ success: false, error: 'Stanza non trovata o sessione scaduta.' });
      }
    });

    // 2b. Display / Tabellone PC si unisce alla stanza
    socket.on('display:join_room', ({ roomCode }, ack) => {
      const result = gameManager.joinDisplay(roomCode, socket.id);
      if (result.success && result.room) {
        socket.join(result.room.code);
        socket.join(`${result.room.code}:display`);
        ack({ success: true, room: result.room });
      } else {
        ack({
          success: false,
          error: result.error || 'Impossibile aprire il Tabellone.',
        });
      }
    });

    // 3. Giocatore/Squadra entra nella stanza
    socket.on('team:join_room', ({ roomCode, teamId }, ack) => {
      const result = gameManager.joinRoom(roomCode, socket.id, teamId);
      if (result.success && result.room && result.team) {
        socket.join(result.room.code);
        socket.join(`${result.room.code}:players`);
        const rawRoom = gameManager.getRoom(result.room.code);
        if (rawRoom) {
          broadcastRoom(rawRoom);
        }
        ack({ success: true, room: result.room, team: result.team });
      } else {
        ack({
          success: false,
          error: result.error || "Errore durante l'accesso.",
        });
      }
    });

    // 4. Giocatore/Squadra sceglie Nome e Colore
    socket.on('team:register', ({ roomCode, teamId, name, color }, ack) => {
      const result = gameManager.registerTeam(roomCode, teamId, name, color);
      if (result.success && result.team) {
        const room = gameManager.getRoom(roomCode);
        if (room) {
          broadcastRoom(room);
          io.to(room.code).emit('game:notification', {
            type: 'info',
            message: `${result.team.name} si è unito alla partita!`,
          });
        }
        ack({ success: true, team: result.team });
      } else {
        ack({
          success: false,
          error: result.error || 'Errore nella registrazione.',
        });
      }
    });

    // 5. Admin rimuove (kick) un giocatore
    socket.on('admin:kick_team', ({ roomCode, teamId }, ack) => {
      const result = gameManager.kickTeam(roomCode, teamId);
      if (result.success) {
        if (result.socketId) {
          io.to(result.socketId).emit(
            'team:kicked',
            'Sei stato rimosso dalla stanza dal conduttore.'
          );
        }
        const room = gameManager.getRoom(roomCode);
        if (room) {
          broadcastRoom(room);
          io.to(room.code).emit('buzzer:queue_updated', room.buzzerQueue);
        }
        if (ack) ack({ success: true });
      } else {
        if (ack) ack({ success: false, error: result.error });
      }
    });

    // 6. Admin cambia status stanza
    socket.on('admin:set_status', ({ roomCode, status }) => {
      const result = gameManager.setStatus(roomCode, status);
      if (result.success && result.room) {
        broadcastRoom(result.room);
      }
    });

    // 7. Admin aggiorna impostazioni
    socket.on('admin:update_settings', ({ roomCode, settings }) => {
      const result = gameManager.updateSettings(roomCode, settings);
      if (result.success && result.room) {
        broadcastRoom(result.room);
      }
    });

    // 8. Admin attiva il Buzzer (ARMED)
    socket.on('admin:arm_buzzer', ({ roomCode, question }) => {
      const result = gameManager.armBuzzer(roomCode, question);
      if (result.success && result.room) {
        broadcastRoom(result.room);
        io.to(result.room.code).emit('buzzer:queue_updated', result.room.buzzerQueue);
        io.to(result.room.code).emit('buzzer:state_changed', {
          buzzerState: 'ARMED',
          openedAt: result.room.buzzerOpenedAt,
        });
      }
    });

    // 9. Admin blocca il Buzzer (LOCKED)
    socket.on('admin:lock_buzzer', ({ roomCode }) => {
      const result = gameManager.lockBuzzer(roomCode);
      if (result.success && result.room) {
        broadcastRoom(result.room);
        io.to(result.room.code).emit('buzzer:state_changed', {
          buzzerState: 'LOCKED',
          openedAt: null,
        });
      }
    });

    // 10. Admin resetta il Buzzer (svuota coda)
    socket.on('admin:reset_buzzer', ({ roomCode }) => {
      const result = gameManager.resetBuzzer(roomCode);
      if (result.success && result.room) {
        broadcastRoom(result.room);
        io.to(result.room.code).emit('buzzer:queue_updated', []);
        io.to(result.room.code).emit('buzzer:state_changed', {
          buzzerState: 'LOCKED',
          openedAt: null,
        });
      }
    });

    // 11. Giocatore preme il Buzzer
    socket.on('team:buzz', ({ roomCode, teamId }, ack) => {
      const result = gameManager.handleBuzz(roomCode, teamId);
      if (result.success && result.position !== undefined) {
        const room = gameManager.getRoom(roomCode);
        if (room) {
          io.to(room.code).emit('buzzer:queue_updated', room.buzzerQueue);
          broadcastRoom(room);
          io.to(room.code).emit('game:sound', 'buzz');
        }
        ack({ success: true, position: result.position });
      } else {
        ack({
          success: false,
          error: result.error || 'Errore nella prenotazione',
        });
      }
    });

    // 12. Admin valuta la risposta del Buzzer (CORRECT / WRONG)
    socket.on('admin:evaluate_buzz', ({ roomCode, teamId, result }) => {
      const evalResult = gameManager.evaluateBuzz(roomCode, teamId, result);
      if (evalResult.success && evalResult.room) {
        broadcastRoom(evalResult.room);
        io.to(evalResult.room.code).emit(
          'buzzer:queue_updated',
          evalResult.room.buzzerQueue
        );

        if (result === 'CORRECT') {
          io.to(evalResult.room.code).emit('game:sound', 'correct');
          io.to(evalResult.room.code).emit('buzzer:state_changed', {
            buzzerState: 'LOCKED',
            openedAt: null,
          });
        } else {
          io.to(evalResult.room.code).emit('game:sound', 'wrong');
          if (
            !evalResult.nextTeam &&
            !evalResult.room.settings.allowMultipleAttempts
          ) {
            io.to(evalResult.room.code).emit('buzzer:state_changed', {
              buzzerState: 'LOCKED',
              openedAt: null,
            });
          }
        }
      }
    });

    // 13. Admin imposta domanda (da categoria o manuale)
    socket.on('admin:set_question', ({ roomCode, question, armImmediately }) => {
      const result = gameManager.setQuestion(
        roomCode,
        question,
        Boolean(armImmediately)
      );
      if (result.success && result.room) {
        broadcastRoom(result.room);
        io.to(result.room.code).emit('buzzer:queue_updated', []);
        io.to(result.room.code).emit('buzzer:state_changed', {
          buzzerState: armImmediately ? 'ARMED' : 'LOCKED',
          openedAt: result.room.buzzerOpenedAt,
        });
      }
    });

    // 14. Admin rivela risposta corretta sul Tabellone
    socket.on('admin:reveal_answer', ({ roomCode }) => {
      const result = gameManager.revealAnswer(roomCode);
      if (result.success && result.room) {
        broadcastRoom(result.room);
        io.to(result.room.code).emit('buzzer:state_changed', {
          buzzerState: 'LOCKED',
          openedAt: null,
        });
      }
    });

    // 15. Admin lancia coriandoli su Tabellone
    socket.on('admin:trigger_confetti', ({ roomCode }) => {
      const room = gameManager.getRoom(roomCode);
      if (room) {
        io.to(room.code).emit('game:confetti');
        io.to(room.code).emit('game:sound', 'victory');
      }
    });

    // Gestione Disconnessione
    socket.on('disconnect', () => {
      const disconnectedInfo = gameManager.handleDisconnect(socket.id);
      if (disconnectedInfo?.room) {
        broadcastRoom(disconnectedInfo.room);
      }
    });
  }
);

async function startServer(): Promise<void> {
  await questionStore.init();
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 LiveQuiz Server in esecuzione su http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Errore avvio server:', err);
  process.exit(1);
});
