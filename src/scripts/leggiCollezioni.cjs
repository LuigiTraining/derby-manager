const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

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
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Array delle collezioni da leggere
const COLLEZIONI = [
  'wiki_pages',
  'annunci',
  'impostazioni',
  'incarichi_citta',
  'progressi_incarichi',
  'derby',
  'elementi_citta',
  'cesti',
  'assegnazioni',
  'richieste_registrazione',
  'utenti'
];

async function leggiCollezioni() {
  const risultati = {};

  try {
    for (const nomeCollezione of COLLEZIONI) {
      console.log(`Lettura collezione: ${nomeCollezione}`);
      const collezioneRef = collection(db, nomeCollezione);
      const snapshot = await getDocs(collezioneRef);
      risultati[nomeCollezione] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    }

    // Salva i risultati in un file JSON
    const risultatiJSON = JSON.stringify(risultati, null, 2);
    console.log('Risultati completi:');
    console.log(risultatiJSON);

  } catch (error) {
    console.error('Errore nella lettura delle collezioni:', error);
  }
}

// Esegui la funzione
leggiCollezioni(); 