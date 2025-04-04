import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Box, Typography, Button, Paper, Tabs, Tab, TextField, InputAdornment, IconButton, CircularProgress, Alert, Snackbar, Tooltip, FormControl, InputLabel, Select, MenuItem, Chip, Collapse, Toolbar, SelectChangeEvent } from "@mui/material";
import Layout from "../../componenti/layout/Layout";
import { Edificio } from "../../tipi/edificio";
import { Incarico, IncaricoCitta } from "../../tipi/incarico";
import { Farm } from "../../tipi/giocatore";
import { Cesto, IncaricoInCesto } from "../../tipi/cesto";
import { Assegnazione, ConteggioAssegnazioni, TipoAssegnazione } from "../../tipi/assegnazione";
import { Derby } from "../../tipi/derby";
import { ListaIncarichi } from "./temp/componenti/ListaIncarichi";
import { ListaIncarichiCitta } from "./temp/componenti/ListaIncarichiCitta";
import { ListaCesti } from "./temp/componenti/ListaCesti";
import DialogoSelezioneFarm from "./temp/componenti/DialogoSelezioneFarmNuovo";
import { useTheme } from "@mui/material/styles";
import { PresetAssegnazioni } from "../../tipi/preset";
import { aggiornaUltimoUtilizzo } from "../../servizi/presetsService";
import DialogoTrasferimentoAssegnazioni from './temp/componenti/DialogoTrasferimentoAssegnazioni';
import { GestioneAssegnazioniDropdown } from './temp/componenti/GestioneAssegnazioniDropdown';
import PresetsAssegnazioniDropdown from './temp/componenti/PresetsAssegnazioniDropdown';

// Importo le funzioni di gestione cache
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
  onSnapshot,
} from "firebase/firestore";
import { db } from "../../configurazione/firebase";
import { 
  aggiornaTimestampCollezione, 
  caricaDatiConCache, 
  verificaAggiornamenti, 
  aggiornaTuttiDati,
  creaDocumentoMetadati
} from "../../servizi/gestioneCache";

