import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getMessaging } from 'firebase/messaging';

// Configurazione Firebase
const firebaseConfig = {
  apiKey: "AIzaSyA5pyoxzvnuOMFUu3ir3o4mRXKF49xBfHU",
  authDomain: "derby-manager-perche-no.firebaseapp.com",
  projectId: "derby-manager-perche-no",
  storageBucket: "derby-manager-perche-no.firebasestorage.app",
  messagingSenderId: "616230781662",
  appId: "1:616230781662:web:4c7eff4825cdaea9a4f84f"
};

// Inizializza Firebase
export const app = initializeApp(firebaseConfig);

// Ottieni istanze dei servizi Firebase
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const messaging = getMessaging(app);

// Funzione per ottenere il riferimento a una collezione di un vicinato
export const getVicinatoCollection = (vicinatoId: string, collection: string) => {
  return `vicinati/${vicinatoId}/${collection}`;
};
