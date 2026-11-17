# LiveQuiz & Buzzer App 🚀

Applicazione real-time mobile-first per quiz dal vivo senza punti né classifica, con **categorie personalizzabili e domande persistenti su server**, **Tabellone PC pubblico**, **Pannello Regia Admin** e **Buzzer sincronizzato al millisecondo** per smartphone iOS/Android.

---

## ✨ Funzionalità Principali

1. **Categorie & Domande Persistenti (`server/data/quiz-library.json`):**
   - Crea e personalizza le **Categorie** (nome, descrizione, colore badge), rinominale o eliminale.
   - Aggiungi manualmente dentro ogni categoria domande a **Risposta Multipla (A/B/C/D)** o **Solo a Voce**, con note segrete opzionali per il conduttore.
   - Modifica, elimina e riordina (`↑`/`↓`) le domande. Tutto viene salvato su file JSON sul server e **non si perde riavviando il server**.
   - Puoi preparare categorie e domande dalla schermata iniziale (`Categorie & Domande`) oppure in diretta dal pannello Admin, lanciandole in sequenza o con il pulsante **"Domanda Casuale"**.

2. **Separazione Telefono vs PC Principale:**
   - **Telefono (`PlayerView`):** il giocatore sceglie nome e colore univoco e durante il gioco vede **SOLO il badge della categoria, il testo della domanda e il pulsante gigante Buzzer** (più la coda prenotazioni). Le opzioni A/B/C/D e la risposta corretta sono nascoste sia a schermo che nei pacchetti WebSocket inviati ai telefoni.
   - **PC Principale — Tabellone Pubblico (`DisplayView`):** mostra QR Code di ingresso, PIN, categoria, testo della domanda e opzioni **A, B, C, D** senza mostrare la risposta corretta finché il conduttore non la rivela (o un giocatore indovina).
   - **PC Principale — Pannello Conduttore (`AdminView`):** regia completa con lista giocatori, selettore rapido di categoria + pescata casuale, navigazione domande (`Precedente` / `Prossima`), controllo Buzzer (`Apri`, `Blocca`, `Svuota`), valutazione (`✅ Corretta` / `❌ Errata`) ed effetto coriandoli.

3. **Gestione Disconnessioni iOS:**
   - Persistenza in `localStorage` (`roomCode`, `teamId`, ruolo) e riconnessione automatica al ritorno dal background (`visibilitychange`) mantenendo nome e colore scelti.

---

## 🚀 Avvio Rapido

### 1. Installazione dipendenze
```bash
cd livequiz/server && npm install
cd ../client && npm install
```

### 2. Avvio Server e Client
In due terminali separati:
```bash
# Terminale 1 (Server)
cd livequiz/server
npm run dev

# Terminale 2 (Client)
cd livequiz/client
npm run dev
```

### 3. Test Integrati
```bash
cd livequiz/server
npx tsx src/testRunner.ts
```
