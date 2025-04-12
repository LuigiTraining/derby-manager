import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, doc, getDoc, getDocs, 
  setDoc, updateDoc, deleteDoc, addDoc, query, where,
  orderBy, limit, DocumentData, CollectionReference, 
  DocumentReference, Query, QuerySnapshot, DocumentSnapshot,
  Firestore
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getMessaging } from 'firebase/messaging';
import { registerRateLimitRequest, setRateLimitProjectId } from './rateLimit';

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

// Imposta il Project ID per il rate limiting
setRateLimitProjectId(firebaseConfig.projectId);

// Ottieni istanze dei servizi Firebase
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const messaging = getMessaging(app);

// Wrapper per le funzioni di Firestore che registrano le richieste per rate limiting

// Wrapper per getDoc
export const getDocWithRateLimit = async <T = DocumentData>(
  docRef: DocumentReference<T>
): Promise<DocumentSnapshot<T>> => {
  // Registra la richiesta per rate limiting
  await registerRateLimitRequest();
  return getDoc(docRef);
};

// Wrapper per getDocs
export const getDocsWithRateLimit = async <T = DocumentData>(
  query: Query<T>
): Promise<QuerySnapshot<T>> => {
  // Registra la richiesta per rate limiting
  await registerRateLimitRequest();
  return getDocs(query);
};

// Wrapper per setDoc
export const setDocWithRateLimit = async <T = DocumentData>(
  docRef: DocumentReference<T>,
  data: T
): Promise<void> => {
  // Registra la richiesta per rate limiting
  await registerRateLimitRequest();
  return setDoc(docRef, data);
};

// Wrapper per updateDoc
export const updateDocWithRateLimit = async <T = DocumentData>(
  docRef: DocumentReference<T>,
  data: Partial<T>
): Promise<void> => {
  // Registra la richiesta per rate limiting
  await registerRateLimitRequest();
  return updateDoc(docRef, data as any);
};

// Wrapper per deleteDoc
export const deleteDocWithRateLimit = async <T = DocumentData>(
  docRef: DocumentReference<T>
): Promise<void> => {
  // Registra la richiesta per rate limiting
  await registerRateLimitRequest();
  return deleteDoc(docRef);
};

// Wrapper per addDoc
export const addDocWithRateLimit = async <T = DocumentData>(
  collRef: CollectionReference<T>,
  data: T
): Promise<DocumentReference<T>> => {
  // Registra la richiesta per rate limiting
  await registerRateLimitRequest();
  return addDoc(collRef, data);
};

// Funzione per ottenere il riferimento a una collezione di un vicinato
export const getVicinatoCollection = (vicinatoId: string, collection: string) => {
  return `vicinati/${vicinatoId}/${collection}`;
};
