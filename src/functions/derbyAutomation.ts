import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Inizializza l'app se non è già inizializzata
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Funzione che viene eseguita ogni 10 minuti
export const manageDerbyAutomation = functions.pubsub
  .schedule('*/10 * * * *')  // Ogni 10 minuti
  .timeZone('Europe/Rome')
  .onRun(async (context) => {
    const now = new Date();
    const day = now.getDay();     // 0 = domenica, 2 = martedì
    const hour = now.getHours();
    const minute = now.getMinutes();

    // Domenica tra le 20:00 e le 20:10 - Disattiva il derby corrente
    if (day === 0 && hour === 20 && minute < 10) {
      const activeDerbySnapshot = await db
        .collection('derby')
        .where('attivo', '==', true)
        .get();

      // Procedi solo se c'è un derby attivo che non è ancora stato disattivato
      if (!activeDerbySnapshot.empty) {
        await disableCurrentDerby();
        console.log('Derby disattivato con successo - Domenica 20:00');
      }
    }

    // Martedì tra le 8:00 e le 8:10 - Attiva il prossimo derby
    if (day === 2 && hour === 8 && minute < 10) {
      const nextDerbySnapshot = await db
        .collection('derby')
        .where('prossimo', '==', true)
        .get();

      // Procedi solo se c'è un derby programmato che non è ancora stato attivato
      if (!nextDerbySnapshot.empty) {
        await activateNextDerby();
        console.log('Nuovo derby attivato con successo - Martedì 8:00');
      }
    }
  });

// Funzione per disattivare il derby corrente
async function disableCurrentDerby() {
  const batch = db.batch();

  // Trova il derby attivo
  const activeDerbySnapshot = await db
    .collection('derby')
    .where('attivo', '==', true)
    .get();

  // Disattiva il derby corrente
  activeDerbySnapshot.docs.forEach(doc => {
    batch.update(doc.ref, { 
      attivo: false,
      data_modifica: admin.firestore.Timestamp.now()
    });
  });

  await batch.commit();
}

// Funzione per attivare il prossimo derby
async function activateNextDerby() {
  const batch = db.batch();

  // Trova il derby marcato come prossimo
  const nextDerbySnapshot = await db
    .collection('derby')
    .where('prossimo', '==', true)
    .get();

  if (!nextDerbySnapshot.empty) {
    const nextDerby = nextDerbySnapshot.docs[0];

    // Disattiva tutti i derby attivi (per sicurezza)
    const activeDerbySnapshot = await db
      .collection('derby')
      .where('attivo', '==', true)
      .get();

    activeDerbySnapshot.docs.forEach(doc => {
      batch.update(doc.ref, { 
        attivo: false,
        data_modifica: admin.firestore.Timestamp.now()
      });
    });

    // Attiva il prossimo derby e rimuovi il flag 'prossimo'
    batch.update(nextDerby.ref, {
      attivo: true,
      prossimo: false,
      data_modifica: admin.firestore.Timestamp.now()
    });

    await batch.commit();
  }
} 