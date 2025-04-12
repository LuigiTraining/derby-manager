import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { inviaNotifica, inviaNotificaATutti, onNuovoAnnuncio } from './notifiche';
import * as cors from 'cors';

// Inizializza l'app se non è già inizializzata
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Configura CORS
const corsHandler = cors({
  origin: [
    'http://localhost:5173',  // Development server
    'http://localhost:3000',  // Altro possibile development server
    'https://derby-manager-perche-no.web.app',  // Dominio principale
    'https://derby-manager-perche-no.firebaseapp.com', // Altro dominio Firebase 
  ],
  methods: ['GET', 'POST'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
});

// Esporta le funzioni di notifica
export { inviaNotifica, inviaNotificaATutti, onNuovoAnnuncio };

// Funzione HTTP per registrare richieste per rate limiting
export const recordRateLimitRequest = functions.https.onRequest(async (req, res) => {
  // Gestisci CORS
  return corsHandler(req, res, async () => {
    const ip = req.ip || 'unknown';
    const timeWindow = Math.floor(Date.now() / (1000 * 60 * 10)); // Finestra di 10 minuti
    const docRef = db.collection('system').doc('rate_limiting').collection(timeWindow.toString()).doc(ip);
    
    try {
      // Ottieni il documento corrente o crea un nuovo documento con conteggio 0
      const doc = await docRef.get();
      
      if (!doc.exists) {
        // Crea nuovo documento con count=1
        await docRef.set({ count: 1, firstRequest: admin.firestore.FieldValue.serverTimestamp() });
      } else {
        // Incrementa il conteggio
        await docRef.update({ 
          count: admin.firestore.FieldValue.increment(1),
          lastRequest: admin.firestore.FieldValue.serverTimestamp() 
        });
      }
      
      // Imposta una TTL per eliminare automaticamente i documenti dopo 20 minuti
      setTimeout(async () => {
        try {
          await docRef.delete();
        } catch (e) {
          console.error('Errore durante l\'eliminazione del documento di rate limiting:', e);
        }
      }, 20 * 60 * 1000);
      
      res.status(200).send({ success: true });
    } catch (error) {
      console.error('Errore durante il rate limiting:', error);
      res.status(500).send({ success: false, error: 'Errore interno' });
    }
  });
});

// Funzione di pulizia per documenti di rate limiting scaduti (esegui ogni ora)
export const cleanupRateLimitingDocs = functions.pubsub
  .schedule('0 * * * *') // Ogni ora
  .timeZone('Europe/Rome')
  .onRun(async (context) => {
    const currentWindow = Math.floor(Date.now() / (1000 * 60 * 10));
    
    try {
      // Ottieni tutte le collezioni in system/rate_limiting
      const collections = await db.collection('system').doc('rate_limiting').listCollections();
      
      for (const collection of collections) {
        const windowId = parseInt(collection.id);
        
        // Se la finestra è scaduta (più vecchia di 20 minuti), elimina tutti i documenti
        if (windowId < currentWindow - 2) {
          const docsSnapshot = await collection.get();
          
          if (!docsSnapshot.empty) {
            const batch = db.batch();
            docsSnapshot.docs.forEach((doc) => {
              batch.delete(doc.ref);
            });
            await batch.commit();
            console.log(`Eliminati ${docsSnapshot.size} documenti dalla finestra di rate limiting ${windowId}`);
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('Errore durante la pulizia dei documenti di rate limiting:', error);
      return null;
    }
  });

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

  if (!activeDerbySnapshot.empty) {
    const activeDerby = activeDerbySnapshot.docs[0];

    // Disattiva il derby corrente
    batch.update(activeDerby.ref, { 
      attivo: false,
      data_modifica: admin.firestore.Timestamp.now()
    });

    // Aggiorna il record storico esistente
    const storicoQuery = await db
      .collection('derby_storico')
      .where('derby_id', '==', activeDerby.id)
      .where('completato', '==', false)
      .get();

    if (!storicoQuery.empty) {
      const storicoDoc = storicoQuery.docs[0];
      batch.update(storicoDoc.ref, {
        data_fine: admin.firestore.Timestamp.now(),
        completato: true
      });
    }
  }

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
    const derbyData = nextDerby.data();

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

    // Attiva il derby e rimuovi il flag 'prossimo'
    batch.update(nextDerby.ref, {
      attivo: true,
      prossimo: false,
      data_modifica: admin.firestore.Timestamp.now()
    });

    // Crea un nuovo record nello storico
    const storicoRef = db.collection('derby_storico').doc();
    batch.set(storicoRef, {
      id: storicoRef.id,
      derby_id: nextDerby.id,
      nome: derbyData.nome,
      colore: derbyData.colore,
      data_inizio: admin.firestore.Timestamp.now(),
      data_fine: null,
      completato: false
    });

    await batch.commit();
  }
} 