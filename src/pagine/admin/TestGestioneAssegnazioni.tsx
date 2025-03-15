import React, { useState, useEffect, useCallback } from "react";
import { Box, Typography, Button, Paper, Tabs, Tab, TextField, InputAdornment, IconButton, CircularProgress, Alert, Snackbar, Tooltip } from "@mui/material";
import Layout from "../../componenti/layout/Layout";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import RefreshIcon from "@mui/icons-material/Refresh";
import SaveIcon from "@mui/icons-material/Save";
import ViewListIcon from "@mui/icons-material/ViewList";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import SortIcon from "@mui/icons-material/Sort";
import SortByAlphaIcon from "@mui/icons-material/SortByAlpha";
import {
  collection,
  query,
  getDocs,
  where,
  doc,
  updateDoc,
  addDoc,
  orderBy,
  Timestamp,
  deleteDoc,
  writeBatch,
  getDoc,
  serverTimestamp,
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase/firestore";
import { db } from "../../configurazione/firebase";
import { Edificio } from "../../tipi/edificio";
import { Incarico, IncaricoCitta } from "../../tipi/incarico";
import { Farm } from "../../tipi/giocatore";
import {
  Assegnazione,
  ConteggioAssegnazioni,
  TipoAssegnazione,
} from "../../tipi/assegnazione";
import { Cesto, IncaricoInCesto } from "../../tipi/cesto";
import { Derby } from "../../tipi/derby";

// Importazione dei componenti che abbiamo creato
import { ListaIncarichi } from "./temp/componenti/ListaIncarichi";
import { ListaCesti } from "./temp/componenti/ListaCesti";
import { ListaIncarichiCitta } from "./temp/componenti/ListaIncarichiCitta";

// Importo le funzioni di gestione cache
import { 
  aggiornaTimestampCollezione, 
  caricaDatiConCache, 
  verificaAggiornamenti, 
  aggiornaTuttiDati,
  creaDocumentoMetadati
} from "../../servizi/gestioneCache";

// Interfaccia per le tab
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

// Componente per il pannello delle tab
function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

/**
 * Pagina di test per il nuovo componente GestioneAssegnazioni
 */
export default function TestGestioneAssegnazioni() {
  // Stati per i dati
  const [edifici, setEdifici] = useState<Edificio[]>([]);
  const [incarichi, setIncarichi] = useState<Incarico[]>([]);
  const [incarichiCitta, setIncarichiCitta] = useState<IncaricoCitta[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [assegnazioni, setAssegnazioni] = useState<Assegnazione[]>([]);
  const [cesti, setCesti] = useState<Cesto[]>([]);
  const [cestiIncarichi, setCestiIncarichi] = useState<Map<string, IncaricoInCesto[]>>(new Map());
  const [derby, setDerby] = useState<Derby[]>([]);
  const [derbySelezionato, setDerbySelezionato] = useState<Derby | null>(null);

  // Stati per la UI
  const [loading, setLoading] = useState(true);
  const [salvandoAssegnazioni, setSalvandoAssegnazioni] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertSeverity, setAlertSeverity] = useState<"success" | "error" | "info" | "warning">("success");
  
  // Stati per la visualizzazione e l'ordinamento
  const [visualizzazioneGlobale, setVisualizzazioneGlobale] = useState(() => {
    try {
      return localStorage.getItem("visualizzazioneGlobale") === "true";
    } catch {
      return false;
    }
  });
  
  const [ordinamentoLivello, setOrdinamentoLivello] = useState(() => {
    try {
      return localStorage.getItem("ordinamentoLivello") === "true";
    } catch {
      return true; // Default: ordina per livello
    }
  });
  
  const [ordinamentoAlfabetico, setOrdinamentoAlfabetico] = useState(() => {
    try {
      return localStorage.getItem("ordinamentoAlfabetico") === "true";
    } catch {
      return false;
    }
  });
  
  const [ordinamentoInverso, setOrdinamentoInverso] = useState(() => {
    try {
      return localStorage.getItem("ordinamentoInverso") === "true";
    } catch {
      return false;
    }
  });
  
  // Stati per l'espansione degli edifici
  const [expandedEdifici, setExpandedEdifici] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("expandedEdifici");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  
  // Stati per l'evidenziazione temporanea
  const [elementoEvidenziato, setElementoEvidenziato] = useState<{
    tipo: 'incarico' | 'incaricoCitta' | 'cesto';
    id: string;
  } | null>(null);

  // Nuovo stato per tenere traccia delle assegnazioni modificate localmente
  const [assegnazioniModificate, setAssegnazioniModificate] = useState<Set<string>>(() => {
    try {
      // Recupera le assegnazioni modificate dal localStorage
      const assegnazioniModificateString = localStorage.getItem("assegnazioni_modificate");
      if (assegnazioniModificateString) {
        return new Set(JSON.parse(assegnazioniModificateString));
      }
      return new Set();
    } catch {
      return new Set();
    }
  });
  
  // Nuovo stato per tenere traccia se ci sono aggiornamenti disponibili
  const [aggiornamentoDisponibile, setAggiornamentoDisponibile] = useState(false);

  // Effetti per salvare gli stati nel localStorage
  useEffect(() => {
    localStorage.setItem("visualizzazioneGlobale", String(visualizzazioneGlobale));
  }, [visualizzazioneGlobale]);
  
  useEffect(() => {
    localStorage.setItem("ordinamentoLivello", String(ordinamentoLivello));
  }, [ordinamentoLivello]);
  
  useEffect(() => {
    localStorage.setItem("ordinamentoAlfabetico", String(ordinamentoAlfabetico));
  }, [ordinamentoAlfabetico]);
  
  useEffect(() => {
    localStorage.setItem("ordinamentoInverso", String(ordinamentoInverso));
  }, [ordinamentoInverso]);
  
  useEffect(() => {
    localStorage.setItem("expandedEdifici", JSON.stringify(expandedEdifici));
  }, [expandedEdifici]);

  // Effetto per salvare le assegnazioni modificate nel localStorage quando cambiano
  useEffect(() => {
    try {
      localStorage.setItem("assegnazioni_modificate", JSON.stringify(Array.from(assegnazioniModificate)));
    } catch (error) {
      console.error("Errore nel salvataggio delle assegnazioni modificate:", error);
    }
  }, [assegnazioniModificate]);

  // Effetto per verificare lo stato del pulsante INVIA
  useEffect(() => {
    console.log(`Assegnazioni modificate: ${assegnazioniModificate.size}`);
    console.log(`Pulsante INVIA ${assegnazioniModificate.size > 0 ? 'abilitato' : 'disabilitato'}`);
  }, [assegnazioniModificate]);

  // Carica i dati all'avvio
  useEffect(() => {
    caricaDati();
  }, []);

  // Funzione per caricare tutti i dati
  const caricaDati = async () => {
    setLoading(true);
    try {
      // Verifica se esiste il documento di metadati
      await creaDocumentoMetadati();
      
      // Carica i dati utilizzando la cache
      await Promise.all([
        caricaEdifici(),
        caricaIncarichi(),
        caricaIncarichiCitta(),
        caricaCesti(),
        caricaAssegnazioni(),
        caricaDerby(),
      ]);
      
      // Verifica se ci sono aggiornamenti disponibili, ma solo se non abbiamo aggiornato recentemente
      const ultimoAggiornamento = localStorage.getItem('ultimo_aggiornamento_dati');
      if (!ultimoAggiornamento || (Date.now() - parseInt(ultimoAggiornamento)) > (5 * 60 * 1000)) {
        console.log("Verifico se ci sono aggiornamenti disponibili...");
        const disponibile = await verificaAggiornamenti(false); // Non forzare la verifica
        setAggiornamentoDisponibile(disponibile);
      } else {
        console.log("Verifica aggiornamenti saltata: aggiornamento recente");
        setAggiornamentoDisponibile(false);
      }
    } catch (error) {
      console.error("Errore nel caricamento dei dati:", error);
    } finally {
      setLoading(false);
    }
  };

  // Funzione per mostrare alert
  const mostraAlert = (messaggio: string, severita: "success" | "error" | "info" | "warning") => {
    // Disabilitato per evitare messaggi temporanei
    console.log(`[${severita}] ${messaggio}`);
    // Non impostare più lo stato dell'alert
    // setAlertMessage(messaggio);
    // setAlertSeverity(severita);
    // setOpenAlert(true);
  };

  // Funzione per gestire il cambio di tab
  const handleChangeTab = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Funzione per simulare il caricamento
  const simulaCaricamento = () => {
    aggiornaProduzioni();
  };

  // Funzione per simulare l'aggiornamento delle produzioni
  const simulaAggiornaProduzioni = () => {
    aggiornaProduzioni();
  };

  // Funzione per simulare il salvataggio delle assegnazioni
  const simulaSalvaAssegnazioni = () => {
    salvaAssegnazioni();
  };

  // Funzione per gestire il toggle di un edificio
  const handleEdificioToggle = (edificioId: string | null) => {
    setExpandedEdifici((prev) => {
      if (prev.includes(edificioId || "")) {
        return prev.filter((id) => id !== edificioId);
      } else {
        return [...prev, edificioId || ""];
      }
    });
  };

  // Funzione per tradurre il nome dell'incarico
  const getTranslatedName = (nome: string) => {
    // In una versione completa, qui utilizzeremmo la traduzione
    // Per ora, restituiamo il nome originale
    return nome;
  };

  // Funzione per ottenere la quantità di un incarico
  const getQuantitaIncarico = (incarico: Incarico | IncaricoCitta): number => {
    if (!derbySelezionato || !incarico.quantita_derby) {
      return incarico.quantita;
    }

    const quantitaDerby = incarico.quantita_derby[derbySelezionato.id];
    if (typeof quantitaDerby === "undefined" || quantitaDerby === null) {
      return incarico.quantita;
    }

    return quantitaDerby;
  };

  // Funzione per ottenere la quantità di un incarico città
  const getQuantitaIncaricoCitta = (incarico: Incarico | IncaricoCitta): number => {
    if (!derbySelezionato || !incarico.quantita_derby) {
      return incarico.quantita;
    }

    const quantitaDerby = incarico.quantita_derby[derbySelezionato.id];
    if (typeof quantitaDerby === "undefined" || quantitaDerby === null) {
      return incarico.quantita;
    }

    return quantitaDerby;
  };

  // Funzione per ottenere la quantità di un incarico in un cesto
  const getQuantitaIncaricoCesto = (cestoId: string, incaricoId: string) => {
    const cesto = cesti.find(c => c.id === cestoId);
    if (!cesto) return 0;
    const incaricoInCesto = cesto.incarichi.find(i => i.incarico_id === incaricoId);
    if (!incaricoInCesto) return 0;

    // Se non c'è un derby selezionato o l'incarico non ha quantità specifiche per derby nel cesto
    if (!derbySelezionato || !incaricoInCesto.quantita_derby) {
      return incaricoInCesto.quantita;
    }

    // Se c'è una quantità specifica per questo derby nel cesto, usala
    const quantitaDerby = incaricoInCesto.quantita_derby[derbySelezionato.id];
    if (typeof quantitaDerby === "undefined" || quantitaDerby === null) {
      return incaricoInCesto.quantita;
    }

    return quantitaDerby;
  };

  // Funzione per calcolare i conteggi delle assegnazioni per un incarico
  const calcolaConteggi = async (incaricoId: string) => {
    try {
      // Filtra le assegnazioni per questo incarico
      const assegnazioniIncarico = assegnazioni.filter(
        (a) => a.tipo === "incarico" && a.riferimento_id === incaricoId
      );

      // Calcola i conteggi
      const conteggi: ConteggioAssegnazioni = {
        totaleAttive: 0,
        totaleInattive: 0,
        completateAttive: 0,
        completateInattive: 0,
        completateSenzaAssegnazioneAttive: 0,
        completateSenzaAssegnazioneInattive: 0,
      };

      // Per ora, contiamo solo il totale delle assegnazioni
      conteggi.totaleAttive = assegnazioniIncarico.length;
      conteggi.completateAttive = assegnazioniIncarico.filter(a => a.completato).length;

      return conteggi;
    } catch (error) {
      console.error("Errore nel calcolo dei conteggi:", error);
      return {
        totaleAttive: 0,
        totaleInattive: 0,
        completateAttive: 0,
        completateInattive: 0,
        completateSenzaAssegnazioneAttive: 0,
        completateSenzaAssegnazioneInattive: 0,
      };
    }
  };

  // Funzione per calcolare i conteggi delle assegnazioni per un incarico città
  const calcolaConteggiCitta = async (incaricoId: string) => {
    // Per ora, riutilizziamo la stessa funzione degli incarichi normali
    return calcolaConteggi(incaricoId);
  };

  // Funzione per calcolare i conteggi delle assegnazioni per un cesto
  const calcolaConteggiCesto = async (cestoId: string) => {
    try {
      // Filtra le assegnazioni per questo cesto
      const assegnazioniCesto = assegnazioni.filter(
        (a) => a.tipo === "cesto" && a.riferimento_id === cestoId
      );

      // Calcola i conteggi
      const conteggi: ConteggioAssegnazioni = {
        totaleAttive: 0,
        totaleInattive: 0,
        completateAttive: 0,
        completateInattive: 0,
        completateSenzaAssegnazioneAttive: 0,
        completateSenzaAssegnazioneInattive: 0,
      };

      // Per ora, contiamo solo il totale delle assegnazioni
      conteggi.totaleAttive = assegnazioniCesto.length;
      conteggi.completateAttive = assegnazioniCesto.filter(a => a.completato).length;

      return conteggi;
    } catch (error) {
      console.error("Errore nel calcolo dei conteggi:", error);
      return {
        totaleAttive: 0,
        totaleInattive: 0,
        completateAttive: 0,
        completateInattive: 0,
        completateSenzaAssegnazioneAttive: 0,
        completateSenzaAssegnazioneInattive: 0,
      };
    }
  };

  // Funzione per gestire l'assegnazione di un incarico a più farm
  const handleAssegnaIncarico = async (incaricoId: string, farmId: string) => {
    try {
      // Se farmId contiene più ID separati da virgola, è un'assegnazione multipla
      const farmIds = farmId.split(',');
      
      // Array per tenere traccia delle nuove assegnazioni
      const nuoveAssegnazioni = [...assegnazioni];
      
      // Per ogni farm ID
      for (const id of farmIds) {
      // Verifica se l'assegnazione esiste già
      const esisteAssegnazione = assegnazioni.some(
        (a) =>
          a.tipo === "incarico" &&
          a.riferimento_id === incaricoId &&
            a.farm_id === id
      );

      if (esisteAssegnazione) {
          console.log(`Assegnazione già esistente per farm ${id}`);
          continue; // Salta questa farm e passa alla prossima
      }

      // Crea la nuova assegnazione
      const nuovaAssegnazione = {
          id: `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`, // ID temporaneo
          farm_id: id,
        tipo: "incarico" as TipoAssegnazione,
        riferimento_id: incaricoId,
        completato: false,
        data_assegnazione: Timestamp.now(),
      };

      // Arricchisci l'assegnazione con i dati della farm e del giocatore
        const assegnazioneArricchita = await arricchisciAssegnazione(nuovaAssegnazione);

        // Aggiungi l'assegnazione all'array delle nuove assegnazioni
        nuoveAssegnazioni.push(assegnazioneArricchita);
        
        // Aggiungi l'ID dell'assegnazione alle assegnazioni modificate
        setAssegnazioniModificate(prev => new Set([...prev, nuovaAssegnazione.id]));
      }
      
      // Aggiorna lo stato locale con tutte le nuove assegnazioni
      setAssegnazioni(nuoveAssegnazioni);
      
      // Salva le assegnazioni nella cache locale
      localStorage.setItem("cache_assegnazioni_admin", JSON.stringify(nuoveAssegnazioni));
      localStorage.setItem("timestamp_assegnazioni_admin", Date.now().toString());
      
      // Non mostrare l'alert
    } catch (error) {
      console.error("Errore nell'assegnazione dell'incarico:", error);
    }
  };

  // Funzione per gestire l'assegnazione di un cesto a più farm
  const handleAssegnaCesto = async (cestoId: string, farmId: string) => {
    try {
      const cesto = cesti.find((c) => c.id === cestoId);
      if (!cesto) {
        console.error("Cesto non trovato");
        return;
      }

      // Se farmId contiene più ID separati da virgola, è un'assegnazione multipla
      const farmIds = farmId.split(',');
      
      // Array per tenere traccia delle nuove assegnazioni
      const nuoveAssegnazioni = [...assegnazioni];
      
      // Per ogni farm ID
      for (const id of farmIds) {
      // Verifica se il cesto è già stato assegnato a questa farm
      const assegnazioniCesto = assegnazioni.filter(
        (a) =>
          a.tipo === "cesto" &&
          a.riferimento_id === cestoId &&
            a.farm_id === id
      );

      if (assegnazioniCesto.length > 0) {
          console.log(`Cesto già assegnato alla farm ${id}`);
          continue; // Salta questa farm e passa alla prossima
      }

      // Crea la nuova assegnazione per il cesto
      const nuovaAssegnazioneCesto = {
          id: `temp_cesto_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`, // ID temporaneo
          farm_id: id,
        tipo: "cesto" as TipoAssegnazione,
        riferimento_id: cestoId,
        completato: false,
        data_assegnazione: Timestamp.now(),
      };

        // Arricchisci l'assegnazione del cesto
        const assegnazioneCestoArricchita = await arricchisciAssegnazione(nuovaAssegnazioneCesto);
        
        // Aggiungi l'assegnazione del cesto all'array delle nuove assegnazioni
        nuoveAssegnazioni.push(assegnazioneCestoArricchita);
        
        // Aggiungi l'ID dell'assegnazione del cesto alle assegnazioni modificate
        setAssegnazioniModificate(prev => new Set([...prev, nuovaAssegnazioneCesto.id]));

      // Crea le assegnazioni per ogni incarico nel cesto che non è già assegnato
      const incarichiDaAssegnare = [];
        
      for (const inc of cesto.incarichi) {
        const esisteAssegnazione = assegnazioni.some(
          (a) =>
            a.tipo === "incarico" &&
            a.riferimento_id === inc.incarico_id &&
              a.farm_id === id
        );

        if (!esisteAssegnazione) {
            // Crea una nuova assegnazione per l'incarico
            const nuovaAssegnazioneIncarico = {
              id: `temp_inc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}_${inc.incarico_id}`, // ID temporaneo
              farm_id: id,
            tipo: "incarico" as TipoAssegnazione,
            riferimento_id: inc.incarico_id,
            completato: false,
            data_assegnazione: Timestamp.now(),
            };
            
            // Arricchisci l'assegnazione dell'incarico
            const assegnazioneIncaricoArricchita = await arricchisciAssegnazione(nuovaAssegnazioneIncarico);
            
            // Aggiungi l'assegnazione dell'incarico all'array delle nuove assegnazioni
            nuoveAssegnazioni.push(assegnazioneIncaricoArricchita);
            incarichiDaAssegnare.push(inc.incarico_id);
            
            // Aggiungi l'ID dell'assegnazione alle assegnazioni modificate
            setAssegnazioniModificate(prev => new Set([...prev, nuovaAssegnazioneIncarico.id]));
          }
        }
        
        console.log(`Cesto assegnato alla farm ${id} con ${incarichiDaAssegnare.length} incarichi`);
      }
      
      // Aggiorna lo stato locale con tutte le nuove assegnazioni
      setAssegnazioni(nuoveAssegnazioni);
      
      // Salva le assegnazioni nella cache locale
      localStorage.setItem("cache_assegnazioni_admin", JSON.stringify(nuoveAssegnazioni));
      localStorage.setItem("timestamp_assegnazioni_admin", Date.now().toString());
      
      // Non mostrare l'alert
    } catch (error) {
      console.error("Errore nell'assegnazione del cesto:", error);
    }
  };

  // Funzione per salvare i nomi delle farm nel localStorage
  const salvaFarmNomi = (giocatoreId: string, farms: Farm[]) => {
    try {
      const farmNomi: Record<number, string> = {};
      farms.forEach((farm, index) => {
        if (farm.nome) {
          farmNomi[index] = farm.nome;
        }
      });
      localStorage.setItem(`farm_nomi_${giocatoreId}`, JSON.stringify(farmNomi));
    } catch (error) {
      console.error("Errore nel salvataggio dei nomi delle farm:", error);
    }
  };

  // Funzione per arricchire un'assegnazione con i dati della farm e del giocatore
  const arricchisciAssegnazione = async (assegnazione: any) => {
    // Se l'assegnazione è già arricchita, restituiscila così com'è
    if (assegnazione.giocatore_nome || assegnazione.farm_nome) {
      return assegnazione;
    }
    
    // Estrai l'ID del giocatore e l'indice della farm dal farm_id
    const [giocatoreId, farmIndex] = assegnazione.farm_id.split('_');
    const farmIndexNumber = parseInt(farmIndex || "0");
    
    try {
      // Carica i dati del giocatore
      const giocatoreRef = doc(db, "utenti", giocatoreId);
      const giocatoreDoc = await getDoc(giocatoreRef);
      
      if (!giocatoreDoc.exists()) {
        // Se il giocatore non esiste, restituisci l'assegnazione con dati di fallback
        return {
          ...assegnazione,
          giocatore_nome: "Giocatore sconosciuto",
          giocatore_id: giocatoreId,
          farm_nome: `Farm ${farmIndexNumber}`,
          farm_index: farmIndexNumber,
        };
      }
      
        const giocatoreData = giocatoreDoc.data();
      
      // Verifica se il giocatore ha le farm direttamente nel suo documento
      if (giocatoreData.farms && Array.isArray(giocatoreData.farms) && giocatoreData.farms.length > farmIndexNumber) {
        // Usa i dati della farm dal documento del giocatore
        const farm = giocatoreData.farms[farmIndexNumber];
        
        // Salva i nomi delle farm nel localStorage
        salvaFarmNomi(giocatoreId, giocatoreData.farms);
        
          return {
            ...assegnazione,
          giocatore_nome: giocatoreData.nome || "Sconosciuto",
          giocatore_id: giocatoreId,
          farm_nome: farm.nome || `Farm ${farmIndexNumber}`,
          farm_index: farmIndexNumber,
        };
      }
      
      // Se non abbiamo trovato le farm nel documento del giocatore, proviamo a cercarle nella collezione "farms"
      const farmsRef = collection(db, "farms");
      const q = query(farmsRef, where("utente_id", "==", giocatoreId));
      const farmsSnapshot = await getDocs(q);
      
      if (!farmsSnapshot.empty) {
        // Ordina le farm per ID o per un altro campo che indica l'ordine
        const farms: Farm[] = [];
        farmsSnapshot.forEach((doc) => {
          farms.push({
            id: doc.id,
            ...doc.data(),
          } as Farm);
        });
        
        // Ordina le farm per indice se disponibile, altrimenti per ID
        farms.sort((a, b) => {
          if (a.indice !== undefined && b.indice !== undefined) {
            return a.indice - b.indice;
          }
          return a.id.localeCompare(b.id);
        });
        
        // Salva i nomi delle farm nel localStorage
        salvaFarmNomi(giocatoreId, farms);
        
        // Verifica se abbiamo abbastanza farm
        if (farms.length > farmIndexNumber) {
          const farm = farms[farmIndexNumber];
          return {
            ...assegnazione,
            giocatore_nome: giocatoreData.nome || "Sconosciuto",
            giocatore_id: giocatoreId,
            farm_nome: farm.nome || `Farm ${farmIndexNumber}`,
            farm_index: farmIndexNumber,
          };
        }
      }
      
      // Se non abbiamo trovato la farm specifica, usa dati generici
      // Cerca di ottenere il nome della farm dal localStorage
      let farmNome = `Farm ${farmIndexNumber}`;
      try {
        const farmNomiString = localStorage.getItem(`farm_nomi_${giocatoreId}`);
        if (farmNomiString) {
          const farmNomi = JSON.parse(farmNomiString);
          if (farmNomi[farmIndexNumber]) {
            farmNome = farmNomi[farmIndexNumber];
          }
        }
      } catch (e) {
        console.error("Errore nel recupero dei nomi delle farm dal localStorage:", e);
      }
      
    return {
      ...assegnazione,
        giocatore_nome: giocatoreData.nome || "Sconosciuto",
        giocatore_id: giocatoreId,
        farm_nome: farmNome,
        farm_index: farmIndexNumber,
      };
    } catch (error) {
      console.error("Errore nell'arricchimento dell'assegnazione:", error);
      
      // In caso di errore, restituisci l'assegnazione con dati di fallback
      return {
        ...assegnazione,
        giocatore_nome: "Errore",
        giocatore_id: giocatoreId,
        farm_nome: `Farm ${farmIndexNumber}`,
        farm_index: farmIndexNumber,
      };
    }
  };

  // Funzione per caricare le assegnazioni
  const caricaAssegnazioni = async (forzaAggiornamento = false) => {
    try {
      // Verifica se ci sono assegnazioni in cache
      const cacheKey = "cache_assegnazioni_admin";
      const timestampKey = "timestamp_assegnazioni_admin";
      
      // Verifica se i dati sono in cache e non è richiesto un aggiornamento forzato
      if (!forzaAggiornamento) {
        const assegnazioniCache = localStorage.getItem(cacheKey);
        const timestampCache = localStorage.getItem(timestampKey);
        
        // Se ci sono dati in cache e non è passato troppo tempo (es. 24 ore)
        if (assegnazioniCache && timestampCache) {
          const oraPrecedente = parseInt(timestampCache);
          const oraAttuale = Date.now();
          const differenzaOre = (oraAttuale - oraPrecedente) / (1000 * 60 * 60);
          
          // Se sono passate meno di 24 ore, usa la cache
          if (differenzaOre < 24) {
            console.log("Utilizzo assegnazioni dalla cache locale");
            const assegnazioniData = JSON.parse(assegnazioniCache);
            
            // Carica i dati delle farm e dei giocatori
            const assegnazioniArricchite = await Promise.all(
              assegnazioniData.map(async (assegnazione: Assegnazione) => arricchisciAssegnazione(assegnazione))
            );
            
            setAssegnazioni(assegnazioniArricchite);
            
            // Verifica se ci sono assegnazioni modificate
            const assegnazioniModificateString = localStorage.getItem("assegnazioni_modificate");
            if (assegnazioniModificateString) {
              const assegnazioniModificateArray = JSON.parse(assegnazioniModificateString);
              setAssegnazioniModificate(new Set(assegnazioniModificateArray));
              console.log(`Caricate ${assegnazioniModificateArray.length} assegnazioni modificate dalla cache locale`);
            }
            
            return;
          }
        }
      }
      
      // Se non ci sono dati in cache o è richiesto un aggiornamento, scarica da Firebase
      console.log("Scarico assegnazioni da Firebase");
      const assegnazioniRef = collection(db, "assegnazioni");
      const q = query(assegnazioniRef);
      const querySnapshot = await getDocs(q);
      
      const assegnazioniData: Assegnazione[] = [];
      querySnapshot.forEach((doc) => {
        assegnazioniData.push({
          id: doc.id,
          ...doc.data(),
        } as Assegnazione);
      });
      
      console.log("Assegnazioni caricate dal database:", assegnazioniData.length);
      
      // Carica i dati delle farm e dei giocatori
      const assegnazioniArricchite = await Promise.all(
        assegnazioniData.map(async (assegnazione) => arricchisciAssegnazione(assegnazione))
      );
      
      setAssegnazioni(assegnazioniArricchite);
      
      // Salva i dati nella cache
      localStorage.setItem(cacheKey, JSON.stringify(assegnazioniArricchite));
      localStorage.setItem(timestampKey, Date.now().toString());
      
      // Resetta le assegnazioni modificate se stiamo forzando l'aggiornamento
      if (forzaAggiornamento) {
        setAssegnazioniModificate(new Set());
        localStorage.removeItem("assegnazioni_modificate");
      }
    } catch (error) {
      console.error("Errore nel caricamento delle assegnazioni:", error);
      // In caso di errore, imposta le assegnazioni a un array vuoto
      setAssegnazioni([]);
    }
  };

  // Funzione per resettare le assegnazioni
  const resetAssegnazioni = async () => {
    // Chiedi conferma all'utente
    if (!window.confirm("Sei sicuro di voler eliminare tutte le assegnazioni? Questa operazione non può essere annullata.")) {
      return;
    }
    
      setLoading(true);
    try {
      // Elimina tutte le assegnazioni da Firebase
      const assegnazioniRef = collection(db, "assegnazioni");
      const assegnazioniSnapshot = await getDocs(assegnazioniRef);
      
      // Crea un batch per eliminare tutte le assegnazioni
      const batch = writeBatch(db);
      assegnazioniSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      // Esegui il batch
      await batch.commit();
      
      // Aggiorna il timestamp della collezione assegnazioni
      await aggiornaTimestampCollezione("assegnazioni");
      
      // Invalida la cache locale di tutti gli utenti
      // Raccogli gli ID degli utenti dalle assegnazioni
      const utentiConAssegnazioni = new Set<string>();
      assegnazioniSnapshot.docs.forEach((doc) => {
        const assegnazione = doc.data();
        if (assegnazione.farm_id) {
          const userId = assegnazione.farm_id.split('_')[0];
          if (userId) {
            utentiConAssegnazioni.add(userId);
          }
        }
      });
      
      // Invalida la cache locale per ogni utente
      utentiConAssegnazioni.forEach(userId => {
        // Rimuovi la cache locale delle assegnazioni per questo utente
        localStorage.removeItem(`cache_assegnazioni_${userId}`);
        localStorage.removeItem(`timestamp_assegnazioni_${userId}`);
        console.log(`Cache locale invalidata per l'utente ${userId}`);
      });
      
      // Resetta le assegnazioni locali
      setAssegnazioni([]);
      
      // Pulisci la cache locale
      localStorage.removeItem("cache_assegnazioni_admin");
      localStorage.removeItem("timestamp_assegnazioni_admin");
      localStorage.removeItem("assegnazioni_modificate");
      
      // Resetta le assegnazioni modificate
      setAssegnazioniModificate(new Set());
      
      console.log("Tutte le assegnazioni sono state eliminate con successo");
      
      // Forza l'aggiornamento dell'interfaccia
      setAggiornamentoDisponibile(true);
      
      // Non mostrare l'alert
    } catch (error) {
      console.error("Errore nell'eliminazione delle assegnazioni:", error);
    } finally {
      setLoading(false);
    }
  };

  // Funzione per aggiornare le produzioni
  const aggiornaProduzioni = async () => {
    setLoading(true);
    try {
      // Aggiorna tutti i dati da Firebase
      await Promise.all([
        caricaEdifici(true),
        caricaIncarichi(true),
        caricaIncarichiCitta(true),
        caricaCesti(true),
        caricaDerby(true),
      ]);
      
      // Imposta aggiornamentoDisponibile a false
      setAggiornamentoDisponibile(false);
      
      // Salva il timestamp dell'ultimo aggiornamento
      localStorage.setItem('ultimo_aggiornamento_dati', Date.now().toString());
      
      mostraAlert("Produzioni aggiornate con successo", "success");
    } catch (error) {
      console.error("Errore nell'aggiornamento delle produzioni:", error);
      mostraAlert("Errore nell'aggiornamento delle produzioni", "error");
    } finally {
      setLoading(false);
    }
  };

  // Funzione per salvare le assegnazioni su Firebase
  const salvaAssegnazioni = async () => {
    setSalvandoAssegnazioni(true);
    try {
      // Ottieni le assegnazioni modificate
      const assegnazioniModificateArray = Array.from(assegnazioniModificate);
      
      // Separa le assegnazioni da eliminare da quelle da aggiornare/creare
      const assegnazioniDaEliminare = assegnazioniModificateArray
        .filter(id => id.startsWith('delete_'))
        .map(id => id.replace('delete_', ''));
      
      const assegnazioniDaAggiornare = assegnazioni.filter(a => 
        assegnazioniModificate.has(a.id)
      );
      
      if (assegnazioniDaAggiornare.length === 0 && assegnazioniDaEliminare.length === 0) {
        mostraAlert("Nessuna modifica da salvare", "info");
        setSalvandoAssegnazioni(false);
        return;
      }
      
      console.log(`Salvataggio di ${assegnazioniDaAggiornare.length} assegnazioni e eliminazione di ${assegnazioniDaEliminare.length} assegnazioni su Firebase`);
      
      // Crea un batch per salvare tutte le assegnazioni in una sola operazione
      const batch = writeBatch(db);
      
      // Mappa per tenere traccia delle nuove assegnazioni e dei loro ID
      const nuoveAssegnazioniMap = new Map<string, string>();
      
      // Per ogni assegnazione modificata
      for (const assegnazione of assegnazioniDaAggiornare) {
        // Se l'assegnazione ha un ID temporaneo, crea un nuovo documento
        if (assegnazione.id.startsWith('temp_')) {
          // Crea un nuovo riferimento per il documento
          const nuovoDocRef = doc(collection(db, "assegnazioni"));
          
          // Prepara i dati da salvare (senza l'ID temporaneo)
          const datiDaSalvare = {
            farm_id: assegnazione.farm_id,
            tipo: assegnazione.tipo,
            riferimento_id: assegnazione.riferimento_id,
            completato: assegnazione.completato,
            data_assegnazione: assegnazione.data_assegnazione,
            data_ultimo_aggiornamento: Timestamp.now(),
          };
          
          // Usa set invece di update per i nuovi documenti
          batch.set(nuovoDocRef, datiDaSalvare);
          
          // Salva la mappatura tra ID temporaneo e nuovo ID
          nuoveAssegnazioniMap.set(assegnazione.id, nuovoDocRef.id);
          
          console.log(`Creazione nuovo documento per assegnazione temporanea ${assegnazione.id} -> ${nuovoDocRef.id}`);
        } 
        // Se l'assegnazione ha un ID normale (non temporaneo), aggiorna il documento esistente
        else {
          const assegnazioneRef = doc(db, "assegnazioni", assegnazione.id);
          batch.update(assegnazioneRef, {
            farm_id: assegnazione.farm_id,
            tipo: assegnazione.tipo,
            riferimento_id: assegnazione.riferimento_id,
            completato: assegnazione.completato,
            data_assegnazione: assegnazione.data_assegnazione,
            data_ultimo_aggiornamento: Timestamp.now(),
          });
          
          console.log(`Aggiornamento documento esistente ${assegnazione.id}`);
        }
      }
      
      // Per ogni assegnazione da eliminare
      for (const assegnazioneId of assegnazioniDaEliminare) {
        const assegnazioneRef = doc(db, "assegnazioni", assegnazioneId);
        batch.delete(assegnazioneRef);
        console.log(`Eliminazione documento ${assegnazioneId}`);
      }
      
      // Esegui il batch
      await batch.commit();
      
      // Aggiorna il timestamp della collezione assegnazioni
      await aggiornaTimestampCollezione("assegnazioni");
      
      // Invalida la cache locale degli utenti a cui sono state assegnate nuove assegnazioni
      const utentiConNuoveAssegnazioni = new Set<string>();
      
      // Raccogli gli ID degli utenti dalle assegnazioni modificate
      assegnazioniDaAggiornare.forEach(assegnazione => {
        if (assegnazione.farm_id) {
          const userId = assegnazione.farm_id.split('_')[0];
          if (userId) {
            utentiConNuoveAssegnazioni.add(userId);
          }
        }
      });
      
      // Invalida la cache locale per ogni utente
      utentiConNuoveAssegnazioni.forEach(userId => {
        // Rimuovi la cache locale delle assegnazioni per questo utente
        localStorage.removeItem(`cache_assegnazioni_${userId}`);
        localStorage.removeItem(`timestamp_assegnazioni_${userId}`);
        console.log(`Cache locale invalidata per l'utente ${userId}`);
      });
      
      // Aggiorna gli ID temporanei con i nuovi ID permanenti
      if (nuoveAssegnazioniMap.size > 0) {
        const nuoveAssegnazioni = assegnazioni.map(assegnazione => {
          if (nuoveAssegnazioniMap.has(assegnazione.id)) {
            // Sostituisci l'ID temporaneo con quello permanente
            return {
              ...assegnazione,
              id: nuoveAssegnazioniMap.get(assegnazione.id) || assegnazione.id
            };
          }
          return assegnazione;
        });
        
        // Aggiorna lo stato con i nuovi ID
        setAssegnazioni(nuoveAssegnazioni);
        
        // Salva le assegnazioni aggiornate nella cache locale
        localStorage.setItem("cache_assegnazioni_admin", JSON.stringify(nuoveAssegnazioni));
      } else {
        // Salva le assegnazioni nella cache locale
        localStorage.setItem("cache_assegnazioni_admin", JSON.stringify(assegnazioni));
      }
      
      // Aggiorna il timestamp della cache
      localStorage.setItem("timestamp_assegnazioni_admin", Date.now().toString());
      
      // Resetta le assegnazioni modificate
      setAssegnazioniModificate(new Set());
      
      // Pulisci anche il localStorage delle assegnazioni modificate
      localStorage.removeItem("assegnazioni_modificate");
      
      mostraAlert("Assegnazioni salvate con successo", "success");
    } catch (error) {
      console.error("Errore nel salvataggio delle assegnazioni:", error);
      mostraAlert("Errore nel salvataggio delle assegnazioni", "error");
    } finally {
      setSalvandoAssegnazioni(false);
    }
  };

  // Funzione per caricare gli edifici
  const caricaEdifici = async (forzaAggiornamento = false) => {
    try {
      const edificiData = await caricaDatiConCache("edifici", forzaAggiornamento);
      setEdifici(edificiData as Edificio[]);
    } catch (error) {
      console.error("Errore nel caricamento degli edifici:", error);
    }
  };

  // Funzione per caricare gli incarichi
  const caricaIncarichi = async (forzaAggiornamento = false) => {
    try {
      const incarichiData = await caricaDatiConCache("incarichi", forzaAggiornamento);
      setIncarichi(incarichiData as Incarico[]);
    } catch (error) {
      console.error("Errore nel caricamento degli incarichi:", error);
    }
  };

  // Funzione per caricare gli incarichi città
  const caricaIncarichiCitta = async (forzaAggiornamento = false) => {
    try {
      // Usa il nome corretto della collezione: "incarichi_citta" invece di "incarichiCitta"
      const incarichiCittaData = await caricaDatiConCache("incarichi_citta", forzaAggiornamento);
      console.log(`Incarichi città caricati: ${incarichiCittaData.length}`);
      setIncarichiCitta(incarichiCittaData as IncaricoCitta[]);
    } catch (error) {
      console.error("Errore nel caricamento degli incarichi città:", error);
    }
  };

  // Funzione per caricare i cesti
  const caricaCesti = async (forzaAggiornamento = false) => {
    try {
      const cestiData = await caricaDatiConCache("cesti", forzaAggiornamento);
      setCesti(cestiData as Cesto[]);
    } catch (error) {
      console.error("Errore nel caricamento dei cesti:", error);
    }
  };

  // Funzione per caricare i derby
  const caricaDerby = async (forzaAggiornamento = false) => {
    try {
      const derbyData = await caricaDatiConCache("derby", forzaAggiornamento);
      setDerby(derbyData as Derby[]);
      
      // Se c'è almeno un derby, seleziona il primo
      if (derbyData.length > 0 && !derbySelezionato) {
        setDerbySelezionato(derbyData[0]);
      }
    } catch (error) {
      console.error("Errore nel caricamento dei derby:", error);
    }
  };

  // Funzione per gestire il toggle del completamento di un'assegnazione
  const handleToggleCompletamento = async (assegnazioneId: string, completato: boolean) => {
    try {
      // Trova l'assegnazione da aggiornare
      const assegnazioneDaAggiornare = assegnazioni.find(a => a.id === assegnazioneId);
      
      if (!assegnazioneDaAggiornare) {
        mostraAlert("Assegnazione non trovata", "error");
        return;
      }

      // Aggiorna lo stato di completamento dell'assegnazione
      const nuoveAssegnazioni = assegnazioni.map(a => {
        if (a.id === assegnazioneId) {
          return { ...a, completato };
        }
        return a;
      });
      
      setAssegnazioni(nuoveAssegnazioni);
      
      // Aggiungi l'ID dell'assegnazione alle assegnazioni modificate
      // Se è un ID temporaneo, è già nelle assegnazioni modificate
      setAssegnazioniModificate(prev => new Set([...prev, assegnazioneId]));
      
      // Salva le assegnazioni nella cache locale
      localStorage.setItem("cache_assegnazioni_admin", JSON.stringify(nuoveAssegnazioni));
      localStorage.setItem("timestamp_assegnazioni_admin", Date.now().toString());
      
      mostraAlert("Stato di completamento aggiornato localmente. Clicca INVIA per salvare su server.", "success");
    } catch (error) {
      console.error("Errore nell'aggiornamento dello stato di completamento:", error);
      mostraAlert("Errore nell'aggiornamento dello stato di completamento", "error");
    }
  };

  // Funzione per gestire la rimozione di un'assegnazione
  const handleRimuoviAssegnazione = async (assegnazioneId: string) => {
    try {
      // Trova l'assegnazione da rimuovere
      const assegnazioneDaRimuovere = assegnazioni.find(a => a.id === assegnazioneId);
      
      if (!assegnazioneDaRimuovere) {
        mostraAlert("Assegnazione non trovata", "error");
        return;
      }

      // Rimuovi l'assegnazione dallo stato locale
      const nuoveAssegnazioni = assegnazioni.filter(a => a.id !== assegnazioneId);
      setAssegnazioni(nuoveAssegnazioni);
      
      // Se l'assegnazione ha un ID temporaneo, rimuovila dalle assegnazioni modificate
      if (assegnazioneId.startsWith('temp_')) {
        setAssegnazioniModificate(prev => {
          const nuovoSet = new Set(prev);
          nuovoSet.delete(assegnazioneId);
          return nuovoSet;
        });
      } else {
        // Altrimenti, aggiungi l'ID dell'assegnazione alle assegnazioni da eliminare
        // Usiamo un prefisso "delete_" per identificare le assegnazioni da eliminare
        setAssegnazioniModificate(prev => new Set([...prev, `delete_${assegnazioneId}`]));
      }
      
      // Salva le assegnazioni nella cache locale
      localStorage.setItem("cache_assegnazioni_admin", JSON.stringify(nuoveAssegnazioni));
      localStorage.setItem("timestamp_assegnazioni_admin", Date.now().toString());
      
      mostraAlert("Assegnazione rimossa localmente. Clicca INVIA per salvare su server.", "success");
    } catch (error) {
      console.error("Errore nella rimozione dell'assegnazione:", error);
      mostraAlert("Errore nella rimozione dell'assegnazione", "error");
    }
  };

  // Verifica se tutti gli incarichi di un cesto sono stati assegnati a una farm
  const verificaCestoCompleto = (cesto: Cesto, farmId: string) => {
    // Verifica se il cesto è già assegnato
    const cestoAssegnato = assegnazioni.some(
      (a) =>
        a.tipo === "cesto" &&
        a.riferimento_id === cesto.id &&
        a.farm_id === farmId
    );

    // Se il cesto è già assegnato, non considerarlo completo
    if (cestoAssegnato) return false;

    // Verifica che tutti gli incarichi del cesto siano assegnati
    const incarichiAssegnati = cesto.incarichi.every((inc) =>
      assegnazioni.some(
        (a) =>
          a.tipo === "incarico" &&
          a.riferimento_id === inc.incarico_id &&
          a.farm_id === farmId
      )
    );

    return incarichiAssegnati;
  };

  // Gestisce l'assegnazione automatica del cesto quando tutti i suoi incarichi sono stati assegnati
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const gestisciAutoAssegnazioneCesti = async () => {
      // Aspetta un momento per assicurarsi che lo stato sia stabile
      timeoutId = setTimeout(async () => {
        const batch = writeBatch(db);
        let nuoveAssegnazioni: any[] = [];
        let cestiDaAssegnare = false;

        for (const cesto of cesti) {
          // Trova tutte le farm che hanno tutti gli incarichi del cesto assegnati
          const farmIds = Array.from(new Set(
            assegnazioni
              .filter(a => a.tipo === "incarico")
              .map(a => a.farm_id)
          ));

          for (const farmId of farmIds) {
            if (verificaCestoCompleto(cesto, farmId)) {
              cestiDaAssegnare = true;
              
              // Crea la nuova assegnazione del cesto
              const nuovaAssegnazioneCesto = {
                farm_id: farmId,
                tipo: "cesto" as TipoAssegnazione,
                riferimento_id: cesto.id,
                completato: false,
                data_assegnazione: Timestamp.now(),
              };

              // Aggiungi l'assegnazione alla batch
              const cestoRef = doc(collection(db, "assegnazioni"));
              batch.set(cestoRef, nuovaAssegnazioneCesto);

              // Arricchisci l'assegnazione con i dati della farm e del giocatore
              const assegnazioneArricchita = await arricchisciAssegnazione({
                id: cestoRef.id,
                ...nuovaAssegnazioneCesto
              });

              nuoveAssegnazioni.push(assegnazioneArricchita);
            }
          }
        }

        if (cestiDaAssegnare) {
          await batch.commit();
          
          // Aggiorna lo stato locale
          setAssegnazioni(prev => [...prev, ...nuoveAssegnazioni]);
          
          if (nuoveAssegnazioni.length > 0) {
            mostraAlert(`${nuoveAssegnazioni.length} cesti assegnati automaticamente`, "info");
          }
        }
      }, 300);
    };

    // Esegui solo se ci sono assegnazioni e cesti
    if (assegnazioni.length > 0 && cesti.length > 0) {
      gestisciAutoAssegnazioneCesti();
    }

    // Cleanup del timeout quando il componente si smonta o l'effetto viene ri-eseguito
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [assegnazioni, cesti]); // Reagisce a qualsiasi cambiamento nelle assegnazioni o nei cesti

  // Funzione per cambiare la modalità di visualizzazione
  const handleToggleVisualizzazione = () => {
    setVisualizzazioneGlobale(!visualizzazioneGlobale);
  };
  
  // Funzione per cambiare l'ordinamento
  const handleChangeOrdinamento = (tipo: 'livello' | 'alfabetico') => {
    if (tipo === 'livello') {
      if (ordinamentoLivello) {
        // Se già ordinato per livello, inverti l'ordine
        setOrdinamentoInverso(!ordinamentoInverso);
      } else {
        // Altrimenti, attiva l'ordinamento per livello
        setOrdinamentoLivello(true);
        setOrdinamentoAlfabetico(false);
      }
    } else if (tipo === 'alfabetico') {
      if (ordinamentoAlfabetico) {
        // Se già ordinato alfabeticamente, inverti l'ordine
        setOrdinamentoInverso(!ordinamentoInverso);
      } else {
        // Altrimenti, attiva l'ordinamento alfabetico
        setOrdinamentoAlfabetico(true);
        setOrdinamentoLivello(false);
      }
    }
  };
  
  // Funzione per ordinare gli incarichi
  const ordinaIncarichi = (incarichiDaOrdinare: Incarico[]) => {
    return [...incarichiDaOrdinare].sort((a, b) => {
      let comparazione = 0;
      
      if (ordinamentoLivello) {
        // Ordina per livello
        comparazione = a.livello_minimo - b.livello_minimo;
      } else if (ordinamentoAlfabetico) {
        // Ordina alfabeticamente
        comparazione = getTranslatedName(a.nome).localeCompare(getTranslatedName(b.nome));
      }
      
      // Inverti l'ordine se necessario
      return ordinamentoInverso ? -comparazione : comparazione;
    });
  };

  // Funzione per navigare a un incarico
  const navigaAIncarico = (incaricoId: string) => {
    // Trova l'incarico
    const incarico = incarichi.find(i => i.id === incaricoId);
    if (!incarico) return;

    // Cambia la tab a "Incarichi"
    setTabValue(0);

    // Se l'incarico appartiene a un edificio, espandi l'edificio
    if (incarico.edificio_id && !expandedEdifici.includes(incarico.edificio_id)) {
      setExpandedEdifici([...expandedEdifici, incarico.edificio_id]);
    }

    // Evidenzia l'incarico
    setElementoEvidenziato({ tipo: 'incarico', id: incaricoId });

    // Rimuovi l'evidenziazione dopo 3 secondi
    setTimeout(() => {
      setElementoEvidenziato(null);
    }, 3000);

    // Scorri alla posizione dell'incarico
    setTimeout(() => {
      const element = document.getElementById(`incarico-${incaricoId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  // Funzione per navigare a un incarico città
  const navigaAIncaricoCitta = (incaricoId: string) => {
    // Cambia la tab a "Incarichi Città"
    setTabValue(1);

    // Evidenzia l'incarico città
    setElementoEvidenziato({ tipo: 'incaricoCitta', id: incaricoId });

    // Rimuovi l'evidenziazione dopo 3 secondi
    setTimeout(() => {
      setElementoEvidenziato(null);
    }, 3000);

    // Scorri alla posizione dell'incarico città
    setTimeout(() => {
      const element = document.getElementById(`incarico-${incaricoId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  // Funzione per navigare a un cesto
  const navigaACesto = (cestoId: string) => {
    // Cambia la tab a "Cesti"
    setTabValue(2);

    // Evidenzia il cesto
    setElementoEvidenziato({ tipo: 'cesto', id: cestoId });

    // Rimuovi l'evidenziazione dopo 3 secondi
    setTimeout(() => {
      setElementoEvidenziato(null);
    }, 3000);

    // Scorri alla posizione del cesto
    setTimeout(() => {
      const element = document.getElementById(`cesto-${cestoId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  // Funzione per trovare il cesto che contiene un incarico
  const trovaCestoPerIncarico = (incaricoId: string): Cesto | undefined => {
    return cesti.find(cesto => 
      cesto.incarichi.some(inc => inc.incarico_id === incaricoId)
    );
  };

  // Funzione per forzare la verifica degli aggiornamenti
  const forzaVerificaAggiornamenti = async () => {
    setLoading(true);
    try {
      console.log("Forzo la verifica degli aggiornamenti...");
      const disponibile = await verificaAggiornamenti(true); // Forza la verifica
      setAggiornamentoDisponibile(disponibile);
      
      if (disponibile) {
        mostraAlert("Ci sono nuovi aggiornamenti disponibili!", "info");
      } else {
        mostraAlert("Non ci sono nuovi aggiornamenti disponibili", "success");
      }
    } catch (error) {
      console.error("Errore nella verifica degli aggiornamenti:", error);
      mostraAlert("Errore nella verifica degli aggiornamenti", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Test Nuova Gestione Assegnazioni
        </Typography>
        <Typography variant="body1" paragraph>
          Questa è una pagina di test per il nuovo componente GestioneAssegnazioni.
          Il componente è stato rifattorizzato per migliorare le prestazioni e la manutenibilità.
        </Typography>
      </Box>

      {showAlert && (
        <Alert severity={alertSeverity} sx={{ mb: 2 }} onClose={() => setShowAlert(false)}>
          {alertMessage}
        </Alert>
      )}

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Caratteristiche principali:
        </Typography>
        <ul>
          <li>Struttura modulare con hook personalizzati</li>
          <li>Componenti UI separati per incarichi e cesti</li>
          <li>Migliore gestione dello stato</li>
          <li>Interfaccia a schede per navigare tra incarichi e cesti</li>
          <li>Contatori per le farm attive e inattive</li>
          <li>Design responsive per desktop e mobile</li>
        </ul>
      </Paper>

      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Anteprima del componente:
        </Typography>
        <Paper sx={{ p: 2 }}>
          {/* Barra di ricerca con filtri derby */}
          <Box
            sx={{
              mb: 3,
              display: "flex",
              flexDirection: { xs: "column", md: "row" },
              gap: 2,
              alignItems: "flex-start",
            }}
          >
            {/* Barra di ricerca */}
            <Box sx={{ flexGrow: 1 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Cerca incarichi, edifici, cesti..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                  endAdornment: searchQuery ? (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => setSearchQuery("")}
                        edge="end"
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ) : null,
                }}
              />
            </Box>

            {/* Pulsanti di azione - Versione desktop e tablet */}
            <Box sx={{ 
              display: { xs: 'none', sm: 'flex' }, 
              gap: 1, 
              flexWrap: 'wrap',
              justifyContent: 'flex-end'
            }}>
              <Button
                variant="contained"
                color={aggiornamentoDisponibile ? "success" : "primary"}
                size="small"
                onClick={aggiornamentoDisponibile ? aggiornaProduzioni : forzaVerificaAggiornamenti}
                startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon />}
                disabled={loading}
                sx={{ 
                  fontSize: '0.75rem', 
                  py: 0.5, 
                  minWidth: 0,
                  backgroundColor: aggiornamentoDisponibile ? '#4caf50' : undefined,
                  '&:hover': {
                    backgroundColor: aggiornamentoDisponibile ? '#388e3c' : undefined,
                  },
                }}
              >
                {aggiornamentoDisponibile ? "AGGIORNA DATI" : "PRODUZIONI"}
              </Button>
              
              <Button
                variant="contained"
                color="success"
                size="small"
                onClick={simulaSalvaAssegnazioni}
                startIcon={salvandoAssegnazioni ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                disabled={salvandoAssegnazioni || assegnazioniModificate.size === 0}
                sx={{ fontSize: '0.75rem', py: 0.5, minWidth: 0 }}
              >
                INVIA
              </Button>
              
              <Button
                variant="contained"
                color="warning"
                size="small"
                onClick={resetAssegnazioni}
                startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon />}
                disabled={loading}
                sx={{ fontSize: '0.75rem', py: 0.5, minWidth: 0 }}
              >
                RESET
              </Button>
            </Box>
          </Box>

          {/* Contenuto principale */}
          <Box>
            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                {/* Controlli per la visualizzazione e l'ordinamento */}
                {tabValue === 0 && (
                  <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Tooltip title={visualizzazioneGlobale ? "Visualizza per edificio" : "Visualizza lista completa"}>
                      <IconButton 
                        onClick={handleToggleVisualizzazione}
                        color={visualizzazioneGlobale ? "primary" : "default"}
                      >
                        {visualizzazioneGlobale ? <ViewListIcon /> : <ViewModuleIcon />}
                      </IconButton>
                    </Tooltip>
                    
                    <Tooltip title="Ordina per livello">
                      <IconButton 
                        onClick={() => handleChangeOrdinamento('livello')}
                        color={ordinamentoLivello ? "primary" : "default"}
                      >
                        {ordinamentoLivello && ordinamentoInverso ? <SortIcon sx={{ transform: 'rotate(180deg)' }} /> : <SortIcon />}
                      </IconButton>
                    </Tooltip>
                    
                    <Tooltip title="Ordina alfabeticamente">
                      <IconButton 
                        onClick={() => handleChangeOrdinamento('alfabetico')}
                        color={ordinamentoAlfabetico ? "primary" : "default"}
                      >
                        {ordinamentoAlfabetico && ordinamentoInverso ? <SortByAlphaIcon sx={{ transform: 'rotate(180deg)' }} /> : <SortByAlphaIcon />}
                      </IconButton>
                    </Tooltip>
                  </Box>
                )}

                {/* Tabs */}
                <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
                  <Tabs
                    value={tabValue}
                    onChange={handleChangeTab}
                    aria-label="tabs"
                  >
                    <Tab label="Incarichi" />
                    <Tab label="Incarichi Città" />
                    <Tab label="Cesti" />
                  </Tabs>
                </Box>

                {/* Pannello per gli incarichi */}
                <TabPanel value={tabValue} index={0}>
                  <ListaIncarichi
                    edifici={edifici}
                    incarichi={incarichi}
                    getTranslatedName={getTranslatedName}
                    getQuantitaIncarico={getQuantitaIncarico}
                    calcolaConteggi={calcolaConteggi}
                    onAssegnaIncarico={handleAssegnaIncarico}
                    expandedEdifici={expandedEdifici}
                    handleEdificioToggle={handleEdificioToggle}
                    searchQuery={searchQuery}
                    mostraCompletati={true}
                    assegnazioni={assegnazioni as any}
                    onToggleCompletamento={handleToggleCompletamento}
                    onRimuoviAssegnazione={handleRimuoviAssegnazione}
                    visualizzazioneGlobale={visualizzazioneGlobale}
                    ordinaIncarichi={ordinaIncarichi}
                    trovaCestoPerIncarico={trovaCestoPerIncarico}
                    onNavigaACesto={navigaACesto}
                    elementoEvidenziato={elementoEvidenziato}
                  />
                </TabPanel>

                {/* Pannello per gli incarichi città */}
                <TabPanel value={tabValue} index={1}>
                  <ListaIncarichiCitta
                    incarichiCitta={incarichiCitta}
                    getTranslatedName={getTranslatedName}
                    getQuantitaIncaricoCitta={getQuantitaIncaricoCitta}
                    calcolaConteggiCitta={calcolaConteggiCitta}
                    onAssegnaIncarico={handleAssegnaIncarico}
                    searchQuery={searchQuery}
                    mostraCompletati={true}
                    assegnazioni={assegnazioni as any}
                    onToggleCompletamento={handleToggleCompletamento}
                    onRimuoviAssegnazione={handleRimuoviAssegnazione}
                    trovaCestoPerIncarico={trovaCestoPerIncarico}
                    onNavigaACesto={navigaACesto}
                    elementoEvidenziato={elementoEvidenziato}
                  />
                </TabPanel>

                {/* Pannello per i cesti */}
                <TabPanel value={tabValue} index={2}>
                  <ListaCesti
                    cesti={cesti}
                    incarichi={incarichi}
                    incarichiCitta={incarichiCitta}
                    getTranslatedName={getTranslatedName}
                    getQuantitaIncaricoCesto={getQuantitaIncaricoCesto}
                    calcolaConteggiCesto={calcolaConteggiCesto}
                    onAssegnaCesto={handleAssegnaCesto}
                    searchQuery={searchQuery}
                    mostraCompletati={true}
                    assegnazioni={assegnazioni as any}
                    onToggleCompletamento={handleToggleCompletamento}
                    onRimuoviAssegnazione={handleRimuoviAssegnazione}
                    onNavigaAIncarico={navigaAIncarico}
                    onNavigaAIncaricoCitta={navigaAIncaricoCitta}
                    elementoEvidenziato={elementoEvidenziato}
                  />
                </TabPanel>
              </>
            )}
          </Box>
        </Paper>
      </Box>

      <Box sx={{ mt: 4 }}>
        <Typography variant="body2" color="text.secondary">
          Nota: Questa è una versione di test. Il componente finale sostituirà l'attuale GestioneAssegnazioni.tsx.
        </Typography>
      </Box>
    </Layout>
  );
} 