import { db } from '../configurazione/firebase';
import { collection, getDocs } from 'firebase/firestore';

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

const leggiCollezioni = async () => {
  const risultati: { [key: string]: any[] } = {};

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
};

// Esegui la funzione
leggiCollezioni(); 