import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import SortIcon from "@mui/icons-material/Sort";
import SortByAlphaIcon from "@mui/icons-material/SortByAlpha";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import RefreshIcon from "@mui/icons-material/Refresh";
import SaveIcon from "@mui/icons-material/Save";
import ViewListIcon from "@mui/icons-material/ViewList";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import CancelIcon from "@mui/icons-material/Cancel";
import FilterListIcon from "@mui/icons-material/FilterList";
import CircleIcon from "@mui/icons-material/Circle";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import Zoom from "@mui/material/Zoom";
import Fab from "@mui/material/Fab";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import TransferWithinAStationIcon from "@mui/icons-material/TransferWithinAStation";
import Menu from "@mui/material/Menu";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import PlaylistPlayIcon from "@mui/icons-material/PlaylistPlay";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import Avatar from "@mui/material/Avatar";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import NotificationsOffIcon from "@mui/icons-material/NotificationsOff";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import { useTranslation } from "react-i18next";

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
  const [tabValue, setTabValue] = useState(() => {
    try {
      return parseInt(localStorage.getItem("tabValue") || "0");
    } catch {
      return 0;
    }
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertSeverity, setAlertSeverity] = useState<"success" | "error" | "info" | "warning">("success");
  
  // Stato per la visualizzazione e l'ordinamento
  const [visualizzazioneGlobale, setVisualizzazioneGlobale] = useState(() => {
    try {
      return localStorage.getItem("visualizzazioneGlobale") === "true";
    } catch {
      return false; // Default: visualizzazione per edificio
    }
  });
  
  // Nuovo stato per controllare l'espansione della barra di ricerca
  const [searchExpanded, setSearchExpanded] = useState(false);
  
  // Nuovo stato per controllare l'espansione del selettore Derby
  const [derbySelectExpanded, setDerbySelectExpanded] = useState(false);
  
  const [ordinamentoLivello, setOrdinamentoLivello] = useState(() => {
    try {
      return localStorage.getItem("ordinamentoLivello") !== "false"; // Default: true
    } catch {
      return true; // Default: ordina per livello
    }
  });
  
  const [ordinamentoAlfabetico, setOrdinamentoAlfabetico] = useState(() => {
    try {
      return localStorage.getItem("ordinamentoAlfabetico") === "true";
    } catch {
      return false; // Default: non ordinare alfabeticamente
    }
  });
  
  const [ordinamentoInverso, setOrdinamentoInverso] = useState(() => {
    try {
      return localStorage.getItem("ordinamentoInverso") === "true";
    } catch {
      return false; // Default: ordine crescente
    }
  });
  
  // Nuovo stato per l'ordinamento per assegnazione
  const [ordinamentoAssegnazione, setOrdinamentoAssegnazione] = useState(() => {
    try {
      return localStorage.getItem("ordinamentoAssegnazione") === "true";
    } catch {
      return false; // Default: non ordinare per assegnazione
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

  // Stato per mostrare/nascondere il pulsante "torna in alto"
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Stati per il trasferimento di assegnazioni
  const [dialogoTrasferimentoAperto, setDialogoTrasferimentoAperto] = useState(false);
  const [caricandoFarms, setCaricandoFarms] = useState(false);
  const [giocatoriEFarms, setGiocatoriEFarms] = useState<{
    giocatore_id: string;
    giocatore_nome: string;
    farms: Farm[];
  }[]>([]);
  const [modalitaTrasferimento, setModalitaTrasferimento] = useState<'copia' | 'trasferisci' | 'elimina'>('copia');

  // Stati per i preset
  const [presetAttivo, setPresetAttivo] = useState<PresetAssegnazioni | null>(null);
  const [incarichiFiltratiPreset, setIncarichiFiltratiPreset] = useState<string[]>([]);

  const { t } = useTranslation();

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
    localStorage.setItem("ordinamentoAssegnazione", String(ordinamentoAssegnazione));
  }, [ordinamentoAssegnazione]);
  
  useEffect(() => {
    localStorage.setItem("expandedEdifici", JSON.stringify(expandedEdifici));
  }, [expandedEdifici]);

  // Effetto per salvare il derby selezionato nel localStorage
  useEffect(() => {
    if (derbySelezionato) {
      localStorage.setItem("derbySelezionatoId", derbySelezionato.id);
    } else {
      localStorage.removeItem("derbySelezionatoId");
    }
  }, [derbySelezionato]);

  // Effetto per salvare la tab selezionata nel localStorage
  useEffect(() => {
    localStorage.setItem("tabValue", tabValue.toString());
  }, [tabValue]);

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
    // Stato del pulsante INVIA basato sul numero di assegnazioni modificate
  }, [assegnazioniModificate]);

  // Effetto per salvare la posizione di scorrimento della pagina
  useEffect(() => {
    const handleScroll = () => {
      // Salva la posizione di scorrimento nel localStorage
      localStorage.setItem("admin_scrollPosition", String(window.scrollY));
      
      // Mostra il pulsante quando si scorre oltre i 400px
      if (window.scrollY > 400) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);
  
  // Effetto per ripristinare la posizione di scorrimento dopo che i dati sono stati caricati
  useEffect(() => {
    if (!loading) {
      const savedScrollPosition = localStorage.getItem("admin_scrollPosition");
      if (savedScrollPosition) {
        const scrollToPosition = (position: number) => {
          window.scrollTo({
            top: position,
            behavior: 'auto'
          });
        };

        // Primo tentativo dopo 500ms
        setTimeout(() => {
          scrollToPosition(parseInt(savedScrollPosition));
        }, 500);
        
        // Secondo tentativo dopo 1200ms, nel caso in cui il primo non funzioni correttamente
        setTimeout(() => {
          scrollToPosition(parseInt(savedScrollPosition));
        }, 1200);
      }
    }
  }, [loading]);

  // Carica i dati all'avvio
  useEffect(() => {
    caricaDati();
  }, []);

  // Al caricamento dell'applicazione, verifichiamo se c'è un derby selezionato nel localStorage
  useEffect(() => {
    try {
      const savedDerbyId = localStorage.getItem("derbySelezionatoId");
      if (savedDerbyId && derby.length > 0) {
        // Cerca il derby con l'ID salvato
        const savedDerby = derby.find(d => d.id === savedDerbyId);
        if (savedDerby) {
          setDerbySelezionato(savedDerby);
        }
      }
    } catch (error) {
      console.error("Errore nel recupero del derby selezionato:", error);
    }
  }, [derby]);

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
        const disponibile = await verificaAggiornamenti(false); // Non forzare la verifica
        setAggiornamentoDisponibile(disponibile);
      } else {
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
    
    // Non impostare più lo stato dell'alert
    // setAlertMessage(messaggio);
    // setAlertSeverity(severita);
    // setOpenAlert(true);
  };

  // Funzione per gestire il cambio di tab
  const handleChangeTab = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    localStorage.setItem("tabValue", newValue.toString());
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
    // Utilizziamo la traduzione dalla sezione "incarichi" del file translations
    // Aggiunta di defaultValue per mostrare il nome originale se non c'è traduzione
    return t(`incarichi.${nome}`, { defaultValue: nome });
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
      // Verifica se l'assegnazione esiste già
      const esisteAssegnazione = assegnazioni.some(
        (a) =>
          a.tipo === "incarico" &&
          a.riferimento_id === incaricoId &&
          a.farm_id === farmId
      );

      if (esisteAssegnazione) {
        console.log(`Assegnazione già esistente per incarico ${incaricoId} e farm ${farmId}`);
        return; // Esci dalla funzione se l'assegnazione già esiste
      }

      // Crea la nuova assegnazione con un ID più significativo e univoco
      // L'ID temporaneo ora include esplicitamente il farmId e l'incaricoId completi
      // Questo garantisce che ogni assegnazione avrà un ID univoco facilmente identificabile
      const nuovaAssegnazione = {
        id: `temp_incarico_${farmId}_${incaricoId}_${Date.now()}`,
        farm_id: farmId,
        tipo: "incarico" as TipoAssegnazione,
        riferimento_id: incaricoId,
        completato: false,
        data_assegnazione: Timestamp.now(),
        data_ultimo_aggiornamento: Timestamp.now(),
        stato: "attivo"
      };

      // Arricchisci l'assegnazione con i dati della farm e del giocatore
      const assegnazioneArricchita = await arricchisciAssegnazione(nuovaAssegnazione);

      // Aggiorna lo stato locale usando il metodo funzionale
      setAssegnazioni(prevAssegnazioni => {
        const updatedAssegnazioni = [...prevAssegnazioni, assegnazioneArricchita];
        
        // Salva le assegnazioni nella cache locale
        localStorage.setItem("cache_assegnazioni_admin", JSON.stringify(updatedAssegnazioni));
        localStorage.setItem("timestamp_assegnazioni_admin", Date.now().toString());
        
        return updatedAssegnazioni;
      });
      
      // Aggiungi l'ID dell'assegnazione alle assegnazioni modificate
      setAssegnazioniModificate(prev => new Set([...prev, nuovaAssegnazione.id]));
    } catch (error) {
      console.error("Errore nell'assegnazione dell'incarico:", error);
      mostraAlert("Errore nell'assegnazione dell'incarico", "error");
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

      // Verifica se il cesto è già stato assegnato a questa farm
      const cestoGiaAssegnato = assegnazioni.some(
        (a) =>
          a.tipo === "cesto" &&
          a.riferimento_id === cestoId &&
          a.farm_id === farmId
      );

      // Array temporaneo per le assegnazioni da aggiungere
      const assegnazioniDaAggiungere: any[] = [];
      const idsDaModificare = new Set<string>();
      
      if (!cestoGiaAssegnato) {
        // Crea la nuova assegnazione per il cesto con ID temporaneo migliorato
        const nuovaAssegnazioneCesto = {
          id: `temp_cesto_${farmId}_${cestoId}_${Date.now()}`,
          farm_id: farmId,
          tipo: "cesto" as TipoAssegnazione,
          riferimento_id: cestoId,
          completato: false,
          data_assegnazione: Timestamp.now(),
          data_ultimo_aggiornamento: Timestamp.now(),
          stato: "attivo"
        };

        // Arricchisci l'assegnazione del cesto
        const assegnazioneCestoArricchita = await arricchisciAssegnazione(nuovaAssegnazioneCesto);
        assegnazioniDaAggiungere.push(assegnazioneCestoArricchita);
        idsDaModificare.add(nuovaAssegnazioneCesto.id);
      }

      // Crea le assegnazioni per ogni incarico nel cesto che non è già assegnato
      for (const inc of cesto.incarichi) {
        const esisteAssegnazione = assegnazioni.some(
          (a) =>
            a.tipo === "incarico" &&
            a.riferimento_id === inc.incarico_id &&
            a.farm_id === farmId
        );

        if (!esisteAssegnazione) {
          // Crea una nuova assegnazione per l'incarico con ID temporaneo migliorato
          const nuovaAssegnazioneIncarico = {
            id: `temp_inc_${farmId}_${inc.incarico_id}_${Date.now()}`,
            farm_id: farmId,
            tipo: "incarico" as TipoAssegnazione,
            riferimento_id: inc.incarico_id,
            completato: false,
            data_assegnazione: Timestamp.now(),
            data_ultimo_aggiornamento: Timestamp.now(),
            stato: "attivo"
          };
          
          // Arricchisci l'assegnazione dell'incarico
          const assegnazioneIncaricoArricchita = await arricchisciAssegnazione(nuovaAssegnazioneIncarico);
          assegnazioniDaAggiungere.push(assegnazioneIncaricoArricchita);
          idsDaModificare.add(nuovaAssegnazioneIncarico.id);
        }
      }
      
      // Se ci sono assegnazioni da aggiungere, aggiorna lo stato
      if (assegnazioniDaAggiungere.length > 0) {
        // Aggiorna lo stato locale con il metodo funzionale
        setAssegnazioni(prevAssegnazioni => {
          const nuoveAssegnazioni = [...prevAssegnazioni, ...assegnazioniDaAggiungere];
          
          // Salva le assegnazioni nella cache locale
          localStorage.setItem("cache_assegnazioni_admin", JSON.stringify(nuoveAssegnazioni));
          localStorage.setItem("timestamp_assegnazioni_admin", Date.now().toString());
          
          return nuoveAssegnazioni;
        });
        
        // Aggiungi gli ID alle assegnazioni modificate
        setAssegnazioniModificate(prev => {
          const nuovoSet = new Set([...prev]);
          idsDaModificare.forEach(id => nuovoSet.add(id));
          return nuovoSet;
        });
      }
    } catch (error) {
      console.error("Errore nell'assegnazione del cesto:", error);
      mostraAlert("Errore nell'assegnazione del cesto", "error");
    }
  };

  // Funzione per salvare i nomi delle farm nel localStorage
  const salvaFarmNomi = (giocatoreId: string, farms: Farm[]) => {
    try {
      const farmNomi: Record<number, string> = {};
      const farmLivelli: Record<number, number> = {}; // Aggiungo un oggetto per i livelli
      const farmStati: Record<number, string> = {}; // Aggiungo un oggetto per gli stati
      
      farms.forEach((farm, index) => {
        if (farm.nome) {
          farmNomi[index] = farm.nome;
        }
        if (farm.livello !== undefined) {
          farmLivelli[index] = farm.livello; // Salvo anche il livello
        }
        if (farm.stato !== undefined) {
          farmStati[index] = farm.stato; // Salvo anche lo stato
        }
      });
      
      localStorage.setItem(`farm_nomi_${giocatoreId}`, JSON.stringify(farmNomi));
      localStorage.setItem(`farm_livelli_${giocatoreId}`, JSON.stringify(farmLivelli)); // Salvo i livelli
      localStorage.setItem(`farm_stati_${giocatoreId}`, JSON.stringify(farmStati)); // Salvo gli stati
    } catch (error) {
      console.error("Errore nel salvataggio dei dati delle farm:", error);
    }
  };

  // Funzione per arricchire un'assegnazione con i dati della farm e del giocatore
  const arricchisciAssegnazione = async (assegnazione: any) => {
    // Se l'assegnazione è già arricchita, restituiscila così com'è
    if (assegnazione.giocatore_nome || assegnazione.farm_nome) {
      return assegnazione;
    }
    
    try {
      // Estrai l'ID del giocatore e l'indice della farm dal farm_id
      const [giocatoreId, farmIndex] = assegnazione.farm_id.split('_');
      
      if (!giocatoreId || !farmIndex) {
        console.warn(`Farm ID non valido: ${assegnazione.farm_id}. Impossibile estrarre giocatoreId e farmIndex.`);
        // Usa un fallback per ID non validi
        return {
          ...assegnazione,
          giocatore_nome: "ID non valido",
          giocatore_id: "unknown",
          farm_nome: `Farm (ID: ${assegnazione.farm_id})`,
          farm_index: 0,
          livello_farm: 50,
          stato: "attivo"
        };
      }
      
      // Converti l'indice della farm in un numero intero
      const farmIndexNum = parseInt(farmIndex, 10);
      
      // Cerca l'utente direttamente
      const utenteDoc = await getDoc(doc(db, "utenti", giocatoreId));
      
      if (utenteDoc.exists()) {
        const utenteData = utenteDoc.data();
        
        // Verifica se l'utente ha farms e se l'indice è valido
        if (utenteData.farms && Array.isArray(utenteData.farms) && 
            farmIndexNum >= 0 && farmIndexNum < utenteData.farms.length) {
          
          const farm = utenteData.farms[farmIndexNum];
          
          return {
            ...assegnazione,
            giocatore_nome: utenteData.nome || "Utente sconosciuto",
            giocatore_id: giocatoreId,
            farm_nome: farm.nome || `Farm ${farmIndexNum + 1}`,
            farm_index: farmIndexNum,
            livello_farm: farm.livello || 50,
            stato: farm.stato || "attivo"
          };
        } else {
          console.warn(`Farm non trovata per l'utente ${giocatoreId} all'indice ${farmIndexNum}`);
          // Farm non trovata all'indice specificato
          return {
            ...assegnazione,
            giocatore_nome: utenteData.nome || "Utente sconosciuto",
            giocatore_id: giocatoreId,
            farm_nome: `Farm ${farmIndexNum + 1} (non trovata)`,
            farm_index: farmIndexNum,
            livello_farm: 50,
            stato: "inattivo"
          };
        }
      } else {
        // Utente non trovato
        console.warn(`Utente non trovato con ID: ${giocatoreId}`);
        
        // Come fallback, prova a cercare in tutti gli utenti
        const utentiRef = collection(db, "utenti");
        const utentiSnapshot = await getDocs(utentiRef);
        
        // Cerca una farm con ID corrispondente in tutti gli utenti
        for (const doc of utentiSnapshot.docs) {
          const userData = doc.data();
          
          if (userData.farms && Array.isArray(userData.farms)) {
            // Cerca una farm con l'indice corrispondente
            if (farmIndexNum >= 0 && farmIndexNum < userData.farms.length) {
              const farm = userData.farms[farmIndexNum];
              
              // Controlla se questo utente potrebbe corrispondere (corrispondenza parziale)
              if (doc.id.includes(giocatoreId) || giocatoreId.includes(doc.id)) {
                return {
                  ...assegnazione,
                  giocatore_nome: userData.nome || "Utente individuato",
                  giocatore_id: doc.id,
                  farm_nome: farm.nome || `Farm ${farmIndexNum + 1}`,
                  farm_index: farmIndexNum,
                  livello_farm: farm.livello || 50,
                  stato: farm.stato || "attivo"
                };
              }
            }
          }
        }
        
        // Se ancora non troviamo corrispondenze, restituisci valori di fallback
        return {
          ...assegnazione,
          giocatore_nome: "Utente non trovato",
          giocatore_id: giocatoreId,
          farm_nome: `Farm ${farmIndexNum + 1}`,
          farm_index: farmIndexNum,
          livello_farm: 50,
          stato: "inattivo"
        };
      }
    } catch (error) {
      console.error("Errore nell'arricchimento dell'assegnazione:", error);
      
      // In caso di errore, restituisci l'assegnazione con dati di fallback
      return {
        ...assegnazione,
        giocatore_nome: "Errore",
        giocatore_id: "error",
        farm_nome: `Farm (Errore)`,
        farm_index: 0,
        livello_farm: 50,
        stato: "attivo"
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
              
            }
            
            return;
          }
        }
      }
      
      // Se non ci sono dati in cache o è richiesto un aggiornamento, scarica da Firebase
      
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
        
      });
      
      // Resetta le assegnazioni locali
      setAssegnazioni([]);
      
      // Pulisci la cache locale
      localStorage.removeItem("cache_assegnazioni_admin");
      localStorage.removeItem("timestamp_assegnazioni_admin");
      localStorage.removeItem("assegnazioni_modificate");
      
      // Resetta le assegnazioni modificate
      setAssegnazioniModificate(new Set());
      
      
      
      // Forza l'aggiornamento dell'interfaccia
      setAggiornamentoDisponibile(true);
      
      // Non mostrare l'alert
    } catch (error) {
      console.error("Errore nell'eliminazione delle assegnazioni:", error);
    } finally {
      setLoading(false);
    }
  };

  // Funzione per aggiornare le produzioni (ora aggiorna solo i dati statici)
  const aggiornaProduzioni = async () => {
    setLoading(true);
    try {
      // Aggiorna solo i dati statici da Firebase
      await Promise.all([
        caricaEdifici(true),
        caricaIncarichi(true),
        caricaIncarichiCitta(true),
        caricaCesti(true),
        caricaDerby(true)
      ]);
      
      // Imposta aggiornamentoDisponibile a false
      setAggiornamentoDisponibile(false);
      
      // Salva il timestamp dell'ultimo aggiornamento
      localStorage.setItem('ultimo_aggiornamento_dati', Date.now().toString());
      
      mostraAlert("Dati aggiornati con successo", "success");
    } catch (error) {
      console.error("Errore nell'aggiornamento dei dati:", error);
      mostraAlert("Errore nell'aggiornamento dei dati", "error");
    } finally {
      setLoading(false);
    }
  };

  // Nuova funzione per aggiornare solo i progressi degli incarichi
  const aggiornaProgressi = async () => {
    setLoading(true);
    try {
      
      
      // Carica le assegnazioni da Firebase (forzando l'aggiornamento)
      await caricaAssegnazioni(true);
      
      // Carica i progressi degli incarichi da Firebase
      const progressiRef = collection(db, "progressi");
      const progressiSnapshot = await getDocs(progressiRef);
      
      
      
      // Mappa per tenere traccia dei progressi più recenti per ogni incarico e farm
      const progressiPerIncarico = new Map<string, { docId: string, percentuale: number, farmId: string, timestamp: number }>();
      
      // Elabora tutti i progressi trovati
      progressiSnapshot.forEach(doc => {
        const dati = doc.data();
        const incaricoId = dati.incarico_id;
        const farmId = dati.farm_id;
        const percentuale = dati.percentuale || 0;
        const timestamp = dati.timestamp?.seconds || 0;
        
        // Crea una chiave univoca per questo progresso (incarico_id + farm_id)
        const chiaveUnica = `${incaricoId}_${farmId}`;
        
        // Se non abbiamo ancora un progresso per questa chiave o questo è più recente, salvalo
        if (!progressiPerIncarico.has(chiaveUnica) || 
            timestamp > (progressiPerIncarico.get(chiaveUnica)?.timestamp || 0)) {
          progressiPerIncarico.set(chiaveUnica, {
            docId: doc.id,
            percentuale,
            farmId,
            timestamp
          });
        }
      });
      
      
      
      // Aggiorna le assegnazioni con i progressi
      const nuoveAssegnazioni = assegnazioni.map(assegnazione => {
        // Crea la chiave per cercare il progresso
        const chiaveProgresso = `${assegnazione.riferimento_id}_${assegnazione.farm_id}`;
        const progresso = progressiPerIncarico.get(chiaveProgresso);
        
        if (progresso) {
          // Trova l'incarico corrispondente
          const incarico = incarichi.find(i => i.id === assegnazione.riferimento_id) || 
                          incarichiCitta.find(i => i.id === assegnazione.riferimento_id);
          
          if (incarico) {
            // Calcola se l'incarico è completato
            const quantitaRichiesta = getQuantitaIncarico(incarico);
            const completato = progresso.percentuale >= quantitaRichiesta;
            
            // Aggiorna l'assegnazione con il progresso
            return {
              ...assegnazione,
              completato,
              quantita: progresso.percentuale
            };
          }
        }
        
        return assegnazione;
      });
      
      // Aggiorna lo stato delle assegnazioni
      setAssegnazioni(nuoveAssegnazioni);
      
      // Salva le assegnazioni aggiornate nella cache locale
      localStorage.setItem("cache_assegnazioni_admin", JSON.stringify(nuoveAssegnazioni));
      localStorage.setItem("timestamp_assegnazioni_admin", Date.now().toString());
      
      mostraAlert("Progressi aggiornati con successo", "success");
    } catch (error) {
      console.error("Errore nell'aggiornamento dei progressi:", error);
      mostraAlert("Errore nell'aggiornamento dei progressi", "error");
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
      
      // Crea un batch per salvare tutte le assegnazioni in una sola operazione
      const batch = writeBatch(db);
      
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
        }
      }
      
      // Per ogni assegnazione da eliminare
      for (const assegnazioneId of assegnazioniDaEliminare) {
        const assegnazioneRef = doc(db, "assegnazioni", assegnazioneId);
        batch.delete(assegnazioneRef);
      }
      
      // Esegui il batch
      await batch.commit();
      
      // IMPORTANTE: Prima di ricaricare i dati, attendiamo un attimo per lasciare tempo a Firebase
      // di elaborare le modifiche e restituire i dati aggiornati. Questo dovrebbe risolvere 
      // il problema delle duplicazioni.
      await new Promise(resolve => setTimeout(resolve, 1000));
      
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
      });
      
      // Invalida completamente la cache locale delle assegnazioni
      localStorage.removeItem("cache_assegnazioni_admin");
      localStorage.removeItem("timestamp_assegnazioni_admin");
      
      // Resetta le assegnazioni modificate
      setAssegnazioniModificate(new Set());
      localStorage.removeItem("assegnazioni_modificate");
      
      // Svuota l'array delle assegnazioni prima di ricaricare i dati
      // Questo è importante per evitare duplicazioni
      setAssegnazioni([]);
      
      // Forza un ricaricamento completo delle assegnazioni da Firebase
      await caricaAssegnazioni(true);
      
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
      
      // La logica per gestire il derby selezionato è ora nell'effect
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

      // MODIFICA: Rimuovi SOLO questa specifica assegnazione, senza automatismi su cesti e incarichi collegati
      // Questo risolve il problema di rimozione di tutte le farm quando si clicca su "X"
      const nuoveAssegnazioni = assegnazioni.filter(a => a.id !== assegnazioneId);
      
      // Aggiorna lo stato delle assegnazioni
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
      
      // Forza la chiusura di eventuali dialoghi aperti per assicurarsi che vengano aggiornati correttamente
      // quando verranno riaperti
      const dialogoAperto = document.querySelector('[role="dialog"]');
      if (dialogoAperto) {
        // Trova il pulsante di chiusura e fai clic su di esso
        const pulsanteChiusura = dialogoAperto.querySelector('[aria-label="close"]');
        if (pulsanteChiusura) {
          (pulsanteChiusura as HTMLElement).click();
        }
      }
      
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
        const nuoveAssegnazioni: any[] = [];
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
    localStorage.setItem("visualizzazioneGlobale", String(!visualizzazioneGlobale));
  };
  
  // Funzione per cambiare l'ordinamento
  const handleChangeOrdinamento = (tipo: 'livello' | 'alfabetico' | 'assegnazione') => {
    if (tipo === 'livello') {
      if (ordinamentoLivello) {
        // Se già ordinato per livello, inverti l'ordine
        setOrdinamentoInverso(!ordinamentoInverso);
      } else {
        // Altrimenti, attiva l'ordinamento per livello
        setOrdinamentoLivello(true);
        setOrdinamentoAlfabetico(false);
        setOrdinamentoAssegnazione(false);
      }
    } else if (tipo === 'alfabetico') {
      if (ordinamentoAlfabetico) {
        // Se già ordinato alfabeticamente, inverti l'ordine
        setOrdinamentoInverso(!ordinamentoInverso);
      } else {
        // Altrimenti, attiva l'ordinamento alfabetico
        setOrdinamentoAlfabetico(true);
        setOrdinamentoLivello(false);
        setOrdinamentoAssegnazione(false);
      }
    } else if (tipo === 'assegnazione') {
      if (ordinamentoAssegnazione) {
        // Se già ordinato per assegnazione, inverti l'ordine
        setOrdinamentoInverso(!ordinamentoInverso);
      } else {
        // Altrimenti, attiva l'ordinamento per assegnazione
        setOrdinamentoAssegnazione(true);
        setOrdinamentoLivello(false);
        setOrdinamentoAlfabetico(false);
      }
    }
  };
  
  // Funzione per espandere/comprimere la barra di ricerca
  const toggleSearchBar = () => {
    setSearchExpanded(!searchExpanded);
    if (!searchExpanded && derbySelectExpanded) {
      setDerbySelectExpanded(false); // Chiudi il selettore derby se apriamo la ricerca
    }
  };
  
  // Funzione per espandere/comprimere il selettore Derby
  const toggleDerbySelect = () => {
    setDerbySelectExpanded(!derbySelectExpanded);
    if (!derbySelectExpanded && searchExpanded) {
      setSearchExpanded(false); // Chiudi la ricerca se apriamo il selettore derby
    }
  };

  // Funzione per cambiare il derby selezionato
  const handleChangeDerby = (event: React.ChangeEvent<{ value: unknown }> | SelectChangeEvent<string>) => {
    const derbyId = event.target.value as string;
    const selectedDerby = derby.find(d => d.id === derbyId) || null;
    setDerbySelezionato(selectedDerby);
    localStorage.setItem("derbySelezionatoId", derbyId || "");
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
      } else if (ordinamentoAssegnazione) {
        // Ordina per numero di assegnazioni
        const assegnazioniA = assegnazioni.filter(
          (ass) => ass.tipo === "incarico" && ass.riferimento_id === a.id
        ).length;
        const assegnazioniB = assegnazioni.filter(
          (ass) => ass.tipo === "incarico" && ass.riferimento_id === b.id
        ).length;
        comparazione = assegnazioniB - assegnazioniA; // Ordine decrescente di default (più assegnazioni prima)
      }
      
      // Inverti l'ordine se necessario
      return ordinamentoInverso ? -comparazione : comparazione;
    });
  };
  
  // Funzione per ordinare gli edifici
  const edificiOrdinati = useMemo(() => {
    return [...edifici].sort((a, b) => {
      let comparazione = 0;
      
      if (ordinamentoLivello) {
        // Ordina per livello
        comparazione = a.livello - b.livello;
      } else if (ordinamentoAlfabetico) {
        // Ordina alfabeticamente
        comparazione = a.nome.localeCompare(b.nome);
      }
      
      // Inverti l'ordine se necessario
      return ordinamentoInverso ? -comparazione : comparazione;
    });
  }, [edifici, ordinamentoLivello, ordinamentoAlfabetico, ordinamentoInverso]);

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

  // Funzione per forzare l'aggiornamento della cache delle assegnazioni
  const forzaAggiornamentoAssegnazioni = async () => {
    try {
      // Mostra un messaggio di caricamento
      mostraAlert("Aggiornamento dati in corso...", "info");
      
      setLoading(true);
      
      // Rimuovi la cache locale
      localStorage.removeItem("cache_assegnazioni_admin");
      localStorage.removeItem("timestamp_assegnazioni_admin");
      
      // Rimuovi tutte le cache dei dati statici
      localStorage.removeItem("cache_edifici");
      localStorage.removeItem("cache_incarichi");
      localStorage.removeItem("cache_incarichi_citta");
      localStorage.removeItem("cache_cesti");
      localStorage.removeItem("cache_derby");
      
      // Aggiungi un ritardo artificiale per mostrare l'animazione di caricamento
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Carica le assegnazioni da Firebase
      await caricaAssegnazioni(true);
      
      // Aggiorna anche i dati statici
      await Promise.all([
        caricaEdifici(true),
        caricaIncarichi(true),
        caricaIncarichiCitta(true),
        caricaCesti(true),
        caricaDerby(true)
      ]);
      
      // Imposta aggiornamentoDisponibile a false
      setAggiornamentoDisponibile(false);
      
      // Aggiungi un ritardo artificiale per mostrare l'animazione di caricamento
      await new Promise(resolve => setTimeout(resolve, 500));
      
      mostraAlert("Assegnazioni e dati aggiornati con successo", "success");
    } catch (error) {
      console.error("Errore nell'aggiornamento delle assegnazioni:", error);
      mostraAlert("Errore nell'aggiornamento delle assegnazioni", "error");
    } finally {
      setLoading(false);
    }
  };

  // Funzione per filtrare gli incarichi in base al derby selezionato
  const filtraIncarichiPerDerby = useCallback((incarichiDaFiltrare: Incarico[]) => {
    if (!derbySelezionato) {
      return incarichiDaFiltrare; // Se non c'è un derby selezionato, mostra tutti gli incarichi
    }
    
    // Filtra gli incarichi che hanno il tag del derby selezionato
    return incarichiDaFiltrare.filter(incarico => 
      incarico.derby_tags?.includes(derbySelezionato.id)
    );
  }, [derbySelezionato]);

  // Funzione per filtrare gli incarichi città in base al derby selezionato
  const filtraIncarichiCittaPerDerby = useCallback((incarichiDaFiltrare: IncaricoCitta[]) => {
    if (!derbySelezionato) {
      return incarichiDaFiltrare; // Se non c'è un derby selezionato, mostra tutti gli incarichi città
    }
    
    // Filtra gli incarichi città che hanno il tag del derby selezionato
    return incarichiDaFiltrare.filter(incarico => 
      incarico.derby_tags?.includes(derbySelezionato.id)
    );
  }, [derbySelezionato]);

  // Funzione per filtrare i cesti in base al derby selezionato
  const filtraCestiPerDerby = useCallback((cestiDaFiltrare: Cesto[]) => {
    if (!derbySelezionato) {
      return cestiDaFiltrare; // Se non c'è un derby selezionato, mostra tutti i cesti
    }
    
    // Filtra i cesti che hanno il tag del derby selezionato
    return cestiDaFiltrare.filter(cesto => 
      cesto.derby_tags && cesto.derby_tags.includes(derbySelezionato.id)
    );
  }, [derbySelezionato]);

  // Funzione per scorrere in cima alla pagina
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // Modifica la funzione handleOpenTrasferimento per supportare l'assegnazione di preset
  const handleOpenTrasferimento = async (modalita: 'copia' | 'trasferisci' | 'elimina', isAssegnazionePreset = false) => {
    setModalitaTrasferimento(modalita);
    setCaricandoFarms(true);
    
    try {
      // Carico gli utenti dalla collezione "utenti" invece che "giocatori"
      const utentiRef = collection(db, "utenti");
      const utentiSnapshot = await getDocs(utentiRef);
      
      const giocatoriData: {
        giocatore_id: string;
        giocatore_nome: string;
        farms: Farm[];
      }[] = [];
      
      // Per l'assegnazione di preset, prepariamo una mappa degli incarichi già assegnati ad ogni farm
      let farmIncarichiAssegnatiMap = new Map<string, Set<string>>();
      if (isAssegnazionePreset && presetAttivo) {
        // Costruisco una mappa delle assegnazioni esistenti per ogni farm
        assegnazioni.forEach(a => {
          if (a.tipo === 'incarico') {
            if (!farmIncarichiAssegnatiMap.has(a.farm_id)) {
              farmIncarichiAssegnatiMap.set(a.farm_id, new Set());
            }
            farmIncarichiAssegnatiMap.get(a.farm_id)?.add(a.riferimento_id);
          }
        });
      }
      
      // Itero su tutti gli utenti trovati
      for(const utentiDoc of utentiSnapshot.docs) {
        const utenteData = utentiDoc.data();
        
        // Verifica se l'utente ha l'array farms direttamente nel documento
        if (utenteData.farms && Array.isArray(utenteData.farms)) {
          const farmsList: Farm[] = [];
          
          // Aggiunge ogni farm dell'utente all'array
          for (let i = 0; i < utenteData.farms.length; i++) {
            const farm = utenteData.farms[i];
            
            // Verifica se la farm esiste ed è un oggetto valido
            if (farm && typeof farm === 'object') {
              // Crea un ID per la farm nel formato "PIN_indice" se non esiste
              const farmId = farm.id || `${utenteData.pin || utentiDoc.id}_${i}`;
              
              // Determina se questa farm ha assegnazioni
              const haAssegnazioni = assegnazioni.some(a => a.farm_id === farmId);
              
              // Verifica per il filtro del preset
              let mostraFarmPerPreset = true;
              if (isAssegnazionePreset && presetAttivo) {
                // Ottieni gli incarichi già assegnati a questa farm
                const incarichiAssegnati = farmIncarichiAssegnatiMap.get(farmId) || new Set();
                
                // Conta quanti incarichi del preset sono già assegnati a questa farm
                let incarichiPresetGiaAssegnati = 0;
                for (const incaricoId of presetAttivo.incarichi) {
                  if (incarichiAssegnati.has(incaricoId)) {
                    incarichiPresetGiaAssegnati++;
                  }
                }
                
                // Se tutti gli incarichi del preset sono già assegnati, non mostrare questa farm
                mostraFarmPerPreset = incarichiPresetGiaAssegnati < presetAttivo.incarichi.length;
              }
              
              // Se la farm passa il filtro del preset, aggiungila all'elenco
              if (mostraFarmPerPreset) {
                farmsList.push({
                  ...farm,
                  id: farmId,
                  haAssegnazioni,
                });
              }
            }
          }
          
          // Aggiunge l'utente con le sue farms all'array dei giocatori
          if (farmsList.length > 0) {
            giocatoriData.push({
              giocatore_id: utentiDoc.id,
              giocatore_nome: utenteData.nome || `Utente ${utentiDoc.id}`,
              farms: farmsList
            });
          }
        }
      }
      
      // Ordina i giocatori per nome
      giocatoriData.sort((a, b) => a.giocatore_nome.localeCompare(b.giocatore_nome));
      
      // Aggiorna lo stato con i dati ottenuti
      setGiocatoriEFarms(giocatoriData);
    } catch (error) {
      console.error("Errore nel caricamento delle farms:", error);
      mostraAlert("Errore nel caricamento delle farms", "error");
    } finally {
      setCaricandoFarms(false);
      setDialogoTrasferimentoAperto(true);
    }
  };
  
  // Funzione per gestire il trasferimento delle assegnazioni
  const handleTrasferimentoAssegnazioni = async (
    farmIdOrigine: string,
    farmIdsDestinazione: string[],
    modalita: 'copia' | 'trasferisci' | 'elimina'
  ) => {
    try {
      setLoading(true);
      
      // 1. Troviamo tutte le assegnazioni della farm di origine
      const assegnazioniOrigine = assegnazioni.filter(
        assegnazione => assegnazione.farm_id === farmIdOrigine
      );
      
      if (assegnazioniOrigine.length === 0) {
        mostraAlert("Nessuna assegnazione trovata per la farm di origine", "warning");
        setLoading(false);
        return;
      }
      
      // 2. Creiamo una copia delle assegnazioni attuali
      const nuoveAssegnazioni = [...assegnazioni];
      
      // 3. Per ogni farm di destinazione
      for (const farmIdDestinazione of farmIdsDestinazione) {
        // Verifichiamo che non sia la stessa farm di origine
        if (farmIdDestinazione === farmIdOrigine) continue;
        
        // Troviamo le assegnazioni esistenti per la farm di destinazione
        const assegnazioniDestinazione = assegnazioni.filter(
          assegnazione => assegnazione.farm_id === farmIdDestinazione
        );
        
        // Per ogni assegnazione della farm di origine
        for (const assegnazioneOrigine of assegnazioniOrigine) {
          // Verifichiamo se esiste già un'assegnazione simile per la farm di destinazione
          const esisteAssegnazione = assegnazioniDestinazione.some(
            assegnazione => 
              assegnazione.tipo === assegnazioneOrigine.tipo && 
              assegnazione.riferimento_id === assegnazioneOrigine.riferimento_id
          );
          
          if (!esisteAssegnazione) {
            // Crea una nuova assegnazione basata su quella di origine
            const nuovaAssegnazione = {
              id: `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`, // ID temporaneo
              farm_id: farmIdDestinazione,
              tipo: assegnazioneOrigine.tipo,
              riferimento_id: assegnazioneOrigine.riferimento_id,
              completato: false, // La nuova assegnazione inizia come non completata
              data_assegnazione: Timestamp.now(),
            };
            
            // Arricchisci l'assegnazione con i dati della farm e del giocatore
            const assegnazioneArricchita = await arricchisciAssegnazione(nuovaAssegnazione);
            
            // Aggiungi la nuova assegnazione all'array
            nuoveAssegnazioni.push(assegnazioneArricchita);
            
            // Aggiungi l'ID dell'assegnazione alle assegnazioni modificate
            setAssegnazioniModificate(prev => new Set([...prev, nuovaAssegnazione.id]));
          }
        }
      }
      
      // 4. Se la modalità è 'trasferisci', rimuoviamo le assegnazioni dalla farm di origine
      if (modalita === 'trasferisci') {
        // Rimuovi le assegnazioni della farm di origine
        const idsAssegnazioniOrigine = assegnazioniOrigine.map(a => a.id);
        
        // Filtra le assegnazioni, tenendo quelle che non sono della farm di origine
        const assegnazioniFiltrate = nuoveAssegnazioni.filter(
          assegnazione => !idsAssegnazioniOrigine.includes(assegnazione.id)
        );
        
        // Aggiorna le assegnazioni modificate
        idsAssegnazioniOrigine.forEach(id => {
          if (id.startsWith('temp_')) {
            // Se è un ID temporaneo, rimuovilo dalle assegnazioni modificate
            setAssegnazioniModificate(prev => {
              const nuovoSet = new Set(prev);
              nuovoSet.delete(id);
              return nuovoSet;
            });
          } else {
            // Altrimenti, aggiungilo come assegnazione da eliminare
            setAssegnazioniModificate(prev => new Set([...prev, `delete_${id}`]));
          }
        });
        
        // Aggiorna lo stato con le assegnazioni filtrate
        setAssegnazioni(assegnazioniFiltrate);
      } else {
        // In modalità 'copia', aggiorna semplicemente lo stato con tutte le nuove assegnazioni
        setAssegnazioni(nuoveAssegnazioni);
      }
      
      // 5. Salva le assegnazioni nella cache locale
      localStorage.setItem("cache_assegnazioni_admin", JSON.stringify(
        modalita === 'trasferisci' 
          ? nuoveAssegnazioni.filter(a => a.farm_id !== farmIdOrigine) 
          : nuoveAssegnazioni
      ));
      localStorage.setItem("timestamp_assegnazioni_admin", Date.now().toString());
      
      // 6. Mostra una notifica di successo
      mostraAlert(
        modalita === 'copia' 
          ? "Assegnazioni copiate con successo. Clicca INVIA per salvare." 
          : "Assegnazioni trasferite con successo. Clicca INVIA per salvare.",
        "success"
      );
      
      // 7. Chiudi il dialogo
      setDialogoTrasferimentoAperto(false);
    } catch (error) {
      console.error("Errore nel trasferimento delle assegnazioni:", error);
      mostraAlert("Errore nel trasferimento delle assegnazioni", "error");
    } finally {
      setLoading(false);
    }
  };

  // Gestisce l'eliminazione delle assegnazioni
  const handleEliminazioneAssegnazioni = async (farmIds: string[]) => {
    try {
      setLoading(true);
      
      // Prepara un batch per eliminare tutte le assegnazioni delle farm selezionate
      const batch = writeBatch(db);
      
      // Per ogni farm selezionata
      for (const farmId of farmIds) {
        // Recupera tutte le assegnazioni associate a questa farm
        const assegnazioniQuery = query(
          collection(db, 'assegnazioni'),
          where('farm_id', '==', farmId)
        );
        
        const snapshot = await getDocs(assegnazioniQuery);
        
        // Aggiunge ogni documento al batch per eliminazione
        snapshot.forEach((doc) => {
          batch.delete(doc.ref);
        });
      }
      
      // Esegue tutte le operazioni di eliminazione
      await batch.commit();
      
      // Aggiorna la UI
      mostraAlert(`Assegnazioni eliminate con successo da ${farmIds.length} farm`, "success");
      
      // Pulisce la cache locale delle assegnazioni per forzare un ricaricamento completo
      localStorage.removeItem("cache_assegnazioni_admin");
      localStorage.removeItem("timestamp_assegnazioni_admin");
      
      // Ricarica i dati dal server
      await caricaAssegnazioni(true); // Passa true per forzare l'aggiornamento
      
      // Ricarica anche gli incarichi per aggiornare lo stato
      await caricaIncarichi(true);
      await caricaIncarichiCitta(true);
      await caricaCesti(true);
      
    } catch (error) {
      console.error("Errore durante l'eliminazione delle assegnazioni:", error);
      mostraAlert(`Errore durante l'eliminazione delle assegnazioni`, "error");
    } finally {
      setLoading(false);
      setDialogoTrasferimentoAperto(false);
    }
  };

  // Gestione del preset selezionato
  const handleSelezionaPreset = (preset: PresetAssegnazioni | null) => {
    setPresetAttivo(preset);
    
    if (preset) {
      // Filtra gli incarichi in base al preset selezionato
      setIncarichiFiltratiPreset(preset.incarichi);
    } else {
      // Se nessun preset è selezionato, mostra tutti gli incarichi
      setIncarichiFiltratiPreset([]);
    }
  };

  // Funzione per filtrare gli incarichi in base al preset selezionato
  const filtraIncarichiPerPreset = useCallback((incarichiDaFiltrare: Incarico[]): Incarico[] => {
    if (!presetAttivo || incarichiFiltratiPreset.length === 0) {
      return incarichiDaFiltrare; // Nessun filtro attivo
    }
    // Se un preset è attivo, mostra solo gli incarichi inclusi nel preset
    return incarichiDaFiltrare.filter(incarico => incarichiFiltratiPreset.includes(incarico.id));
  }, [presetAttivo, incarichiFiltratiPreset]);

  // Modifica la funzione esistente per renderizzare gli incarichi per tipo e applicare il filtro
  const handleRenderIncarichi = useCallback(() => {
    // ... existing code ...
    
    // Applica il filtro del preset prima di raggruppare per tipo
    const incarichiFiltrati = filtraIncarichiPerPreset(incarichi);
    
    // Restituisci i risultati già filtrati
    // ... rest of the existing function ...
  }, [/* existing dependencies */, filtraIncarichiPerPreset, incarichi]);

  // Aggiungo una nuova funzione per l'assegnazione di massa di tutti gli incarichi del preset
  const handleAssegnazioneIncarichiPreset = async () => {
    if (!presetAttivo || presetAttivo.incarichi.length === 0) {
      mostraAlert('Nessun preset attivo o preset senza incarichi', 'error');
      return;
    }
    
    // Apriamo il dialogo di trasferimento in modalità 'copia' per selezionare le farm di destinazione
    setModalitaTrasferimento('copia');
    // Non serve selezionare una farm origine per questa operazione
    await handleOpenTrasferimento('copia', true); // true indica che è un'assegnazione di preset
  };
  
  // Aggiungi funzione per gestire le assegnazioni da preset a farm
  const handleAssegnazionePresetAFarms = async (farmIds: string[]) => {
    if (!presetAttivo || presetAttivo.incarichi.length === 0 || farmIds.length === 0) {
      mostraAlert('Dati mancanti per l\'assegnazione', 'error');
      return;
    }
    
    let contatoreSuccessi = 0;
    let contatoreTentativi = 0;
    let contatoreSaltati = 0;
    
    // Mappe per accesso rapido agli elementi disponibili
    const incarichiDisponibiliMap = new Map();
    const incarichiCittaDisponibiliMap = new Map();
    const cestiDisponibiliMap = new Map();
    
    // Popolo le mappe per accesso rapido
    incarichi.forEach(incarico => {
      incarichiDisponibiliMap.set(incarico.id, incarico);
    });
    
    incarichiCitta.forEach(incarico => {
      incarichiCittaDisponibiliMap.set(incarico.id, incarico);
    });
    
    cesti.forEach(cesto => {
      cestiDisponibiliMap.set(cesto.id, cesto);
    });
    
    try {
      console.log(`Iniziando assegnazione di ${presetAttivo.incarichi.length} elementi a ${farmIds.length} farm`);
      
      // Crea una mappa di farms per ricerche veloci
      const farmMap = new Map();
      for (const giocatore of giocatoriEFarms) {
        for (const farm of giocatore.farms) {
          if (farmIds.includes(farm.id)) {
            farmMap.set(farm.id, {
              farm,
              giocatore_id: giocatore.giocatore_id,
              giocatore_nome: giocatore.giocatore_nome
            });
          }
        }
      }
      
      // Array per tenere traccia di tutte le nuove assegnazioni
      const nuoveAssegnazioni = [...assegnazioni];
      
      // Per ogni farm selezionata
      for (const farmId of farmIds) {
        console.log(`Elaborazione assegnazioni per farm: ${farmId}`);
        const farmInfo = farmMap.get(farmId);
        
        if (!farmInfo) {
          console.warn(`Informazioni farm non trovate per ID: ${farmId}`);
          continue;
        }
        
        // Traccia gli ID degli incarichi già processati per evitare duplicati
        const incarichiProcessati = new Set<string>();
        
        // Per ogni elemento nel preset
        for (const elementoId of presetAttivo.incarichi) {
          contatoreTentativi++;
          
          try {
            // Determina il tipo di elemento (incarico, incarico città o cesto)
            let tipo: 'incarico' | 'cesto' = 'incarico';
            let elementoTrovato: any = null;
            
            // Verifica se l'elemento è un incarico standard
            if (incarichiDisponibiliMap.has(elementoId)) {
              elementoTrovato = incarichiDisponibiliMap.get(elementoId);
              tipo = 'incarico';
            } 
            // Verifica se l'elemento è un incarico città
            else if (incarichiCittaDisponibiliMap.has(elementoId)) {
              elementoTrovato = incarichiCittaDisponibiliMap.get(elementoId);
              tipo = 'incarico'; // Anche gli incarichi città sono di tipo 'incarico'
            }
            // Verifica se l'elemento è un cesto
            else if (cestiDisponibiliMap.has(elementoId)) {
              elementoTrovato = cestiDisponibiliMap.get(elementoId);
              tipo = 'cesto';
            }
            
            if (!elementoTrovato) {
              console.warn(`Elemento ${elementoId} non trovato nelle liste disponibili`);
              continue;
            }
            
            console.log(`Tentativo di assegnazione: ${elementoTrovato.nome} (${elementoId}) alla farm ${farmId}`);
            
            // Verifica se l'assegnazione esiste già per questa farm
            const assegnazioneEsistente = assegnazioni.some(
              a => a.riferimento_id === elementoId && a.farm_id === farmId && a.tipo === tipo
            );
            
            if (assegnazioneEsistente) {
              console.log(`Assegnazione già esistente per elemento ${elementoId} e farm ${farmId}`);
              contatoreSaltati++;
              continue;
            }
            
            // Crea una nuova assegnazione con ID significativo
            const nuovaAssegnazione: Assegnazione = {
              id: `temp_${Date.now()}_${farmId.substring(0, 6)}_${elementoId.substring(0, 6)}`,
              tipo: tipo,
              riferimento_id: elementoId,
              farm_id: farmId,
              data_assegnazione: Timestamp.now(),
              data_ultimo_aggiornamento: Timestamp.now(),
              completato: false,
              stato: 'attivo'
            };
            
            // Arricchisci l'assegnazione con i dati già disponibili
            const assegnazioneArricchita = {
              ...nuovaAssegnazione,
              giocatore_nome: farmInfo.giocatore_nome,
              giocatore_id: farmInfo.giocatore_id,
              farm_nome: farmInfo.farm.nome || `Farm ${farmId.substring(0, 6)}`,
              farm_index: 0,
              livello_farm: farmInfo.farm.livello || 50,
              stato: farmInfo.farm.stato || 'attivo'
            };
            
            // Aggiungi l'assegnazione all'array delle nuove assegnazioni
            nuoveAssegnazioni.push(assegnazioneArricchita);
            
            // Marca l'assegnazione come modificata per il salvataggio
            setAssegnazioniModificate(prev => new Set([...prev, nuovaAssegnazione.id]));
            
            // Marca l'incarico come processato
            incarichiProcessati.add(elementoId);
            
            contatoreSuccessi++;
            console.log(`Assegnazione creata con successo: ${elementoId} -> ${farmId}`);
            
            // Se è un cesto, aggiungiamo anche gli incarichi contenuti nel cesto che non sono già nel preset
            if (tipo === 'cesto' && elementoTrovato.incarichi && Array.isArray(elementoTrovato.incarichi)) {
              console.log(`Processando incarichi contenuti nel cesto ${elementoTrovato.nome}`);
              
              for (const incaricoInCesto of elementoTrovato.incarichi) {
                const incaricoId = incaricoInCesto.incarico_id;
                
                // Salta se l'incarico è già stato processato o è incluso nel preset
                if (incarichiProcessati.has(incaricoId) || presetAttivo.incarichi.includes(incaricoId)) {
                  console.log(`Incarico ${incaricoId} nel cesto già processato o presente nel preset`);
                  continue;
                }
                
                // Verifica se l'assegnazione per questo incarico esiste già
                const assegnazioneIncaricoEsistente = assegnazioni.some(
                  a => a.riferimento_id === incaricoId && a.farm_id === farmId && a.tipo === 'incarico'
                );
                
                if (assegnazioneIncaricoEsistente) {
                  console.log(`Assegnazione già esistente per incarico ${incaricoId} del cesto e farm ${farmId}`);
                  continue;
                }
                
                // Crea una nuova assegnazione per l'incarico del cesto
                const nuovaAssegnazioneIncarico: Assegnazione = {
                  id: `temp_${Date.now()}_${farmId.substring(0, 6)}_${incaricoId.substring(0, 6)}_incesto`,
                  tipo: 'incarico',
                  riferimento_id: incaricoId,
                  farm_id: farmId,
                  data_assegnazione: Timestamp.now(),
                  data_ultimo_aggiornamento: Timestamp.now(),
                  completato: false,
                  stato: 'attivo'
                };
                
                // Arricchisci l'assegnazione dell'incarico
                const assegnazioneIncaricoArricchita = {
                  ...nuovaAssegnazioneIncarico,
                  giocatore_nome: farmInfo.giocatore_nome,
                  giocatore_id: farmInfo.giocatore_id,
                  farm_nome: farmInfo.farm.nome || `Farm ${farmId.substring(0, 6)}`,
                  farm_index: 0,
                  livello_farm: farmInfo.farm.livello || 50,
                  stato: farmInfo.farm.stato || 'attivo'
                };
                
                // Aggiungi l'assegnazione dell'incarico all'array delle nuove assegnazioni
                nuoveAssegnazioni.push(assegnazioneIncaricoArricchita);
                
                // Marca l'assegnazione come modificata per il salvataggio
                setAssegnazioniModificate(prev => new Set([...prev, nuovaAssegnazioneIncarico.id]));
                
                // Marca l'incarico come processato
                incarichiProcessati.add(incaricoId);
                
                console.log(`Assegnazione creata per incarico ${incaricoId} contenuto nel cesto ${elementoId}`);
              }
            }
          } catch (error) {
            console.error(`Errore nell'assegnazione dell'elemento ${elementoId} alla farm ${farmId}:`, error);
          }
        }
      }
      
      // Aggiorna lo stato locale con tutte le nuove assegnazioni
      if (contatoreSuccessi > 0) {
        setAssegnazioni(nuoveAssegnazioni);
        
        // Salva le assegnazioni nella cache locale
        localStorage.setItem("cache_assegnazioni_admin", JSON.stringify(nuoveAssegnazioni));
        localStorage.setItem("timestamp_assegnazioni_admin", Date.now().toString());
        
        // Mostra feedback
        mostraAlert(`Aggiunte ${contatoreSuccessi} nuove assegnazioni. Premi INVIA per salvarle definitivamente.`, "success");
      } else if (contatoreSaltati > 0) {
        mostraAlert(`Tutte le assegnazioni richieste (${contatoreSaltati}) esistono già`, 'info');
      } else {
        mostraAlert(`Nessuna nuova assegnazione creata. Verificare che gli incarichi non siano già assegnati.`, 'warning');
      }
      
      console.log(`Assegnazione completata: ${contatoreSuccessi}/${contatoreTentativi} operazioni riuscite, ${contatoreSaltati} saltate`);
    } catch (error) {
      console.error('Errore durante l\'assegnazione degli incarichi:', error);
      mostraAlert('Errore durante l\'assegnazione degli incarichi', 'error');
    } finally {
      setDialogoTrasferimentoAperto(false);
    }
  };

  // Modifica la funzione per filtrare gli incarichi in base al preset attivo e al derby
  const filtraIncarichiPerDerbyEPreset = useCallback((incarichiDaFiltrare: Incarico[]): Incarico[] => {
    // Prima filtra per derby se necessario
    let incarichiFiltratiPerDerby = derbySelezionato 
      ? incarichiDaFiltrare.filter(incarico => {
          // Verifica se l'incarico appartiene al derby selezionato o a nessun derby specifico
          return !incarico.derby_tags || incarico.derby_tags.includes(derbySelezionato.id);
        })
      : incarichiDaFiltrare;
    
    // Poi applica il filtro del preset se attivo
    return filtraIncarichiPerPreset(incarichiFiltratiPerDerby);
  }, [derbySelezionato, filtraIncarichiPerPreset]);
  
  // Nuova funzione per filtrare gli incarichi città in base al preset attivo e al derby
  const filtraIncarichiCittaPerDerbyEPreset = useCallback((incarichiDaFiltrare: IncaricoCitta[]): IncaricoCitta[] => {
    // Prima filtra per derby se necessario
    let incarichiFiltratiPerDerby = filtraIncarichiCittaPerDerby(incarichiDaFiltrare);
    
    // Poi applica il filtro del preset se attivo
    if (!presetAttivo || incarichiFiltratiPreset.length === 0) {
      return incarichiFiltratiPerDerby; // Nessun filtro attivo
    }
    // Se un preset è attivo, mostra solo gli incarichi inclusi nel preset
    return incarichiFiltratiPerDerby.filter(incarico => incarichiFiltratiPreset.includes(incarico.id));
  }, [presetAttivo, incarichiFiltratiPreset, filtraIncarichiCittaPerDerby]);
  
  // Nuova funzione per filtrare i cesti in base al preset attivo e al derby
  const filtraCestiPerDerbyEPreset = useCallback((cestiDaFiltrare: Cesto[]): Cesto[] => {
    // Prima filtra per derby se necessario
    let cestiFiltratiPerDerby = filtraCestiPerDerby(cestiDaFiltrare);
    
    // Poi applica il filtro del preset se attivo
    if (!presetAttivo || incarichiFiltratiPreset.length === 0) {
      return cestiFiltratiPerDerby; // Nessun filtro attivo
    }
    // Se un preset è attivo, mostra solo i cesti inclusi nel preset
    return cestiFiltratiPerDerby.filter(cesto => incarichiFiltratiPreset.includes(cesto.id));
  }, [presetAttivo, incarichiFiltratiPreset, filtraCestiPerDerby]);

  return (
    <Layout>
      <Snackbar open={showAlert} autoHideDuration={6000} onClose={() => setShowAlert(false)}>
        <Alert severity={alertSeverity} onClose={() => setShowAlert(false)}>
          {alertMessage}
        </Alert>
      </Snackbar>

      {/* Dialogo per il trasferimento o l'eliminazione delle assegnazioni */}
      <DialogoTrasferimentoAssegnazioni
        open={dialogoTrasferimentoAperto}
        onClose={() => setDialogoTrasferimentoAperto(false)}
        onConfirm={handleTrasferimentoAssegnazioni}
        onElimina={handleEliminazioneAssegnazioni}
        onAssegnaPreset={handleAssegnazionePresetAFarms}
        modalita={modalitaTrasferimento}
        giocatori={giocatoriEFarms}
        isAssegnazionePreset={presetAttivo !== null && modalitaTrasferimento === 'copia'}
      />
      
      {/* Banner di preset attivo */}
      {presetAttivo && (
        <Paper sx={{ p: 2, mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <PlaylistPlayIcon color="primary" sx={{ mr: 1 }} />
            <Typography variant="subtitle1" component="div">
              Preset attivo: <strong>{presetAttivo.nome}</strong> 
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              color="primary"
              size="small"
              startIcon={<ContentCopyIcon />}
              onClick={handleAssegnazioneIncarichiPreset}
              disabled={salvandoAssegnazioni}
            >
              Assegna a più farm
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              size="small"
              onClick={() => {
                setPresetAttivo(null);
                setIncarichiFiltratiPreset([]);
              }}
            >
              Disattiva preset
            </Button>
          </Box>
        </Paper>
      )}

      <Paper sx={{ p: 2, maxWidth: '100%', overflow: 'hidden' }}>
        {/* Pulsanti di azione centrali */}
        <Box 
          sx={{ 
            display: 'flex', 
            flexWrap: 'wrap',
            justifyContent: 'center', 
            gap: 1, 
            mb: 3,
            mx: 'auto',
          }}
        >
          {/* Pulsante AGGIORNA */}
          <Button
            variant="contained"
            color="primary"
            size="small"
            onClick={forzaAggiornamentoAssegnazioni}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon fontSize="small" />}
            disabled={loading}
            sx={{ 
              fontSize: '0.75rem', 
              py: 0.4, 
              px: 1.5,
              minWidth: 0,
              fontWeight: 'bold',
              boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
              borderRadius: '4px',
              textTransform: 'none',
              '&:hover': {
                boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                background: theme => theme.palette.primary.dark
              },
              '&:active': {
                transform: 'scale(0.98)',
                transition: 'transform 0.1s',
              }
            }}
          >
            Aggiorna
          </Button>
          
          {/* Pulsante PRODUZIONI */}
          <Button
            variant="contained"
            color="primary"
            size="small"
            onClick={aggiornaProgressi}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon fontSize="small" />}
            disabled={loading}
            sx={{ 
              fontSize: '0.75rem', 
              py: 0.4, 
              px: 1.5,
              minWidth: 0,
              fontWeight: 'bold',
              boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
              borderRadius: '4px',
              textTransform: 'none',
              '&:hover': {
                boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                background: theme => theme.palette.primary.dark
              },
              '&:active': {
                transform: 'scale(0.98)',
                transition: 'transform 0.1s',
              }
            }}
          >
            Produzioni
          </Button>
          
          {/* Pulsante GESTIONE ASSEGNAZIONI con dropdown */}
          <GestioneAssegnazioniDropdown 
            onCopia={() => handleOpenTrasferimento('copia')}
            onTrasferisci={() => handleOpenTrasferimento('trasferisci')}
            onElimina={() => handleOpenTrasferimento('elimina')}
            disabilitato={loading || assegnazioni.length === 0}
          />
          
          {/* Pulsante PRESET ASSEGNAZIONI con dropdown */}
          <PresetsAssegnazioniDropdown 
            presetAttivo={presetAttivo}
            onSelezionaPreset={handleSelezionaPreset}
            disabilitato={loading}
            incarichiDisponibili={incarichi}
            incarichiCittaDisponibili={incarichiCitta}
            cestiDisponibili={cesti}
            edifici={edifici}
          />
          
          {/* Pulsante INVIA */}
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
        </Box>

        {/* Controlli per la visualizzazione e l'ordinamento - ora visibili in tutte le tab */}
        {/* Rimuovo display:flex e justifyContent per permettere l'impilamento verticale */}
        <Box sx={{ mb: 2, width: '100%' }}>
          {/* Box contenente i pulsanti di visualizzazione, ordinamento, ricerca e reset */}
          {/* Aggiungo mb: 1.5 per spaziare dal menu a tendina sottostante */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            {/* Pulsante per cambiare la visualizzazione (solo per la tab Incarichi) */}
            <Tooltip title={visualizzazioneGlobale ? "Visualizza per edificio" : "Visualizza lista completa"}>
              <span>
                <IconButton 
                  onClick={handleToggleVisualizzazione}
                  color={visualizzazioneGlobale ? "primary" : "default"}
                  disabled={tabValue !== 0} // disabilitato se non siamo nella tab incarichi
                >
                  {visualizzazioneGlobale ? <ViewListIcon /> : <ViewModuleIcon />}
                </IconButton>
              </span>
            </Tooltip>
            
            {/* Pulsanti di ordinamento (sempre visibili) */}
            <Tooltip title={ordinamentoInverso ? "Ordina per livello (crescente)" : "Ordina per livello (decrescente)"}>
              <IconButton 
                onClick={() => handleChangeOrdinamento('livello')}
                color={ordinamentoLivello ? "primary" : "default"}
              >
                {ordinamentoLivello && ordinamentoInverso ? <SortIcon sx={{ transform: 'rotate(180deg)' }} /> : <SortIcon />}
              </IconButton>
            </Tooltip>
            
            <Tooltip title={ordinamentoInverso ? "Ordina alfabeticamente (A-Z)" : "Ordina alfabeticamente (Z-A)"}>
              <IconButton 
                onClick={() => handleChangeOrdinamento('alfabetico')}
                color={ordinamentoAlfabetico ? "primary" : "default"}
              >
                {ordinamentoAlfabetico && ordinamentoInverso ? <SortByAlphaIcon sx={{ transform: 'rotate(180deg)' }} /> : <SortByAlphaIcon />}
              </IconButton>
            </Tooltip>
            
            <Tooltip title={ordinamentoInverso ? "Ordina per assegnazioni (meno a più)" : "Ordina per assegnazioni (più a meno)"}>
              <span>
                <IconButton 
                  onClick={() => handleChangeOrdinamento('assegnazione')}
                  color={ordinamentoAssegnazione ? "primary" : "default"}
                  disabled={tabValue === 2} // disabilitato se siamo nella tab dei cesti
                >
                  {ordinamentoAssegnazione && ordinamentoInverso ? <PeopleAltIcon sx={{ transform: 'rotate(180deg)' }} /> : <PeopleAltIcon />}
                </IconButton>
              </span>
            </Tooltip>
            
            
            
            {/* Pulsante di ricerca */}
            <Tooltip title="Cerca">
              <IconButton
                size="small"
                onClick={toggleSearchBar}
              >
                <SearchIcon />
              </IconButton>
            </Tooltip>

            {/* Campo di ricerca espandibile */}
            {searchExpanded && (
              <Box sx={{ ml: 1, mr: 1, flex: 1, maxWidth: 400 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Cerca incarichi..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton 
                          edge="end" 
                          size="small" 
                          onClick={() => {
                            setSearchQuery("");
                            setSearchExpanded(false);
                          }}
                        >
                          <CancelIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  autoFocus
                />
              </Box>
            )}
            
            {/* Pulsante RESET */}
            <Tooltip title="Resetta tutte le assegnazioni">
              <IconButton 
                onClick={resetAssegnazioni}
                disabled={loading}
                sx={{ 
                  color: 'error.main'
                }}
              >
                <CancelIcon />
              </IconButton>
            </Tooltip>
          </Box>

          {/* Striscia del derby selezionato come Select diretto - ora è posizionata sotto la Box dei pulsanti */}
          <FormControl 
            variant="standard" 
            sx={{
              width: '100%',
              mb: 1.5,
              borderBottom: '1px solid rgba(0,0,0,0.08)',
              backgroundColor: 'rgba(245,249,255,0.8)',
              '&:hover': {
                backgroundColor: 'rgba(235,245,255,0.9)',
              }
            }}
          >
            <Select
              value={derby.some(d => d.id === derbySelezionato?.id) ? derbySelezionato?.id : ""}
              onChange={handleChangeDerby}
              displayEmpty
              disableUnderline
              IconComponent={(props) => (
                <FilterListIcon {...props} color="action" fontSize="small" sx={{ mr: 1 }} />
              )}
              sx={{ 
                py: 0.5,
                px: { xs: 1, sm: 2 },
                '& .MuiSelect-select': {
                  py: 0.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  fontSize: '0.75rem',
                  fontWeight: 500
                }
              }}
              renderValue={(value) => {
                const selectedDerby = derby.find(d => d.id === value);
                return (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box 
                      sx={{ 
                        width: 10, 
                        height: 10, 
                        borderRadius: '50%', 
                        bgcolor: selectedDerby?.colore || '#9e9e9e',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                      }} 
                    />
                    <Typography variant="caption" sx={{ fontSize: '0.75rem', fontWeight: 500, color: 'text.secondary' }}>
                      Derby selezionato: 
                    </Typography>
                    <Typography variant="caption" sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'text.primary' }}>
                      {selectedDerby ? selectedDerby.nome : "Tutti i tipi"}
                      {selectedDerby?.attivo && (
                        <Typography 
                          component="span" 
                          variant="caption" 
                          sx={{ 
                            ml: 1, 
                            fontSize: '0.65rem', 
                            fontWeight: 500, 
                            color: 'success.main',
                            bgcolor: 'rgba(76, 175, 80, 0.1)',
                            px: 0.7,
                            py: 0.2,
                            borderRadius: 1
                          }}
                        >
                          Attivo
                        </Typography>
                      )}
                      {selectedDerby?.prossimo && !selectedDerby?.attivo && (
                        <Typography 
                          component="span" 
                          variant="caption" 
                          sx={{ 
                            ml: 1, 
                            fontSize: '0.65rem', 
                            fontWeight: 500, 
                            color: 'info.main',
                            bgcolor: 'rgba(33, 150, 243, 0.1)',
                            px: 0.7,
                            py: 0.2,
                            borderRadius: 1
                          }}
                        >
                          Prossimo
                        </Typography>
                      )}
                    </Typography>
                  </Box>
                );
              }}
            >
              <MenuItem value="">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box 
                    sx={{ 
                      width: 12, 
                      height: 12, 
                      borderRadius: '50%', 
                      bgcolor: '#9e9e9e',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                    }} 
                  />
                  <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>Tutti i tipi</Typography>
                </Box>
              </MenuItem>
              {derby.map((d) => (
                <MenuItem key={d.id} value={d.id} sx={{ py: 0.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box 
                      sx={{ 
                        width: 12, 
                        height: 12, 
                        borderRadius: '50%', 
                        bgcolor: d.colore || '#ccc',
                        border: '1px solid rgba(0,0,0,0.1)',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                      }} 
                    />
                    <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>{d.nome}</Typography>
                    {d.attivo && (
                      <Chip 
                        label="Attivo" 
                        size="small" 
                        color="success" 
                        sx={{ height: 18, fontSize: '0.65rem', py: 0 }} 
                      />
                    )}
                    {d.prossimo && !d.attivo && (
                      <Chip 
                        label="Prossimo" 
                        size="small" 
                        color="info" 
                        sx={{ height: 18, fontSize: '0.65rem', py: 0 }} 
                      />
                    )}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Barra di ricerca espandibile */}
        <Collapse in={searchExpanded} timeout="auto" sx={{ mb: 2 }}>
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
            autoFocus
          />
        </Collapse>

        {/* Tabs e Contenuto principale */}
        <Box sx={{ maxWidth: '100%', overflow: 'hidden' }}>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {/* Tabs */}
              <Box sx={{ borderBottom: 1, borderColor: "divider", maxWidth: '100%', overflow: 'hidden' }}>
                <Tabs
                  value={tabValue}
                  onChange={handleChangeTab}
                  aria-label="tabs"
                  variant="scrollable"
                  scrollButtons="auto"
                  sx={{
                    '& .MuiTab-root': {
                      minWidth: 'auto',
                      px: 2,
                      py: 1
                    }
                  }}
                >
                  <Tab 
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                        <Typography component="span" sx={{ fontSize: '0.85rem', fontWeight: 500 }}>INCARICHI</Typography>
                        <Chip 
                          label={derbySelezionato || presetAttivo ? filtraIncarichiPerDerbyEPreset(incarichi).length : incarichi.length} 
                          size="small" 
                          color="primary" 
                          sx={{ 
                            height: 18, 
                            fontSize: '0.7rem', 
                            fontWeight: 'bold',
                            '& .MuiChip-label': { px: 0.7, py: 0 } 
                          }} 
                        />
                      </Box>
                    } 
                  />
                  <Tab 
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                        <Typography component="span" sx={{ fontSize: '0.85rem', fontWeight: 500 }}>CITTÀ</Typography>
                        <Chip 
                          label={derbySelezionato || presetAttivo ? filtraIncarichiCittaPerDerbyEPreset(incarichiCitta).length : incarichiCitta.length} 
                          size="small" 
                          color="primary" 
                          sx={{ 
                            height: 18, 
                            fontSize: '0.7rem', 
                            fontWeight: 'bold',
                            '& .MuiChip-label': { px: 0.7, py: 0 } 
                          }} 
                        />
                      </Box>
                    } 
                  />
                  <Tab 
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                        <Typography component="span" sx={{ fontSize: '0.85rem', fontWeight: 500 }}>CESTI</Typography>
                        <Chip 
                          label={derbySelezionato || presetAttivo ? filtraCestiPerDerbyEPreset(cesti).length : cesti.length} 
                          size="small" 
                          color="primary" 
                          sx={{ 
                            height: 18, 
                            fontSize: '0.7rem', 
                            fontWeight: 'bold',
                            '& .MuiChip-label': { px: 0.7, py: 0 } 
                          }} 
                        />
                      </Box>
                    } 
                  />
                </Tabs>
              </Box>

              {/* Messaggio quando non ci sono incarichi da mostrare */}
              {(derbySelezionato || presetAttivo) && (
                <>
                  {tabValue === 0 && filtraIncarichiPerDerbyEPreset(incarichi).length === 0 && (
                    <Box sx={{ mt: 4, mb: 2, textAlign: 'center' }}>
                      <Typography variant="body1" color="text.secondary">
                        {presetAttivo ? 
                          `Non ci sono incarichi nel preset ${presetAttivo.nome}` : 
                          `Non ci sono incarichi disponibili per il derby ${derbySelezionato?.nome}`}
                      </Typography>
                    </Box>
                  )}
                  {tabValue === 1 && filtraIncarichiCittaPerDerbyEPreset(incarichiCitta).length === 0 && (
                    <Box sx={{ mt: 4, mb: 2, textAlign: 'center' }}>
                      <Typography variant="body1" color="text.secondary">
                        {presetAttivo ? 
                          `Non ci sono incarichi città nel preset ${presetAttivo.nome}` : 
                          `Non ci sono incarichi città disponibili per il derby ${derbySelezionato?.nome}`}
                      </Typography>
                    </Box>
                  )}
                  {tabValue === 2 && filtraCestiPerDerbyEPreset(cesti).length === 0 && (
                    <Box sx={{ mt: 4, mb: 2, textAlign: 'center' }}>
                      <Typography variant="body1" color="text.secondary">
                        {presetAttivo ? 
                          `Non ci sono cesti nel preset ${presetAttivo.nome}` : 
                          `Non ci sono cesti disponibili per il derby ${derbySelezionato?.nome}`}
                      </Typography>
                    </Box>
                  )}
                </>
              )}

              {/* Pannello per gli incarichi */}
              <TabPanel value={tabValue} index={0}>
                <ListaIncarichi
                  edifici={edificiOrdinati}
                  incarichi={filtraIncarichiPerDerbyEPreset(incarichi)}
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
                  derbySelezionatoId={derbySelezionato?.id || ""} // Passa l'ID del derby selezionato
                  incarichiInPreset={presetAttivo ? presetAttivo.incarichi : []} // Passa gli incarichi del preset attivo
                />
              </TabPanel>

              {/* Pannello per gli incarichi città */}
              <TabPanel value={tabValue} index={1}>
                <ListaIncarichiCitta
                  incarichiCitta={filtraIncarichiCittaPerDerbyEPreset(incarichiCitta)}
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
                  derbySelezionatoId={derbySelezionato?.id || ""} // Passa l'ID del derby selezionato
                  ordinamentoLivello={ordinamentoLivello}
                  ordinamentoAlfabetico={ordinamentoAlfabetico}
                  ordinamentoInverso={ordinamentoInverso}
                />
              </TabPanel>

              {/* Pannello per i cesti */}
              <TabPanel value={tabValue} index={2}>
                <ListaCesti
                  cesti={filtraCestiPerDerbyEPreset(cesti)}
                  incarichi={filtraIncarichiPerDerby(incarichi)}
                  incarichiCitta={filtraIncarichiCittaPerDerby(incarichiCitta)}
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
                  derbySelezionatoId={derbySelezionato?.id || ""} // Passa l'ID del derby selezionato
                  ordinamentoLivello={ordinamentoLivello}
                  ordinamentoAlfabetico={ordinamentoAlfabetico}
                  ordinamentoInverso={ordinamentoInverso}
                />
              </TabPanel>
            </>
          )}
        </Box>
      </Paper>
      
      {/* Pulsante per tornare in cima */}
      <Zoom in={showScrollTop}>
        <Fab 
          color="primary" 
          size="small" 
          onClick={scrollToTop}
          sx={{ 
            position: 'fixed', 
            bottom: 16, 
            right: 16,
            zIndex: 1000
          }}
          aria-label="torna in alto"
        >
          <KeyboardArrowUpIcon />
        </Fab>
      </Zoom>
    </Layout>
  );
}

