import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Box,
  Button,
  Typography,
  Paper,
  Tabs,
  Tab,
  TextField,
  InputAdornment,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  CircularProgress,
  Alert,
  Container,
  Grid,
  SelectChangeEvent,
  Chip,
  Avatar,
  // Aggiungo Badge per mostrare quando ci sono modifiche non sincronizzate
  Badge,
  Collapse,
  Fab,
  Zoom,
  Menu,
  ListItemIcon,
  ListItemText,
  Divider,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import ViewListIcon from "@mui/icons-material/ViewList";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import UnfoldLessIcon from "@mui/icons-material/UnfoldLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import SortIcon from "@mui/icons-material/Sort";
import SortByAlphaIcon from "@mui/icons-material/SortByAlpha";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import FolderIcon from "@mui/icons-material/Folder";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  QueryDocumentSnapshot,
  DocumentData,
  deleteField,
  writeBatch,
  Timestamp,
  setDoc,
} from "firebase/firestore"
import { 
  getDocWithRateLimit, 
  getDocsWithRateLimit, 
  setDocWithRateLimit,
  updateDocWithRateLimit,
  deleteDocWithRateLimit,
  addDocWithRateLimit
} from '../../../configurazione/firebase';;
import { db } from "../../../configurazione/firebase";
import { useAuth } from "../../../componenti/autenticazione/AuthContext";
import { Farm } from "../../../tipi/giocatore";
import { Incarico, IncaricoCitta } from "../../../tipi/incarico";
import { Assegnazione } from "../../../tipi/assegnazione";
import { Cesto, IncaricoInCesto } from "../../../tipi/cesto";
import { Edificio } from "../../../tipi/edificio";
import { Derby } from "../../../tipi/derby";
import Layout from "../../../componenti/layout/Layout";
import { useTranslation } from "react-i18next";
import ListaIncarichi from "./componenti/ListaIncarichi";
import ListaIncarichiCitta from "./componenti/ListaIncarichiCitta";
import ListaCesti from "./componenti/ListaCesti";
import ProgressoBar from "./componenti/ProgressoBar";
// Aggiungo icona per il pulsante di sincronizzazione
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import CloudDoneIcon from "@mui/icons-material/CloudDone";
import FilterListIcon from "@mui/icons-material/FilterList";
import CircleIcon from "@mui/icons-material/Circle";
import InfoIcon from "@mui/icons-material/Info";

// Estensione dell'interfaccia Assegnazione per aggiungere la proprietà quantita
interface AssegnazioneEstesa extends Assegnazione {
  quantita?: number;
}

// Definizione dell'interfaccia TabPanel
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

// Componente TabPanel
function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
      style={{ width: "100%", maxWidth: "100%", overflowX: "hidden", boxSizing: "border-box" }}
    >
      {value === index && (
        <Box sx={{ 
          pt: 2, 
          px: 0,
          width: "100%", 
          maxWidth: "100%", 
          display: "flex", 
          flexDirection: "column", 
          alignItems: "center", 
          overflow: "hidden",
          boxSizing: "border-box"
        }}>
          {children}
        </Box>
      )}
    </div>
  );
}

// Importo il servizio di gestione cache
import { caricaDatiConCache, caricaAssegnazioniConCache, creaDocumentoMetadati } from "../../../servizi/gestioneCache";

// Importo il componente AggiornaDatiButton
import AggiornaDatiButton from "../../../componenti/comune/AggiornaDatiButton";

