import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as webpush from 'web-push';

// Inizializza l'app se non è già inizializzata
if (!admin.apps.length) {
  admin.initializeApp();
}

// Configura web-push con le tue VAPID keys
webpush.setVapidDetails(
  'mailto:percheno.asd@gmail.com',
  'BBX6cEdwVXJev8VfC2lgYyWsaG0NDf1ljSk1SOkwkdx9fQci8CYZo8iNF3QI8YBbdzdWxXAkhhB4HIQbKkAjERw',
  'LP0VRJ-WgGwTBKYLMVCNsPu5Uk9RQdT8LpZx-AHM8r8'
);

// Funzione per inviare una notifica a una subscription
const inviaNotificaPush = async (subscription: webpush.PushSubscription, payload: any) => {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return true;
  } catch (error) {
    console.error('Errore nell\'invio della notifica push:', error);
    if (error && typeof error === 'object' && 'statusCode' in error && error.statusCode === 410) {
      return 'subscription-expired';
    }
    return false;
  }
};

// Tipo per i dati della notifica
interface NotificationData {
  userIds?: string[];
  notification: {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    data?: Record<string, any>;
    actions?: Array<{
      action: string;
      title: string;
      icon?: string;
    }>;
    requireInteraction?: boolean;
    tag?: string;
    renotify?: boolean;
  };
}

// Funzione helper per inviare notifiche a utenti specifici
const inviaNotificaHelper = async (data: NotificationData) => {
  const { userIds, notification } = data;

  if (!userIds || !Array.isArray(userIds)) {
    throw new functions.https.HttpsError('invalid-argument', 'userIds deve essere un array');
  }

  // Recupera le subscriptions degli utenti
  const subscriptionsSnap = await admin.firestore()
    .collection('notifiche_subscriptions')
    .where(admin.firestore.FieldPath.documentId(), 'in', userIds)
    .get();

  const risultati = await Promise.all(
    subscriptionsSnap.docs.map(async (doc) => {
      const subscription = doc.data().subscription;
      const result = await inviaNotificaPush(subscription, notification);
      
      if (result === 'subscription-expired') {
        // Rimuovi la subscription scaduta
        await doc.ref.delete();
      }
      
      return {
        userId: doc.id,
        success: result === true
      };
    })
  );

  return { risultati };
};

// Funzione helper per inviare notifiche a tutti
const inviaNotificaATuttiHelper = async (data: NotificationData) => {
  const { notification } = data;

  // Recupera tutte le subscriptions
  const subscriptionsSnap = await admin.firestore()
    .collection('notifiche_subscriptions')
    .get();

  const risultati = await Promise.all(
    subscriptionsSnap.docs.map(async (doc) => {
      const subscription = doc.data().subscription;
      const result = await inviaNotificaPush(subscription, notification);
      
      if (result === 'subscription-expired') {
        // Rimuovi la subscription scaduta
        await doc.ref.delete();
      }
      
      return {
        userId: doc.id,
        success: result === true
      };
    })
  );

  return { risultati };
};

// Cloud Function per inviare notifiche a utenti specifici
export const inviaNotifica = functions.https.onCall(async (data: NotificationData, context) => {
  try {
    return await inviaNotificaHelper(data);
  } catch (error) {
    console.error('Errore nell\'invio delle notifiche:', error);
    throw new functions.https.HttpsError('internal', 'Errore nell\'invio delle notifiche');
  }
});

// Cloud Function per inviare notifiche a tutti gli utenti
export const inviaNotificaATutti = functions.https.onCall(async (data: NotificationData, context) => {
  try {
    return await inviaNotificaATuttiHelper(data);
  } catch (error) {
    console.error('Errore nell\'invio delle notifiche:', error);
    throw new functions.https.HttpsError('internal', 'Errore nell\'invio delle notifiche');
  }
});

// Trigger automatico quando viene creato un nuovo annuncio
export const onNuovoAnnuncio = functions.firestore
  .document('annunci/{annuncioId}')
  .onCreate(async (snap, context) => {
    const annuncio = snap.data();
    
    // Non inviare notifiche per le bozze
    if (annuncio.bozza) return;

    // Rimuovi i tag HTML e le entità HTML dal contenuto
    let contenutoSenzaHTML = annuncio.contenuto
      .replace(/<[^>]*>/g, '') // Rimuove i tag HTML
      .replace(/&nbsp;/g, ' ') // Sostituisce &nbsp; con spazi
      .replace(/&[^;]+;/g, '') // Rimuove altre entità HTML
      .trim(); // Rimuove spazi extra all'inizio e alla fine

    const notificationData: NotificationData = {
      notification: {
        title: 'Nuovo Annuncio',
        body: contenutoSenzaHTML.length > 100 
          ? contenutoSenzaHTML.substring(0, 97) + '...' 
          : contenutoSenzaHTML,
        icon: 'https://derby-manager-perche-no.web.app/icons/megaphone.png',
        badge: 'https://derby-manager-perche-no.web.app/icons/megaphone.png',
        data: {
          tipo: 'annuncio',
          annuncioId: context.params.annuncioId,
          url: `/annunci/${context.params.annuncioId}`
        },
        actions: [
          {
            action: 'apri',
            title: 'Apri',
            icon: 'https://derby-manager-perche-no.web.app/icons/open.png'
          }
        ],
        requireInteraction: true,
        tag: 'nuovo-annuncio',
        renotify: false // Cambiato a false per evitare notifiche duplicate
      }
    };

    try {
      // Se l'annuncio ha visibileLettori, invia solo a loro
      if (annuncio.visibileLettori?.length > 0) {
        await inviaNotificaHelper({
          ...notificationData,
          userIds: annuncio.visibileLettori
        });
      } else {
        // Altrimenti invia a tutti
        await inviaNotificaATuttiHelper(notificationData);
      }
    } catch (error) {
      console.error('Errore nell\'invio delle notifiche per il nuovo annuncio:', error);
    }
  }); 