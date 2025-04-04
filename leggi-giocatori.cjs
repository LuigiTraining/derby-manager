const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs } = require("firebase/firestore");

// Configurazione Firebase
const firebaseConfig = {
  apiKey: "AIzaSyA5pyoxzvnuOMFUu3ir3o4mRXKF49xBfHU",
  authDomain: "derby-manager-perche-no.firebaseapp.com",
  projectId: "derby-manager-perche-no",
  storageBucket: "derby-manager-perche-no.firebasestorage.app",
  messagingSenderId: "616230781662",
  appId: "1:616230781662:web:4c7eff4825cdaea9a4f84f",
};

// Inizializza Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function leggiGiocatori() {
  try {
    console.log("Lettura collezione: giocatori");
    const giocatoriRef = collection(db, "giocatori");
    const snapshot = await getDocs(giocatoriRef);
    
    if (snapshot.empty) {
      console.log("Nessun giocatore trovato nella collezione 'giocatori'");
      return;
    }
    
    console.log(`Trovati ${snapshot.docs.length} giocatori`);
    
    // Per ogni giocatore, carica le sue farm
    const giocatoriConFarms = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const giocatore = {
          id: doc.id,
          ...doc.data()
        };
        
        console.log(`Caricamento farm per giocatore: ${giocatore.nome || "Senza nome"} (ID: ${doc.id})`);
        
        // Carica le farm del giocatore
        const farmsRef = collection(db, "giocatori", doc.id, "farms");
        const farmsSnapshot = await getDocs(farmsRef);
        
        const farms = farmsSnapshot.docs.map(farmDoc => ({
          id: farmDoc.id,
          ...farmDoc.data()
        }));
        
        console.log(`  - Trovate ${farms.length} farm`);
        
        return {
          ...giocatore,
          farms
        };
      })
    );
    
    // Stampa i risultati
    console.log(JSON.stringify(giocatoriConFarms, null, 2));
    
    // Stampa il numero totale di farm
    const totaleFarms = giocatoriConFarms.reduce((total, giocatore) => total + giocatore.farms.length, 0);
    console.log(`Totale farm in tutti i giocatori: ${totaleFarms}`);
    
  } catch (error) {
    console.error("Errore nella lettura dei giocatori:", error);
  }
}

// Esegui la funzione
leggiGiocatori(); 