export default function MieiIncarichiNuovo() {
  const { currentUser } = useAuth();
  const { t } = useTranslation();

  // Stati per i dati
  const [farms, setFarms] = useState<Farm[]>([]);
  const [farmSelezionata, setFarmSelezionata] = useState<string>(() => {
    try {
      return localStorage.getItem("farmSelezionata") || "";
    } catch {
      return "";
    }
  });
  const [incarichi, setIncarichi] = useState<Incarico[]>([]);
  const [incarichiCitta, setIncarichiCitta] = useState<IncaricoCitta[]>([]);
  const [assegnazioni, setAssegnazioni] = useState<AssegnazioneEstesa[]>([]);
  const [cesti, setCesti] = useState<Cesto[]>([]);
  const [progressi, setProgressi] = useState<Map<string, number>>(new Map());
  const [progressiDocs, setProgressiDocs] = useState<Map<string, string>>(new Map());
  const [edifici, setEdifici] = useState<Edificio[]>([]);
  const [derby, setDerby] = useState<Derby[]>([]);
  const [derbySelezionato, setDerbySelezionato] = useState<Derby | null>(() => {
    try {
      const savedDerbyId = localStorage.getItem("derbySelezionato");
      if (savedDerbyId) {
        // Il derby completo verrà impostato dopo il caricamento dei derby
        return { id: savedDerbyId } as Derby;
      }
      return null;
    } catch {
      return null;
    }
  });
  const [giocatori, setGiocatori] = useState<{ id: string; nome: string; pin: number; ruolo: string; farms: Farm[] }[]>([]);
  const [giocatoreSelezionato, setGiocatoreSelezionato] = useState<string | null>(() => {
    try {
      return localStorage.getItem("giocatoreSelezionato");
    } catch {
      return null;
    }
  });
  
  // Stati per la UI
  const [loading, setLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false); // Nuovo stato per tenere traccia del caricamento dei dati
  const [error, setError] = useState<string>("");
  const [tabValue, setTabValue] = useState(() => {
    try {
      return parseInt(localStorage.getItem("tabAttiva") || "0");
    } catch {
      return 0;
    }
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [derbySelectExpanded, setDerbySelectExpanded] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  
  // Stati per la visualizzazione e l'ordinamento
  const [visualizzazioneGlobale, setVisualizzazioneGlobale] = useState(() => {
    try {
      const savedVisualization = localStorage.getItem("visualizzazioneGlobale");
      // Se il valore esiste in localStorage, usa quello
      if (savedVisualization !== null) {
        return savedVisualization === "true";
      }
      // Altrimenti imposta true come valore di default (vista lista completa)
      return true;
    } catch {
      return true; // Default: visualizzazione lista completa
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
  
  const [ordinamentoCompletamento, setOrdinamentoCompletamento] = useState(() => {
    try {
      return localStorage.getItem("ordinamentoCompletamento") === "true";
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
  
  const [mostraSoloAssegnati, setMostraSoloAssegnati] = useState<boolean>(() => {
    try {
      const savedValue = localStorage.getItem("miei-incarichi-mostra-assegnati");
      return savedValue !== null ? JSON.parse(savedValue) : true;
    } catch {
      return true;
    }
  });
  
  // Stati per l'evidenziazione temporanea
  const [elementoEvidenziato, setElementoEvidenziato] = useState<{
    tipo: 'incarico' | 'incaricoCitta' | 'cesto';
    id: string;
  } | null>(null);

  // Stati per tenere traccia degli incarichi espansi
  const [expandedIncarichi, setExpandedIncarichi] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("expandedIncarichi");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Nuovi stati per la gestione dei progressi locali
  const [progressiLocali, setProgressiLocali] = useState<Map<string, number>>(new Map());
  const [modificheNonSincronizzate, setModificheNonSincronizzate] = useState<boolean>(false);
  const [sincronizzazioneInCorso, setSincronizzazioneInCorso] = useState<boolean>(false);
  
  // Aggiungiamo un nuovo stato per tenere traccia delle modifiche non sincronizzate
  const [progressiModificati, setProgressiModificati] = useState<Set<string>>(new Set());
  
  // Stato per i messaggi di successo
  const [success, setSuccess] = useState<string | null>(null);
  
  // Ottieni il livello della farm selezionata
  const getLivelloFarmSelezionata = (): number => {
    if (!farmSelezionata || !farms || farms.length === 0) return 0;
    const farmIndex = parseInt(farmSelezionata);
    if (isNaN(farmIndex) || farmIndex < 0 || farmIndex >= farms.length) return 0;
    return farms[farmIndex].livello || 0;
  };

  // Funzione per aggiornare il livello della farm selezionata
  const handleUpdateFarmLevel = async () => {
    try {
      // Verifica che ci sia una farm selezionata
      if (!farmSelezionata || farmSelezionata === "") {
        setError(t('errori.seleziona_farm'));
        return;
      }

      // Ottieni l'indice della farm
      const farmIndex = parseInt(farmSelezionata);
      if (isNaN(farmIndex) || farmIndex < 0 || farmIndex >= farms.length) {
        setError("Farm non valida.");
        return;
      }

      // Ottieni la farm selezionata
      const farm = farms[farmIndex];
      if (!farm) {
        setError(t('errori.farm_non_trovata'));
        return;
      }

      // Controlla che il livello non superi 999
      if (farm.livello >= 999) {
        setError(t('errori.livello_massimo'));
        return;
      }

      // Incrementa il livello della farm
      const nuovoLivello = (farm.livello || 0) + 1;
      
      // Aggiorna la farm
      const farmsAggiornate = [...farms];
      farmsAggiornate[farmIndex] = {
        ...farmsAggiornate[farmIndex],
        livello: nuovoLivello
      };

      // Aggiorna il documento utente nel database
      let userId = "";
      
      // Se è un admin o coordinatore e ha selezionato un giocatore, aggiorna quel giocatore
      if ((currentUser?.ruolo === "admin" || currentUser?.ruolo === "coordinatore") && giocatoreSelezionato) {
        userId = giocatoreSelezionato;
      } 
      // Altrimenti aggiorna l'utente corrente
      else if (currentUser) {
        userId = currentUser.id;
      } else {
        setError(t('errori.utente_non_trovato'));
        return;
      }

      // Aggiorna il documento nel DB
      const userRef = doc(db, "utenti", userId);
      await updateDocWithRateLimit(userRef, {
        farms: farmsAggiornate
      });

      // Aggiorna lo stato locale
      setFarms(farmsAggiornate);
      
      // Mostra un messaggio di successo
      setSuccess(t('successi.livello_aggiornato'));
    } catch (error) {
      console.error("Errore nell'aggiornamento del livello:", error);
      setError(t('errori.aggiornamento_livello'));
    }
  };
  
  // Effetto per salvare la posizione di scroll
  useEffect(() => {
    const handleScroll = () => {
      localStorage.setItem("scrollPosition", String(window.scrollY));
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);
  
  // Effetto per ripristinare la posizione di scroll dopo che i dati sono stati caricati
  useEffect(() => {
    if (dataLoaded && !loading) {
      const savedScrollPosition = localStorage.getItem("scrollPosition");
      if (savedScrollPosition) {
        const scrollToPosition = (position: number) => {
          window.scrollTo({
            top: position,
            behavior: 'auto'
          });
        };

        // Primo tentativo dopo 800ms
        setTimeout(() => {
          scrollToPosition(parseInt(savedScrollPosition));
        }, 800);
        
        // Secondo tentativo dopo 1500ms, nel caso in cui il primo non funzioni correttamente
        setTimeout(() => {
          scrollToPosition(parseInt(savedScrollPosition));
        }, 1500);
      }
    }
  }, [dataLoaded, loading]);
  
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
    localStorage.setItem("ordinamentoCompletamento", String(ordinamentoCompletamento));
  }, [ordinamentoCompletamento]);
  
  useEffect(() => {
    localStorage.setItem("ordinamentoInverso", String(ordinamentoInverso));
  }, [ordinamentoInverso]);
  
  useEffect(() => {
    localStorage.setItem("expandedEdifici", JSON.stringify(expandedEdifici));
  }, [expandedEdifici]);
  
  useEffect(() => {
    localStorage.setItem("miei-incarichi-mostra-assegnati", JSON.stringify(mostraSoloAssegnati));
  }, [mostraSoloAssegnati]);

  useEffect(() => {
    if (farmSelezionata) {
      localStorage.setItem("farmSelezionata", farmSelezionata);
    }
  }, [farmSelezionata]);

  useEffect(() => {
    if (giocatoreSelezionato) {
      localStorage.setItem("giocatoreSelezionato", giocatoreSelezionato);
    }
  }, [giocatoreSelezionato]);

  useEffect(() => {
    localStorage.setItem("tabAttiva", String(tabValue));
  }, [tabValue]);

  useEffect(() => {
    if (derbySelezionato?.id) {
      localStorage.setItem("derbySelezionato", derbySelezionato.id);
    }
  }, [derbySelezionato]);

  useEffect(() => {
    localStorage.setItem("expandedIncarichi", JSON.stringify(expandedIncarichi));
  }, [expandedIncarichi]);

  // Effetto per verificare che la farm selezionata sia valida quando le farm cambiano
  useEffect(() => {
    // Se non ci sono farm, non fare nulla
    if (farms.length === 0) return;
    
    // Se la farm selezionata non è valida, seleziona la prima farm
    const farmIndex = parseInt(farmSelezionata);
    if (isNaN(farmIndex) || farmIndex < 0 || farmIndex >= farms.length) {
      setFarmSelezionata("0");
    }
  }, [farms, farmSelezionata]);

  // Riferimenti alle funzioni per evitare dipendenze circolari
  const caricaProgressiRef = useRef<(assegnazioniData: AssegnazioneEstesa[]) => Promise<void>>(async () => {});
  const caricaAssegnazioniRef = useRef<(forceReload?: boolean) => Promise<void>>(async () => {});
  const verificaModificheNonSincronizzateRef = useRef<(progressiLocaliInput: Map<string, number>) => void>(() => {});
  const caricaProgressiLocaliRef = useRef<() => void>(() => {});

  // Funzione per caricare i progressi
  const caricaProgressi = useCallback(async (assegnazioniData: AssegnazioneEstesa[]) => {
    try {
      // Determina il farm_id da utilizzare
      let farmId = "";
      
      if (farmSelezionata && farms && farms.length > parseInt(farmSelezionata)) {
        const farmIndex = parseInt(farmSelezionata);
        const farm = farms[farmIndex];
        
        if (farm && farm.id) {
          farmId = farm.id;
        } else if (currentUser) {
          farmId = `${currentUser.id || ''}_${farmIndex}`;
        }
      } else if (currentUser) {
        farmId = `${currentUser.id || ''}_0`;
      }
      
      if (!farmId) {
        farmId = "default_farm";
        console.warn("Non è stato possibile determinare un farm_id valido, uso un valore di fallback");
      }
      
      // Interroga Firebase per tutti i progressi relativi a questa farm
      const progressiRef = collection(db, "progressi");
      const q = query(progressiRef, where("farm_id", "==", farmId));
      const querySnapshot = await getDocsWithRateLimit(q);
      
      // Se non ci sono risultati, usa i progressi locali esistenti
      if (querySnapshot.empty) {
        // Nessun progresso trovato sul server, carico i progressi locali esistenti
        return;
      }
      
      // Crea un nuovo oggetto Map per i progressi
      const nuoviProgressi = new Map<string, number>();
      
      // Per ogni progresso, salva l'incarico_id e la percentuale
      querySnapshot.forEach(doc => {
        const dati = doc.data();
        const incaricoId = dati.incarico_id;
        const percentuale = dati.percentuale || 0;
        
        nuoviProgressi.set(incaricoId, percentuale);
      });
      
      // Aggiorna lo stato
      setProgressi(nuoviProgressi);
    } catch (error) {
      console.error("Errore nel caricamento dei progressi:", error);
      setError("Errore nel caricamento dei progressi. Riprova più tardi.");
    }
  }, [currentUser, farmSelezionata, farms]);

  // Funzione per caricare le assegnazioni
  const caricaAssegnazioni = async () => {
    if (!currentUser) {
      return;
    }
    
    try {
      // Resetta le assegnazioni prima di caricare le nuove
      setAssegnazioni([]);
      
      // Ottieni la farm selezionata in base all'indice
      let farmIndex = -1;
      
      // Gestione sicura dell'indice della farm
      try {
        farmIndex = parseInt(farmSelezionata);
        
        // Se farmIndex non è un numero o è negativo, resetta a -1
        if (isNaN(farmIndex) || farmIndex < 0) {
          farmIndex = -1;
        }
      } catch (error) {
        farmIndex = -1;
      }
      
      // Verifica che l'indice della farm sia valido
      if (farmIndex === -1 || farmIndex >= farms.length) {
        // Se l'indice non è valido ma ci sono farm disponibili, seleziona la prima
        if (farms.length > 0) {
          setFarmSelezionata("0");
          
          // Salva la preferenza in localStorage
          try {
            localStorage.setItem("farmSelezionata", "0");
          } catch (error) {
            console.error("caricaAssegnazioni - Errore nel salvataggio della preferenza:", error);
          }
          
          // Imposta dataLoaded a true e ritorna, le assegnazioni verranno caricate quando cambia farmSelezionata
          setDataLoaded(true);
          return;
        } else {
          setDataLoaded(true);
          return;
        }
      }
      
      const farm = farms[farmIndex];
      
      if (!farm) {
        console.error("caricaAssegnazioni - Farm non trovata");
        setDataLoaded(true); // Imposta dataLoaded a true anche se non ci sono farm
        return;
      }
      
      // Costruisci l'ID della farm nel formato utilizzato nelle assegnazioni
      let userId = "";
      
      // Se è un admin o coordinatore e ha selezionato un giocatore, carica le assegnazioni di quel giocatore
      if ((currentUser?.ruolo === "admin" || currentUser?.ruolo === "coordinatore") && giocatoreSelezionato) {
        userId = giocatoreSelezionato;
      } 
      // Altrimenti carica le assegnazioni dell'utente corrente
      else if (currentUser) {
        userId = currentUser.id || '';
      } else {

        setDataLoaded(true); // Imposta dataLoaded a true anche se non ci sono utenti
        return;
      }
      
      // Formato dell'ID: userId_farmIndex (es. DDe2t7HkxMCqrKqsFZGh_0)
      const farmId = `${userId}_${farmIndex}`;
      
      // Definisco una variabile per forzare o meno l'aggiornamento dal server
      const forzaAggiornamento = false;
      
      // Utilizzo la funzione di cache per caricare le assegnazioni
      // Passa il parametro forzaAggiornamento per forzare l'aggiornamento dal server
      const assegnazioniData = await caricaAssegnazioniConCache(userId, forzaAggiornamento);
      
      // Filtra le assegnazioni per la farm selezionata
      const assegnazioniFiltratePerFarm = assegnazioniData.filter((a: any) => a.farm_id === farmId);
      
      // Aggiorna lo stato con le nuove assegnazioni
      setAssegnazioni(assegnazioniFiltratePerFarm);
      
      // Carica i progressi per le assegnazioni
      await caricaProgressi(assegnazioniFiltratePerFarm);
      
      // Carica anche i progressi senza assegnazione per questa farm specifica
      if (farmId) {
        await caricaProgressiSenzaAssegnazione(farmId);
      }
      
      // Imposta dataLoaded a true
      setDataLoaded(true);
    } catch (error) {
      console.error("caricaAssegnazioni - Errore nel caricamento delle assegnazioni:", error);
      setError("Errore nel caricamento delle assegnazioni. Riprova più tardi.");
      setDataLoaded(true); // Imposta dataLoaded a true anche in caso di errore
    }
  };

  // Effetto per caricare i dati iniziali
  const caricaDati = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      
      // Carica i dati di base
      await Promise.all([
        caricaIncarichi(),
        caricaIncarichiCitta(),
        caricaCesti(),
        caricaEdifici(),
        caricaDerby()
      ]);
      
      // Se è un admin o coordinatore, carica i giocatori
      if (currentUser?.ruolo === "admin" || currentUser?.ruolo === "coordinatore") {
        await caricaGiocatori();
      } else {
        // Altrimenti carica le farm dell'utente corrente
        await caricaFarms();
      }
      
      // Verifica se c'è una farm selezionata
      if ((!farmSelezionata || farmSelezionata === "") && farms.length > 0) {
        setFarmSelezionata("0");
        
        // Salva la preferenza in localStorage
        try {
          localStorage.setItem("farmSelezionata", "0");
        } catch (error) {
          console.error("caricaDati - Errore nel salvataggio della preferenza:", error);
        }
        
        // Imposta dataLoaded a false per forzare il caricamento delle assegnazioni
        setDataLoaded(false);
        
        // Carica le assegnazioni dopo che le farm sono state caricate
        await caricaAssegnazioniRef.current();
      } else if (farmSelezionata && farms.length > 0) {
        // Imposta dataLoaded a false per forzare il caricamento delle assegnazioni
        setDataLoaded(false);
        
        // Carica le assegnazioni dopo che le farm sono state caricate
        await caricaAssegnazioniRef.current();
      } else {
        setDataLoaded(true);
      }
      
      setLoading(false);
    } catch (error) {
      console.error("caricaDati - Errore nel caricamento dei dati:", error);
      setError("Errore nel caricamento dei dati. Riprova più tardi.");
      setLoading(false);
      setDataLoaded(true); // Imposta dataLoaded a true anche in caso di errore
    }
  }, [currentUser?.ruolo, farmSelezionata, farms.length]);

  // Effetto per caricare i dati all'avvio
  useEffect(() => {
    // Verifica se esiste il documento di metadati e crealo se necessario
    creaDocumentoMetadati().then(() => {
      // Carica i dati dopo aver verificato il documento di metadati
      caricaDati();
    });
  }, [caricaDati]);

  // Effetto per ricaricare le assegnazioni quando cambia il giocatore o la farm selezionata
  useEffect(() => {
    if (farmSelezionata) {
      // Resetta lo stato delle assegnazioni e dei progressi
      setAssegnazioni([]);
      setProgressi(new Map());
      setProgressiDocs(new Map());
      setDataLoaded(false);
      
      // Forza il ricaricamento delle assegnazioni
      caricaAssegnazioniRef.current();
    }
  }, [farmSelezionata, giocatoreSelezionato]);

  // Effetto per loggare le assegnazioni quando cambiano
  useEffect(() => {
    // Verifica se ci sono assegnazioni per gli incarichi
    if (assegnazioni.length > 0 && incarichi.length > 0) {
      const assegnazioniIncarichi = assegnazioni.filter(a => a.tipo === "incarico");
      
      // Verifica se gli ID degli incarichi nelle assegnazioni corrispondono agli ID degli incarichi
      const incarichiAssegnati = incarichi.filter(incarico => 
        assegnazioniIncarichi.some(assegnazione => assegnazione.riferimento_id === incarico.id)
      );
      
      if (incarichiAssegnati.length === 0) {
        // Rimossi console.log di debug
        return;
      }
    }
  }, [assegnazioni, incarichi, mostraSoloAssegnati]);

// Funzione per caricare i progressi locali da localStorage
const caricaProgressiLocali = useCallback(() => {
  console.log("caricaProgressiLocali chiamata con farmSelezionata:", farmSelezionata);
  if (farmSelezionata) {
    try {
      // Carico i progressi locali per questa farm specifica
      const chiaveStorage = `progressiLocali_${farmSelezionata}`;
      const progressiSalvati = localStorage.getItem(chiaveStorage);

      if (progressiSalvati) {
        const progressiObj = JSON.parse(progressiSalvati);
        const nuoviProgressiLocali = new Map<string, number>();
        
        // Converti l'oggetto in Map
        Object.entries(progressiObj).forEach(([key, value]) => {
          nuoviProgressiLocali.set(key, value as number);
        });
        
        // Aggiorna lo stato
        setProgressiLocali(nuoviProgressiLocali);
        
        // Carica anche i progressi modificati
        const chiaveModificati = `progressiModificati_${farmSelezionata}`;
        const modificatiSalvati = localStorage.getItem(chiaveModificati);
        
        if (modificatiSalvati) {
          const modificatiArray = JSON.parse(modificatiSalvati);
          const nuoviModificati = new Set<string>(modificatiArray);
          setProgressiModificati(nuoviModificati);
        }
        
        // Verifica se ci sono modifiche non sincronizzate
        verificaModificheNonSincronizzateRef.current(nuoviProgressiLocali);
      }
    } catch (error) {
      console.error("Errore nel caricamento dei progressi locali:", error);
    }
  }
}, [farmSelezionata]);

  // Implementazione della funzione caricaProgressi
  useEffect(() => {
    caricaProgressiRef.current = async (assegnazioniData: AssegnazioneEstesa[]) => {
      try {
        // Resetta completamente i progressi prima di caricare quelli nuovi
        const nuoviProgressi = new Map<string, number>();
        const nuoviProgressiDocs = new Map<string, string>();
        
        // Ottieni la farm_id corrente dalle assegnazioni (dovrebbero avere tutte lo stesso farm_id)
        const farmIdCorrente = assegnazioniData.length > 0 ? assegnazioniData[0].farm_id : null;
        
        if (!farmIdCorrente) {
          setProgressi(nuoviProgressi);
          setProgressiDocs(nuoviProgressiDocs);
          return;
        }
        
        // Per ogni assegnazione, carica il progresso
        for (const assegnazione of assegnazioniData) {
          // Verifica che l'assegnazione appartenga alla farm corrente
          if (assegnazione.farm_id !== farmIdCorrente) {
            continue;
          }
          
          // Cerca il progresso nel database, indipendentemente dallo stato di completamento
          const progressiRef = collection(db, "progressi");
          const q = query(
            progressiRef,
            where("assegnazione_id", "==", assegnazione.id),
            where("farm_id", "==", assegnazione.farm_id || "") // Filtro per farm_id, assicurandoci che non sia null
          );
          
          const querySnapshot = await getDocsWithRateLimit(q);
          
          let progressoAttuale = 0;
          let progressoDocId = '';
          let timestampPiuRecente = new Date(0); // Data molto vecchia
          
          if (!querySnapshot.empty) {
            // Potremmo avere più documenti per la stessa assegnazione
            // Prendiamo quello con il timestamp più recente
            querySnapshot.docs.forEach(doc => {
              const progressoData = doc.data();
              const timestamp = progressoData.timestamp?.toDate() || new Date(0);
              
              if (timestamp > timestampPiuRecente) {
                timestampPiuRecente = timestamp;
                progressoAttuale = progressoData.percentuale || 0;
                progressoDocId = doc.id;
              }
            });
            
            // Per gli incarichi assegnati, usiamo solo l'ID dell'incarico come chiave
            nuoviProgressi.set(assegnazione.riferimento_id, progressoAttuale);
            nuoviProgressiDocs.set(assegnazione.riferimento_id, progressoDocId);
          } else {
            // Se non c'è un documento di progresso, usa la quantità dell'assegnazione o 0
            progressoAttuale = assegnazione.quantita || 0;
            nuoviProgressi.set(assegnazione.riferimento_id, progressoAttuale);
          }
          
          // Trova l'incarico corrispondente
          const incarico = incarichi.find(i => i.id === assegnazione.riferimento_id) || 
                           incarichiCitta.find(i => i.id === assegnazione.riferimento_id);
          
          if (incarico) {
            // Calcola la percentuale di completamento
            const quantitaRichiesta = incarico.quantita || 0;
            if (quantitaRichiesta > 0) {
              const percentuale = Math.min(100, Math.round((progressoAttuale / quantitaRichiesta) * 100));
              
              // Se la percentuale è 100% ma l'incarico non è marcato come completato, aggiornalo
              if (percentuale >= 100 && !assegnazione.completato) {
                // Aggiorna lo stato di completamento nel database
                const assegnazioneRef = doc(db, "assegnazioni", assegnazione.id);
                await updateDocWithRateLimit(assegnazioneRef, {
                  completato: true
                });
                
                // Aggiorna lo stato locale
                setAssegnazioni(prev => 
                  prev.map(a => 
                    a.id === assegnazione.id 
                      ? { ...a, completato: true } 
                      : a
                  )
                );
              }
            }
          }
        }
        
        // Aggiorna lo stato con i nuovi progressi
        setProgressi(nuoviProgressi);
        setProgressiDocs(nuoviProgressiDocs);
        
        // Carica anche i progressi senza assegnazione per questa farm specifica
        await caricaProgressiSenzaAssegnazione(farmIdCorrente);
      } catch (error) {
        console.error("Errore nel caricamento dei progressi:", error);
      }
    };
  }, [incarichi, incarichiCitta]);
  
  // Funzione per caricare i progressi senza assegnazione
  const caricaProgressiSenzaAssegnazione = async (farmId: string) => {
    try {
      // Carica TUTTI i progressi per questa farm, indipendentemente dall'assegnazione
      const progressiRef = collection(db, "progressi");
      
      const qTuttiProgressi = query(
        progressiRef,
        where("farm_id", "==", farmId)
      );
      
      const querySnapshotTuttiProgressi = await getDocsWithRateLimit(qTuttiProgressi);
      
      // Mappa per tenere traccia dei progressi per incarico_id
      const progressiPerIncarico = new Map<string, { docId: string, percentuale: number, assegnazioneId: string, timestamp: number }>();
      
      // Elabora tutti i progressi trovati
      querySnapshotTuttiProgressi.forEach(doc => {
        const progressoData = doc.data();
        const incaricoId = progressoData.incarico_id;
        const percentuale = progressoData.percentuale || 0;
        const assegnazioneId = progressoData.assegnazione_id || "";
        const timestamp = progressoData.timestamp?.seconds || 0;
        
        // Se non abbiamo ancora un progresso per questo incarico o se questo è più recente
        if (!progressiPerIncarico.has(incaricoId) || 
            timestamp > (progressiPerIncarico.get(incaricoId)?.timestamp || 0)) {
          progressiPerIncarico.set(incaricoId, { 
            docId: doc.id, 
            percentuale, 
            assegnazioneId,
            timestamp
          });
        }
      });
      
      // Aggiorna i progressi e i documenti di progresso
      setProgressi(prev => {
        const nuoviProgressi = new Map(prev);
        
        // Itera su tutti i progressi trovati
        progressiPerIncarico.forEach((progresso, incaricoId) => {
          // Verifica se esiste un'assegnazione per questo incarico
          const assegnazione = assegnazioni.find(a => a.riferimento_id === incaricoId && a.farm_id === farmId);
          
          if (assegnazione) {
            // Se esiste un'assegnazione ma il progresso ha assegnazione_id vuota o diversa,
            // aggiorna il documento di progresso con l'ID dell'assegnazione
            if (progresso.assegnazioneId === "" || progresso.assegnazioneId !== assegnazione.id) {
              // Aggiorna il documento di progresso
              const progressoDocRef = doc(db, "progressi", progresso.docId);
              updateDocWithRateLimit(progressoDocRef, {
                assegnazione_id: assegnazione.id
              }).catch(error => {
                console.error("Errore nell'aggiornamento del documento di progresso:", error);
              });
            }
            
            // Aggiorna il progresso locale
            nuoviProgressi.set(incaricoId, progresso.percentuale);
            
            // Aggiorna anche la mappa dei documenti di progresso
            setProgressiDocs(prevDocs => {
              const nuoviProgressiDocs = new Map(prevDocs);
              nuoviProgressiDocs.set(incaricoId, progresso.docId);
              return nuoviProgressiDocs;
            });
            
            // Se l'assegnazione ha quantità 0 ma il progresso è > 0, aggiorna l'assegnazione
            if ((assegnazione.quantita === 0 || assegnazione.quantita === undefined) && progresso.percentuale > 0) {
              // Aggiorna il documento di assegnazione
              const assegnazioneRef = doc(db, "assegnazioni", assegnazione.id);
              updateDocWithRateLimit(assegnazioneRef, {
                quantita: progresso.percentuale
              }).catch(error => {
                console.error("Errore nell'aggiornamento dell'assegnazione:", error);
              });
              
              // Aggiorna lo stato locale delle assegnazioni
              setAssegnazioni(prev => 
                prev.map(a => 
                  a.id === assegnazione.id 
                    ? { ...a, quantita: progresso.percentuale } 
                    : a
                )
              );
            }
          } else {
            // Se non esiste un'assegnazione, aggiungi il progresso ai progressi locali
            nuoviProgressi.set(incaricoId, progresso.percentuale);
            
            // Aggiorna anche la mappa dei documenti di progresso
            setProgressiDocs(prevDocs => {
              const nuoviProgressiDocs = new Map(prevDocs);
              nuoviProgressiDocs.set(incaricoId, progresso.docId);
              return nuoviProgressiDocs;
            });
          }
        });
        
        return nuoviProgressi;
      });
    } catch (error) {
      console.error("Errore nel caricamento dei progressi senza assegnazione:", error);
    }
  };

  // Implementazione della funzione caricaAssegnazioni
  useEffect(() => {
    caricaAssegnazioniRef.current = async (forzaAggiornamento: boolean = false) => {
      if (!farmSelezionata) {
        setDataLoaded(true); // Imposta dataLoaded a true anche se non ci sono farm selezionate
        return;
      }
      
      try {
        // Resetta le assegnazioni prima di caricare le nuove
        setAssegnazioni([]);
        
        // Ottieni la farm selezionata in base all'indice
        let farmIndex = -1;
        
        // Gestione sicura dell'indice della farm
        try {
          farmIndex = parseInt(farmSelezionata);
          
          // Se farmIndex non è un numero o è negativo, resetta a -1
          if (isNaN(farmIndex) || farmIndex < 0) {
            farmIndex = -1;
          }
        } catch (error) {
          farmIndex = -1;
        }
        
        // Verifica che l'indice della farm sia valido
        if (farmIndex === -1 || farmIndex >= farms.length) {
          // Se l'indice non è valido ma ci sono farm disponibili, seleziona la prima
          if (farms.length > 0) {
            setFarmSelezionata("0");
            
            // Salva la preferenza in localStorage
            try {
              localStorage.setItem("farmSelezionata", "0");
            } catch (error) {
              console.error("caricaAssegnazioni - Errore nel salvataggio della preferenza:", error);
            }
            
            // Imposta dataLoaded a true e ritorna, le assegnazioni verranno caricate quando cambia farmSelezionata
            setDataLoaded(true);
            return;
          } else {
            setDataLoaded(true);
            return;
          }
        }
        
        const farm = farms[farmIndex];
        
        if (!farm) {
          console.error("caricaAssegnazioni - Farm non trovata");
          setDataLoaded(true); // Imposta dataLoaded a true anche se non ci sono farm
          return;
        }
        
        // Costruisci l'ID della farm nel formato utilizzato nelle assegnazioni
        let userId = "";
        
        // Se è un admin o coordinatore e ha selezionato un giocatore, carica le assegnazioni di quel giocatore
        if ((currentUser?.ruolo === "admin" || currentUser?.ruolo === "coordinatore") && giocatoreSelezionato) {
          userId = giocatoreSelezionato;
        } 
        // Altrimenti carica le assegnazioni dell'utente corrente
        else if (currentUser) {
          userId = currentUser.id || '';
        } else {

          setDataLoaded(true); // Imposta dataLoaded a true anche se non ci sono utenti
          return;
        }
        
        // Formato dell'ID: userId_farmIndex (es. DDe2t7HkxMCqrKqsFZGh_0)
        const farmId = `${userId}_${farmIndex}`;
        
        // Definisco una variabile per forzare o meno l'aggiornamento dal server
        const forzaAggiornamento = false;
        
        // Utilizzo la funzione di cache per caricare le assegnazioni
        // Passa il parametro forzaAggiornamento per forzare l'aggiornamento dal server
        const assegnazioniData = await caricaAssegnazioniConCache(userId, forzaAggiornamento);
        
        // Filtra le assegnazioni per la farm selezionata
        const assegnazioniFiltratePerFarm = assegnazioniData.filter((a: any) => a.farm_id === farmId);
        
        // Aggiorna lo stato con le nuove assegnazioni
        setAssegnazioni(assegnazioniFiltratePerFarm);
        
        // Carica i progressi per le assegnazioni
        await caricaProgressi(assegnazioniFiltratePerFarm);
        
        // Carica anche i progressi senza assegnazione per questa farm specifica
        if (farmId) {
          await caricaProgressiSenzaAssegnazione(farmId);
        }
        
        // Imposta dataLoaded a true
        setDataLoaded(true);
      } catch (error) {
        console.error("caricaAssegnazioni - Errore nel caricamento delle assegnazioni:", error);
        setError("Errore nel caricamento delle assegnazioni. Riprova più tardi.");
        setDataLoaded(true); // Imposta dataLoaded a true anche in caso di errore
      }
    };
  }, [currentUser, farmSelezionata, farms, giocatoreSelezionato]);

  // Funzione per caricare i giocatori
  const caricaGiocatori = async () => {
    // Se l'utente non è admin o coordinatore, non caricare la lista dei giocatori
    if (currentUser?.ruolo !== "admin" && currentUser?.ruolo !== "coordinatore") {
      // Rimosso console.log
      return;
    }

    try {
      const giocatoriRef = collection(db, "utenti");
      const q = query(giocatoriRef);
      const querySnapshot = await getDocsWithRateLimit(q);
      
      const giocatoriData: any[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        giocatoriData.push({
          id: doc.id,
          nome: data.nome || "Utente senza nome",
          pin: data.pin || 0,
          ruolo: data.ruolo || "giocatore",
          farms: data.farms || [],
        });
      });
      
      setGiocatori(giocatoriData);
      
      // Se c'è un giocatore selezionato salvato, carica le sue farm
      const savedGiocatoreId = localStorage.getItem("giocatoreSelezionato");
      
      if (savedGiocatoreId) {
        const giocatoreSalvato = giocatoriData.find(g => g.id === savedGiocatoreId);
        if (giocatoreSalvato) {
          setFarms(giocatoreSalvato.farms);
          
          // Ripristina la farm selezionata dal localStorage
          const savedFarmIndex = localStorage.getItem("farmSelezionata");
          
          if (savedFarmIndex && !isNaN(parseInt(savedFarmIndex)) && parseInt(savedFarmIndex) < giocatoreSalvato.farms.length) {
            setFarmSelezionata(savedFarmIndex);
          } else if (giocatoreSalvato.farms.length > 0) {
            // Se non c'è una farm salvata valida, seleziona la prima
            setFarmSelezionata("0");
          }
        } else {
          // Rimosso console.log
          setGiocatoreSelezionato(null);
        }
      } else {
        // Rimosso console.log
        setGiocatoreSelezionato(null);
      }
    } catch (error) {
      console.error("Errore nel caricamento dei giocatori:", error);
    }
  };

  // Funzione per caricare le farm dell'utente corrente
  const caricaFarms = async () => {
    try {
      if (currentUser) {
        // Ottieni le farm dell'utente corrente
        const userRef = doc(db, "utenti", currentUser.id);
        const userDoc = await getDocWithRateLimit(userRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const userFarms = userData.farms || [];
          
          setFarms(userFarms);
          
          // Ripristina la farm selezionata da localStorage
          const savedFarmIndex = localStorage.getItem("farmSelezionata");
          
          if (savedFarmIndex && !isNaN(parseInt(savedFarmIndex)) && parseInt(savedFarmIndex) < userFarms.length) {
            setFarmSelezionata(savedFarmIndex);
          } else if (userFarms.length > 0) {
            // Se non c'è una farm salvata valida, seleziona la prima
            setFarmSelezionata("0");
            
            // Salva la preferenza in localStorage
            try {
              localStorage.setItem("farmSelezionata", "0");
            } catch (error) {
              console.error("caricaFarms - Errore nel salvataggio della preferenza:", error);
            }
          } else {
            setFarmSelezionata("");
          }
        } else {
          // Rimosso console.log
          return;
        }
      } else {
        // Rimosso console.log
        return;
      }
    } catch (error) {
      console.error("caricaFarms - Errore nel caricamento delle farms:", error);
      setError("Errore nel caricamento delle farms. Riprova più tardi.");
    }
  };

  // Funzioni per caricare i dati (da implementare)
  const caricaIncarichi = async () => {
    try {
      // Utilizzo la funzione di cache invece di caricare direttamente da Firebase
      const incarichiData = await caricaDatiConCache("incarichi");
      setIncarichi(incarichiData);
    } catch (error) {
      console.error("Errore nel caricamento degli incarichi:", error);
      setError("Errore nel caricamento degli incarichi. Riprova più tardi.");
    }
  };

  const caricaIncarichiCitta = async () => {
    try {
      // Utilizzo la funzione di cache invece di caricare direttamente da Firebase
      const incarichiCittaData = await caricaDatiConCache("incarichi_citta");
      setIncarichiCitta(incarichiCittaData);
    } catch (error) {
      console.error("Errore nel caricamento degli incarichi città:", error);
      setError("Errore nel caricamento degli incarichi città. Riprova più tardi.");
    }
  };

  const caricaCesti = async () => {
    try {
      // Utilizzo la funzione di cache invece di caricare direttamente da Firebase
      const cestiData = await caricaDatiConCache("cesti");
      setCesti(cestiData);
    } catch (error) {
      console.error("Errore nel caricamento dei cesti:", error);
      setError("Errore nel caricamento dei cesti. Riprova più tardi.");
    }
  };

  const caricaEdifici = async () => {
    try {
      // Utilizzo la funzione di cache invece di caricare direttamente da Firebase
      const edificiData = await caricaDatiConCache("edifici");
      setEdifici(edificiData);
    } catch (error) {
      console.error("Errore nel caricamento degli edifici:", error);
      setError("Errore nel caricamento degli edifici. Riprova più tardi.");
    }
  };

  // Funzione per caricare i derby
  const caricaDerby = async () => {
    try {
      // Utilizzo la funzione di cache invece di caricare direttamente da Firebase
      const derbyData = await caricaDatiConCache("derby");
      setDerby(derbyData);
      
      // Se c'è un derby selezionato salvato, trova il derby completo
      if (derbySelezionato && derbySelezionato.id) {
        const derbyCompleto = derbyData.find((d: any) => d.id === derbySelezionato.id);
        if (derbyCompleto) {
          setDerbySelezionato(derbyCompleto);
        } else {
          // Se il derby salvato non esiste più, resetta la selezione
          setDerbySelezionato(null);
          localStorage.removeItem("derbySelezionato");
        }
      }
    } catch (error) {
      console.error("Errore nel caricamento dei derby:", error);
      setError("Errore nel caricamento dei derby. Riprova più tardi.");
    }
  };

  // Funzione per cambiare la tab
  const handleChangeTab = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    
    // Verifica se ci sono modifiche non sincronizzate quando cambia la scheda
    setTimeout(() => {
      verificaModificheNonSincronizzateRef.current(new Map());
    }, 100);
  };

  // Funzione per cambiare la farm selezionata
  const handleChangeFarm = (event: SelectChangeEvent<string>) => {
    const nuovaFarm = event.target.value;
    
    // Se la farm selezionata è la stessa, non fare nulla
    if (nuovaFarm === farmSelezionata) {
      return;
    }
    
    // Prima di cambiare farm, salva i progressi locali correnti
    try {
      salvaProgressiLocali();
    } catch (error) {
      console.error("Errore nel salvataggio dei progressi locali:", error);
    }
    
    // Aggiorna la farm selezionata
    setFarmSelezionata(nuovaFarm);
    
    // Salva la preferenza in localStorage
    try {
      localStorage.setItem("farmSelezionata", nuovaFarm);
    } catch (error) {
      console.error("Errore nel salvataggio della preferenza:", error);
    }
    
    // Resetta lo stato delle assegnazioni e dei progressi del server
    // ma NON i progressi locali che verranno caricati dal localStorage
    setAssegnazioni([]);
    setProgressi(new Map());
    setProgressiDocs(new Map());
    setDataLoaded(false);
    
    // Carica i progressi locali per la nuova farm
    // Importante: carica i progressi locali PRIMA di caricare le assegnazioni
    
    // Carica i progressi locali con una chiave che include l'ID della farm
    const chiaveStorage = `progressiLocali_${nuovaFarm}`;
        const progressiSalvati = localStorage.getItem(chiaveStorage);

        if (progressiSalvati) {
      try {
        const progressiObj = JSON.parse(progressiSalvati);
        
        // Converti l'oggetto in una Map
        const nuoviProgressiLocali = new Map<string, number>();
        Object.entries(progressiObj).forEach(([key, value]) => {
          nuoviProgressiLocali.set(key, value as number);
        });
        
        // Imposta i progressi locali direttamente qui
        setProgressiLocali(nuoviProgressiLocali);
        
        // Carica anche l'elenco degli incarichi modificati
        const chiaveModificati = `progressiModificati_${nuovaFarm}`;
        const modificatiSalvati = localStorage.getItem(chiaveModificati);
        
        if (modificatiSalvati) {
          const modificatiArray = JSON.parse(modificatiSalvati) as string[];
          setProgressiModificati(new Set(modificatiArray));
          
          // Se ci sono incarichi modificati, imposta modificheNonSincronizzate a true
          if (modificatiArray.length > 0) {
            setModificheNonSincronizzate(true);
          }
        }
      } catch (error) {
        console.error("handleChangeFarm - Errore nel caricamento dei progressi locali:", error);
      }
    } else {
      setProgressiLocali(new Map());
      setProgressiModificati(new Set());
      setModificheNonSincronizzate(false);
    }
    
    // Forza il ricaricamento delle assegnazioni
    setTimeout(() => {
      caricaAssegnazioniRef.current();
    }, 100);
  };

  // Funzione per cambiare il derby selezionato
  const handleChangeDerby = (event: SelectChangeEvent<string>) => {
    const derbyId = event.target.value;
    const selectedDerby = derby.find(d => d.id === derbyId) || null;
    setDerbySelezionato(selectedDerby);
    // Chiudi il selettore derby dopo la selezione
    setDerbySelectExpanded(false);
  };

  // Funzione per cambiare il giocatore selezionato (solo per admin e coordinatori)
  const handleChangeGiocatore = (event: SelectChangeEvent<string>) => {
    const nuovoGiocatore = event.target.value;
    setGiocatoreSelezionato(nuovoGiocatore);
    
    // Salva la preferenza in localStorage
    try {
      localStorage.setItem("miei-incarichi-giocatore", nuovoGiocatore);
    } catch (error) {
      console.error("Errore nel salvataggio della preferenza:", error);
    }
    
    // Trova il giocatore selezionato e carica le sue farm
    const giocatoreSelezionato = giocatori.find(g => g.id === nuovoGiocatore);
    if (giocatoreSelezionato && giocatoreSelezionato.farms && giocatoreSelezionato.farms.length > 0) {
      setFarms(giocatoreSelezionato.farms);
      
      // Seleziona la prima farm del nuovo giocatore
      setFarmSelezionata("0");
      
      // Salva la preferenza in localStorage
      try {
        localStorage.setItem("farmSelezionata", "0");
      } catch (error) {
        console.error("Errore nel salvataggio della preferenza:", error);
      }
    } else {

      setFarms([]);
      setFarmSelezionata("");
    }
    
    // Resetta lo stato delle assegnazioni e dei progressi
    setAssegnazioni([]);
    setProgressi(new Map());
    setProgressiDocs(new Map());
    setDataLoaded(false);
    
    // Forza il ricaricamento delle assegnazioni dopo che le farm sono state aggiornate
    setTimeout(() => {
      caricaAssegnazioniRef.current();
    }, 100);
  };

  // Funzione per cambiare la modalità di visualizzazione
  const handleToggleVisualizzazione = () => {
    const newValue = !visualizzazioneGlobale;
    setVisualizzazioneGlobale(newValue);
    
    // Salva la preferenza in localStorage
    try {
      localStorage.setItem("visualizzazioneGlobale", String(newValue));
    } catch (error) {
      console.error("Errore nel salvataggio della preferenza:", error);
    }
  };
  
  // Funzione per cambiare l'ordinamento
  const handleChangeOrdinamento = (tipo: 'livello' | 'alfabetico' | 'completamento') => {
    if (tipo === 'livello') {
      if (ordinamentoLivello) {
        // Se già ordinato per livello, inverti l'ordine
        setOrdinamentoInverso(!ordinamentoInverso);
      } else {
        // Altrimenti, attiva l'ordinamento per livello
        setOrdinamentoLivello(true);
        setOrdinamentoAlfabetico(false);
        setOrdinamentoCompletamento(false);
      }
    } else if (tipo === 'alfabetico') {
      if (ordinamentoAlfabetico) {
        // Se già ordinato alfabeticamente, inverti l'ordine
        setOrdinamentoInverso(!ordinamentoInverso);
      } else {
        // Altrimenti, attiva l'ordinamento alfabetico
        setOrdinamentoAlfabetico(true);
        setOrdinamentoLivello(false);
        setOrdinamentoCompletamento(false);
      }
    } else if (tipo === 'completamento') {
      if (ordinamentoCompletamento) {
        // Se già ordinato per completamento, inverti l'ordine
        setOrdinamentoInverso(!ordinamentoInverso);
      } else {
        // Altrimenti, attiva l'ordinamento per completamento
        setOrdinamentoCompletamento(true);
        setOrdinamentoLivello(false);
        setOrdinamentoAlfabetico(false);
      }
    }
  };

  // Funzione per espandere/comprimere un edificio
  const handleEdificioToggle = (edificioId: string | null) => {
    if (!edificioId) return;
    
    setExpandedEdifici((prev) => {
      if (prev.includes(edificioId)) {
        return prev.filter((id) => id !== edificioId);
      } else {
        return [...prev, edificioId];
      }
    });
  };

  // Funzione per mostrare solo gli incarichi assegnati o tutti
  const handleToggleMostraSoloAssegnati = () => {
    const newValue = !mostraSoloAssegnati;
    setMostraSoloAssegnati(newValue);
    
    // Salva la preferenza in localStorage
    try {
      localStorage.setItem("miei-incarichi-mostra-assegnati", JSON.stringify(newValue));
    } catch (error) {
      console.error("Errore nel salvataggio della preferenza:", error);
    }
  };

  // Funzione per mostrare solo gli incarichi assegnati
  const handleShowOnlyAssigned = () => {
    setMostraSoloAssegnati(true);
    
    // Salva la preferenza in localStorage
    try {
      localStorage.setItem("miei-incarichi-mostra-assegnati", JSON.stringify(true));
    } catch (error) {
      console.error("Errore nel salvataggio della preferenza:", error);
    }
  };
  
  // Funzione per mostrare tutti gli incarichi
  const handleShowAllTasks = () => {
    setMostraSoloAssegnati(false);
    
    // Salva la preferenza in localStorage
    try {
      localStorage.setItem("miei-incarichi-mostra-assegnati", JSON.stringify(false));
    } catch (error) {
      console.error("Errore nel salvataggio della preferenza:", error);
    }
  };

  // Funzione per la ricerca
  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  // Funzione per espandere/comprimere la barra di ricerca
  const toggleSearchBar = () => {
    setSearchExpanded(!searchExpanded);
    // Rimuovo il riferimento a derbySelectExpanded poiché non è più necessario
  };

  // Funzione per la stampa (solo per admin e coordinatori)
  const handleStampa = () => {
    // Implementare
  };

  // Funzione per tradurre i nomi degli incarichi
  const getTranslatedName = (nome: string) => {
    // Verifica se esiste una traduzione per questo incarico
    const traduzione = t(`incarichi.${nome}`, {
      defaultValue: nome,
      ns: "common"
    });
    return traduzione;
  };

  // Funzione per ottenere la quantità di un incarico in base al derby selezionato
  const getQuantitaIncarico = (incarico: Incarico | IncaricoCitta): number => {
    if (!incarico) return 0;
    
    // Se c'è un derby selezionato e l'incarico ha una quantità specifica per quel derby, usala
    if (derbySelezionato && incarico.quantita_derby && incarico.quantita_derby[derbySelezionato.id]) {
      return incarico.quantita_derby[derbySelezionato.id];
    }
    
    // Altrimenti usa la quantità di default
    return incarico.quantita || 0;
  };

  // Modifica della funzione handleUpdateQuantita per tenere traccia delle modifiche
  const handleUpdateQuantita = async (incaricoId: string, quantita: number) => {
    try {
      // Trova l'incarico corrispondente
      const incarico = incarichi.find(i => i.id === incaricoId) || 
                       incarichiCitta.find(i => i.id === incaricoId);
      if (!incarico) return;
      
      // Determina il farm_id da utilizzare
      let farmId = "";
      
      if (farmSelezionata && farms && farms.length > parseInt(farmSelezionata)) {
        const farmIndex = parseInt(farmSelezionata);
        const farm = farms[farmIndex];
        
        if (farm && farm.id) {
          farmId = farm.id;
        } else if (currentUser) {
          farmId = `${currentUser.id || ''}_${farmIndex}`;
        }
      } else if (currentUser) {
        farmId = `${currentUser.id || ''}_0`;
      }
      
      if (!farmId) {
        farmId = "default_farm";
        console.warn("Non è stato possibile determinare un farm_id valido, uso un valore di fallback");
      }
      
      // Crea una chiave composta da incaricoId e farmId
      const chiaveComposta = `${incaricoId}_${farmId}`;
      

      
      // Verifica se il valore è effettivamente cambiato rispetto al server
      const progressoServer = progressi.get(incaricoId) || 0;
      const progressoModificato = quantita !== progressoServer;
      

      
      // Aggiorna il progresso locale
      setProgressiLocali(prev => {
        const nuoviProgressiLocali = new Map(prev);
        nuoviProgressiLocali.set(chiaveComposta, quantita);
        
        // Stampa tutti i progressi locali dopo l'aggiornamento

        nuoviProgressiLocali.forEach((val, key) => {

        });
        
        return nuoviProgressiLocali;
      });
      
      // Aggiorna l'elenco dei progressi modificati
      if (progressoModificato) {
        setProgressiModificati(prev => {
          const nuoviProgressiModificati = new Set(prev);
          nuoviProgressiModificati.add(chiaveComposta);
          
          // Stampa tutti gli incarichi modificati dopo l'aggiornamento

          nuoviProgressiModificati.forEach(id => {

          });
          
          return nuoviProgressiModificati;
        });
      }
      
      // Imposta che ci sono modifiche non sincronizzate
      setModificheNonSincronizzate(true);
      
      // Salva immediatamente i progressi locali
      setTimeout(() => {
        salvaProgressiLocali();
      }, 0);
    } catch (error) {
      console.error("Errore nell'aggiornamento della quantità locale:", error);
      setError("Errore nell'aggiornamento della quantità. Riprova più tardi.");
    }
  };

  // Modifica della funzione handleToggleCompletamento per tenere traccia delle modifiche
  const handleToggleCompletamento = async (incaricoId: string, completato: boolean) => {
    try {
      // Trova l'incarico corrispondente
      const incarico = incarichi.find(i => i.id === incaricoId) || 
                       incarichiCitta.find(i => i.id === incaricoId);
      if (!incarico) return;
      
      // Determina il farm_id da utilizzare
      let farmId = "";
      
      if (farmSelezionata && farms && farms.length > parseInt(farmSelezionata)) {
        const farmIndex = parseInt(farmSelezionata);
        const farm = farms[farmIndex];
        
        if (farm && farm.id) {
          farmId = farm.id;
        } else if (currentUser) {
          farmId = `${currentUser.id || ''}_${farmIndex}`;
        }
      } else if (currentUser) {
        farmId = `${currentUser.id || ''}_0`;
      }
      
      if (!farmId) {
        farmId = "default_farm";
        console.warn("Non è stato possibile determinare un farm_id valido, uso un valore di fallback");
      }
      
      // Crea una chiave composta da incaricoId e farmId
      const chiaveComposta = `${incaricoId}_${farmId}`;
      
      // Ottieni la quantità richiesta per l'incarico
      const quantitaRichiesta = getQuantitaIncarico(incarico);
      
      // Ottieni il progresso attuale
      const progressoAttuale = getProgressoCorrente(incaricoId);
      
      // Dichiaro la variabile nuovaQuantita
      let nuovaQuantita = 0;
      
      // Se il progresso è inferiore alla quantità richiesta, lo portiamo alla quantità richiesta
      if (progressoAttuale < quantitaRichiesta) {

        nuovaQuantita = quantitaRichiesta;
      } else {
        // Se il progresso è uguale o maggiore alla quantità richiesta, lo portiamo a zero

        nuovaQuantita = 0;
      }
      

      
      // Verifica se il valore è effettivamente cambiato rispetto al server
      const progressoServer = progressi.get(incaricoId) || 0;
      const progressoModificato = nuovaQuantita !== progressoServer;
      

      
      // Aggiorna il progresso locale
      setProgressiLocali(prev => {
        const nuoviProgressiLocali = new Map(prev);
        nuoviProgressiLocali.set(chiaveComposta, nuovaQuantita);
        return nuoviProgressiLocali;
      });
      
      // Aggiorna l'elenco dei progressi modificati
      if (progressoModificato) {
        setProgressiModificati(prev => {
          const nuoviProgressiModificati = new Set(prev);
          nuoviProgressiModificati.add(chiaveComposta);
          return nuoviProgressiModificati;
        });
      }
      
      // Imposta che ci sono modifiche non sincronizzate
      setModificheNonSincronizzate(true);
      
      // Salva immediatamente i progressi locali
      setTimeout(() => {
        salvaProgressiLocali();
      }, 0);
    } catch (error) {
      console.error("Errore nel toggle del completamento locale:", error);
      setError("Errore nel completamento dell'incarico. Riprova più tardi.");
    }
  };

  // Funzione per navigare a un incarico specifico
  const handleNavigateToIncarico = (incaricoId: string) => {
    // Rimosso console.log
    
    // Cambia alla tab degli incarichi
    setTabValue(0);
    
    // Evidenzia l'incarico
    setElementoEvidenziato({
      tipo: 'incarico',
      id: incaricoId
    });
    
    // Scorri alla posizione dell'incarico dopo un breve ritardo
    setTimeout(() => {
      const incaricoElement = document.getElementById(`incarico-${incaricoId}`);
      if (incaricoElement) {
        incaricoElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        console.error("Elemento incarico non trovato:", incaricoId);
      }
    }, 100);
  };
  
  // Funzione per navigare a un incarico città specifico
  const handleNavigateToIncaricoCitta = (incaricoId: string) => {
    // Rimosso console.log
    
    // Cambia alla tab degli incarichi città
    setTabValue(1);
    
    // Evidenzia l'incarico città
    setElementoEvidenziato({
      tipo: 'incaricoCitta',
      id: incaricoId
    });
  };
  
  // Funzione per navigare a un cesto specifico
  const handleNavigateToCesto = (cestoId: string) => {
    // Rimosso console.log
    
    // Cambia alla tab dei cesti
    setTabValue(2);
    
    // Evidenzia il cesto
    setElementoEvidenziato({
      tipo: 'cesto',
      id: cestoId
    });
    
    // Scorri alla posizione del cesto dopo un breve ritardo
    setTimeout(() => {
      const cestoElement = document.getElementById(`cesto-${cestoId}`);
      if (cestoElement) {
        cestoElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        console.error("Elemento cesto non trovato:", cestoId);
      }
    }, 100);
  };
  
  // Funzione per trovare il cesto che contiene un incarico
  const trovaCestoPerIncarico = (incaricoId: string): Cesto | undefined => {
    return cesti.find(cesto => 
      cesto.incarichi.some(inc => inc.incarico_id === incaricoId)
    );
  };
  
  // Funzione per ottenere la quantità di un incarico in un cesto specifico
  const getQuantitaIncaricoCesto = (cestoId: string, incaricoId: string): number => {
    // Trova il cesto
    const cesto = cesti.find(c => c.id === cestoId);
    if (!cesto) return 0;
    
    // Trova l'incarico nel cesto
    const incaricoInCesto = cesto.incarichi.find(i => i.incarico_id === incaricoId);
    if (!incaricoInCesto) return 0;
    
    // Se non c'è un derby selezionato o l'incarico non ha quantità specifiche per derby
    if (!derbySelezionato || !incaricoInCesto.quantita_derby) {
      return incaricoInCesto.quantita;
    }
    
    // Se c'è una quantità specifica per questo derby, usala
    const quantitaDerby = incaricoInCesto.quantita_derby[derbySelezionato.id];
    if (typeof quantitaDerby === "undefined" || quantitaDerby === null) {
      return incaricoInCesto.quantita;
    }
    
    return quantitaDerby;
  };

  // Aggiungiamo una funzione per ottenere il progresso corrente (locale o remoto)
  const getProgressoCorrente = (incaricoId: string): number => {
    // Determina il farm_id da utilizzare
    let farmId = "";
    
    if (farmSelezionata && farms && farms.length > parseInt(farmSelezionata)) {
      const farmIndex = parseInt(farmSelezionata);
      const farm = farms[farmIndex];
      
      if (farm && farm.id) {
        farmId = farm.id;
      } else if (currentUser) {
        farmId = `${currentUser.id || ''}_${farmIndex}`;
      }
    } else if (currentUser) {
      farmId = `${currentUser.id || ''}_0`;
    }
    
    if (!farmId) {
      farmId = "default_farm";
    }
    
    // Crea la chiave composta
    const chiaveComposta = `${incaricoId}_${farmId}`;
    
    // Se esiste un progresso locale, usa quello
    if (progressiLocali.has(chiaveComposta)) {
      const valore = progressiLocali.get(chiaveComposta) || 0;
      return valore;
    }
    
    // Altrimenti usa il progresso remoto
    const valoreRemoto = progressi.get(incaricoId) || 0;
    return valoreRemoto;
  };

  // Funzione per ottenere il progresso corrente di un incarico in un cesto
  const getProgressoCorrentePerCesto = (cestoId: string, incaricoId: string): number => {
    // Usa la stessa logica di getProgressoCorrente
    return getProgressoCorrente(incaricoId);
  };

  // Calcolo delle statistiche per il progresso
  const statistiche = useMemo(() => {
    // Filtra le assegnazioni per escludere i cesti
    const assegnazioniSenzaCesti = assegnazioni.filter(a => a.tipo !== 'cesto');
    
    const totaleIncarichi = assegnazioniSenzaCesti.length;
    
    // Conta gli incarichi completati (sia quelli marcati come completati che quelli con progresso sufficiente)
    const incarichiCompletati = assegnazioniSenzaCesti.filter(a => {
      if (a.completato) return true;
      
      // Trova l'incarico corrispondente
      const incarico = incarichi.find(i => i.id === a.riferimento_id) || 
                       incarichiCitta.find(i => i.id === a.riferimento_id);
      if (!incarico) return false;
      
      // Ottieni la quantità richiesta e il progresso attuale
      const quantitaRichiesta = getQuantitaIncarico(incarico);
      const progresso = getProgressoCorrente(a.riferimento_id);
      
      // Considera completato se il progresso è sufficiente
      return progresso >= quantitaRichiesta;
    }).length;
    
    // Conta gli incarichi in progresso (non completati ma con progresso > 0)
    const incarichiInProgresso = assegnazioniSenzaCesti.filter(a => {
      if (a.completato) return false; // Già contato come completato
      
      const progresso = getProgressoCorrente(a.riferimento_id);
      
      // Trova l'incarico corrispondente
      const incarico = incarichi.find(i => i.id === a.riferimento_id) || 
                       incarichiCitta.find(i => i.id === a.riferimento_id);
      if (!incarico) return false;
      
      // Ottieni la quantità richiesta
      const quantitaRichiesta = getQuantitaIncarico(incarico);
      
      // In progresso se ha un valore > 0 ma non ha raggiunto la quantità richiesta
      return progresso > 0 && progresso < quantitaRichiesta;
    }).length;
    
    return {
      totaleIncarichi,
      incarichiCompletati,
      incarichiInProgresso,
      incarichiAssegnati: totaleIncarichi
    };
  }, [assegnazioni, progressi, progressiLocali, farmSelezionata, farms, currentUser, incarichi, incarichiCitta, getQuantitaIncarico]);

  // Funzione per aggiornare il completamento di un incarico in un cesto
  const handleToggleCompletamentoInCesto = async (cestoId: string, incaricoId: string) => {
    try {
      // Verifica che ci sia una farm selezionata
      if (!farmSelezionata || farmSelezionata === "") {
        console.error("Nessuna farm selezionata");
        setError("Seleziona una farm prima di completare un incarico.");
        return;
      }
      
      // Ottieni l'ID della farm corrente
      const farmIndex = parseInt(farmSelezionata);
      if (isNaN(farmIndex) || farmIndex < 0 || farmIndex >= farms.length) {
        console.error("Indice farm non valido:", farmSelezionata);
        setError("Farm non valida. Riprova più tardi.");
        return;
      }
      
      const farmId = farms[farmIndex].id;
      // Crea una chiave composita per il progresso locale
      const chiaveComposta = `${incaricoId}_${farmId}`;
      
      // Trova il cesto
      const cesto = cesti.find(c => c.id === cestoId);
      if (!cesto) {
        console.error("Cesto non trovato:", cestoId);
        setError("Cesto non trovato. Riprova più tardi.");
        return;
      }
      
      // Trova l'incarico nel cesto
      const incarico = cesto.incarichi.find(i => i.incarico_id === incaricoId);
      if (!incarico) {
        console.error("Incarico non trovato nel cesto:", incaricoId);
        setError("Incarico non trovato nel cesto. Riprova più tardi.");
        return;
      }
      
      // Ottieni la quantità richiesta per l'incarico nel cesto
      const quantitaRichiesta = getQuantitaIncaricoCesto(cestoId, incaricoId);
      
      // Trova l'assegnazione corrispondente all'incarico
      const assegnazione = assegnazioni.find(a => a.riferimento_id === incaricoId && a.farm_id === farmId);
      if (!assegnazione) {
        console.error("Assegnazione non trovata per l'incarico:", incaricoId);
        setError("Assegnazione non trovata. Riprova più tardi.");
        return;
      }
      
      const assegnazioneRef = doc(db, "assegnazioni", assegnazione.id);
      
      // Ottieni il progresso attuale
      const progressoAttuale = progressi.get(chiaveComposta) || 0;
      
      // Determina se l'incarico è completato in base alla quantità richiesta
      const incaricoCompletato = progressoAttuale >= quantitaRichiesta;
      
      // Se l'incarico non è completato, imposta il progresso alla quantità richiesta
      if (!incaricoCompletato) {
        const nuovoProgresso = quantitaRichiesta;
        
        const incaricoCompletato = nuovoProgresso >= quantitaRichiesta;
        
        await updateDocWithRateLimit(assegnazioneRef, {
          completato: incaricoCompletato,
          quantita: nuovoProgresso
        });
        
        // Aggiorna lo stato locale
        setAssegnazioni(prev => 
          prev.map(a => 
            a.id === assegnazione.id 
              ? { ...a, completato: incaricoCompletato, quantita: nuovoProgresso } 
              : a
          )
        );
        
        // Aggiorna il progresso locale usando la chiave composita
        setProgressi(prev => {
          const nuoviProgressi = new Map(prev);
          nuoviProgressi.set(chiaveComposta, nuovoProgresso);
          return nuoviProgressi;
        });
        
        // Aggiorna anche il documento di progresso
        const progressoDocId = progressiDocs.get(incaricoId);
        if (progressoDocId) {
          const progressoRef = doc(db, "progressi", progressoDocId);
          await updateDocWithRateLimit(progressoRef, {
            percentuale: nuovoProgresso
          });
        } else if (nuovoProgresso > 0) {
          // Se non esiste un documento di progresso ma c'è un valore, crealo
          const progressiRef = collection(db, "progressi");
          
          // Troviamo l'assegnazione per questo incarico
          const assegnazioneIncarico = assegnazioni.find(a => a.riferimento_id === incaricoId && a.farm_id === farmId);
          
          // Creiamo il documento con il farm_id corretto
          const nuovoProgressoDoc = await addDocWithRateLimit(progressiRef, {
            assegnazione_id: assegnazioneIncarico ? assegnazioneIncarico.id : "",
            farm_id: farmId,
            incarico_id: incaricoId, // Aggiungiamo l'ID dell'incarico
            percentuale: nuovoProgresso,
            timestamp: serverTimestamp()
          });
          
          // Aggiorna la mappa dei documenti di progresso
          setProgressiDocs(prev => {
            const nuoviProgressiDocs = new Map(prev);
            nuoviProgressiDocs.set(incaricoId, nuovoProgressoDoc.id);
            return nuoviProgressiDocs;
          });
        }
      } else {
        // Se stiamo deselezionando l'incarico, mantieni il progresso attuale ma rimuovi il flag completato
        await updateDocWithRateLimit(assegnazioneRef, {
          completato: false
        });
        
        // Aggiorna lo stato locale
        setAssegnazioni(prev => 
          prev.map(a => 
            a.id === assegnazione.id 
              ? { ...a, completato: false } 
              : a
          )
        );
        
        // Non modifichiamo il progresso, lo manteniamo al valore attuale
      }
      
      // Aggiorna lo stato di completamento del cesto
      const assegnazioneCesto = assegnazioni.find(a => a.tipo === 'cesto' && a.riferimento_id === cestoId && a.farm_id === farmId);
      if (assegnazioneCesto) {
        // Verifica se tutti gli incarichi nel cesto hanno un progresso >= alla quantità richiesta nel cesto
        const tuttiCompletatiNelCesto = cesto.incarichi.every(incaricoInCesto => {
          const chiaveCompositaInCesto = `${incaricoInCesto.incarico_id}_${farmId}`;
          const progressoIncarico = progressi.get(chiaveCompositaInCesto) || 0;
          const quantitaRichiestaNelCesto = getQuantitaIncaricoCesto(cestoId, incaricoInCesto.incarico_id);
          return progressoIncarico >= quantitaRichiestaNelCesto;
        });
        
        // Aggiorna lo stato di completamento del cesto
        const cestoRef = doc(db, "assegnazioni", assegnazioneCesto.id);
        await updateDocWithRateLimit(cestoRef, {
          completato: tuttiCompletatiNelCesto
        });
        
        // Aggiorna lo stato locale
        setAssegnazioni(prev => 
          prev.map(a => 
            a.id === assegnazioneCesto.id 
              ? { ...a, completato: tuttiCompletatiNelCesto } 
              : a
          )
        );
      }
    } catch (error) {
      console.error("Errore nell'aggiornamento del completamento in cesto:", error);
      setError("Errore nell'aggiornamento del completamento. Riprova più tardi.");
    }
  };

  // Funzione per aggiornare il completamento di un cesto
  const handleToggleCestoCompletamento = async (cestoId: string, completato: boolean) => {
    try {
      // Verifica che ci sia una farm selezionata
      if (!farmSelezionata || farmSelezionata === "") {
        console.error("Nessuna farm selezionata");
        setError("Seleziona una farm prima di completare un cesto.");
        return;
      }
      
      // Ottieni l'ID della farm corrente
      const farmIndex = parseInt(farmSelezionata);
      if (isNaN(farmIndex) || farmIndex < 0 || farmIndex >= farms.length) {
        console.error("Indice farm non valido:", farmSelezionata);
        setError("Farm non valida. Riprova più tardi.");
        return;
      }
      
      const currentFarm = farms[farmIndex];
      const currentFarmId = currentFarm.id;
      
      // Trova il cesto
      const cesto = cesti.find(c => c.id === cestoId);
      if (!cesto) {
        console.error("Cesto non trovato:", cestoId);
        setError("Cesto non trovato. Riprova più tardi.");
        return;
      }
      
      // Trova l'assegnazione del cesto
      const assegnazioneCesto = assegnazioni.find(a => a.tipo === 'cesto' && a.riferimento_id === cestoId && a.farm_id === currentFarmId);
      
      // Verifica se tutti gli incarichi nel cesto hanno un progresso >= alla quantità richiesta nel cesto
      const tuttiCompletatiNelCesto = cesto.incarichi.every(incaricoInCesto => {
        const progressoIncarico = progressi.get(incaricoInCesto.incarico_id) || 0;
        const quantitaRichiestaNelCesto = getQuantitaIncaricoCesto(cestoId, incaricoInCesto.incarico_id);
        return progressoIncarico >= quantitaRichiestaNelCesto;
      });
      
      // Se esiste un'assegnazione per il cesto, aggiorniamo il suo stato
      if (assegnazioneCesto) {
        // Aggiorna lo stato di completamento del cesto nel database
        const cestoRef = doc(db, "assegnazioni", assegnazioneCesto.id);
        await updateDocWithRateLimit(cestoRef, {
          completato: tuttiCompletatiNelCesto
        });
        
        // Aggiorna lo stato locale
        setAssegnazioni(prev => 
          prev.map(a => 
            a.id === assegnazioneCesto.id 
              ? { ...a, completato: tuttiCompletatiNelCesto } 
              : a
          )
        );
      } else {

      }
    } catch (error) {
      console.error("Errore nell'aggiornamento del completamento del cesto:", error);
      setError("Errore nell'aggiornamento del completamento. Riprova più tardi.");
    }
  };

  // Funzione per gestire la fine dell'evidenziazione
  const handleEvidenziazioneFine = () => {
    setElementoEvidenziato(null);
  };

  // Funzione per aggiornare lo stato di espansione di un incarico
  const handleIncaricoExpand = (incaricoId: string, isExpanded: boolean) => {
    if (isExpanded) {
      setExpandedIncarichi(prev => [...prev, incaricoId]);
    } else {
      setExpandedIncarichi(prev => prev.filter(id => id !== incaricoId));
    }
  };

  // Riorganizzazione delle funzioni per evitare riferimenti circolari

  // Dichiarazione di verificaModificheNonSincronizzate con useRef per evitare dipendenze circolari
  const verificaModificheNonSincronizzate = useCallback((progressiLocaliAttuali: Map<string, number>) => {
    // Verifica se ci sono modifiche non sincronizzate nello stato
    let modifiche = progressiModificati.size > 0;
    
    // Se non ci sono modifiche nello stato, controlla direttamente in localStorage
    if (!modifiche && farmSelezionata) {
      // Controlla specificamente per la farm corrente
      const chiaveModificati = `progressiModificati_${farmSelezionata}`;
      const modificatiSalvati = localStorage.getItem(chiaveModificati);
      
      if (modificatiSalvati) {
        const modificatiArray = JSON.parse(modificatiSalvati) as string[];
        modifiche = modificatiArray.length > 0;
      }
      
      // Se ancora non ci sono modifiche, controlla tutte le farm
      if (!modifiche) {
        // Cerca tutte le chiavi in localStorage che iniziano con "progressiModificati_"
        for (let i = 0; i < localStorage.length; i++) {
          const chiave = localStorage.key(i);
          if (chiave && chiave.startsWith("progressiModificati_")) {
            const modificatiSalvati = localStorage.getItem(chiave);
            if (modificatiSalvati) {
              const modificatiArray = JSON.parse(modificatiSalvati) as string[];
              if (modificatiArray.length > 0) {
                modifiche = true;
                break;
              }
            }
          }
        }
      }
    }
    
    setModificheNonSincronizzate(modifiche);
    // Rimosso console.log
  }, [progressiModificati, farmSelezionata]);

  // Aggiorna il riferimento quando la funzione cambia
  useEffect(() => {
    verificaModificheNonSincronizzateRef.current = verificaModificheNonSincronizzate;
  }, [verificaModificheNonSincronizzate]);

  // Funzione per salvare i progressi locali in localStorage
  const salvaProgressiLocali = useCallback(() => {
    try {
      // Converti la Map in un oggetto per salvarlo in localStorage
      const progressiObj: Record<string, number> = {};
      progressiLocali.forEach((value, key) => {
        progressiObj[key] = value;
      });
      
      // Salva i progressi locali con una chiave che include l'ID della farm
      const chiaveStorage = `progressiLocali_${farmSelezionata}`;
      localStorage.setItem(chiaveStorage, JSON.stringify(progressiObj));
      
      // Salva anche l'elenco degli incarichi modificati
      const chiaveModificati = `progressiModificati_${farmSelezionata}`;
      const progressiModificatiArray = Array.from(progressiModificati);
      localStorage.setItem(chiaveModificati, JSON.stringify(progressiModificatiArray));
      
      // Aggiorniamo anche verificaModificheNonSincronizzate per riflettere lo stato corrente
      verificaModificheNonSincronizzateRef.current(progressiLocali);
    } catch (error) {
      console.error("Errore nel salvataggio dei progressi locali:", error);
    }
  }, [progressiLocali, progressiModificati, farmSelezionata]);

  // Effetto per salvare i progressi locali quando cambiano
  useEffect(() => {
    if (progressiLocali.size > 0 || progressiModificati.size > 0) {
      salvaProgressiLocali();
    }
  }, [progressiLocali, progressiModificati, salvaProgressiLocali]);

  // Effetto per caricare i progressi locali quando cambia la farm selezionata
  useEffect(() => {
    if (farmSelezionata) {
      // Carico i progressi locali per questa farm specifica
      if (caricaProgressiLocaliRef.current) {
        caricaProgressiLocaliRef.current();
      }
    }
  }, [farmSelezionata]);

  // Nuovo effetto per caricare i progressi locali all'avvio dell'applicazione
  useEffect(() => {
    // Registriamo il riferimento a caricaProgressiLocali prima di usarlo
    caricaProgressiLocaliRef.current = caricaProgressiLocali;
    
    // Assicuriamoci che il caricamento venga eseguito all'avvio
    if (farmSelezionata) {
      caricaProgressiLocaliRef.current();
    }
    
    // Verifica se ci sono modifiche non sincronizzate all'avvio
    setTimeout(() => {
      verificaModificheNonSincronizzateRef.current(new Map());
    }, 500);
  }, []); // Esegui solo all'avvio

  // Modifica della funzione caricaProgressi per utilizzare i progressi locali
  caricaProgressiRef.current = async (assegnazioniData: AssegnazioneEstesa[]) => {
    try {
      // Determina il farm_id da utilizzare
      let farmId = "";
      
      if (farmSelezionata && farms && farms.length > parseInt(farmSelezionata)) {
        const farmIndex = parseInt(farmSelezionata);
        const farm = farms[farmIndex];
        
        if (farm && farm.id) {
          farmId = farm.id;
        } else if (currentUser) {
          farmId = `${currentUser.id || ''}_${farmIndex}`;
        }
      } else if (currentUser) {
        farmId = `${currentUser.id || ''}_0`;
      }
      
      if (!farmId) {
        farmId = "default_farm";
        console.warn("Non è stato possibile determinare un farm_id valido, uso un valore di fallback");
      }
      
      // Interroga Firebase per tutti i progressi relativi a questa farm
      const progressiRef = collection(db, "progressi");
      const q = query(progressiRef, where("farm_id", "==", farmId));
      const querySnapshot = await getDocsWithRateLimit(q);
      
      // Se non ci sono risultati, usa i progressi locali esistenti
      if (querySnapshot.empty) {
        // Nessun progresso trovato sul server, carico i progressi locali esistenti
        return;
      }
      
      // Crea un nuovo oggetto Map per i progressi
      const nuoviProgressi = new Map<string, number>();
      
      // Per ogni progresso, salva l'incarico_id e la percentuale
      querySnapshot.forEach(doc => {
        const dati = doc.data();
        const incaricoId = dati.incarico_id;
        const percentuale = dati.percentuale || 0;
        
        nuoviProgressi.set(incaricoId, percentuale);
      });
      
      // Aggiorna lo stato
      setProgressi(nuoviProgressi);
      
      return nuoviProgressi;
    } catch (error) {
      console.error("Errore nel caricamento dei progressi:", error);
      setError("Errore nel caricamento dei progressi. Riprova più tardi.");
    }
  };

  // Aggiungo la funzione sincronizzaProgressi che manca
  const sincronizzaProgressi = async () => {
    try {
      // Rimosso console.log
      setSincronizzazioneInCorso(true);
      
      // Determina il farm_id da utilizzare
      let farmId = "";
      
      if (farmSelezionata && farms && farms.length > parseInt(farmSelezionata)) {
        const farmIndex = parseInt(farmSelezionata);
        const farm = farms[farmIndex];
        
        if (farm && farm.id) {
          farmId = farm.id;
        } else if (currentUser) {
          farmId = `${currentUser.id || ''}_${farmIndex}`;
        }
      } else if (currentUser) {
        farmId = `${currentUser.id || ''}_0`;
      }
      
      if (!farmId) {
        farmId = "default_farm";
        console.warn("Non è stato possibile determinare un farm_id valido, uso un valore di fallback");
      }
      
      // Crea un array di promesse per aggiornare solo i progressi modificati
      const promesse: Promise<void>[] = [];
      
      // Ottieni l'array degli ID degli incarichi modificati
      const incarichiModificati = Array.from(progressiModificati);
      // Rimosso console.log
      
      // Per ogni incarico modificato
      for (const chiaveComposta of incarichiModificati) {
        // Estrai l'ID dell'incarico dalla chiave composta
        const incaricoId = chiaveComposta.split('_')[0];
        
        // Ottieni il valore locale
        const quantita = progressiLocali.get(chiaveComposta) || 0;
        
        // Trova l'assegnazione corrispondente
        const assegnazione = assegnazioni.find(a => a.riferimento_id === incaricoId && a.farm_id === farmId);
        
        // Crea una promessa per aggiornare il progresso
        const aggiornaProgresso = async () => {
          const progressiRef = collection(db, "progressi");
          
          // Crea una chiave univoca per questo progresso
          // Formato: incarico_id + "_" + farm_id
          const chiaveUnica = `${incaricoId}_${farmId}`;
          
          // Cerca se esiste già un documento con questa chiave
          const qPerChiave = query(
            progressiRef,
            where("incarico_id", "==", incaricoId),
            where("farm_id", "==", farmId)
          );
          
          const querySnapshot = await getDocsWithRateLimit(qPerChiave);
          
          if (querySnapshot.size > 0) {
            // Se esistono documenti, trova quello più recente
            let docPiuRecenteId = '';
            let timestampPiuRecente = 0;
            
            for (const documento of querySnapshot.docs) {
              const data = documento.data();
              const timestamp = data.timestamp?.seconds || 0;
              
              if (timestamp > timestampPiuRecente) {
                timestampPiuRecente = timestamp;
                docPiuRecenteId = documento.id;
              }
            }
            
            if (docPiuRecenteId !== '') {
              // Aggiorna il documento esistente

              const progressoDocRef = doc(db, "progressi", docPiuRecenteId);
              
              // Se la quantità è zero, aggiungi un campo data_zero e da_eliminare
              if (quantita === 0) {
                await updateDocWithRateLimit(progressoDocRef, {
                  percentuale: quantita,
                  timestamp: serverTimestamp(),
                  assegnazione_id: assegnazione ? assegnazione.id : "",
                  data_zero: serverTimestamp(), // Registra quando il documento è stato impostato a zero
                  da_eliminare: true // Contrassegna il documento per l'eliminazione futura
                });

              } else {
                // Se la quantità non è zero, rimuovi i campi data_zero e da_eliminare se esistono
                await updateDocWithRateLimit(progressoDocRef, {
                  percentuale: quantita,
                  timestamp: serverTimestamp(),
                  assegnazione_id: assegnazione ? assegnazione.id : "",
                  data_zero: deleteField(), // Rimuovi il campo data_zero
                  da_eliminare: deleteField() // Rimuovi il campo da_eliminare
                });
              }
              
              // Aggiorna la mappa dei progressiDocs
              setProgressiDocs(prev => {
                const nuoviProgressiDocs = new Map(prev);
                nuoviProgressiDocs.set(incaricoId, docPiuRecenteId);
                return nuoviProgressiDocs;
              });
            } else {
              // Questo non dovrebbe mai accadere, ma per sicurezza creiamo un nuovo documento
              console.warn(`Nessun documento valido trovato per l'incarico ${incaricoId}, ne creo uno nuovo`);
              await creaDocumentoProgresso(incaricoId, farmId, quantita, assegnazione);
            }
          } else {
            // Se non esiste un documento, creane uno nuovo

            await creaDocumentoProgresso(incaricoId, farmId, quantita, assegnazione);
          }
          
          // Aggiorna i progressi nel componente
          setProgressi(prev => {
            const nuoviProgressi = new Map(prev);
            nuoviProgressi.set(incaricoId, quantita);
            return nuoviProgressi;
          });
          
          // Se c'è un'assegnazione, aggiorna anche lo stato di completamento
          if (assegnazione) {
            // Trova l'incarico corrispondente
            const incarico = incarichi.find(i => i.id === incaricoId) || 
                            incarichiCitta.find(i => i.id === incaricoId);
            
            if (incarico) {
              // Calcola la percentuale di completamento
              const quantitaRichiesta = incarico.quantita || 0;
              if (quantitaRichiesta > 0) {
                const percentuale = Math.min(100, Math.round((quantita / quantitaRichiesta) * 100));
                
                // Se la percentuale è 100% ma l'incarico non è marcato come completato, aggiornalo
                if (percentuale >= 100 && !assegnazione.completato) {
                  // Aggiorna lo stato di completamento nel database
                  const assegnazioneRef = doc(db, "assegnazioni", assegnazione.id);
                  await updateDocWithRateLimit(assegnazioneRef, {
                    completato: true,
                    quantita: quantita
                  });
                  
                  // Aggiorna lo stato locale
                  setAssegnazioni(prev => 
                    prev.map(a => 
                      a.id === assegnazione.id 
                        ? { ...a, completato: true, quantita: quantita } 
                        : a
                    )
                  );
                } else if (assegnazione.quantita !== quantita) {
                  // Aggiorna la quantità nell'assegnazione
                  const assegnazioneRef = doc(db, "assegnazioni", assegnazione.id);
                  await updateDocWithRateLimit(assegnazioneRef, {
                    quantita: quantita
                  });
                  
                  // Aggiorna lo stato locale
                  setAssegnazioni(prev => 
                    prev.map(a => 
                      a.id === assegnazione.id 
                        ? { ...a, quantita: quantita } 
                        : a
                    )
                  );
                }
              }
            }
          }
        };
        
        promesse.push(aggiornaProgresso());
      }
      
      // Attendi che tutte le promesse siano risolte
      await Promise.all(promesse);
      
      // Resetta l'elenco degli incarichi modificati
      setProgressiModificati(new Set());
      
      // Pulisci i progressi modificati nel localStorage per questa farm
      const chiaveModificati = `progressiModificati_${farmSelezionata}`;
      localStorage.setItem(chiaveModificati, JSON.stringify([]));
      
      // Aggiorna il timestamp dell'ultima sincronizzazione
      localStorage.setItem('ultima_sincronizzazione', Date.now().toString());
      
      // Imposta modificheNonSincronizzate a false
      setModificheNonSincronizzate(false);
      
      // Sincronizzazione completata
      // Rimosso console.log
      
      // Reset delle variabili di stato
      setProgressiModificati(new Set());
      setModificheNonSincronizzate(false);
    } catch (error) {
      console.error("Errore nella sincronizzazione dei progressi:", error);
      setError("Errore nella sincronizzazione dei progressi. Riprova più tardi.");
    } finally {
      setSincronizzazioneInCorso(false);
    }
  };

  // Funzione per creare un nuovo documento di progresso
  const creaDocumentoProgresso = async (incaricoId: string, farmId: string, quantita: number, assegnazione: Assegnazione | undefined) => {
    const progressiRef = collection(db, "progressi");
    
    // Prepara i dati del documento
    const datiDocumento: any = {
      incarico_id: incaricoId,
      farm_id: farmId,
      assegnazione_id: assegnazione ? assegnazione.id : "",
      percentuale: quantita,
      timestamp: serverTimestamp()
    };
    
    // Se la quantità è zero, aggiungi i campi per l'eliminazione futura
    if (quantita === 0) {
      datiDocumento.data_zero = serverTimestamp();
      datiDocumento.da_eliminare = true;
    }
    
    // Crea un nuovo documento
    const nuovoProgressoRef = await addDocWithRateLimit(progressiRef, datiDocumento);
    
    // Aggiorna la mappa dei progressiDocs
    setProgressiDocs(prev => {
      const nuoviProgressiDocs = new Map(prev);
      nuoviProgressiDocs.set(incaricoId, nuovoProgressoRef.id);
      return nuoviProgressiDocs;
    });
    

    if (quantita === 0) {

    }
    
    return nuovoProgressoRef.id;
  };

  // Funzione per eliminare i documenti con valore zero più vecchi di 30 giorni
  const eliminaDocumentiZero = async () => {
    try {

      
      // Calcola la data di 30 giorni fa
      const trentaGiorniFa = new Date();
      trentaGiorniFa.setDate(trentaGiorniFa.getDate() - 30);
      
      // Converti la data in timestamp Firestore
      const timestampTrentaGiorniFa = Timestamp.fromDate(trentaGiorniFa);
      
      // Cerca i documenti da eliminare
      const progressiRef = collection(db, "progressi");
      const q = query(
        progressiRef,
        where("percentuale", "==", 0),
        where("da_eliminare", "==", true),
        where("data_zero", "<=", timestampTrentaGiorniFa)
      );
      
      const querySnapshot = await getDocsWithRateLimit(q);
      
      if (querySnapshot.empty) {

        return;
      }
      

      
      // Crea un batch per eliminare i documenti
      const batch = writeBatch(db);
      
      querySnapshot.forEach((documento) => {
        batch.delete(documento.ref);

      });
      
      // Esegui il batch
      await batch.commit();
      

    } catch (error) {
      console.error("Errore nell'eliminazione dei documenti con valore zero:", error);
    }
  };
  
  // Effetto per eseguire la pulizia dei documenti con valore zero all'avvio dell'applicazione
  useEffect(() => {
    // Verifica quando è stata eseguita l'ultima pulizia
    const verificaEdEseguiPulizia = async () => {
      try {
        // Ottengo la data dell'ultima pulizia
        const ultimaPuliziaString = localStorage.getItem('ultima_pulizia_documenti');
        const dataCorrente = new Date();
        
        // Se non esiste ancora un'ultima pulizia, la eseguo ora
        if (!ultimaPuliziaString) {
          // Eseguo la pulizia
          await eliminaDocumentiZero();
          
          // Salvo la data corrente
          localStorage.setItem('ultima_pulizia_documenti', dataCorrente.toISOString());
          return;
        }
        
        // Calcolo quanto tempo è passato dall'ultima pulizia
        const ultimaPulizia = new Date(ultimaPuliziaString);
        const differenzaGiorni = Math.floor((dataCorrente.getTime() - ultimaPulizia.getTime()) / (1000 * 60 * 60 * 24));
        
        // Se sono passati almeno 7 giorni, eseguo la pulizia
        if (differenzaGiorni >= 7) {
          // Eseguo la pulizia
          await eliminaDocumentiZero();
          
          // Aggiorno la data dell'ultima pulizia
          localStorage.setItem('ultima_pulizia_documenti', dataCorrente.toISOString());
        } else {
          // Non è necessario eseguire la pulizia ora
        }
      } catch (error) {
        console.error("Errore nella verifica della data dell'ultima pulizia:", error);
      }
    };
    
    // Eseguo la verifica solo una volta all'avvio dell'app
    verificaEdEseguiPulizia();
  }, [eliminaDocumentiZero]);

  // Effetto per caricare i progressi locali all'avvio dell'app
  useEffect(() => {
    // Caricamente iniziale dei progressi locali
    caricaProgressiLocali();
  }, [caricaProgressiLocali]);

  const handleAggiornamentoCompletato = () => {

    
    // Ricarica tutti i dati
    caricaIncarichi();
    caricaIncarichiCitta();
    caricaCesti();
    caricaEdifici();
    caricaDerby();
    
    // NON resettiamo i progressi locali e le modifiche non sincronizzate
    // Questo permette di mantenere i progressi durante l'aggiornamento
    
    // Ricarica le assegnazioni (che a loro volta caricheranno i progressi dal server)
    // Impostiamo dataLoaded a false per forzare il ricaricamento completo
    setDataLoaded(false);
    
    // Forza l'aggiornamento dal server
    if (caricaAssegnazioniRef.current) {
      caricaAssegnazioniRef.current(true);
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

  // Effetto per verificare quando mostrare il pulsante 'torna in alto'
  useEffect(() => {
    const handleScroll = () => {
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

  // Funzione per scorrere in cima alla pagina
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // Aggiungo useMemo per calcolare il numero di incarichi filtrati
  const numeroIncarichiMostrati = useMemo(() => {
    let incarichiDaContare = derbySelezionato ? filtraIncarichiPerDerby(incarichi) : incarichi;
    
    // Filtro per incarichi assegnati se necessario
    if (mostraSoloAssegnati) {
      incarichiDaContare = incarichiDaContare.filter(incarico => 
        assegnazioni.some(assegnazione => 
          assegnazione.riferimento_id === incarico.id && assegnazione.tipo === "incarico"
        )
      );
    }
    
    // Filtro per ricerca
    if (searchQuery) {
      incarichiDaContare = incarichiDaContare.filter(incarico => 
        incarico.nome.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return incarichiDaContare.length;
  }, [incarichi, derbySelezionato, filtraIncarichiPerDerby, mostraSoloAssegnati, assegnazioni, searchQuery]);

  // Aggiungo useMemo per calcolare il numero di incarichi città filtrati
  const numeroIncarichiCittaMostrati = useMemo(() => {
    let incarichiDaContare = derbySelezionato ? filtraIncarichiCittaPerDerby(incarichiCitta) : incarichiCitta;
    
    // Filtro per incarichi assegnati se necessario
    if (mostraSoloAssegnati) {
      incarichiDaContare = incarichiDaContare.filter(incarico => 
        assegnazioni.some(assegnazione => 
          assegnazione.riferimento_id === incarico.id && assegnazione.tipo === 'incarico'
        )
      );
    }
    
    // Filtro per ricerca
    if (searchQuery) {
      incarichiDaContare = incarichiDaContare.filter(incarico => 
        incarico.nome.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return incarichiDaContare.length;
  }, [incarichiCitta, derbySelezionato, filtraIncarichiCittaPerDerby, mostraSoloAssegnati, assegnazioni, searchQuery]);

  // Aggiungo useMemo per calcolare il numero di cesti filtrati
  const numeroCestiMostrati = useMemo(() => {
    let cestiDaContare = derbySelezionato ? filtraCestiPerDerby(cesti) : cesti;
    
    // Filtro per cesti assegnati se necessario
    if (mostraSoloAssegnati) {
      cestiDaContare = cestiDaContare.filter(cesto => 
        assegnazioni.some(assegnazione => 
          assegnazione.riferimento_id === cesto.id && assegnazione.tipo === "cesto"
        )
      );
    }
    
    // Filtro per ricerca
    if (searchQuery) {
      cestiDaContare = cestiDaContare.filter(cesto => 
        cesto.nome.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return cestiDaContare.length;
  }, [cesti, derbySelezionato, filtraCestiPerDerby, mostraSoloAssegnati, assegnazioni, searchQuery]);

  // Wrapper per getProgressoCorrentePerCesto che prende un solo parametro per compatibilità con il componente ListaCesti
  const getProgressoCorrentePerCestoWrapper = (incaricoId: string) => {
    // Trova il cesto che contiene questo incarico
    const cesto = trovaCestoPerIncarico(incaricoId);
    if (cesto) {
      // Usa la funzione originale con entrambi i parametri
      return getProgressoCorrentePerCesto(cesto.id, incaricoId);
    }
    // Fallback se il cesto non viene trovato
    return getProgressoCorrente(incaricoId);
  };

  // Funzione per caricare i progressi dal server e aggiornarli localmente
  const caricaProgressiDalServer = useCallback(async () => {
    try {
      // Rimosso console.log
      
      if (!currentUser || !farmSelezionata) {
        return;
      }
      

      
      // Interroga Firebase per i progressi relativi a questa farm
      const progressiRef = collection(db, "progressi");
      const q = query(progressiRef, where("farm_id", "==", farmSelezionata));
      const snapshot = await getDocsWithRateLimit(q);


      
      // Crea nuove mappe per progressi e progressi locali
      const nuoviProgressi = new Map(progressi);
      const nuoviProgressiLocali = new Map(progressiLocali);
      
      // Flag per verificare se ci sono stati aggiornamenti
      let aggiornamenti = false;
      
      // Per ogni progresso trovato su Firebase
      snapshot.docs.forEach(doc => {
        const dati = doc.data();
        const incaricoId = dati.incarico_id;
        const quantita = dati.percentuale || 0;
        
        // Crea la chiave composta
        const chiaveComposta = `${incaricoId}_${farmSelezionata}`;
        
        // Aggiorna entrambe le mappe
        nuoviProgressi.set(incaricoId, quantita);
        nuoviProgressiLocali.set(chiaveComposta, quantita);
        
        // Verifica se c'è stato un aggiornamento rispetto ai dati locali
        const valoreLocale = progressiLocali.get(chiaveComposta);
        if (valoreLocale !== quantita) {

          aggiornamenti = true;
        }
      });
      
      // Anche se non ci sono stati aggiornamenti, reset comunque le modifiche locali

      setProgressi(nuoviProgressi);
      setProgressiLocali(nuoviProgressiLocali);
      
      // IMPORTANTE: Reset delle modifiche non sincronizzate
      setProgressiModificati(new Set());
      setModificheNonSincronizzate(false);
      
      // Salva i progressi locali in localStorage
      setTimeout(() => {
        salvaProgressiLocali();
      }, 0);
      

      return true;
    } catch (error) {
      console.error("Errore nel caricamento dei progressi dal server:", error);
      return false;
    }
  }, [currentUser, farmSelezionata, progressi, progressiLocali, salvaProgressiLocali]);

  // Modifica della UI per rendere il pulsante di sincronizzazione fisso in alto
  return (
    <Layout>
      {/* Rimuovo i pulsanti fissi in alto */}
      <Container maxWidth="lg" sx={{ mt: 2, mb: 4, mx: 'auto', px: 0, overflow: 'hidden' }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <Paper sx={{ p: 2, pb: 2, pt: 2, px: 0, mb: 2, boxShadow: 'none', border: 'none', width: '100%' }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, px: 2 }}>
            {/* Rimuovo il titolo "I miei incarichi" */}
            
            {/* Aggiungo i pulsanti qui */}
            <Box sx={{ display: 'flex', gap: 2, width: '100%', justifyContent: 'center', flexDirection: 'column', alignItems: 'center' }}>
              <Box sx={{ 
                display: 'flex', 
                gap: { xs: 1, sm: 2 }, 
                width: '100%', 
                justifyContent: 'center',
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: 'center'
              }}>
                {/* Pulsante AGGIORNA DATI */}
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: { xs: '100%', sm: 'auto' },
                  gap: 1
                }}>
                  <AggiornaDatiButton 
                    userId={currentUser?.id} 
                    onAggiornamentoCompletato={handleAggiornamentoCompletato}
                    caricaProgressiDalServer={caricaProgressiDalServer} 
                  />
                  <Tooltip 
                    title={t('messaggi.aggiorna_tooltip')}
                    arrow 
                    enterTouchDelay={0}
                    leaveTouchDelay={3000}
                    placement="bottom"
                  >
                    <Chip
                      icon={<InfoIcon fontSize="small" />}
                      size="small"
                      sx={{ height: 24, cursor: 'help', flexShrink: 0 }}
                      label=""
                    />
                  </Tooltip>
                </Box>
                
                {/* Pulsante di sincronizzazione */}
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: { xs: '100%', sm: 'auto' },
                  gap: 1
                }}>
                  <Tooltip 
                    title={modificheNonSincronizzate ? t('messaggi.sincronizza_progressi') : t('messaggi.nessuna_modifica')}
                    enterTouchDelay={0}
                    leaveTouchDelay={3000}
                    placement="bottom"
                  >
                    <span>
                      <Badge color="error" variant="dot" invisible={!modificheNonSincronizzate}>
                        <Button
                          variant="contained"
                          color={modificheNonSincronizzate ? "primary" : "success"}
                          startIcon={sincronizzazioneInCorso ? 
                            <CircularProgress size={20} color="inherit" /> : 
                            (modificheNonSincronizzate ? <CloudUploadIcon /> : <CloudDoneIcon />)
                          }
                          onClick={sincronizzaProgressi}
                          disabled={!modificheNonSincronizzate || sincronizzazioneInCorso}
                        >
                          {t('pulsanti.sincronizza')}
                        </Button>
                      </Badge>
                    </span>
                  </Tooltip>
                  <Tooltip 
                    title={t('messaggi.sincronizza_tooltip')}
                    arrow 
                    enterTouchDelay={0}
                    leaveTouchDelay={3000}
                    placement="bottom"
                  >
                    <Chip
                      icon={<InfoIcon fontSize="small" />}
                      size="small"
                      sx={{ height: 24, cursor: 'help', flexShrink: 0 }}
                      label=""
                    />
                  </Tooltip>
                </Box>
              </Box>
            </Box>
          </Box>
          
          {/* Selettori e controlli */}
          <Box sx={{ px: 2, mb: 3 }}>
            {/* Box contenitore per Farm e Giocatore uno accanto all'altro */}
            <Box sx={{ 
              display: "flex", 
              flexDirection: { xs: 'column', sm: 'row' }, 
              gap: { xs: 2, sm: 0 } 
            }}>
              {/* Selettore giocatore (solo per admin e coordinatori) - ora per primo */}
              {(currentUser?.ruolo === "admin" || currentUser?.ruolo === "coordinatore") && (
                <FormControl size="small" sx={{ flex: 1, mb: { xs: 0, sm: 0 }, mr: { xs: 0, sm: 1 } }}>
                  <InputLabel id="giocatore-select-label">{t('assegnazioni.giocatore')}</InputLabel>
                  <Select
                    labelId="giocatore-select-label"
                    id="giocatore-select"
                    value={giocatoreSelezionato || ""}
                    label={t('assegnazioni.giocatore')}
                    onChange={handleChangeGiocatore}
                  >
                    {giocatori.map((giocatore) => (
                      <MenuItem key={giocatore.id} value={giocatore.id}>
                        {giocatore.nome}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
              
              {/* Selettore farm */}
              <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, gap: 0.5 }}>
                <FormControl size="small" sx={{ flex: 1 }}>
                  <InputLabel id="farm-select-label">Farm</InputLabel>
                  <Select
                    labelId="farm-select-label"
                    id="farm-select"
                    value={farms.length > 0 ? farmSelezionata : ""}
                    label="Farm"
                    onChange={handleChangeFarm}
                    disabled={farms.length === 0}
                    renderValue={(selected) => {
                      const farmIndex = parseInt(selected as string);
                      if (isNaN(farmIndex) || farmIndex < 0 || farmIndex >= farms.length) {
                        return "Seleziona Farm";
                      }
                      const farm = farms[farmIndex];
                      return (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar
                            variant="rounded"
                            sx={{
                              width: 24,
                              height: 24,
                              bgcolor: farm.stato === 'attivo' ? 'success.main' : 'grey.300',
                              color: farm.stato === 'attivo' ? 'white' : 'text.secondary',
                              fontSize: '0.875rem',
                            }}
                          >
                            {farm.nome ? farm.nome.charAt(0).toUpperCase() : "F"}
                          </Avatar>
                          {farm.nome || `Farm ${farmIndex + 1}`}
                          {farm.livello && (
                            <Chip
                              label={farm.livello}
                              size="small"
                              sx={{
                                height: 20,
                                minWidth: 20,
                                bgcolor: 'rgb(33, 150, 243, 0.1)',
                                color: 'rgb(33, 150, 243)',
                                fontStyle: 'italic',
                                '& .MuiChip-label': {
                                  px: 1,
                                  py: 0,
                                },
                              }}
                            />
                          )}
                        </Box>
                      );
                    }}
                  >
                    {farms.length === 0 ? (
                      <MenuItem value="">
                        <em>Nessuna farm disponibile</em>
                      </MenuItem>
                    ) : (
                      farms.map((farm, index) => (
                        <MenuItem key={farm.id || index} value={index.toString()}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar
                              variant="rounded"
                              sx={{
                                width: 24,
                                height: 24,
                                bgcolor: farm.stato === 'attivo' ? 'success.main' : 'grey.300',
                                color: farm.stato === 'attivo' ? 'white' : 'text.secondary',
                                fontSize: '0.875rem',
                              }}
                            >
                              {farm.nome ? farm.nome.charAt(0).toUpperCase() : "F"}
                            </Avatar>
                            {farm.nome || `Farm ${index + 1}`}
                            {farm.livello && (
                              <Chip
                                label={farm.livello}
                                size="small"
                                sx={{
                                  height: 20,
                                  minWidth: 20,
                                  bgcolor: 'rgb(33, 150, 243, 0.1)',
                                  color: 'rgb(33, 150, 243)',
                                  fontStyle: 'italic',
                                  '& .MuiChip-label': {
                                    px: 1,
                                    py: 0,
                                  },
                                }}
                              />
                            )}
                          </Box>
                        </MenuItem>
                      ))
                    )}
                  </Select>
                </FormControl>
                
                {/* Pulsante + per incrementare il livello */}
                <Tooltip title="Aumenta livello farm">
                  <span>
                    <IconButton
                      size="small"
                      onClick={handleUpdateFarmLevel}
                      disabled={farms.length === 0 || !farmSelezionata}
                      sx={{
                        bgcolor: "primary.main",
                        color: "white",
                        width: 28,
                        height: 28,
                        "&:hover": {
                          bgcolor: "primary.dark",
                        },
                      }}
                    >
                      <AddIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>
            </Box>
          </Box>
          
          {/* Barra di progresso */}
          {!loading && assegnazioni.length > 0 && (
            <ProgressoBar
              totaleIncarichi={statistiche.totaleIncarichi}
              incarichiCompletati={statistiche.incarichiCompletati}
              incarichiInProgresso={statistiche.incarichiInProgresso}
              incarichiAssegnati={statistiche.incarichiAssegnati}
            />
          )}
          
          {/* Pulsanti e controlli di visualizzazione */}
          <Box sx={{ mb: 2 }}>
            {/* Pulsanti LISTA e TUTTI GLI INCARICHI */}
            <Box sx={{ display: "flex", mb: 2 }}>
                      <Button
                variant={mostraSoloAssegnati ? "contained" : "outlined"}
                onClick={handleShowOnlyAssigned}
                        size="small"
                sx={{
                  flex: 1,
                  mr: 1
                }}
              >
                {t('azioni.lista')}
                      </Button>
                    <Button
                variant={!mostraSoloAssegnati ? "contained" : "outlined"}
                onClick={handleShowAllTasks}
                      size="small"
                sx={{
                  flex: 1
                }}
                    >
                {t('pulsanti.tutti_gli_incarichi')}
                    </Button>
            </Box>
            
            {/* Riga con i controlli di visualizzazione */}
            <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: "medium", mr: 1 }}>
                {t('comune.vista')}:
              </Typography>
              
              {/* Toggle visualizzazione globale/per edificio (sempre visibile ma disabilitato in tab non-incarichi) */}
              <Tooltip title={tabValue !== 0 ? t('comune.disponibile_solo_incarichi') : (visualizzazioneGlobale ? t('azioni.visualizza_per_edificio') : t('azioni.visualizza_lista_completa'))}>
                <span>
                  <IconButton
                    size="small"
                    onClick={handleToggleVisualizzazione}
                    color={visualizzazioneGlobale ? "default" : "primary"}
                    disabled={tabValue !== 0}
                    sx={{
                      color: tabValue !== 0 ? 'rgba(0, 0, 0, 0.26)' : (visualizzazioneGlobale ? 'default' : 'primary.main'),
                    }}
                  >
                    {visualizzazioneGlobale ? <ViewModuleIcon /> : <ViewListIcon />}
                  </IconButton>
                </span>
              </Tooltip>
              
              {/* Menu di ordinamento unificato */}
              {/* Pulsante di apertura menu */}
              <Tooltip title={t('comune.opzioni_ordinamento')}>
                <IconButton
                  size="small"
                  onClick={(event) => setMenuAnchorEl(event.currentTarget)}
                  color={ordinamentoLivello || ordinamentoAlfabetico || ordinamentoCompletamento ? "primary" : "default"}
                >
                  <SortIcon />
                </IconButton>
              </Tooltip>
              
              {/* Menu con opzioni di ordinamento */}
              <Menu
                anchorEl={menuAnchorEl}
                open={Boolean(menuAnchorEl)}
                onClose={() => setMenuAnchorEl(null)}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right',
                }}
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
              >
                <MenuItem 
                  onClick={() => {
                    handleChangeOrdinamento('livello');
                    setMenuAnchorEl(null);
                  }}
                  selected={ordinamentoLivello}
                >
                  <ListItemIcon>
                    <SortIcon 
                      fontSize="small" 
                      color={ordinamentoLivello ? "primary" : "inherit"} 
                      sx={ordinamentoLivello && ordinamentoInverso ? { transform: 'rotate(180deg)' } : {}}
                    />
                  </ListItemIcon>
                  <ListItemText primary={t('assegnazioni.ordina.livello')} />
                </MenuItem>
                
                <MenuItem 
                  onClick={() => {
                    handleChangeOrdinamento('alfabetico');
                    setMenuAnchorEl(null);
                  }}
                  selected={ordinamentoAlfabetico}
                >
                  <ListItemIcon>
                    <SortByAlphaIcon 
                      fontSize="small" 
                      color={ordinamentoAlfabetico ? "primary" : "inherit"} 
                      sx={ordinamentoAlfabetico && ordinamentoInverso ? { transform: 'rotate(180deg)' } : {}}
                    />
                  </ListItemIcon>
                  <ListItemText primary={t('assegnazioni.ordina.alfabetico')} />
                </MenuItem>
                
                <MenuItem 
                  onClick={() => {
                    handleChangeOrdinamento('completamento');
                    setMenuAnchorEl(null);
                  }}
                  selected={ordinamentoCompletamento}
                >
                  <ListItemIcon>
                    <CheckCircleIcon 
                      fontSize="small" 
                      color={ordinamentoCompletamento ? "primary" : "inherit"} 
                      sx={ordinamentoCompletamento && ordinamentoInverso ? { transform: 'rotate(180deg)' } : {}}
                    />
                  </ListItemIcon>
                  <ListItemText primary={t('assegnazioni.ordina.completamento')} />
                </MenuItem>
              </Menu>
              
              {/* Espandi/Comprimi tutti gli edifici - solo abilitato quando la visualizzazione è per edificio */}
              <Tooltip title={tabValue !== 0 ? t('comuni.disponibile_solo_incarichi') : (visualizzazioneGlobale ? t('comuni.disponibile_solo_edifici') : (expandedEdifici.length > 0 ? t('azioni.comprimi') : t('azioni.espandi')))}>
                <span>
                  <IconButton
                    size="small"
                    onClick={() => setExpandedEdifici(expandedEdifici.length > 0 ? [] : edifici.map(e => e.id))}
                    disabled={visualizzazioneGlobale || tabValue !== 0}
                    sx={{
                      color: visualizzazioneGlobale || tabValue !== 0 ? 'rgba(0, 0, 0, 0.26)' : (expandedEdifici.length > 0 ? 'primary.main' : 'text.secondary'),
                    }}
                  >
                    {expandedEdifici.length > 0 ? <UnfoldLessIcon /> : <UnfoldMoreIcon />}
                  </IconButton>
                </span>
              </Tooltip>
              
              {/* Icona di ricerca */}
              <Tooltip title={t('comune.cerca')}>
                <span>
                <IconButton
                  size="small"
                  color={searchExpanded ? "primary" : "default"}
                  onClick={toggleSearchBar}
                >
                  <SearchIcon />
                </IconButton>
                </span>
              </Tooltip>
              
              {/* Elimina tutti i progressi */}
              <Tooltip title={t('comune.elimina')}>
                <span>
                <IconButton
                  size="small"
                  color="error"
                  onClick={async () => {
                    if (window.confirm(t('messaggi.conferma_elimina_progressi'))) {
                      try {
                        setLoading(true);
                        
                        // Ottieni la farm selezionata
                        const farmIndex = parseInt(farmSelezionata || "0");
                        const farm = farms[farmIndex];
                        if (!farm) {
                          throw new Error(t('errori.farm_non_trovata'));
                        }
                        
                        // Elimina tutti i documenti di progresso per questa farm
                        for (const [incaricoId, progressoDocId] of progressiDocs.entries()) {
                          const progressoRef = doc(db, "progressi", progressoDocId);
                          await deleteDocWithRateLimit(progressoRef);
                        }
                        
                        // Resetta tutti i progressi a 0
                        const nuoviProgressi = new Map<string, number>();
                        for (const incaricoId of progressi.keys()) {
                          nuoviProgressi.set(incaricoId, 0);
                        }
                        
                        // Aggiorna lo stato
                        setProgressi(nuoviProgressi);
                        setProgressiDocs(new Map<string, string>());
                        
                        // Resetta anche i progressi locali
                        setProgressiLocali(new Map<string, number>());
                        setProgressiModificati(new Set<string>());
                        setModificheNonSincronizzate(false);
                        
                        // Pulisci i progressi locali nel localStorage
                        if (farmSelezionata) {
                          const chiaveStorage = `progressiLocali_${farmSelezionata}`;
                          const chiaveModificati = `progressiModificati_${farmSelezionata}`;
                          localStorage.setItem(chiaveStorage, JSON.stringify({}));
                          localStorage.setItem(chiaveModificati, JSON.stringify([]));

                        }
                        
                        // Aggiorna le assegnazioni per rimuovere il flag completato e impostare la quantità a 0
                        const assegnazioniDaAggiornare = [...assegnazioni];
                        for (const assegnazione of assegnazioniDaAggiornare) {
                          if (assegnazione.completato || assegnazione.quantita) {
                            const assegnazioneRef = doc(db, "assegnazioni", assegnazione.id);
                            await updateDocWithRateLimit(assegnazioneRef, {
                              completato: false,
                              quantita: 0
                            });
                          }
                        }
                        
                        // Aggiorna lo stato delle assegnazioni
                        setAssegnazioni(assegnazioniDaAggiornare.map((a: AssegnazioneEstesa) => ({ ...a, completato: false, quantita: 0 })));
                        
                        // Forza il ricaricamento della pagina per aggiornare l'interfaccia utente
                        setTimeout(() => {
                          caricaAssegnazioniRef.current(true);
                        }, 100);
                        
                        setLoading(false);
                      } catch (error) {
                        console.error("Errore nell'eliminazione dei progressi:", error);
                        setError(t('errori.eliminazione_progressi'));
                        setLoading(false);
                      }
                    }
                  }}
                >
                  <CloseIcon />
                </IconButton>
                </span>
              </Tooltip>
              
              {/* Stampa (solo per admin e coordinatori) */}
              {(currentUser?.ruolo === "admin" || currentUser?.ruolo === "coordinatore") && (
                <Tooltip title={t('azioni.stampa')}>
                  <span>
                  <IconButton
                    size="small"
                    onClick={handleStampa}
                  >
                    <PictureAsPdfIcon />
                  </IconButton>
                  </span>
                </Tooltip>
              )}
            </Box>
          </Box>
          
          {/* Campo di ricerca espandibile */}
          {searchExpanded && (
            <Box sx={{ mb: 2, px: 2 }}>
              <TextField
                fullWidth
                size="small"
                placeholder={t('comune.cerca_incarichi')}
                value={searchQuery}
                onChange={handleSearch}
                autoFocus
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
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ) : null,
                }}
              />
            </Box>
          )}
          
          {/* Striscia del derby selezionato come Select diretto */}
          <FormControl 
            fullWidth 
            variant="standard" 
            sx={{
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
                py: 0.3,
                px: 1.8,
                '& .MuiSelect-select': {
                  py: 0.2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  fontSize: '0.75rem',
                  fontWeight: 500
                }
              }}
              renderValue={(value) => {
                if (value === "") {
                  return (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box 
                        sx={{ 
                          width: 10, 
                          height: 10, 
                          borderRadius: '50%', 
                          bgcolor: '#9e9e9e',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                        }} 
                      />
                      <Typography variant="caption" sx={{ fontSize: '0.75rem', fontWeight: 500, color: 'text.secondary' }}>
                        {t('derby.selezionato')}: 
                      </Typography>
                      <Typography variant="caption" sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'text.primary' }}>
                        {t('derby.tipi')}
                      </Typography>
                    </Box>
                  );
                }
                
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
                      {selectedDerby ? selectedDerby.nome : t('derby.tipi')}
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
                          {t('derby.attivo')}
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
                          {t('derby.prossimo')}
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
                        label={t('derby.attivo')} 
                        size="small" 
                        color="success" 
                        sx={{ height: 18, fontSize: '0.65rem', py: 0 }} 
                      />
                    )}
                    {d.prossimo && !d.attivo && (
                      <Chip 
                        label={t('derby.prossimo')} 
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
          
          {/* Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: "divider", px: 2 }}>
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
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Typography component="span" sx={{ fontSize: '0.85rem', fontWeight: 500 }}>{t('assegnazioni.incarichi')}</Typography>
                    <Chip 
                      label={numeroIncarichiMostrati} 
                      size="small" 
                      color="primary" 
                      sx={{ 
                        height: 18, 
                        fontSize: '0.7rem', 
                        fontWeight: 'bold',
                        mt: 0.5,
                        '& .MuiChip-label': { px: 0.7, py: 0 } 
                      }} 
                    />
                  </Box>
                } 
              />
              <Tab 
                label={
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Typography component="span" sx={{ fontSize: '0.85rem', fontWeight: 500 }}>{t('assegnazioni.città')}</Typography>
                    <Chip 
                      label={numeroIncarichiCittaMostrati} 
                      size="small" 
                      color="primary" 
                      sx={{ 
                        height: 18, 
                        fontSize: '0.7rem', 
                        fontWeight: 'bold',
                        mt: 0.5,
                        '& .MuiChip-label': { px: 0.7, py: 0 } 
                      }} 
                    />
                  </Box>
                } 
              />
              <Tab 
                label={
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Typography component="span" sx={{ fontSize: '0.85rem', fontWeight: 500 }}>{t('assegnazioni.cesti')}</Typography>
                    <Chip 
                      label={numeroCestiMostrati} 
                      size="small" 
                      color="primary" 
                      sx={{ 
                        height: 18, 
                        fontSize: '0.7rem', 
                        fontWeight: 'bold',
                        mt: 0.5,
                        '& .MuiChip-label': { px: 0.7, py: 0 } 
                      }} 
                    />
                  </Box>
                } 
              />
            </Tabs>
          </Box>
          
          {/* Contenuto principale */}
          <Box sx={{ px: 0 }}>
            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                {/* Pannello per gli incarichi */}
                <TabPanel value={tabValue} index={0}>
                  {dataLoaded && assegnazioni.length === 0 && mostraSoloAssegnati ? (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      {t('assegnazioni.nessun_incarico')}
                    </Alert>
                  ) : derbySelezionato && dataLoaded && filtraIncarichiPerDerby(incarichi).length === 0 ? (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      {t('derby.nessun_incarico_disponibile')} {derbySelezionato.nome}.
                    </Alert>
                  ) : (
                    <ListaIncarichi
                      incarichi={filtraIncarichiPerDerby(incarichi)}
                      assegnazioni={assegnazioni}
                      edifici={edifici}
                      progressi={progressi}
                      searchQuery={searchQuery}
                      visualizzazioneGlobale={visualizzazioneGlobale}
                      mostraSoloAssegnati={mostraSoloAssegnati}
                      expandedEdifici={expandedEdifici}
                      ordinamentoLivello={ordinamentoLivello}
                      ordinamentoAlfabetico={ordinamentoAlfabetico}
                      ordinamentoCompletamento={ordinamentoCompletamento}
                      ordinamentoInverso={ordinamentoInverso}
                      elementoEvidenziato={elementoEvidenziato}
                      onToggleCompletamento={handleToggleCompletamento}
                      onUpdateQuantita={handleUpdateQuantita}
                      onEdificioToggle={handleEdificioToggle}
                      onEvidenziazioneFine={handleEvidenziazioneFine}
                      getQuantitaIncarico={getQuantitaIncarico}
                      trovaCestoPerIncarico={trovaCestoPerIncarico}
                      getQuantitaIncaricoCesto={getQuantitaIncaricoCesto}
                      onNavigateToCesto={handleNavigateToCesto}
                      livelloFarmSelezionata={getLivelloFarmSelezionata()}
                      expandedIncarichi={expandedIncarichi}
                      onIncaricoExpand={handleIncaricoExpand}
                      getProgressoCorrente={getProgressoCorrente}
                    />
                  )}
                </TabPanel>
                
                {/* Pannello per gli incarichi città */}
                <TabPanel value={tabValue} index={1}>
                  {dataLoaded && assegnazioni.length === 0 && mostraSoloAssegnati ? (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      {t('assegnazioni.nessun_incarico_citta')}
                    </Alert>
                  ) : derbySelezionato && dataLoaded && filtraIncarichiCittaPerDerby(incarichiCitta).length === 0 ? (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      {t('derby.nessun_incarico_citta_disponibile')} {derbySelezionato.nome}.
                    </Alert>
                  ) : (
                    <ListaIncarichiCitta
                      incarichiCitta={filtraIncarichiCittaPerDerby(incarichiCitta)}
                      assegnazioni={assegnazioni}
                      progressi={progressi}
                      searchQuery={searchQuery}
                      mostraSoloAssegnati={mostraSoloAssegnati}
                      elementoEvidenziato={elementoEvidenziato}
                      onToggleCompletamento={handleToggleCompletamento}
                      onUpdateQuantita={handleUpdateQuantita}
                      onEvidenziazioneFine={handleEvidenziazioneFine}
                      getQuantitaIncarico={getQuantitaIncarico}
                      livelloFarmSelezionata={getLivelloFarmSelezionata()}
                      expandedIncarichi={expandedIncarichi}
                      onIncaricoExpand={handleIncaricoExpand}
                      getProgressoCorrente={getProgressoCorrente}
                      trovaCestoPerIncarico={trovaCestoPerIncarico}
                      getQuantitaIncaricoCesto={getQuantitaIncaricoCesto}
                      onNavigateToCesto={handleNavigateToCesto}
                    />
                  )}
                </TabPanel>
                
                {/* Pannello per i cesti */}
                <TabPanel value={tabValue} index={2}>
                  {dataLoaded && cesti.length === 0 ? (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      {t('assegnazioni.nessun_cesto')}
                    </Alert>
                  ) : derbySelezionato && dataLoaded && filtraCestiPerDerby(cesti).length === 0 ? (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      {t('derby.nessun_cesto_disponibile')} {derbySelezionato.nome}.
                    </Alert>
                  ) : (
                    <ListaCesti
                      cesti={filtraCestiPerDerby(cesti)}
                      assegnazioni={assegnazioni}
                      incarichi={incarichi}
                      incarichiCitta={incarichiCitta}
                      progressi={progressi}
                      searchQuery={searchQuery}
                      mostraSoloAssegnati={mostraSoloAssegnati}
                      elementoEvidenziato={elementoEvidenziato}
                      onToggleCompletamentoInCesto={handleToggleCompletamentoInCesto}
                      onToggleCestoCompletamento={handleToggleCestoCompletamento}
                      onEvidenziazioneFine={handleEvidenziazioneFine}
                      getQuantitaIncaricoCesto={getQuantitaIncaricoCesto}
                      getProgressoCorrente={getProgressoCorrentePerCestoWrapper}
                      farmSelezionata={farmSelezionata}
                      onNavigateToIncarico={handleNavigateToIncarico}
                      onNavigateToIncaricoCitta={handleNavigateToIncaricoCitta}
                      onToggleCompletamento={handleToggleCompletamento}
                    />
                  )}
                </TabPanel>
              </>
            )}
          </Box>
        </Paper>
      </Container>
      
      {/* Pulsante per tornare in cima */}
      <Zoom in={showScrollTop}>
        <Fab
          color="primary"
          size="small"
          onClick={() => scrollToTop()}
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


