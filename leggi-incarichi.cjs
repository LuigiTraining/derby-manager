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

async function leggiIncarichi() {
  try {
    console.log("Lettura collezione: incarichi");
    const incarichiRef = collection(db, "incarichi");
    const snapshot = await getDocs(incarichiRef);
    const incarichi = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Stampa i risultati
    console.log(JSON.stringify(incarichi, null, 2));
  } catch (error) {
    console.error("Errore nella lettura degli incarichi:", error);
  }
}

// Esegui la funzione
leggiIncarichi();
