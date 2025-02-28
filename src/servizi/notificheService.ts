import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../configurazione/firebase';

const functions = getFunctions();
const inviaNotificaFn = httpsCallable(functions, 'inviaNotifica');
const inviaNotificaATuttiFn = httpsCallable(functions, 'inviaNotificaATutti');

const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      // Prima controlla se esiste già una registrazione
      const existingRegistration = await navigator.serviceWorker.getRegistration('/notification-sw.js');
      if (existingRegistration) {
        await existingRegistration.unregister(); // Rimuovi la registrazione esistente
      }

      // Registra il nuovo service worker
      const registration = await navigator.serviceWorker.register('/notification-sw.js');
      await navigator.serviceWorker.ready;
      return registration;
    } catch (error) {
      console.error('Errore durante la registrazione del service worker:', error);
      return null;
    }
  }
  return null;
};

export const richiediPermessoNotifiche = async (userId: string) => {
  try {
    if (!('Notification' in window)) {
      console.log('Questo browser non supporta le notifiche desktop');
      return false;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const registration = await registerServiceWorker();
      if (!registration) {
        console.error('Impossibile registrare il service worker');
        return false;
      }

      try {
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: 'BBX6cEdwVXJev8VfC2lgYyWsaG0NDf1ljSk1SOkwkdx9fQci8CYZo8iNF3QI8YBbdzdWxXAkhhB4HIQbKkAjERw'
        });

        await setDoc(doc(db, 'notifiche_subscriptions', userId), {
          subscription: JSON.parse(JSON.stringify(subscription)),
          lastUpdated: new Date()
        }, { merge: true });

        return true;
      } catch (error) {
        console.error('Errore durante la sottoscrizione alle notifiche:', error);
        return false;
      }
    }
    return false;
  } catch (error) {
    console.error('Errore durante la richiesta del permesso:', error);
    return false;
  }
};

// Funzione per controllare se le notifiche sono già abilitate
export const controllaStatoNotifiche = async () => {
  try {
    if (!('Notification' in window)) {
      return false;
    }

    const permission = Notification.permission;
    if (permission === 'granted') {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        const subscription = await registration.pushManager.getSubscription();
        return !!subscription;
      }
    }
    return false;
  } catch (error) {
    console.error('Errore durante il controllo dello stato delle notifiche:', error);
    return false;
  }
};

export const inviaNotifica = async (
  titolo: string,
  messaggio: string,
  userIds?: string[],
  dati?: Record<string, string>
) => {
  try {
    const notificaPayload = {
      title: titolo,
      body: messaggio,
      data: dati || {},
      icon: '/logo192.png',
      badge: '/logo192.png'
    };

    if (userIds && userIds.length > 0) {
      const result = await inviaNotificaFn({
        userIds,
        notification: notificaPayload
      });
      return result.data.success;
    } else {
      const result = await inviaNotificaATuttiFn({
        notification: notificaPayload
      });
      return result.data.success;
    }
  } catch (error) {
    console.error('Errore durante l\'invio della notifica:', error);
    return false;
  }
};

// Mostra una notifica quando l'app è in primo piano
export const mostraNotificaInPrimoPiano = (titolo: string, opzioni: NotificationOptions) => {
  if (Notification.permission === 'granted') {
    new Notification(titolo, opzioni);
  }
}; 