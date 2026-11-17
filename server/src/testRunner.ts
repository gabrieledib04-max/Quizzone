import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GameManager } from './gameManager.js';
import { QuestionStore } from './questionStore.js';
import { CATEGORY_COLORS, Question } from '../../shared/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

async function runSimulation() {
  console.log('🧪 === AVVIO TEST INTEGRATO LIVEQUIZ (CATEGORIE + SANITIZZAZIONE + BUZZER SENZA PUNTI) ===\n');

  const testDbPath = path.resolve(__dirname, '..', 'data', 'test-categories.tmp.json');
  await fs.unlink(testDbPath).catch(() => {});

  // Test 0: Persistenza Categorie & Domande tra riavvii (incl. migrazione legacy)
  console.log('0️⃣ Test: Creazione Categorie e Persistenza Domande su File JSON');
  const store1 = new QuestionStore(testDbPath);
  await store1.init();
  const createdCat = await store1.createCategory(
    'Geografia',
    'Capitali e continenti',
    CATEGORY_COLORS[2]
  );
  const added1 = await store1.addQuestion(createdCat.id, {
    type: 'MULTIPLE_CHOICE',
    text: "Qual è la capitale dell'Islanda?",
    options: ['Oslo', 'Reykjavik', 'Helsinki', 'Copenaghen'],
    correctOptionIndex: 1,
    hostNote: 'Risposta B',
  });
  const added2 = await store1.addQuestion(createdCat.id, {
    type: 'VOICE_ONLY',
    text: 'Qual è il fiume più lungo del Sud America?',
    options: [],
    correctOptionIndex: -1,
    hostNote: 'Rio delle Amazzoni',
  });
  await store1.reorderQuestions(createdCat.id, [
    added2.question.id,
    added1.question.id,
  ]);

  // Simulazione riavvio server
  const store2 = new QuestionStore(testDbPath);
  await store2.init();
  const reloadedCat = store2.getCategoryById(createdCat.id);
  assert(Boolean(reloadedCat), 'La categoria non è stata ricaricata dopo il riavvio!');
  assert(reloadedCat!.color === CATEGORY_COLORS[2], 'Colore categoria non preservato!');
  assert(reloadedCat!.questions.length === 2, 'Numero domande errato dopo riavvio!');
  assert(reloadedCat!.questions[0].id === added2.question.id, 'Ordine domande non preservato!');
  assert(reloadedCat!.questions[1].options[1] === 'Reykjavik', 'Opzioni non preservate!');

  // Test migrazione automatica da formato legacy v1 (quizzes -> categories senza punti)
  const legacyPath = path.resolve(__dirname, '..', 'data', 'test-legacy.tmp.json');
  await fs.writeFile(
    legacyPath,
    JSON.stringify({
      version: 1,
      quizzes: [
        {
          id: 'legacy_1',
          title: 'Vecchia Scaletta',
          questions: [
            {
              id: 'lq_1',
              type: 'MULTIPLE_CHOICE',
              text: 'Domanda migrata?',
              options: ['Si', 'No'],
              correctOptionIndex: 0,
              points: 50,
              penaltyPoints: 10,
            },
          ],
        },
      ],
    }),
    'utf-8'
  );
  const legacyStore = new QuestionStore(legacyPath);
  await legacyStore.init();
  const migrated = legacyStore.getCategories();
  assert(migrated.length === 1 && migrated[0].name === 'Vecchia Scaletta', 'Migrazione legacy fallita!');
  assert(!('points' in migrated[0].questions[0]), 'I punti legacy dovevano essere rimossi!');
  await fs.unlink(legacyPath).catch(() => {});

  console.log(' ✅ Categorie, domande, colori, ordine e migrazione legacy verificati.');
  await fs.unlink(testDbPath).catch(() => {});

  // Test 1: Creazione Stanza & Giocatori senza punti
  const gm = new GameManager();
  console.log('\n1️⃣ Test: Creazione Stanza e Registrazione Giocatori');
  const room = gm.createRoom('socket_admin_123');
  assert(Boolean(room.code) && room.code.length === 6, 'Codice stanza non conforme');

  const team1Join = gm.joinRoom(room.code, 'socket_team_1');
  const team2Join = gm.joinRoom(room.code, 'socket_team_2');
  assert(team1Join.success && Boolean(team1Join.team), 'Join Giocatore 1 fallito');
  assert(team2Join.success && Boolean(team2Join.team), 'Join Giocatore 2 fallito');
  assert(!('score' in team1Join.team!), 'Team non deve contenere punti/score!');

  const reg1 = gm.registerTeam(room.code, team1Join.team!.id, 'Marco', '#EF4444');
  assert(reg1.success, 'Registrazione Marco fallita');

  const reg2Conflict = gm.registerTeam(room.code, team2Join.team!.id, 'Giulia', '#EF4444');
  assert(!reg2Conflict.success, 'Il controllo colore non ha bloccato il duplicato!');

  const reg2 = gm.registerTeam(room.code, team2Join.team!.id, 'Giulia', '#3B82F6');
  assert(reg2.success, 'Registrazione Giulia fallita');
  console.log(' ✅ Giocatori registrati senza punteggio e con colori univoci.');

  // Test 2: Sanitizzazione payload Telefoni vs PC Principale
  console.log('\n2️⃣ Test: Sanitizzazione Payload (Telefono solo domanda+categoria, Opzioni solo su PC)');
  const mcQuestion: Question = {
    id: added1.question.id,
    type: 'MULTIPLE_CHOICE',
    mode: 'BUZZER_FIRST',
    text: added1.question.text,
    options: added1.question.options,
    correctOptionIndex: added1.question.correctOptionIndex,
    hostNote: added1.question.hostNote,
    buzzerState: 'LOCKED',
    categoryId: reloadedCat!.id,
    categoryName: reloadedCat!.name,
    categoryColor: reloadedCat!.color,
  };
  gm.setQuestion(room.code, mcQuestion, false);

  const playerViewRoom = gm.sanitizeRoomForPlayers(room);
  assert(playerViewRoom.currentQuestion?.text === mcQuestion.text, 'Il telefono deve vedere la domanda');
  assert(playerViewRoom.currentQuestion?.categoryName === 'Geografia', 'Il telefono deve vedere la categoria');
  assert(playerViewRoom.currentQuestion?.options.length === 0, 'Il telefono NON deve ricevere le opzioni!');
  assert(playerViewRoom.currentQuestion?.correctOptionIndex === -1, 'Il telefono NON deve ricevere la risposta corretta!');
  assert(playerViewRoom.currentQuestion?.hostNote === undefined, 'Il telefono NON deve ricevere le note admin!');

  const displayBeforeReveal = gm.sanitizeRoomForDisplay(room);
  assert(displayBeforeReveal.currentQuestion?.options.length === 4, 'Il PC Display deve vedere le 4 opzioni');
  assert(displayBeforeReveal.currentQuestion?.correctOptionIndex === -1, 'Il Display NON deve vedere la risposta prima di rivelarla!');

  gm.revealAnswer(room.code);
  const displayAfterReveal = gm.sanitizeRoomForDisplay(room);
  assert(displayAfterReveal.currentQuestion?.correctOptionIndex === 1, 'Il Display deve vedere la risposta dopo revealAnswer!');
  console.log(' ✅ Isolamento opzioni/risposte tra Telefoni e PC Principale verificato.');

  // Test 3: Concorrenza sub-millisecondo e Reset coda
  console.log('\n3️⃣ Test: Concorrenza Buzzer (<1ms) & Caso Limite Reset Coda');
  gm.setQuestion(room.code, mcQuestion, true);
  const buzz1 = gm.handleBuzz(room.code, team1Join.team!.id);
  const buzz2 = gm.handleBuzz(room.code, team2Join.team!.id);
  assert(buzz1.position === 1 && buzz2.position === 2, 'Ordinamento sub-millisecondo errato!');
  assert(!gm.handleBuzz(room.code, team1Join.team!.id).success, 'Doppio tocco accettato erroneamente!');

  gm.resetBuzzer(room.code);
  assert(room.buzzerQueue.length === 0, 'La coda non è stata svuotata!');
  assert(!gm.evaluateBuzz(room.code, team1Join.team!.id, 'CORRECT').success, 'Valutazione su coda vuota doveva fallire!');
  console.log(' ✅ Concorrenza sub-ms e reset coda sicuro verificati.');

  // Test 4: Valutazione Errata -> Scala al 2° -> Risposta Corretta
  console.log('\n4️⃣ Test: Valutazione Coda senza Punti (Errata -> Passa -> Corretta)');
  gm.armBuzzer(room.code);
  gm.handleBuzz(room.code, team1Join.team!.id);
  await new Promise((r) => setTimeout(r, 10));
  gm.handleBuzz(room.code, team2Join.team!.id);

  const evalWrong = gm.evaluateBuzz(room.code, team1Join.team!.id, 'WRONG');
  assert(evalWrong.nextTeam?.teamId === team2Join.team!.id, 'Scorrimento coda fallito!');

  const evalCorrect = gm.evaluateBuzz(room.code, team2Join.team!.id, 'CORRECT');
  assert(evalCorrect.success, 'Valutazione corretta fallita!');
  assert(room.currentQuestion?.revealedAnswer === true, 'Risposta multipla non rivelata su risposta corretta!');
  console.log(' ✅ Valutazione corretta e scorrimento coda verificati.');

  // Test 5: Disconnessione e Riconnessione iOS
  console.log('\n5️⃣ Test: Disconnessione e Riconnessione Giocatore');
  gm.handleDisconnect('socket_team_2');
  assert(room.teams[team2Join.team!.id].connected === false, 'Giocatore dovrebbe risultare disconnesso');
  const reconnectResult = gm.joinRoom(room.code, 'socket_team_2_NEW', team2Join.team!.id);
  assert(reconnectResult.success && reconnectResult.team?.name === 'Giulia', 'Riconnessione fallita!');
  console.log(' ✅ Riconnessione automatica verificata.');

  console.log('\n🎉 TUTTI I TEST SONO PASSATI CON SUCCESSO!');
}

runSimulation().catch((err) => {
  console.error('\n❌ ERRORE NEL TEST:', err);
  process.exit(1);
});
