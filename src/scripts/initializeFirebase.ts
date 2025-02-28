import { db } from '../configurazione/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import { config } from '../configurazione/config';

const initializeFirebase = async () => {
  try {
    // Inizializza la pagina home della Wiki
    await setDoc(doc(db, 'wiki_pages', 'wiki_home'), {
      title: 'Wiki del Vicinato',
      content: '<h1>Benvenuti nella Wiki del Vicinato</h1><p>Questa è la pagina principale della wiki dove troverai tutte le informazioni utili sul nostro vicinato.</p>',
      parentPath: null,
      order: 0,
      lastModified: new Date(),
      modifiedBy: 'system'
    });

    // Inizializza la pagina home del Tutorial
    await setDoc(doc(db, 'wiki_pages', 'tutorial_home'), {
      title: 'Tutorial',
      content: '<h1>Tutorial</h1><p>In questa sezione troverai guide e tutorial utili per il gioco.</p>',
      parentPath: null,
      order: 0,
      lastModified: new Date(),
      modifiedBy: 'system'
    });

    // Inizializza la pagina home del Regolamento
    await setDoc(doc(db, 'wiki_pages', 'regolamento_home'), {
      title: 'Regolamento del Vicinato',
      content: '<h1>Regolamento</h1><p>Qui trovi tutte le regole del nostro vicinato.</p>',
      parentPath: null,
      order: 0,
      lastModified: new Date(),
      modifiedBy: 'system'
    });

    // Crea un annuncio di esempio
    await setDoc(doc(collection(db, 'annunci')), {
      numero: 1,
      contenuto: '<h2>Benvenuti nel Derby Manager!</h2><p>Questo è il primo annuncio del nostro nuovo sistema.</p>',
      data: new Date(),
      lastModified: new Date(),
      modifiedBy: 'system'
    });

    console.log('Inizializzazione completata con successo!');
  } catch (error) {
    console.error('Errore durante l\'inizializzazione:', error);
    throw error;
  }
};

// Esporta la funzione per poterla chiamare da altri file
export { initializeFirebase }; 