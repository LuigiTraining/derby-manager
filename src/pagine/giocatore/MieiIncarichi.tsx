import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import {
  Avatar,
  Box,
  Button,
  Checkbox,
  Chip,
  IconButton,
  Paper,
  Table,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Switch,
  TextField,
  Collapse,
  Divider,
  Container,
  Alert,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  ListSubheader,
  ListItemIcon,
  ListItemText,
  Menu,
  SelectChangeEvent,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import AssignmentIcon from "@mui/icons-material/Assignment";
import ViewListIcon from "@mui/icons-material/ViewList";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import LinearProgress from "@mui/material/LinearProgress";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import Tooltip from "@mui/material/Tooltip";
import Stack from "@mui/material/Stack";
import Badge from "@mui/material/Badge";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import SortIcon from "@mui/icons-material/Sort";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
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
} from "firebase/firestore";
import { db } from "../../configurazione/firebase";
import { useAuth } from "../../componenti/autenticazione/AuthContext";
import { Farm } from "../../tipi/giocatore";
import { Incarico } from "../../tipi/incarico";
import { Assegnazione } from "../../tipi/assegnazione";
import { Cesto, IncaricoInCesto } from "../../tipi/cesto";
import { Edificio } from "../../tipi/edificio";
import Layout from "../../componenti/layout/Layout";
import ContatoreProduzione from "../../componenti/ContatoreProduzione";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import UnfoldLessIcon from "@mui/icons-material/UnfoldLess";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import html2pdf from "html2pdf.js";
import StampaIncarichi from "../../componenti/stampa/StampaIncarichi";
import { IncaricoCitta } from "../../tipi/incarico";
import { Derby } from "../../tipi/derby";
import { useTranslation } from "react-i18next";

export default function MieiIncarichi() {
  const { currentUser } = useAuth();
  const { t } = useTranslation();

  // Stati
  const [farms, setFarms] = useState<Farm[]>([]);
  const [farmSelezionata, setFarmSelezionata] = useState<string>("");
  const [incarichi, setIncarichi] = useState<Incarico[]>([]);
  const [assegnazioni, setAssegnazioni] = useState<Assegnazione[]>([]);
  const [cesti, setCesti] = useState<Cesto[]>([]);
  const [cestiIncarichi, setCestiIncarichi] = useState<
    Map<string, IncaricoInCesto[]>
  >(new Map());
  const [progressi, setProgressi] = useState<Map<string, number>>(new Map());
  const [progressiDocs, setProgressiDocs] = useState<Map<string, string>>(
    new Map()
  );
  const [expandedEdifici, setExpandedEdifici] = useState<string[]>([]);
  const [edifici, setEdifici] = useState<Record<string, string>>({});
  const [edificiData, setEdificiData] = useState<Edificio[]>([]);
  const [mostraSoloAssegnati, setMostraSoloAssegnati] = useState<boolean>(
    () => {
      try {
        const savedValue = localStorage.getItem(
          "miei-incarichi-mostra-assegnati"
        );
        // Se non esiste un valore salvato, mostra la vista LISTA (true)
        return savedValue !== null ? JSON.parse(savedValue) : true;
      } catch {
        return true; // In caso di errore, mostra comunque la vista LISTA
      }
    }
  );
  const [cestiEspansi, setCestiEspansi] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [derbySelezionato, setDerbySelezionato] = useState<Derby | null>(null);
  const [ordinamento, setOrdinamento] = useState<{
    tipo: "alfabetico" | "livello" | "completamento" | null;
    direzione: "asc" | "desc" | null;
  }>({ tipo: null, direzione: null });
  const [cestoHighlight, setCestoHighlight] = useState<string | null>(null);
  const [cittaExpanded, setCittaExpanded] = useState(false);
  const [incarichiCitta, setIncarichiCitta] = useState<IncaricoCitta[]>([]);
  const [tuttiIncarichiCitta, setTuttiIncarichiCitta] = useState<
    IncaricoCitta[]
  >([]);
  const [derbyAttivo, setDerbyAttivo] = useState<Derby | null>(null);
  const [derby, setDerby] = useState<Derby[]>([]);
  const [giocatori, setGiocatori] = useState<
    { id: string; nome: string; pin: number; ruolo: string; farms: Farm[] }[]
  >([]);
  const [giocatoreSelezionato, setGiocatoreSelezionato] = useState<
    string | null
  >(null);
  const [error, setError] = useState<string>("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [totaleCitta, setTotaleCitta] = useState<number>(0);
  const [visualizzazioneGlobale, setVisualizzazioneGlobale] = useState(false);

  // Aggiungo un ref per il campo di ricerca
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Effetto per gestire il focus automatico quando si apre la ricerca
  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      // Piccolo timeout per assicurarsi che il campo sia visibile
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [searchOpen]);

  // Funzioni di utilità
  const getQuantitaIncarico = useCallback(
    (incaricoId: string): number => {
      const incarico = incarichi.find((i) => i.id === incaricoId);
      if (!incarico) {
        // Se non troviamo l'incarico standard, cerchiamo tra gli incarichi città
        const incaricoCitta = incarichiCitta.find((i) => i.id === incaricoId);
        if (!incaricoCitta) return 0;

        if (!derbySelezionato || !incaricoCitta.quantita_derby) {
          return incaricoCitta.quantita;
        }
        const quantitaDerby = incaricoCitta.quantita_derby[derbySelezionato.id];
        return typeof quantitaDerby === "undefined" || quantitaDerby === null
          ? incaricoCitta.quantita
          : quantitaDerby;
      }

      if (!derbySelezionato || !incarico.quantita_derby) {
        return incarico.quantita;
      }

      const quantitaDerby = incarico.quantita_derby[derbySelezionato.id];
      return typeof quantitaDerby === "undefined" || quantitaDerby === null
        ? incarico.quantita
        : quantitaDerby;
    },
    [incarichi, incarichiCitta, derbySelezionato]
  );

  // Costanti per le chiavi del localStorage
  const STORAGE_KEYS = {
    EXPANDED_EDIFICI: `miei-incarichi-expanded-edifici-${
      currentUser?.id || ""
    }-${farmSelezionata || ""}`,
    SCROLL_POSITION: `miei-incarichi-scroll-position-${currentUser?.id || ""}-${
      farmSelezionata || ""
    }`,
    MOSTRA_SOLO_ASSEGNATI: `miei-incarichi-mostra-assegnati-${
      currentUser?.id || ""
    }`, // Rimosso farmSelezionata
    FARM_SELEZIONATA: `miei-incarichi-farm-selezionata-${
      currentUser?.id || ""
    }`,
    CITTA_EXPANDED: `miei-incarichi-citta-expanded-${currentUser?.id || ""}-${
      farmSelezionata || ""
    }`,
    CESTI_EXPANDED: `miei-incarichi-cesti-expanded-${currentUser?.id || ""}-${
      farmSelezionata || ""
    }`,
    GIOCATORE_SELEZIONATO: `miei-incarichi-giocatore-selezionato-${
      currentUser?.id || ""
    }`,
  };

  // Funzione per salvare lo stato degli edifici espansi
  const salvaStatoEdifici = useCallback(
    (edifici: string[]) => {
      try {
        localStorage.setItem(
          STORAGE_KEYS.EXPANDED_EDIFICI,
          JSON.stringify(edifici)
        );
      } catch (error) {
        console.error("Errore nel salvataggio degli edifici espansi:", error);
      }
    },
    [STORAGE_KEYS.EXPANDED_EDIFICI]
  );

  // Funzione per salvare la posizione dello scroll
  const salvaScrollPosition = useCallback(() => {
    try {
      localStorage.setItem(
        STORAGE_KEYS.SCROLL_POSITION,
        window.scrollY.toString()
      );
    } catch (error) {
      console.error("Errore nel salvataggio della posizione scroll:", error);
    }
  }, [STORAGE_KEYS.SCROLL_POSITION]);

  // Funzione per salvare lo stato di visualizzazione
  const salvaMostraAssegnati = useCallback(
    (mostra: boolean) => {
      try {
        localStorage.setItem(
          STORAGE_KEYS.MOSTRA_SOLO_ASSEGNATI,
          JSON.stringify(mostra)
        );
      } catch (error) {
        console.error("Errore nel salvataggio stato visualizzazione:", error);
      }
    },
    [STORAGE_KEYS.MOSTRA_SOLO_ASSEGNATI]
  );

  // Funzione per salvare la farm selezionata
  const salvaFarmSelezionata = useCallback(
    (farmId: string) => {
      try {
        localStorage.setItem(STORAGE_KEYS.FARM_SELEZIONATA, farmId);
      } catch (error) {
        console.error("Errore nel salvataggio della farm selezionata:", error);
      }
    },
    [STORAGE_KEYS.FARM_SELEZIONATA]
  );

  // Funzione per salvare lo stato di espansione della città
  const salvaCittaExpanded = useCallback(
    (expanded: boolean) => {
      try {
        localStorage.setItem(
          STORAGE_KEYS.CITTA_EXPANDED,
          JSON.stringify(expanded)
        );
      } catch (error) {
        console.error("Errore nel salvataggio dello stato città:", error);
      }
    },
    [STORAGE_KEYS.CITTA_EXPANDED]
  );

  // Funzione per salvare lo stato di espansione dei cesti
  const salvaCestiExpanded = useCallback(
    (expanded: boolean) => {
      try {
        localStorage.setItem(
          STORAGE_KEYS.CESTI_EXPANDED,
          JSON.stringify(expanded)
        );
      } catch (error) {
        console.error("Errore nel salvataggio dello stato cesti:", error);
      }
    },
    [STORAGE_KEYS.CESTI_EXPANDED]
  );

  // Effetto per gestire lo scroll
  useEffect(() => {
    if (!currentUser?.id || !farmSelezionata) return;

    // Salva la posizione dello scroll quando l'utente scrolla
    const handleScroll = () => {
      clearTimeout(scrollTimeout.current);
      scrollTimeout.current = setTimeout(() => {
        localStorage.setItem(
          STORAGE_KEYS.SCROLL_POSITION,
          window.scrollY.toString()
        );
      }, 100);
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }
    };
  }, [currentUser?.id, farmSelezionata, STORAGE_KEYS.SCROLL_POSITION]);

  // Effetto per ripristinare la posizione dello scroll dopo il caricamento dei dati
  useEffect(() => {
    if (!currentUser?.id || !farmSelezionata || !incarichi.length) return;

    try {
      const savedPosition = localStorage.getItem(STORAGE_KEYS.SCROLL_POSITION);
      if (savedPosition) {
        // Aspetta che il DOM sia completamente renderizzato
        setTimeout(() => {
          window.scrollTo({
            top: parseInt(savedPosition),
            behavior: "instant",
          });
        }, 100);
      }
    } catch (error) {
      console.error("Errore nel ripristino della posizione scroll:", error);
    }
  }, [
    currentUser?.id,
    farmSelezionata,
    incarichi.length,
    STORAGE_KEYS.SCROLL_POSITION,
  ]);

  // Effetto per caricare lo stato salvato degli edifici e della visualizzazione
  useEffect(() => {
    if (!currentUser?.id || !farmSelezionata) return;

    try {
      // Carica stato edifici espansi
      const savedEdifici = localStorage.getItem(STORAGE_KEYS.EXPANDED_EDIFICI);
      if (savedEdifici) {
        setExpandedEdifici(JSON.parse(savedEdifici));
      }
    } catch (error) {
      console.error("Errore nel caricamento degli stati salvati:", error);
    }
  }, [currentUser?.id, farmSelezionata, STORAGE_KEYS.EXPANDED_EDIFICI]);

  // Effetto separato per gestire mostraSoloAssegnati
  useEffect(() => {
    if (!currentUser?.id) return;

    try {
      const savedMostraAssegnati = localStorage.getItem(
        STORAGE_KEYS.MOSTRA_SOLO_ASSEGNATI
      );
      if (savedMostraAssegnati !== null) {
        setMostraSoloAssegnati(JSON.parse(savedMostraAssegnati));
      } else {
        // Se non c'è un valore salvato, impostiamo il valore predefinito a true (LISTA)
        setMostraSoloAssegnati(true);
        localStorage.setItem(
          STORAGE_KEYS.MOSTRA_SOLO_ASSEGNATI,
          JSON.stringify(true)
        );
      }
    } catch (error) {
      console.error(
        "Errore nel caricamento dello stato visualizzazione:",
        error
      );
      // In caso di errore, impostiamo comunque il valore predefinito a true (LISTA)
      setMostraSoloAssegnati(true);
    }
  }, [currentUser?.id, STORAGE_KEYS.MOSTRA_SOLO_ASSEGNATI]);

  // Effetto per caricare la farm selezionata all'avvio
  useEffect(() => {
    if (!currentUser?.id || farms.length === 0) return;

    try {
      const savedFarm = localStorage.getItem(STORAGE_KEYS.FARM_SELEZIONATA);
      if (savedFarm && farms.some((f) => f.id === savedFarm)) {
        setFarmSelezionata(savedFarm);
      } else {
        // Se non c'è una farm salvata o non è più valida, usa la prima
        setFarmSelezionata(farms[0].id);
      }
    } catch (error) {
      console.error("Errore nel caricamento della farm salvata:", error);
      setFarmSelezionata(farms[0].id);
    }
  }, [currentUser?.id, farms, STORAGE_KEYS.FARM_SELEZIONATA]);

  // Effetto per salvare la farm quando cambia
  useEffect(() => {
    if (!currentUser?.id || !farmSelezionata) return;
    salvaFarmSelezionata(farmSelezionata);
  }, [currentUser?.id, farmSelezionata, salvaFarmSelezionata]);

  // Effetto per salvare lo stato degli edifici quando cambia
  useEffect(() => {
    if (!currentUser?.id || !farmSelezionata) return;
    salvaStatoEdifici(expandedEdifici);
  }, [currentUser?.id, farmSelezionata, expandedEdifici, salvaStatoEdifici]);

  // Effetto per salvare lo stato della visualizzazione quando cambia
  useEffect(() => {
    if (!currentUser?.id || !farmSelezionata) return;
    salvaMostraAssegnati(mostraSoloAssegnati);
  }, [
    currentUser?.id,
    farmSelezionata,
    mostraSoloAssegnati,
    salvaMostraAssegnati,
  ]);

  // Effetto per caricare lo stato salvato della città
  useEffect(() => {
    if (!currentUser?.id || !farmSelezionata) return;

    try {
      const savedCittaExpanded = localStorage.getItem(
        STORAGE_KEYS.CITTA_EXPANDED
      );
      if (savedCittaExpanded !== null) {
        setCittaExpanded(JSON.parse(savedCittaExpanded));
      }
    } catch (error) {
      console.error("Errore nel caricamento dello stato città:", error);
    }
  }, [currentUser?.id, farmSelezionata, STORAGE_KEYS.CITTA_EXPANDED]);

  // Effetto per salvare lo stato della città quando cambia
  useEffect(() => {
    if (!currentUser?.id || !farmSelezionata) return;
    salvaCittaExpanded(cittaExpanded);
  }, [currentUser?.id, farmSelezionata, cittaExpanded, salvaCittaExpanded]);

  // Effetto per caricare lo stato salvato dei cesti
  useEffect(() => {
    if (!currentUser?.id || !farmSelezionata) return;

    try {
      const savedCestiExpanded = localStorage.getItem(
        STORAGE_KEYS.CESTI_EXPANDED
      );
      if (savedCestiExpanded !== null) {
        setCestiEspansi(JSON.parse(savedCestiExpanded));
      }
    } catch (error) {
      console.error("Errore nel caricamento dello stato cesti:", error);
    }
  }, [currentUser?.id, farmSelezionata, STORAGE_KEYS.CESTI_EXPANDED]);

  // Effetto per salvare lo stato dei cesti quando cambia
  useEffect(() => {
    if (!currentUser?.id || !farmSelezionata) return;
    salvaCestiExpanded(cestiEspansi);
  }, [currentUser?.id, farmSelezionata, cestiEspansi, salvaCestiExpanded]);

  // Ref per il timeout dello scroll
  const scrollTimeout = useRef<NodeJS.Timeout>();

  // Funzione per espandere/collassare tutti gli edifici e i cesti
  const toggleAllEdifici = useCallback(() => {
    const edificiIds = Object.keys(edifici);
    if (expandedEdifici.length === edificiIds.length) {
      // Se tutti sono espansi, collassa tutto (edifici e cesti)
      setExpandedEdifici([]);
      setCestiEspansi(false);
    } else {
      // Altrimenti espandi tutto (edifici e cesti)
      setExpandedEdifici(edificiIds);
      setCestiEspansi(true);
    }
  }, [expandedEdifici.length, edifici]);

  // Aggiorna il testo del pulsante per riflettere lo stato di espansione di edifici e cesti
  const getExpandButtonText = useMemo(() => {
    const tuttoEspanso =
      expandedEdifici.length === Object.keys(edifici).length && cestiEspansi;
    return tuttoEspanso ? "COLLASSA TUTTO" : "ESPANDI TUTTO";
  }, [expandedEdifici.length, edifici, cestiEspansi]);

  // Carica le farm del giocatore
  const caricaFarms = useCallback(async () => {
    if (!currentUser?.id) return;

    try {
      const userId =
        (currentUser.ruolo === "admin" ||
          currentUser.ruolo === "coordinatore" ||
          currentUser.ruolo === "moderatore") &&
        giocatoreSelezionato
          ? giocatoreSelezionato
          : currentUser.id;

      const userDoc = await getDoc(doc(db, "utenti", userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.farms) {
          const farmsData: Farm[] = userData.farms.map(
            (farm: any, index: number) => ({
              id: `${userId}_${index}`,
              farmId: `${userId}_${index}`,
              nome: farm.nome,
              livello: farm.livello || 1,
              isAttiva: farm.stato === "attivo",
              diamanti: farm.diamanti || 0,
              immagine: farm.immagine || "",
              giocatore_id: userId,
              giocatore_nome: userData.nome || "",
            })
          );
          setFarms(farmsData);
          if (farmsData.length > 0) {
            setFarmSelezionata(farmsData[0].farmId || "");
          }
        }
      }
    } catch (error) {
      console.error("Errore nel caricamento delle farm:", error);
      setError("Errore nel caricamento delle farm");
    }
  }, [currentUser, giocatoreSelezionato]);

  // Carica gli incarichi disponibili
  const caricaIncarichi = useCallback(async () => {
    try {
      const incarichiQuery = query(collection(db, "incarichi"));
      const incarichiSnapshot = await getDocs(incarichiQuery);
      const incarichiData = incarichiSnapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          } as Incarico)
      );
      setIncarichi(incarichiData);
    } catch (error) {
      console.error("Errore nel caricamento degli incarichi:", error);
    }
  }, []);

  // Carica le assegnazioni per la farm selezionata
  const caricaAssegnazioni = useCallback(async () => {
    if (!farmSelezionata) return;

    try {
      const assegnazioniQuery = query(
        collection(db, "assegnazioni"),
        where("farm_id", "==", farmSelezionata)
      );

      const assegnazioniSnapshot = await getDocs(assegnazioniQuery);
      const assegnazioniData = assegnazioniSnapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          } as Assegnazione)
      );

      setAssegnazioni(assegnazioniData);
    } catch (error) {
      console.error("Errore nel caricamento delle assegnazioni:", error);
    }
  }, [farmSelezionata]);

  // Carica i cesti e i loro incarichi
  const caricaCesti = useCallback(async () => {
    try {
      // Carica i cesti
      const cestiQuery = query(collection(db, "cesti"));
      const cestiSnapshot = await getDocs(cestiQuery);
      const cestiData = cestiSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        data_creazione: doc.data().data_creazione?.toDate() || new Date(),
      })) as Cesto[];
      setCesti(cestiData);

      // Carica gli incarichi per ogni cesto
      const incarichiMap = new Map<string, IncaricoInCesto[]>();

      // Per ogni cesto, prendiamo i suoi incarichi dalla proprietà 'incarichi'
      cestiData.forEach((cesto) => {
        if (cesto.incarichi && Array.isArray(cesto.incarichi)) {
          incarichiMap.set(cesto.id, cesto.incarichi);
        }
      });

      setCestiIncarichi(incarichiMap);
    } catch (error) {
      console.error("Errore nel caricamento dei cesti:", error);
    }
  }, []);

  // Carica i progressi per la farm selezionata
  const caricaProgressi = useCallback(async () => {
    if (!farmSelezionata) return;

    try {
      // Carica tutti i progressi esistenti per questa farm
      const progressiQuery = query(
        collection(db, "progressi_incarichi"),
        where("farm_id", "==", farmSelezionata)
      );

      const progressiSnapshot = await getDocs(progressiQuery);
      const progressiMap = new Map<string, number>();
      const progressiDocMap = new Map<string, string>();

      // Mappa i progressi esistenti
      progressiSnapshot.docs.forEach((doc) => {
        const progresso = doc.data();
        progressiMap.set(progresso.riferimento_id, progresso.quantita || 0);
        progressiDocMap.set(progresso.riferimento_id, doc.id);
      });

      setProgressi(progressiMap);
      setProgressiDocs(progressiDocMap);
    } catch (error) {
      console.error("Errore nel caricamento dei progressi:", error);
    }
  }, [farmSelezionata]);

  // Carica gli edifici dal database
  const caricaEdifici = useCallback(async () => {
    try {
      const edificiRef = collection(db, "edifici");
      const snapshot = await getDocs(edificiRef);
      const edificiMap: Record<string, string> = {};
      const edificiList = snapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          } as Edificio)
      );
      edificiList.forEach((edificio) => {
        edificiMap[edificio.id] = edificio.nome;
      });
      setEdifici(edificiMap);
      setEdificiData(edificiList);
    } catch (error) {
      console.error("Errore nel caricamento degli edifici:", error);
    }
  }, []);

  useEffect(() => {
    caricaEdifici();
  }, []);

  // Effetti per il caricamento iniziale dei dati
  useEffect(() => {
    caricaFarms();
    caricaIncarichi();
    caricaCesti();
  }, [caricaFarms, caricaIncarichi, caricaCesti]);

  useEffect(() => {
    if (farmSelezionata) {
      caricaAssegnazioni();
      caricaProgressi();
    }
  }, [farmSelezionata, caricaAssegnazioni, caricaProgressi]);

  useEffect(() => {
    if (incarichi.length > 0) {
      caricaProgressi();
    }
  }, [caricaProgressi, incarichi]);

  // Funzione per verificare se un incarico è assegnato
  const isIncaricoAssegnato = (incaricoId: string) => {
    return assegnazioni.some(
      (a) =>
        a.tipo === "incarico" &&
        a.riferimento_id === incaricoId &&
        a.farm_id === farmSelezionata
    );
  };

  // Funzione per verificare se un cesto è assegnato
  const isCestoAssegnato = (cestoId: string) => {
    return assegnazioni.some(
      (a) =>
        a.tipo === "cesto" &&
        a.riferimento_id === cestoId &&
        a.farm_id === farmSelezionata
    );
  };

  // Funzione per ottenere il progresso di un incarico
  const getProgressoIncarico = (incaricoId: string) => {
    return progressi.get(incaricoId) || 0;
  };

  // Funzione per calcolare il progresso di un cesto
  const calcolaProgressoCesto = (
    cesto: Cesto
  ): { completati: number; totale: number } => {
    const incarichiCesto = cestiIncarichi.get(cesto.id) || [];
    let completati = 0;
    let totale = incarichiCesto.length;

    incarichiCesto.forEach((incaricoInCesto) => {
      const incarico = incarichi.find(
        (i) => i.id === incaricoInCesto.incarico_id
      );
      if (incarico) {
        const progresso = getProgressoIncarico(incarico.id);
        const quantitaRichiesta = getQuantitaIncarico(incarico.id);
        if (progresso >= quantitaRichiesta) {
          completati++;
        }
      }
    });

    return { completati, totale };
  };

  // Funzione per calcolare il livello del cesto
  const calcolaLivelloCesto = (cestoId: string): number => {
    const incarichiCesto = cestiIncarichi.get(cestoId) || [];
    let livelloMassimo = 0;

    incarichiCesto.forEach((incaricoInCesto) => {
      // Cerca prima tra gli incarichi standard
      const incarico = incarichi.find(
        (i) => i.id === incaricoInCesto.incarico_id
      );
      if (incarico && incarico.livello_minimo > livelloMassimo) {
        livelloMassimo = incarico.livello_minimo;
      }

      // Se non lo trova, cerca tra gli incarichi città
      if (!incarico) {
        const incaricoCitta = incarichiCitta.find(
          (i) => i.id === incaricoInCesto.incarico_id
        );
        if (incaricoCitta && incaricoCitta.livello_minimo > livelloMassimo) {
          livelloMassimo = incaricoCitta.livello_minimo;
        }
      }
    });

    return livelloMassimo;
  };

  // Funzione per aggiornare il progresso di un incarico
  const aggiornaProgresso = async (incaricoId: string, nuovoValore: number) => {
    if (!farmSelezionata) return;

    try {
      const progressoDocId = progressiDocs.get(incaricoId);

      if (progressoDocId) {
        // Se il nuovo valore è 0, eliminiamo il documento
        if (nuovoValore === 0) {
          await deleteDoc(doc(db, "progressi_incarichi", progressoDocId));

          // Aggiorniamo le mappe locali
          const nuoviProgressi = new Map(progressi);
          const nuoviProgressiDocs = new Map(progressiDocs);
          nuoviProgressi.delete(incaricoId);
          nuoviProgressiDocs.delete(incaricoId);
          setProgressi(nuoviProgressi);
          setProgressiDocs(nuoviProgressiDocs);
        } else {
          // Altrimenti aggiorniamo il valore
          await updateDoc(doc(db, "progressi_incarichi", progressoDocId), {
            quantita: nuovoValore,
          });
          setProgressi(new Map(progressi.set(incaricoId, nuovoValore)));
        }
      } else if (nuovoValore > 0) {
        // Creiamo un nuovo documento solo se il valore è maggiore di 0
        const nuovoProgressoRef = await addDoc(
          collection(db, "progressi_incarichi"),
          {
            quantita: nuovoValore,
            farm_id: farmSelezionata,
            riferimento_id: incaricoId,
            tipo: "incarico",
            data_creazione: new Date(),
          }
        );

        // Aggiorniamo le mappe locali
        setProgressi(new Map(progressi.set(incaricoId, nuovoValore)));
        setProgressiDocs(
          new Map(progressiDocs.set(incaricoId, nuovoProgressoRef.id))
        );
      }

      // Se il progresso ha raggiunto la quantità richiesta, aggiorniamo l'assegnazione
      const incarico = incarichi.find((i) => i.id === incaricoId);
      if (incarico && nuovoValore >= incarico.quantita) {
        const assegnazione = assegnazioni.find(
          (a) => a.riferimento_id === incaricoId
        );
        if (assegnazione) {
          await updateDoc(doc(db, "assegnazioni", assegnazione.id), {
            completato: true,
            data_completamento: new Date(),
          });
        }
      }
    } catch (error) {
      console.error("Errore nell'aggiornamento del progresso:", error);
    }
  };

  // Funzione per ottenere la quantità dell'incarico nel cesto
  const getQuantitaIncaricoCesto = useCallback(
    (cestoId: string, incaricoId: string): number => {
      const cesto = cesti.find((c) => c.id === cestoId);
      if (!cesto) return 0;

      const incaricoInCesto = cesto.incarichi.find(
        (i) => i.incarico_id === incaricoId
      );
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
    },
    [cesti, derbySelezionato]
  );

  // Funzione per calcolare quante volte un incarico è stato completato
  const getCompletamentiMultipli = (
    progresso: number,
    quantita: number
  ): number => {
    return quantita > 0 ? Math.floor(progresso / quantita) : 0;
  };

  // Funzione per calcolare quante volte un cesto può essere completato
  const getCompletamentiCesto = useCallback(
    (cestoId: string): number => {
      const cesto = cesti.find((c) => c.id === cestoId);
      if (!cesto) return 0;

      // Calcola quante volte ogni incarico può essere completato
      const completamentiPerIncarico = cesto.incarichi.map(
        (incaricoInCesto) => {
          const progresso = getProgressoIncarico(incaricoInCesto.incarico_id);
          // Qui era l'errore, mancavano i parametri alla funzione
          return Math.floor(
            progresso /
              getQuantitaIncaricoCesto(cestoId, incaricoInCesto.incarico_id)
          );
        }
      );

      return Math.min(...completamentiPerIncarico);
    },
    [getProgressoIncarico, getQuantitaIncaricoCesto]
  );

  // Funzione per verificare se un cesto è completato
  const isCestoCompletato = useCallback(
    (cestoId: string): boolean => {
      const cesto = cesti.find((c) => c.id === cestoId);
      if (!cesto) return false;

      return cesto.incarichi.every((incaricoInCesto) => {
        const progresso = getProgressoIncarico(incaricoInCesto.incarico_id);
        // Usa getQuantitaIncaricoCesto invece di incaricoInCesto.quantita
        return (
          progresso >=
          getQuantitaIncaricoCesto(cestoId, incaricoInCesto.incarico_id)
        );
      });
    },
    [getProgressoIncarico, getQuantitaIncaricoCesto]
  );

  // Funzione per completare manualmente un incarico
  const completaIncarico = async (incaricoId: string, quantita: number) => {
    if (!farmSelezionata) return;
    await aggiornaProgresso(incaricoId, quantita);
  };

  // Funzione per resettare un cesto
  const resetCesto = async (cestoId: string) => {
    if (!farmSelezionata) return;

    const cesto = cesti.find((c) => c.id === cestoId);
    if (!cesto) return;

    try {
      // Prepara gli aggiornamenti per tutti gli incarichi
      const updates = cesto.incarichi
        .map(async (incaricoInCesto) => {
          const progressoDocId = progressiDocs.get(incaricoInCesto.incarico_id);
          if (progressoDocId) {
            return deleteDoc(doc(db, "progressi_incarichi", progressoDocId));
          }
        })
        .filter(Boolean);

      // Esegue tutti gli aggiornamenti in parallelo
      await Promise.all(updates);

      // Aggiorna lo stato locale
      const nuoviProgressi = new Map(progressi);
      const nuoviProgressiDocs = new Map(progressiDocs);

      cesto.incarichi.forEach((incaricoInCesto) => {
        nuoviProgressi.delete(incaricoInCesto.incarico_id);
        nuoviProgressiDocs.delete(incaricoInCesto.incarico_id);
      });

      setProgressi(nuoviProgressi);
      setProgressiDocs(nuoviProgressiDocs);
    } catch (error) {
      console.error("Errore nel reset del cesto:", error);
    }
  };

  // Funzione per aggiornare più progressi contemporaneamente
  const aggiornaProgressiMultipli = async (
    aggiornamenti: { incaricoId: string; nuovoValore: number }[]
  ) => {
    if (!farmSelezionata) return;

    try {
      const updates = await Promise.all(
        aggiornamenti
          .filter(Boolean)
          .map(async ({ incaricoId, nuovoValore }) => {
            const progressoDocId = progressiDocs.get(incaricoId);

            if (progressoDocId) {
              if (nuovoValore === 0) {
                return deleteDoc(
                  doc(db, "progressi_incarichi", progressoDocId)
                );
              } else {
                return updateDoc(
                  doc(db, "progressi_incarichi", progressoDocId),
                  {
                    quantita: nuovoValore,
                  }
                );
              }
            } else if (nuovoValore > 0) {
              const nuovoProgressoRef = await addDoc(
                collection(db, "progressi_incarichi"),
                {
                  quantita: nuovoValore,
                  farm_id: farmSelezionata,
                  riferimento_id: incaricoId,
                  tipo: "incarico",
                  data_creazione: new Date(),
                }
              );

              return { id: nuovoProgressoRef.id, incaricoId, nuovoValore };
            }
          })
      );

      // Aggiorna lo stato locale
      const nuoviProgressi = new Map(progressi);
      const nuoviProgressiDocs = new Map(progressiDocs);

      aggiornamenti.forEach(({ incaricoId, nuovoValore }) => {
        if (nuovoValore === 0) {
          nuoviProgressi.delete(incaricoId);
          nuoviProgressiDocs.delete(incaricoId);
        } else {
          nuoviProgressi.set(incaricoId, nuovoValore);
        }
      });

      // Aggiorna i nuovi documenti creati
      updates.forEach((update) => {
        if (update && "id" in update) {
          nuoviProgressiDocs.set(update.incaricoId, update.id);
        }
      });

      setProgressi(nuoviProgressi);
      setProgressiDocs(nuoviProgressiDocs);
    } catch (error) {
      console.error("Errore nell'aggiornamento multiplo dei progressi:", error);
      setError("Errore nell'aggiornamento dei progressi");
    }
  };

  // Funzione per tradurre il nome dell'incarico
  const getTranslatedName = useCallback(
    (nome: string) => {
      // Verifica se esiste una traduzione per questo incarico
      const traduzione = t(`incarichi.${nome}`, {
        defaultValue: nome,
      });
      return traduzione;
    },
    [t]
  );

  // Modifica la funzione matchSearch per accettare sia stringhe che oggetti Incarico
  const matchSearch = useCallback(
    (text: string | Incarico | undefined | null) => {
      if (!searchQuery) return true;
      if (!text) return false;

      // Se text è un oggetto Incarico, usa getTranslatedName per tradurre il nome
      const textToSearch =
        typeof text === "string" ? text : getTranslatedName(text.nome);
      return textToSearch.toLowerCase().includes(searchQuery.toLowerCase());
    },
    [searchQuery, getTranslatedName]
  );

  // Modifica la funzione completaCesto per gestire correttamente i tipi
  const completaCesto = async (cestoId: string) => {
    if (!farmSelezionata) return;

    const cesto = cesti.find((c) => c.id === cestoId);
    if (!cesto) return;

    // Prepara gli aggiornamenti per tutti gli incarichi che non hanno raggiunto la quantità richiesta
    const aggiornamenti = cesto.incarichi
      .map((incaricoInCesto) => {
        const progressoAttuale = getProgressoIncarico(
          incaricoInCesto.incarico_id
        );
        // Usa getQuantitaIncaricoCesto invece di incaricoInCesto.quantita
        const quantitaRichiesta = getQuantitaIncaricoCesto(
          cestoId,
          incaricoInCesto.incarico_id
        );
        if (progressoAttuale < quantitaRichiesta) {
          return {
            incaricoId: incaricoInCesto.incarico_id,
            nuovoValore: quantitaRichiesta, // Usa la quantità corretta dal derby
          };
        }
        return null;
      })
      .filter(
        (update): update is { incaricoId: string; nuovoValore: number } =>
          update !== null
      );

    if (aggiornamenti.length > 0) {
      await aggiornaProgressiMultipli(aggiornamenti);
    }
  };

  // Funzione per verificare se l'incarico è disponibile per il livello della farm corrente
  const isIncaricoDisponibile = (livelloMinimo: number): boolean => {
    const farm = farms.find((f) => f.farmId === farmSelezionata);
    return farm ? farm.livello >= livelloMinimo : false;
  };

  // Funzione per scrollare e evidenziare un incarico
  const scrollToIncarico = (incaricoId: string) => {
    // Trova l'incarico
    const incarico = incarichi.find((i) => i.id === incaricoId);
    const incaricoCitta = incarichiCitta.find((i) => i.id === incaricoId);

    if (incarico) {
      // Se è un incarico edificio
      if (incarico.edificio_id) {
        setExpandedEdifici((prev) =>
          prev.includes(incarico.edificio_id!)
            ? prev
            : [...prev, incarico.edificio_id!]
        );
      }
    } else if (incaricoCitta) {
      // Se è un incarico città, espandi la sezione città
      setCittaExpanded(true);
    }

    // Aspetta che il DOM si aggiorni dopo l'espansione
    setTimeout(() => {
      const element = document.getElementById(`incarico-${incaricoId}`);
      if (element) {
        // Scroll all'elemento
        element.scrollIntoView({ behavior: "smooth", block: "center" });

        // Aggiungi effetto flash
        element.style.transition = "background-color 0.5s";
        element.style.backgroundColor = "#ffeb3b";
        setTimeout(() => {
          element.style.backgroundColor = "";
        }, 1000);
      }
    }, 100);
  };

  // Funzione per verificare se tutti gli incarichi di un edificio sono non disponibili
  const tuttiIncarichiNonDisponibili = useCallback(
    (edificioId: string) => {
      const incarichiEdificio = incarichi.filter(
        (inc) => inc.edificio_id === edificioId
      );
      return (
        incarichiEdificio.length > 0 &&
        incarichiEdificio.every(
          (inc) => !isIncaricoDisponibile(inc.livello_minimo)
        )
      );
    },
    [incarichi, isIncaricoDisponibile]
  );

  // Funzione per verificare se un cesto ha incarichi assegnati
  const hasCestoIncarichiAssegnati = useCallback(
    (cestoId: string) => {
      const incarichiCesto = cestiIncarichi.get(cestoId) || [];
      return incarichiCesto.some((inc) => {
        const incarico = incarichi.find((i) => i.id === inc.incarico_id);
        return incarico && isIncaricoAssegnato(incarico.id);
      });
    },
    [cestiIncarichi, incarichi, isIncaricoAssegnato]
  );

  // Verifica se ci sono incarichi o cesti da mostrare
  const hasContentToShow = useMemo(() => {
    if (!mostraSoloAssegnati) return true;

    // Controlla se ci sono incarichi assegnati (sia normali che città)
    const hasAssignedTasks = incarichi.some((inc) =>
      isIncaricoAssegnato(inc.id)
    );
    const hasAssignedCityTasks = incarichiCitta.some((inc) =>
      isIncaricoAssegnato(inc.id)
    );

    // Controlla se ci sono cesti con incarichi assegnati
    const hasAssignedBaskets = cesti.some((cesto) =>
      hasCestoIncarichiAssegnati(cesto.id)
    );

    return hasAssignedTasks || hasAssignedCityTasks || hasAssignedBaskets;
  }, [
    incarichi,
    incarichiCitta,
    cesti,
    mostraSoloAssegnati,
    isIncaricoAssegnato,
    hasCestoIncarichiAssegnati,
  ]);

  // Funzione per verificare se un incarico corrisponde alla ricerca
  const matchesSearch = useCallback(
    (incarico: Incarico) => {
      return matchSearch(incarico.nome);
    },
    [matchSearch]
  );

  // Edifici filtrati e ordinati
  const edificiFiltrati = useMemo(() => {
    let edificiArray = Object.entries(edifici)
      .filter(([edificioId, nomeEdificio]) => {
        // Se c'è una ricerca attiva, mostra l'edificio solo se ha incarichi che corrispondono
        if (searchQuery) {
          const incarichiCorrispondenti = incarichi.filter(
            (inc) =>
              inc.edificio_id === edificioId &&
              inc.nome.toLowerCase().includes(searchQuery.toLowerCase())
          );
          return incarichiCorrispondenti.length > 0;
        }
        return true;
      })
      // Ordina per livello crescente
      .sort((a, b) => {
        const edificioA = edificiData.find((e) => e.id === a[0]);
        const edificioB = edificiData.find((e) => e.id === b[0]);
        return (edificioA?.livello || 0) - (edificioB?.livello || 0);
      });

    // Applica l'ordinamento alfabetico se richiesto
    if (ordinamento.tipo === "alfabetico") {
      edificiArray.sort((a, b) => {
        return ordinamento.direzione === "asc"
          ? a[1].localeCompare(b[1])
          : b[1].localeCompare(a[1]);
      });
    }

    return edificiArray;
  }, [edifici, searchQuery, ordinamento, edificiData, incarichi]);

  // Filtra i cesti in base alla ricerca e alla modalità di visualizzazione
  const cestiFiltrati = useMemo(() => {
    return cesti.filter((cesto) => {
      // Se siamo in modalità "solo assegnati", verifica che il cesto abbia incarichi assegnati
      if (mostraSoloAssegnati) {
        // Verifica se il cesto stesso è assegnato
        const cestoAssegnato = assegnazioni.some(
          (a) =>
            a.tipo === "cesto" &&
            a.riferimento_id === cesto.id &&
            a.farm_id === farmSelezionata
        );

        if (!cestoAssegnato) {
          return false;
        }
      }

      // Filtra in base alla ricerca se presente
      if (searchQuery) {
        const cestoMatch = matchSearch(cesto.nome);
        const incarichiCesto = cestiIncarichi.get(cesto.id) || [];
        const incarichiMatch = incarichiCesto.some((inc) => {
          const incarico = incarichi.find((i) => i.id === inc.incarico_id);
          return incarico && matchSearch(incarico.nome);
        });
        return cestoMatch || incarichiMatch;
      }

      return true;
    });
  }, [
    cesti,
    mostraSoloAssegnati,
    searchQuery,
    cestiIncarichi,
    incarichi,
    matchSearch,
    assegnazioni,
    farmSelezionata,
  ]);

  // Verifica se ci sono cesti che contengono risultati della ricerca
  const hasCestiResults = useMemo(() => {
    if (!searchQuery) return true;
    return cestiFiltrati.some((cesto) => {
      const incarichiCesto = cestiIncarichi.get(cesto.id) || [];
      return (
        incarichiCesto.some((inc) => {
          const incarico = incarichi.find((i) => i.id === inc.incarico_id);
          return incarico && matchSearch(incarico);
        }) || cesto.nome.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  }, [searchQuery, cestiFiltrati, cestiIncarichi, incarichi, matchSearch]);

  // Effetto per gestire l'espansione automatica degli edifici e cesti durante la ricerca
  useEffect(() => {
    if (searchQuery) {
      // Espande gli edifici che contengono risultati
      const edificiDaEspandere = edificiFiltrati
        .filter(([edificioId]) => {
          const incarichiEdificio = incarichi.filter(
            (inc) => inc.edificio_id === edificioId && matchesSearch(inc)
          );
          return incarichiEdificio.length > 0;
        })
        .map(([edificioId]) => edificioId);

      setExpandedEdifici(edificiDaEspandere);

      // Espande i cesti se contengono risultati
      const hasMatchingCesti = cestiFiltrati.some((cesto) => {
        const incarichiCesto = cestiIncarichi.get(cesto.id) || [];
        return (
          incarichiCesto.some((inc) => {
            const incarico = incarichi.find((i) => i.id === inc.incarico_id);
            return incarico && matchesSearch(incarico.nome);
          }) || cesto.nome.toLowerCase().includes(searchQuery.toLowerCase())
        );
      });

      if (hasMatchingCesti) {
        setCestiEspansi(true);
      }
    }
  }, [
    searchQuery,
    edificiFiltrati,
    incarichi,
    matchesSearch,
    cestiFiltrati,
    cestiIncarichi,
  ]);

  // Funzione per ciclare tra i tipi di ordinamento
  const handleOrdinamento = useCallback(() => {
    setOrdinamento((prev) => {
      if (prev.tipo === null) return { tipo: "alfabetico", direzione: "asc" };
      if (prev.tipo === "alfabetico") {
        return { tipo: "livello", direzione: prev.direzione };
      }
      if (prev.tipo === "livello") {
        return { tipo: "completamento", direzione: prev.direzione };
      }
      if (prev.tipo === "completamento") {
        return { tipo: null, direzione: prev.direzione };
      }
      return prev;
    });
  }, []);

  // Funzione per ordinare gli incarichi
  const incarichiOrdinati = useMemo(() => {
    if (!ordinamento.tipo) return incarichi;

    return [...incarichi].sort((a, b) => {
      switch (ordinamento.tipo) {
        case "alfabetico":
          const nomeA = (getTranslatedName(a.nome) || "").toLowerCase();
          const nomeB = (getTranslatedName(b.nome) || "").toLowerCase();
          return ordinamento.direzione === "asc"
            ? nomeA.localeCompare(nomeB)
            : nomeB.localeCompare(nomeA);

        case "livello":
          if (ordinamento.direzione === "asc") {
            return a.livello_minimo - b.livello_minimo;
          } else {
            return b.livello_minimo - a.livello_minimo;
          }

        case "completamento":
          const progressoA = getProgressoIncarico(a.id);
          const progressoB = getProgressoIncarico(b.id);
          const quantitaA = getQuantitaIncarico(a.id);
          const quantitaB = getQuantitaIncarico(b.id);
          const completatoA = progressoA >= quantitaA;
          const completatoB = progressoB >= quantitaB;

          if (completatoA === completatoB) {
            // Se entrambi sono completati o non completati, ordina per progresso percentuale
            const percentualeA = (progressoA / quantitaA) * 100;
            const percentualeB = (progressoB / quantitaB) * 100;
            return ordinamento.direzione === "asc"
              ? percentualeA - percentualeB
              : percentualeB - percentualeA;
          }

          return ordinamento.direzione === "asc"
            ? completatoA
              ? 1
              : -1
            : completatoA
            ? -1
            : 1;

        default:
          return 0;
      }
    });
  }, [
    incarichi,
    ordinamento,
    getProgressoIncarico,
    getQuantitaIncarico,
    getTranslatedName,
  ]);

  // Raggruppa incarichi per edificio
  const incarichiPerEdificio = useMemo(() => {
    return incarichi.reduce((acc, incarico) => {
      const key = incarico.edificio_id || "senza_edificio";
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(incarico);
      return acc;
    }, {} as { [key: string]: Incarico[] });
  }, [incarichi]);

  // Funzione per ottenere gli incarichi di un edificio
  const getIncarichiEdificio = useCallback(
    (edificioId: string): Incarico[] => {
      let incarichi = incarichiPerEdificio[edificioId] || [];

      // Se c'è una ricerca attiva, filtra solo gli incarichi che corrispondono
      if (searchQuery) {
        incarichi = incarichi.filter((incarico) => matchSearch(incarico));
      }

      // Se mostraSoloAssegnati è true, filtra solo gli incarichi assegnati
      if (mostraSoloAssegnati) {
        incarichi = incarichi.filter((incarico) => {
          // Verifica se l'incarico ha un'assegnazione diretta
          const haAssegnazioneDiretta = assegnazioni.some(
            (a) =>
              a.tipo === "incarico" &&
              a.riferimento_id === incarico.id &&
              a.farm_id === farmSelezionata
          );

          // Verifica se l'incarico è in un cesto assegnato
          const isInCestoAssegnato = Array.from(cestiIncarichi.entries()).some(
            ([cestoId, incarichiCesto]) => {
              const cestoAssegnato = assegnazioni.some(
                (a) =>
                  a.tipo === "cesto" &&
                  a.riferimento_id === cestoId &&
                  a.farm_id === farmSelezionata
              );
              return (
                cestoAssegnato &&
                incarichiCesto.some((inc) => inc.incarico_id === incarico.id)
              );
            }
          );

          return haAssegnazioneDiretta || isInCestoAssegnato;
        });
      }

      return incarichi;
    },
    [
      incarichiPerEdificio,
      mostraSoloAssegnati,
      assegnazioni,
      farmSelezionata,
      cestiIncarichi,
      searchQuery,
      matchSearch,
    ]
  );

  // Modifica la funzione handleChangeFarm per accettare il nuovo tipo
  const handleChangeFarm = useCallback(
    (event: React.SyntheticEvent, value: string) => {
      setFarmSelezionata(value);
      // Resetta gli stati salvati quando si cambia farm
      setExpandedEdifici([]);
      window.scrollTo(0, 0);
    },
    []
  );

  // Gestione espansione edifici
  const handleExpandEdificio = (edificioId: string) => {
    setExpandedEdifici((prev) =>
      prev.includes(edificioId)
        ? prev.filter((id) => id !== edificioId)
        : [...prev, edificioId]
    );
  };

  // Funzione per trovare il cesto che contiene un incarico
  const trovaCestoPerIncarico = useCallback(
    (incaricoId: string) => {
      if (!cestiIncarichi) return null;
      for (const [cestoId, incarichi] of cestiIncarichi.entries()) {
        if (incarichi.some((inc) => inc.incarico_id === incaricoId)) {
          return cestoId;
        }
      }
      return null;
    },
    [cestiIncarichi]
  );

  // Funzione per trovare il nome del cesto che contiene un incarico
  const trovaNomeCestoPerIncarico = useCallback(
    (incaricoId: string) => {
      if (!cestiIncarichi || !cesti) return null;
      for (const [cestoId, incarichi] of cestiIncarichi.entries()) {
        if (incarichi.some((inc) => inc.incarico_id === incaricoId)) {
          const cesto = cesti.find((c) => c.id === cestoId);
          return cesto?.nome || null;
        }
      }
      return null;
    },
    [cestiIncarichi, cesti]
  );

  // Funzione per navigare a un cesto specifico
  const navigaACesto = useCallback(
    (cestoId: string) => {
      // Espande la sezione dei cesti se è chiusa
      if (!cestiEspansi) {
        setCestiEspansi(true);
      }

      // Imposta l'highlight
      setCestoHighlight(cestoId);

      // Rimuovi l'highlight dopo un po'
      setTimeout(() => {
        setCestoHighlight(null);
      }, 1000);

      // Aspetta il prossimo tick per assicurarci che il DOM sia aggiornato
      setTimeout(() => {
        // Trova l'elemento del cesto
        const cestoElement = document.getElementById(`cesto-${cestoId}`);
        if (cestoElement) {
          // Scroll all'elemento
          cestoElement.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 0);
    },
    [cestiEspansi]
  );

  // Funzione per determinare il colore della riga e della checkbox in base alla quantità
  const getCompletionColors = useCallback(
    (incarico: Incarico) => {
      const quantitaProdotta = getProgressoIncarico(incarico.id);
      const quantitaNecessaria = getQuantitaIncarico(incarico.id);
      const quantitaTotaleCesti = cestiIncarichi
        ? Array.from(cestiIncarichi.entries())
            .filter(([_, cesto]) =>
              cesto.some((inc) => inc.incarico_id === incarico.id)
            )
            .reduce((total, [_, cesto]) => {
              const incaricoInCesto = cesto.find(
                (inc) => inc.incarico_id === incarico.id
              );
              return (
                total +
                (incaricoInCesto
                  ? getQuantitaIncaricoCesto(cesto.id, incarico.id)
                  : 0)
              );
            }, 0)
        : 0;

      const quantitaTotaleNecessaria = quantitaNecessaria + quantitaTotaleCesti;

      // Se non c'è progresso, ritorna il colore di default
      if (quantitaProdotta === 0) {
        return {
          backgroundColor: "transparent",
          checkboxColor: "default",
        };
      }

      // Se l'incarico è completamente fatto (quantità base + cesti)
      if (
        quantitaProdotta >= quantitaTotaleNecessaria &&
        quantitaTotaleNecessaria > 0
      ) {
        return {
          backgroundColor: "#e8f5e9", // verde chiaro
          checkboxColor: "success", // verde
        };
      }
      // Se l'incarico base è completato ma non i cesti
      else if (
        quantitaProdotta >= quantitaNecessaria &&
        quantitaNecessaria > 0
      ) {
        return {
          backgroundColor: "#fff3e0", // arancione chiaro
          checkboxColor: "warning", // arancione
        };
      }
      // Non completato
      return {
        backgroundColor: "transparent",
        checkboxColor: "default",
      };
    },
    [getProgressoIncarico, cestiIncarichi, getQuantitaIncaricoCesto]
  );

  // Modifica la funzione calcolaQuantitaTotale
  const calcolaQuantitaTotale = useCallback(
    (incaricoId: string) => {
      const incarico = incarichi.find((inc) => inc.id === incaricoId);
      if (!incarico) return { base: 0, cesti: 0, totale: 0 };

      const quantitaBase = getQuantitaIncarico(incaricoId);
      const quantitaCesti = cestiIncarichi
        ? Array.from(cestiIncarichi.entries())
            .filter(([cestoId, cesto]) =>
              cesto.some((inc) => inc.incarico_id === incaricoId)
            )
            .reduce((total, [cestoId, cesto]) => {
              const incaricoInCesto = cesto.find(
                (inc) => inc.incarico_id === incaricoId
              );
              return (
                total +
                (incaricoInCesto
                  ? getQuantitaIncaricoCesto(cestoId, incaricoId)
                  : 0)
              );
            }, 0)
        : 0;

      return {
        base: quantitaBase,
        cesti: quantitaCesti,
        totale: quantitaBase + quantitaCesti,
      };
    },
    [incarichi, cestiIncarichi, getQuantitaIncaricoCesto, derbySelezionato]
  );

  // Funzione per ottenere lo stile del chip del cesto
  const getChipStyle = useCallback(
    (incaricoId: string, cestoId: string) => {
      const quantitaProdotta = getProgressoIncarico(incaricoId);
      const quantitaCesto = getQuantitaIncaricoCesto(cestoId, incaricoId);

      // Se la quantità prodotta è sufficiente per il cesto
      if (quantitaProdotta >= quantitaCesto) {
        return {
          bgcolor: "#e8f5e9", // verde chiaro
          color: "#2e7d32", // verde scuro
          border: "1px solid #2e7d32",
        };
      }

      // Non completato
      return {
        bgcolor: "grey.100",
        color: "text.secondary",
        border: "1px solid transparent",
      };
    },
    [getProgressoIncarico, cestiIncarichi, derbySelezionato]
  );

  // Funzione per caricare la lista dei giocatori (per admin e coordinatori)
  const caricaGiocatori = useCallback(async () => {
    if (
      !["admin", "coordinatore", "moderatore"].includes(
        currentUser?.ruolo || ""
      )
    )
      return;

    try {
      const querySnapshot = await getDocs(collection(db, "utenti"));
      const giocatoriData = querySnapshot.docs
        .map((doc) => ({
          id: doc.id,
          nome: doc.data().nome,
          pin: doc.data().pin,
          ruolo: doc.data().ruolo,
          farms: doc.data().farms || [],
        }))
        .filter(
          (g) =>
            g.pin !== currentUser.pin && // Esclude l'utente corrente
            g.ruolo !== "admin" // Esclude gli admin
        )
        .sort((a, b) => a.nome.localeCompare(b.nome));

      setGiocatori(giocatoriData);
    } catch (error) {
      console.error("Errore nel caricamento dei giocatori:", error);
      setError("Errore nel caricamento dei giocatori");
    }
  }, [currentUser]);

  // Effetto per caricare i giocatori all'avvio (per admin e coordinatori)
  useEffect(() => {
    if (
      currentUser?.ruolo === "admin" ||
      currentUser?.ruolo === "coordinatore" ||
      currentUser?.ruolo === "moderatore"
    ) {
      caricaGiocatori();
    }
  }, [currentUser, caricaGiocatori]);

  // Effetto per ricaricare le farm quando cambia il giocatore selezionato
  useEffect(() => {
    caricaFarms();
  }, [caricaFarms, giocatoreSelezionato]);

  // Riferimento per il componente di stampa
  const stampaRef = useRef<HTMLDivElement>(null);

  // Funzione per ottenere la quantità dell'incarico città in base al derby selezionato
  const getQuantitaIncaricoCitta = (incarico: IncaricoCitta): number => {
    if (!derbySelezionato || !incarico.quantita_derby) {
      return incarico.quantita;
    }

    // Se c'è una quantità specifica per questo derby, usala
    const quantitaDerby = incarico.quantita_derby[derbySelezionato.id];
    if (typeof quantitaDerby === "undefined" || quantitaDerby === null) {
      return incarico.quantita;
    }

    return quantitaDerby;
  };

  // Funzione per preparare i dati per la stampa
  const getDatiStampa = useCallback(() => {
    // Trova la farm selezionata
    const farmCorrente = farms.find((f) => f.farmId === farmSelezionata);
    const giocatoreCorrente = giocatori.find(
      (g) => g.id === (giocatoreSelezionato || currentUser?.id)
    );

    // Oggetto per raggruppare gli incarichi per edificio
    const incarichiPerEdificio: {
      [key: string]: Array<{
        incarico: Incarico;
        quantita: number;
        cesto?: Cesto;
      }>;
    } = {};

    // Prima raccogli tutti gli incarichi assegnati singolarmente
    incarichi.forEach((inc) => {
      if (isIncaricoAssegnato(inc.id)) {
        const edificioId = inc.edificio_id || "senza_edificio";
        if (!incarichiPerEdificio[edificioId]) {
          incarichiPerEdificio[edificioId] = [];
        }
        incarichiPerEdificio[edificioId].push({
          incarico: inc,
          quantita: getQuantitaIncarico(inc.id),
        });
      }
    });

    // Poi aggiungi gli incarichi dai cesti assegnati
    cesti.forEach((cesto) => {
      const cestoAssegnato = assegnazioni.some(
        (a) => a.tipo === "cesto" && a.riferimento_id === cesto.id
      );
      if (cestoAssegnato) {
        cesto.incarichi.forEach((incaricoInCesto) => {
          const incarico = incarichi.find(
            (inc) => inc.id === incaricoInCesto.incarico_id
          );
          if (incarico) {
            const edificioId = incarico.edificio_id || "senza_edificio";
            if (!incarichiPerEdificio[edificioId]) {
              incarichiPerEdificio[edificioId] = [];
            }
            incarichiPerEdificio[edificioId].push({
              incarico: incarico,
              quantita: getQuantitaIncaricoCesto(cesto.id, incarico.id),
              cesto: cesto,
            });
          }
        });
      }
    });

    // Appiattisci l'array mantenendo l'ordine per edificio
    const incarichiStampa = Object.values(incarichiPerEdificio).flat();

    // Prepara gli incarichi città (anche se vuoti, per mostrare l'header)
    const incarichiCittaStampa = incarichiCitta
      .filter((inc) => isIncaricoAssegnato(inc.id))
      .map((inc) => ({
        incarico: inc,
        quantita: getQuantitaIncaricoCitta(inc),
      }));

    return {
      giocatore: giocatoreCorrente?.nome || currentUser?.nome || "",
      incarichi: incarichiStampa,
      incarichiCitta: incarichiCittaStampa,
      nomeFarm: farmCorrente?.nome,
      livelloFarm: farmCorrente?.livello,
      pin: giocatoreCorrente?.pin || currentUser?.pin,
      totaleCitta,
    };
  }, [
    incarichi,
    assegnazioni,
    cesti,
    currentUser,
    isIncaricoAssegnato,
    farms,
    farmSelezionata,
    giocatori,
    giocatoreSelezionato,
    incarichiCitta,
    getQuantitaIncaricoCitta,
    totaleCitta,
    derbySelezionato,
  ]);

  // Modifica la funzione generaPDF
  const generaPDF = async () => {
    try {
      if (!stampaRef.current) return;

      const opt = {
        margin: 10,
        filename: `incarichi_${currentUser?.nome || "giocatore"}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: true,
          imageTimeout: 15000,
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" as const },
      };

      // Aspetta un momento per assicurarsi che tutte le immagini siano caricate
      await new Promise((resolve) => setTimeout(resolve, 1000));

      await html2pdf().set(opt).from(stampaRef.current).save();
    } catch (error) {
      console.error("Errore nella generazione del PDF:", error);
      setError("Errore nella generazione del PDF");
    }
  };

  // Funzione per caricare gli incarichi città
  const caricaIncarichiCitta = async () => {
    try {
      // Prima carico tutti gli incarichi città disponibili
      const incarichiCittaSnapshot = await getDocs(
        collection(db, "incarichi_citta")
      );
      const incarichiCittaData = incarichiCittaSnapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          } as IncaricoCitta)
      );

      // Salvo tutti gli incarichi città
      setTuttiIncarichiCitta(incarichiCittaData);

      if (mostraSoloAssegnati) {
        // Se mostraSoloAssegnati è true, mostra solo gli incarichi città assegnati
        const assegnazioniSnapshot = await getDocs(
          query(
            collection(db, "assegnazioni"),
            where("farm_id", "==", farmSelezionata),
            where("tipo", "==", "incarico")
          )
        );

        // Filtro solo le assegnazioni che si riferiscono a incarichi città
        const incarichiAssegnati = assegnazioniSnapshot.docs
          .map((doc) => {
            const assegnazione = { id: doc.id, ...doc.data() } as Assegnazione;
            return incarichiCittaData.find(
              (inc) => inc.id === assegnazione.riferimento_id
            );
          })
          .filter((inc): inc is IncaricoCitta => inc !== undefined);

        setIncarichiCitta(incarichiAssegnati);
      } else {
        // Se mostraSoloAssegnati è false, mostra tutti gli incarichi città
        setIncarichiCitta(incarichiCittaData);
      }
    } catch (error) {
      console.error("Errore nel caricamento degli incarichi città:", error);
    }
  };

  // Aggiungi mostraSoloAssegnati alle dipendenze dell'effetto
  useEffect(() => {
    if (!farmSelezionata) return;
    caricaIncarichiCitta();
  }, [farmSelezionata, mostraSoloAssegnati]);

  // Carica i derby dal database
  useEffect(() => {
    const q = query(collection(db, "derby"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const derbyData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Derby[];
      setDerby(derbyData);

      const derbyAttivo = derbyData.find((d) => d.attivo);
      if (derbyAttivo) {
        setDerbyAttivo(derbyAttivo);
        setDerbySelezionato(derbyAttivo);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleChangeDerby = (event: SelectChangeEvent) => {
    const derbyId = event.target.value as string;
    const selectedDerby = derby.find((d) => d.id === derbyId);
    setDerbySelezionato(selectedDerby || null);
  };

  // Funzione per verificare se un incarico è completato
  const isIncaricoCompletato = (incaricoId: string): boolean => {
    const progresso = getProgressoIncarico(incaricoId);
    if (progresso === 0) return false;

    const incaricoCitta = incarichiCitta.find((i) => i.id === incaricoId);
    if (incaricoCitta) {
      return progresso >= getQuantitaIncaricoCitta(incaricoCitta);
    }

    const quantitaNecessaria = getQuantitaIncarico(incaricoId);
    return progresso >= quantitaNecessaria;
  };

  // Funzione per calcolare il totale dei progressi della città
  const calcolaTotaleProgressiCitta = useCallback(async (): Promise<number> => {
    try {
      // Ottieni tutti gli incarichi città
      const incarichiCittaSnapshot = await getDocs(
        collection(db, "incarichi_citta")
      );
      const tuttiIncarichi = incarichiCittaSnapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          } as IncaricoCitta)
      );

      // Calcola il totale usando tutti gli incarichi
      return tuttiIncarichi.reduce((total, incarico) => {
        const progresso = getProgressoIncarico(incarico.id);
        return total + progresso;
      }, 0);
    } catch (error) {
      console.error("Errore nel calcolo del totale progressi città:", error);
      return 0;
    }
  }, [getProgressoIncarico]);

  // Effetto per aggiornare il totale quando cambiano i progressi
  useEffect(() => {
    calcolaTotaleProgressiCitta().then(setTotaleCitta);
  }, [calcolaTotaleProgressiCitta, progressi]);

  // Costante per la soglia massima della città
  const SOGLIA_MASSIMA_CITTA = 42;

  // Vista ordinata globalmente
  const incarichiDaMostrare = useMemo(() => {
    // Prima filtriamo gli incarichi in base a mostraSoloAssegnati
    const incarichiVisibili = mostraSoloAssegnati
      ? incarichi.filter((inc) => isIncaricoAssegnato(inc.id))
      : incarichi;

    // Poi applichiamo l'ordinamento se richiesto
    if (ordinamento.tipo) {
      return [...incarichiVisibili].sort((a, b) => {
        switch (ordinamento.tipo) {
          case "alfabetico":
            const nomeA = (getTranslatedName(a.nome) || "").toLowerCase();
            const nomeB = (getTranslatedName(b.nome) || "").toLowerCase();
            return ordinamento.direzione === "asc"
              ? nomeA.localeCompare(nomeB)
              : nomeB.localeCompare(nomeA);

          case "livello":
            if (ordinamento.direzione === "asc") {
              return a.livello_minimo - b.livello_minimo;
            } else {
              return b.livello_minimo - a.livello_minimo;
            }

          case "completamento":
            const progressoA = getProgressoIncarico(a.id);
            const progressoB = getProgressoIncarico(b.id);
            const quantitaA = getQuantitaIncarico(a.id);
            const quantitaB = getQuantitaIncarico(b.id);
            const completatoA = progressoA >= quantitaA;
            const completatoB = progressoB >= quantitaB;

            if (completatoA === completatoB) {
              // Se entrambi sono completati o non completati, ordina per progresso percentuale
              const percentualeA = (progressoA / quantitaA) * 100;
              const percentualeB = (progressoB / quantitaB) * 100;
              return ordinamento.direzione === "asc"
                ? percentualeA - percentualeB
                : percentualeB - percentualeA;
            }

            return ordinamento.direzione === "asc"
              ? completatoA
                ? 1
                : -1
              : completatoA
              ? -1
              : 1;

          default:
            return 0;
        }
      });
    }
    return incarichiVisibili;
  }, [
    incarichi,
    ordinamento,
    mostraSoloAssegnati,
    isIncaricoAssegnato,
    getProgressoIncarico,
    getQuantitaIncarico,
    getTranslatedName,
  ]);

  // Verifica se ci sono incarichi città che corrispondono alla ricerca
  const hasIncarichiCittaResults = useMemo(() => {
    if (!searchQuery) return true;
    return incarichiCitta.some((incarico) => matchSearch(incarico));
  }, [searchQuery, incarichiCitta, matchSearch]);

  // Filtra gli incarichi città in base alla ricerca
  const incarichiCittaFiltrati = useMemo(() => {
    if (!searchQuery) return incarichiCitta;
    return incarichiCitta.filter((incarico) => matchSearch(incarico));
  }, [searchQuery, incarichiCitta, matchSearch]);

  // Funzione per salvare il giocatore selezionato
  const salvaGiocatoreSelezionato = useCallback(
    (giocatoreId: string | null) => {
      try {
        if (giocatoreId) {
          localStorage.setItem(STORAGE_KEYS.GIOCATORE_SELEZIONATO, giocatoreId);
        } else {
          localStorage.removeItem(STORAGE_KEYS.GIOCATORE_SELEZIONATO);
        }
      } catch (error) {
        console.error(
          "Errore nel salvataggio del giocatore selezionato:",
          error
        );
      }
    },
    [STORAGE_KEYS.GIOCATORE_SELEZIONATO]
  );

  // Effetto per caricare il giocatore selezionato all'avvio
  useEffect(() => {
    if (currentUser?.ruolo !== "admin") return;

    try {
      const savedGiocatore = localStorage.getItem(
        STORAGE_KEYS.GIOCATORE_SELEZIONATO
      );
      if (savedGiocatore) {
        setGiocatoreSelezionato(savedGiocatore);
      }
    } catch (error) {
      console.error("Errore nel caricamento del giocatore salvato:", error);
    }
  }, [currentUser?.ruolo, STORAGE_KEYS.GIOCATORE_SELEZIONATO]);

  // Effetto per salvare il giocatore quando cambia
  useEffect(() => {
    if (currentUser?.ruolo !== "admin") return;
    salvaGiocatoreSelezionato(giocatoreSelezionato);
  }, [currentUser?.ruolo, giocatoreSelezionato, salvaGiocatoreSelezionato]);

  // Funzione per renderizzare un singolo incarico
  const renderIncaricoCard = (incarico: Incarico) => {
    const progresso = getProgressoIncarico(incarico.id);
    const isCompletato = isIncaricoCompletato(incarico.id);
    const isDisponibile = isIncaricoDisponibile(incarico.livello_minimo);
    const completamenti = getCompletamentiMultipli(
      progresso,
      getQuantitaIncarico(incarico.id)
    );

    return (
      <Box
        id={`incarico-${incarico.id}`}
        key={incarico.id}
        sx={{
          position: "relative",
          display: "flex",
          alignItems: "flex-start",
          minHeight: "88px",
          p: 1.5,
          borderBottom: "1px solid rgba(0, 0, 0, 0.12)",
          bgcolor: getCompletionColors(incarico).backgroundColor,
          transition: "background-color 0.2s ease",
          borderRadius: 1,
          ...(isIncaricoAssegnato(incarico.id) && {
            "&::before": {
              content: '""',
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: "4px",
              backgroundColor: "primary.main",
            },
          }),
          ...(!isDisponibile && {
            filter: "grayscale(100%)",
            opacity: 0.7,
            pointerEvents: "none",
            bgcolor: "grey.100",
          }),
        }}
      >
        {/* Strisciolina del livello */}
        <Box
          sx={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: "24px",
            bgcolor: "rgb(33, 150, 243, 0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography
            sx={{
              fontSize: "0.75rem",
              fontStyle: "italic",
              color: "rgb(33, 150, 243)",
              width: "3ch",
              textAlign: "center",
            }}
          >
            {incarico.livello_minimo}
          </Typography>
        </Box>

        {/* Contenuto principale */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            width: "100%",
            pl: 0,
          }}
        >
          {/* Checkbox, Avatar e Quantità */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {/* Checkbox e contatore completamenti */}
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 0.5,
                ml: 2,
              }}
            >
              <Checkbox
                checked={isCompletato}
                onChange={(e) => {
                  const quantitaNecessaria = getQuantitaIncarico(incarico.id);
                  if (e.target.checked) {
                    aggiornaProgresso(incarico.id, quantitaNecessaria);
                  } else {
                    aggiornaProgresso(incarico.id, 0);
                  }
                }}
                color={
                  getCompletionColors(incarico).checkboxColor as
                    | "success"
                    | "warning"
                    | "default"
                }
                sx={{ p: 0.5 }}
              />
              {completamenti > 0 && (
                <Typography
                  variant="caption"
                  sx={{
                    color: "success.main",
                    fontWeight: "medium",
                    fontSize: "0.75rem",
                  }}
                >
                  x{completamenti}
                </Typography>
              )}
            </Box>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 0.5,
              }}
            >
              <Avatar
                src={incarico.immagine}
                variant="rounded"
                sx={{ width: 40, height: 40 }}
              >
                {incarico.nome.charAt(0)}
              </Avatar>
              <Typography
                sx={{
                  fontSize: "0.80rem",
                  fontWeight: "medium",
                  color: "text.primary",
                  bgcolor: "white",
                  px: 0.75,
                  py: 0.25,
                  borderRadius: 1,
                  border: "1px solid rgba(0, 0, 0, 0.12)",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                  lineHeight: 1,
                }}
              >
                {progresso}/{getQuantitaIncarico(incarico.id)}
              </Typography>
            </Box>
          </Box>

          {/* Nome e badge */}
          <Box
            sx={{
              ml: 2,
              flexGrow: 1,
              minWidth: 0,
              mr: 1,
            }}
          >
            <Typography
              variant="body1"
              sx={{
                wordBreak: "break-word",
                overflow: "hidden",
                mb: 0.5,
              }}
            >
              {getTranslatedName(incarico.nome)}
            </Typography>
            <Stack spacing={0.5} sx={{ mt: 0.5 }}>
              {incarico.is_obbligatorio && (
                <Chip
                  size="small"
                  label="Obbligatorio"
                  color="warning"
                  sx={{ height: "20px", width: "fit-content" }}
                />
              )}
              {cestiIncarichi &&
                Array.from(cestiIncarichi.entries()).some(([_, cesto]) =>
                  cesto.some((inc) => inc.incarico_id === incarico.id)
                ) && (
                  <Stack spacing={0.5}>
                    {cestiIncarichi &&
                      Array.from(cestiIncarichi.entries()).map(
                        ([cestoId, cesto]) => {
                          const cestoIncarico = cesto.find(
                            (inc) => inc.incarico_id === incarico.id
                          );
                          if (!cestoIncarico) return null;

                          const cestoInfo = cesti.find((c) => c.id === cestoId);
                          if (!cestoInfo) return null;

                          const chipStyle = getChipStyle(incarico.id, cestoId);
                          const quantitaProdotta = getProgressoIncarico(
                            incarico.id
                          );
                          const quantitaCesto = cestoIncarico.quantita;

                          return (
                            <Chip
                              key={cestoId}
                              size="small"
                              label={`${cestoInfo.nome} (${
                                quantitaProdotta >= quantitaCesto
                                  ? quantitaCesto
                                  : quantitaProdotta
                              }/${quantitaCesto})`}
                              sx={{
                                height: "20px",
                                cursor: "pointer",
                                width: "fit-content",
                                ...chipStyle,
                                "&:hover": {
                                  bgcolor: chipStyle.bgcolor,
                                  filter: "brightness(0.95)",
                                },
                              }}
                              onClick={() => {
                                navigaACesto(cestoId);
                              }}
                            />
                          );
                        }
                      )}

                    {/* Contatore totale se l'incarico è in almeno un cesto */}
                    {cestiIncarichi &&
                      Array.from(cestiIncarichi.entries()).some(([_, cesto]) =>
                        cesto.some((inc) => inc.incarico_id === incarico.id)
                      ) && (
                        <Typography
                          variant="caption"
                          sx={{
                            color: (theme) => {
                              const totale = calcolaQuantitaTotale(incarico.id);
                              const prodotto = getProgressoIncarico(
                                incarico.id
                              );
                              return prodotto >= totale.totale
                                ? theme.palette.success.main
                                : theme.palette.text.secondary;
                            },
                          }}
                        >
                          Tot: {getProgressoIncarico(incarico.id)}/
                          {calcolaQuantitaTotale(incarico.id).totale}
                        </Typography>
                      )}
                  </Stack>
                )}
            </Stack>
          </Box>

          {/* Controlli del progresso */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              ml: "auto",
              flexShrink: 0,
              mr: 0,
            }}
          >
            <IconButton
              size="small"
              disabled={!isDisponibile || progresso <= 0}
              onClick={() =>
                aggiornaProgresso(incarico.id, Math.max(0, progresso - 1))
              }
              sx={{ p: "2px" }}
            >
              <RemoveIcon fontSize="small" />
            </IconButton>
            <TextField
              size="small"
              value={progresso}
              disabled={!isDisponibile}
              onChange={(e) => {
                const value =
                  e.target.value === "" ? 0 : parseInt(e.target.value);
                if (!isNaN(value) && value >= 0) {
                  aggiornaProgresso(incarico.id, value);
                }
              }}
              inputProps={{
                style: {
                  padding: "2px",
                  width: "30px",
                  textAlign: "center",
                  appearance: "textfield",
                },
                type: "number",
                min: 0,
              }}
              sx={{
                mx: 0.5,
                "& .MuiOutlinedInput-root": {
                  "& fieldset": {
                    borderColor: "transparent",
                  },
                  "&:hover fieldset": {
                    borderColor: isDisponibile
                      ? "rgba(0, 0, 0, 0.23)"
                      : "transparent",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: isDisponibile ? "primary.main" : "transparent",
                  },
                },
                "& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button":
                  {
                    display: "none",
                  },
              }}
              onBlur={(e) => {
                // Se il campo è vuoto, imposta il valore a 0
                if (e.target.value === "") {
                  aggiornaProgresso(incarico.id, 0);
                }
              }}
            />
            <IconButton
              size="small"
              onClick={() => {
                const progresso = getProgressoIncarico(incarico.id);
                aggiornaProgresso(incarico.id, progresso + 1);
              }}
              sx={{ p: "2px" }}
            >
              <AddIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      </Box>
    );
  };

  // Pulsanti di visualizzazione e ordinamento
  const [anchorElSort, setAnchorElSort] = useState<null | HTMLElement>(null);

  return (
    <Layout>
      <Box sx={{ p: { xs: 1, sm: 2 } }}>
        {/* Barra superiore */}
        <Paper sx={{ mb: 2, p: 2 }}>
          <Grid container spacing={2} alignItems="center">
            {/* Selettore Derby */}
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Mostra quantità per derby</InputLabel>
                <Select
                  value={derbySelezionato?.id || ""}
                  onChange={handleChangeDerby}
                  label="Mostra quantità per derby"
                >
                  <MenuItem value="">
                    <em>Nessun Derby</em>
                  </MenuItem>
                  {derby.map((d: Derby) => (
                    <MenuItem
                      key={d.id}
                      value={d.id}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                      }}
                    >
                      {d.attivo && (
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            bgcolor: "success.main",
                            mr: 1,
                          }}
                        />
                      )}
                      {d.nome}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Selettore giocatore per admin */}
            {(currentUser?.ruolo === "admin" ||
              currentUser?.ruolo === "coordinatore" ||
              currentUser?.ruolo === "moderatore") && (
              <Grid item xs={12}>
                <FormControl
                  fullWidth
                  size="small"
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      bgcolor: "background.paper",
                    },
                    "& .MuiSelect-select": {
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                    },
                    "& .MuiPaper-root": {
                      maxHeight: "50%",
                    },
                  }}
                >
                  <InputLabel>Seleziona Giocatore</InputLabel>
                  <Select
                    value={giocatoreSelezionato || ""}
                    onChange={(e) => {
                      const newGiocatore =
                        e.target.value === "" ? null : e.target.value;
                      setGiocatoreSelezionato(newGiocatore);
                      setFarmSelezionata(""); // Reset della farm selezionata
                    }}
                    label="Seleziona Giocatore"
                    renderValue={(selected) => {
                      if (!selected) {
                        const farmCount =
                          currentUser?.farms?.filter(
                            (f) => f.stato === "attivo"
                          ).length || 0;
                        const totalFarms = currentUser?.farms?.length || 0;
                        return (
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            <Typography>TU - {currentUser?.nome}</Typography>
                            <Typography
                              variant="caption"
                              sx={{ color: "text.secondary" }}
                            >
                              ({farmCount}/{totalFarms})
                            </Typography>
                          </Box>
                        );
                      }
                      const giocatore = giocatori.find(
                        (g) => g.id === selected
                      );
                      if (!giocatore) return "";
                      const farmCount = giocatore.farms.filter(
                        (f) => f.stato === "attivo"
                      ).length;
                      return (
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          <Typography>{giocatore.nome}</Typography>
                          <Typography
                            variant="caption"
                            sx={{ color: "text.secondary" }}
                          >
                            ({farmCount}/{giocatore.farms.length})
                          </Typography>
                        </Box>
                      );
                    }}
                    MenuProps={{
                      PaperProps: {
                        sx: {
                          maxHeight: 300,
                          "& .MuiMenuItem-root": {
                            minHeight: "36px",
                            py: 0.5,
                          },
                          "& .MuiDivider-root": {
                            my: 0.5,
                          },
                          "& .MuiListSubheader-root": {
                            lineHeight: "32px",
                            bgcolor: "rgba(0, 0, 0, 0.03)",
                          },
                          "& .MuiMenu-list": {
                            py: 0,
                          },
                          // Stile moderno per la scrollbar
                          "&::-webkit-scrollbar": {
                            width: "8px",
                          },
                          "&::-webkit-scrollbar-track": {
                            background: "rgba(0,0,0,0.05)",
                            borderRadius: "4px",
                          },
                          "&::-webkit-scrollbar-thumb": {
                            background: "rgba(0,0,0,0.2)",
                            borderRadius: "4px",
                            "&:hover": {
                              background: "rgba(0,0,0,0.3)",
                            },
                          },
                        },
                      },
                    }}
                  >
                    <MenuItem
                      value=""
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 1,
                      }}
                    >
                      <Typography>TU - {currentUser?.nome || ""}</Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          color: "text.secondary",
                          ml: "auto",
                        }}
                      >
                        (
                        {currentUser?.farms?.filter((f) => f.stato === "attivo")
                          .length || 0}
                        /{currentUser?.farms?.length || 0})
                      </Typography>
                    </MenuItem>

                    {/* Giocatori con farm attive */}
                    <ListSubheader>Giocatori Attivi</ListSubheader>
                    {giocatori
                      .filter((g) => g.farms.some((f) => f.stato === "attivo"))
                      .sort((a, b) => a.nome.localeCompare(b.nome))
                      .map((g) => (
                        <MenuItem
                          key={g.id}
                          value={g.id}
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 1,
                          }}
                        >
                          <Typography>{g.nome}</Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              color: "text.secondary",
                              ml: "auto",
                            }}
                          >
                            (
                            {g.farms.filter((f) => f.stato === "attivo").length}
                            /{g.farms.length})
                          </Typography>
                        </MenuItem>
                      ))}

                    {/* Giocatori con tutte le farm inattive */}
                    <Divider />
                    <ListSubheader>Giocatori Inattivi</ListSubheader>
                    {giocatori
                      .filter((g) =>
                        g.farms.every((f) => f.stato === "inattivo")
                      )
                      .sort((a, b) => a.nome.localeCompare(b.nome))
                      .map((g) => (
                        <MenuItem
                          key={g.id}
                          value={g.id}
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 1,
                            color: "text.secondary",
                          }}
                        >
                          <Typography>{g.nome}</Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              color: "inherit",
                              ml: "auto",
                            }}
                          >
                            (0/{g.farms.length})
                          </Typography>
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
              </Grid>
            )}
          </Grid>
        </Paper>

        {/* Farm Selector Tabs */}
        <Paper sx={{ mb: 2, overflow: "hidden" }}>
          <Tabs
            value={farmSelezionata}
            onChange={handleChangeFarm}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              minHeight: 72,
              "& .MuiTab-root": {
                minHeight: 72,
                p: 1,
              },
              "& .MuiTabs-indicator": {
                height: 4,
                borderRadius: "3px 3px 0 0",
              },
            }}
          >
            {farms.map((farm) => (
              <Tab
                key={farm.farmId}
                value={farm.farmId}
                label={
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 0.5,
                    }}
                  >
                    <Avatar
                      src={farm.immagine}
                      variant="rounded"
                      sx={{
                        width: 32,
                        height: 32,
                        bgcolor: farm.isAttiva ? "#4caf50" : "grey.300",
                        color: farm.isAttiva ? "white" : "text.secondary",
                        transition: "all 0.2s ease-in-out",
                        "& img": {
                          opacity: farm.isAttiva ? 1 : 0.7,
                        },
                      }}
                    >
                      {farm.nome.charAt(0)}
                    </Avatar>
                    <Box sx={{ textAlign: "center" }}>
                      <Typography
                        sx={{
                          fontSize: "0.875rem",
                          lineHeight: 1.2,
                          fontWeight:
                            farmSelezionata === farm.farmId ? 700 : 400,
                        }}
                      >
                        {farm.nome}
                      </Typography>
                      <Chip
                        label={farm.livello}
                        size="small"
                        sx={{
                          height: 16,
                          fontSize: "0.625rem",
                          bgcolor: "rgb(33, 150, 243, 0.1)",
                          color: "rgb(33, 150, 243)",
                          "& .MuiChip-label": {
                            px: 1,
                            fontStyle: "italic",
                          },
                        }}
                      />
                    </Box>
                  </Box>
                }
              />
            ))}
          </Tabs>
        </Paper>

        {/* Header con pulsanti di controllo */}
        <Box
          sx={{
            position: "sticky",
            top: "56px", // Altezza della barra di navigazione
            zIndex: 1000,
            bgcolor: "background.default",
            pt: 2,
            pb: 1,
            borderBottom: "1px solid",
            borderColor: "divider",
            boxShadow: 1,
            mt: -2, // Compensiamo il padding top del contenitore
          }}
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 1,
              px: 2,
            }}
          >
            {/* Prima riga con i controlli esistenti */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                flexWrap: "wrap",
              }}
            >
              {/* Pulsante espandi/comprimi */}
              <Button
                startIcon={
                  expandedEdifici.length === Object.keys(edifici).length &&
                  cestiEspansi &&
                  cittaExpanded ? (
                    <ExpandLessIcon />
                  ) : (
                    <ExpandMoreIcon />
                  )
                }
                onClick={() => {
                  if (
                    expandedEdifici.length === Object.keys(edifici).length &&
                    cestiEspansi &&
                    cittaExpanded
                  ) {
                    // Comprimi tutto
                    setExpandedEdifici([]);
                    setCestiEspansi(false);
                    setCittaExpanded(false);
                  } else {
                    // Espandi tutto
                    setExpandedEdifici(Object.keys(edifici));
                    setCestiEspansi(true);
                    setCittaExpanded(true);
                  }
                }}
                size="small"
                sx={{
                  textTransform: "none",
                  minWidth: "auto",
                }}
              >
                {expandedEdifici.length === Object.keys(edifici).length &&
                cestiEspansi &&
                cittaExpanded
                  ? "COMPRIMI"
                  : "ESPANDI"}
              </Button>

              {/* Pulsante PDF */}
              <IconButton onClick={generaPDF} size="small" title="Genera PDF">
                <PictureAsPdfIcon />
              </IconButton>

              {/* Campo di ricerca integrato */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  flex: searchOpen ? 1 : "unset",
                  transition: "all 0.3s ease",
                  minWidth: searchOpen ? 200 : 40,
                  maxWidth: searchOpen ? "100%" : 40,
                  position: "relative",
                }}
              >
                <TextField
                  inputRef={searchInputRef}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cerca incarichi..."
                  size="small"
                  sx={{
                    width: "100%",
                    visibility: searchOpen ? "visible" : "hidden",
                    opacity: searchOpen ? 1 : 0,
                    position: "absolute",
                    right: 0,
                    transition: "all 0.3s ease",
                    "& .MuiOutlinedInput-root": {
                      pr: searchQuery ? 6 : 4,
                    },
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    ),
                    endAdornment: searchQuery && (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setSearchQuery("");
                            searchInputRef.current?.focus();
                          }}
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <IconButton
                  onClick={() => setSearchOpen(!searchOpen)}
                  color={searchOpen ? "primary" : "default"}
                  size="small"
                  sx={{
                    visibility: searchOpen ? "hidden" : "visible",
                    opacity: searchOpen ? 0 : 1,
                    transition: "all 0.3s ease",
                  }}
                >
                  <SearchIcon />
                </IconButton>
              </Box>
            </Box>

            {/* Seconda riga con i pulsanti di visualizzazione */}
            <Box
              sx={{
                display: "flex",
                gap: 1,
              }}
            >
              <Button
                variant={mostraSoloAssegnati ? "contained" : "outlined"}
                onClick={() => setMostraSoloAssegnati(true)}
                size="small"
                sx={{
                  flex: 1,
                  minWidth: "100px",
                  px: 2,
                }}
              >
                LISTA
              </Button>
              <Button
                variant={!mostraSoloAssegnati ? "contained" : "outlined"}
                onClick={() => setMostraSoloAssegnati(false)}
                size="small"
                sx={{
                  flex: 1,
                  minWidth: "100px",
                  px: 2,
                }}
              >
                COMPLETA
              </Button>
            </Box>
          </Box>
        </Box>

        {/* Alert per nessun incarico assegnato */}
        {mostraSoloAssegnati && !hasContentToShow && !searchQuery && (
          <Alert
            severity="info"
            sx={{
              mx: 2,
              mt: 2,
              mb: 1,
              "& .MuiAlert-message": {
                color: "info.main",
              },
            }}
          >
            Non hai incarichi assegnati al momento.
          </Alert>
        )}

        {/* Sezione Città - nascosta se non ci sono incarichi assegnati in modalità ASSEGNAZIONI o se non ci sono risultati nella ricerca */}
        {(!mostraSoloAssegnati ||
          (mostraSoloAssegnati && incarichiCitta.length > 0)) &&
          (!searchQuery || hasIncarichiCittaResults) && (
            <Box sx={{ mb: 0 }}>
              {" "}
              {/* Ridotto da mb: 2 a mb: 0 */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  p: 1.5,
                  borderBottom: "1px solid rgba(0, 0, 0, 0.12)",
                  cursor: "pointer",
                  transition: "all 0.2s ease-in-out",
                  "&:hover": {
                    bgcolor: "rgba(0, 0, 0, 0.04)",
                  },
                }}
                onClick={() => setCittaExpanded(!cittaExpanded)}
              >
                <Avatar
                  src="/images/citta.png"
                  variant="rounded"
                  sx={{
                    width: 40,
                    height: 40,
                    bgcolor: "transparent",
                  }}
                >
                  C
                </Avatar>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" component="div">
                    Città
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    "@media (max-width: 600px)": {
                      "& .MuiTypography-root": {
                        fontSize: "0.875rem",
                      },
                    },
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "0.95rem",
                      fontWeight: "medium",
                      color: (theme) => {
                        if (totaleCitta === SOGLIA_MASSIMA_CITTA)
                          return theme.palette.success.main;
                        if (totaleCitta > SOGLIA_MASSIMA_CITTA)
                          return theme.palette.error.main;
                        return theme.palette.text.secondary;
                      },
                      bgcolor: "white",
                      px: 1,
                      py: 0.5,
                      borderRadius: 1,
                      border: "1px solid rgba(0, 0, 0, 0.12)",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                      mr: 1,
                    }}
                  >
                    {Math.min(totaleCitta, SOGLIA_MASSIMA_CITTA)}/
                    {SOGLIA_MASSIMA_CITTA}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {incarichiCitta.length}{" "}
                    {incarichiCitta.length === 1 ? "incarico" : "incarichi"}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCittaExpanded(!cittaExpanded);
                    }}
                    sx={{
                      transition: "transform 0.2s ease-in-out",
                      transform: cittaExpanded
                        ? "rotate(180deg)"
                        : "rotate(0deg)",
                    }}
                  >
                    <ExpandMoreIcon />
                  </IconButton>
                </Box>
              </Box>
              <Collapse in={cittaExpanded}>
                <Box sx={{ mb: 3 }}>
                  {incarichiCitta.length > 0 ? (
                    incarichiCittaFiltrati.map((incarico) =>
                      renderIncaricoCard(incarico)
                    )
                  ) : (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ textAlign: "center" }}
                    >
                      Nessun incarico città assegnato
                    </Typography>
                  )}
                </Box>
              </Collapse>
            </Box>
          )}

        {/* Sezione Cesti - nascosta se non ci sono risultati o se non ci sono assegnazioni in modalità assegnazioni */}
        {hasCestiResults &&
          (!mostraSoloAssegnati ||
            (mostraSoloAssegnati &&
              cesti.some((cesto) => isCestoAssegnato(cesto.id)))) && (
            <>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  p: 2,
                  borderBottom: "1px solid rgba(0, 0, 0, 0.12)",
                  cursor: "pointer",
                  transition: "all 0.2s ease-in-out",
                  "&:hover": {
                    bgcolor: "rgba(0, 0, 0, 0.04)",
                  },
                  mt: 0, // Aggiunto mt: 0 per assicurarci che non ci sia margine superiore
                }}
                onClick={() => setCestiEspansi(!cestiEspansi)}
              >
                <Avatar
                  src="/images/cesto.png"
                  alt="Cesti"
                  sx={{
                    width: 40,
                    height: 40,
                    bgcolor: "transparent",
                    "& img": {
                      objectFit: "contain",
                      transform: "scale(1.2)", // Leggermente più grande per allinearsi con le altre icone
                    },
                  }}
                />
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" component="div">
                    Cesti
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    "@media (max-width: 600px)": {
                      // Responsive per mobile
                      "& .MuiTypography-root": {
                        fontSize: "0.875rem",
                      },
                    },
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    {mostraSoloAssegnati
                      ? `${
                          cestiFiltrati.filter((cesto) =>
                            isCestoAssegnato(cesto.id)
                          ).length
                        } cesti`
                      : `${cesti.length} cesti`}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCestiEspansi(!cestiEspansi);
                    }}
                    sx={{
                      transition: "transform 0.2s ease-in-out",
                      transform: cestiEspansi
                        ? "rotate(180deg)"
                        : "rotate(0deg)",
                    }}
                  >
                    <ExpandMoreIcon />
                  </IconButton>
                </Box>
              </Box>

              {/* Contenuto Cesti */}
              <Collapse in={cestiEspansi} timeout={200}>
                <Box sx={{ mb: 3 }}>
                  {cestiFiltrati.map((cesto) => {
                    const incarichiCesto = cestiIncarichi.get(cesto.id) || [];

                    // Controlla se ci sono incarichi non disponibili e se sono tutti non disponibili
                    const haIncarichiNonDisponibili = incarichiCesto.some(
                      (inc) => {
                        const incarico = incarichi.find(
                          (i) => i.id === inc.incarico_id
                        );
                        return (
                          incarico &&
                          !isIncaricoDisponibile(incarico.livello_minimo)
                        );
                      }
                    );
                    const tuttiIncarichiNonDisponibili = incarichiCesto.every(
                      (inc) => {
                        const incarico = incarichi.find(
                          (i) => i.id === inc.incarico_id
                        );
                        return (
                          incarico &&
                          !isIncaricoDisponibile(incarico.livello_minimo)
                        );
                      }
                    );

                    return (
                      <TableContainer
                        key={cesto.id}
                        id={`cesto-${cesto.id}`}
                        component={Paper}
                        sx={{
                          position: "relative",
                          borderBottom: "0.5px solid rgba(0, 0, 0, 0.12)",
                          boxShadow: "none",
                          borderRadius: 0,
                          ...(isCestoCompletato(cesto.id) && {
                            bgcolor: "rgba(76, 175, 80, 0.08)",
                            "& .MuiTableCell-root": {
                              bgcolor: "transparent",
                            },
                          }),
                          ...(!isCestoCompletato(cesto.id) &&
                            haIncarichiNonDisponibili && {
                              bgcolor: "grey.100",
                              "& .MuiTypography-root": {
                                color: "text.disabled",
                              },
                              "& .MuiCheckbox-root": {
                                color: "action.disabled",
                              },
                              "& .livello-strip": {
                                opacity: 0.5,
                              },
                            }),
                          ...(!isCestoCompletato(cesto.id) &&
                            !haIncarichiNonDisponibili &&
                            isCestoAssegnato(cesto.id) && {
                              bgcolor: "primary.lighter",
                              "& .MuiTableCell-root": {
                                bgcolor: "transparent",
                              },
                            }),
                          ...(isCestoAssegnato(cesto.id) && {
                            "&::before": {
                              content: '""',
                              position: "absolute",
                              left: 0,
                              top: 0,
                              bottom: 0,
                              width: "4px",
                              backgroundColor: "primary.main",
                              borderTopLeftRadius: "4px",
                              borderBottomLeftRadius: "4px",
                            },
                          }),
                          ...(cestoHighlight === cesto.id && {
                            bgcolor: "#fff176",
                            transition: "background-color 0.5s ease",
                          }),
                        }}
                      >
                        <Table>
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ py: 1 }}>
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    position: "relative",
                                    pl: 3,
                                    height: "48px",
                                    gap: 2,
                                  }}
                                >
                                  {/* Strisciolina del livello */}
                                  <Box
                                    className="livello-strip"
                                    sx={{
                                      position: "absolute",
                                      left: 0,
                                      top: 0,
                                      bottom: 0,
                                      width: "24px",
                                      bgcolor: "rgb(33, 150, 243, 0.1)",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                    }}
                                  >
                                    <Typography
                                      sx={{
                                        fontSize: "0.75rem",
                                        fontStyle: "italic",
                                        color: "rgb(33, 150, 243)",
                                        width: "3ch",
                                        textAlign: "center",
                                      }}
                                    >
                                      {calcolaLivelloCesto(cesto.id)}
                                    </Typography>
                                  </Box>

                                  {/* Checkbox e Nome */}
                                  <Box
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 0.5, // Ridotto da 1 a 0.5
                                      width: "150px", // Ridotto da 200px a 150px
                                      flexShrink: 0,
                                    }}
                                  >
                                    <Checkbox
                                      checked={isCestoCompletato(cesto.id)}
                                      disabled={
                                        tuttiIncarichiNonDisponibili ||
                                        !isIncaricoDisponibile(
                                          calcolaLivelloCesto(cesto.id)
                                        )
                                      }
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          completaCesto(cesto.id);
                                        } else {
                                          resetCesto(cesto.id);
                                        }
                                      }}
                                      sx={{
                                        p: 0.5,
                                        "& .MuiSvgIcon-root": {
                                          fontSize: "1.2rem",
                                        },
                                      }}
                                    />
                                    <Typography
                                      variant="body2"
                                      sx={{
                                        fontWeight: 500,
                                        fontSize: "0.875rem",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      {cesto.nome}
                                    </Typography>
                                  </Box>

                                  {/* Spazio per il chip dei completamenti */}
                                  <Box
                                    sx={{
                                      width: "32px",
                                      display: "flex",
                                      justifyContent: "center",
                                      flexShrink: 0,
                                    }}
                                  >
                                    {getCompletamentiCesto(cesto.id) > 0 && (
                                      <Chip
                                        size="small"
                                        label={`x${getCompletamentiCesto(
                                          cesto.id
                                        )}`}
                                        color="success"
                                        sx={{ height: "20px" }}
                                      />
                                    )}
                                  </Box>

                                  {/* Icone degli incarichi */}
                                  <Box
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 0.5, // Ridotto da 1 a 0.5
                                      ml: 1, // Ridotto da auto a 1
                                      minWidth: "auto", // Rimosso minWidth fisso
                                      justifyContent: "flex-start", // Cambiato da flex-end a flex-start
                                    }}
                                  >
                                    {cestiIncarichi
                                      .get(cesto.id)
                                      ?.map((incaricoInCesto) => {
                                        // Cerca prima tra gli incarichi standard
                                        let incarico = incarichi.find(
                                          (i) =>
                                            i.id === incaricoInCesto.incarico_id
                                        );

                                        // Se non lo trova, cerca tra gli incarichi città
                                        if (!incarico) {
                                          const incaricoInCitta =
                                            incarichiCitta.find(
                                              (i) =>
                                                i.id ===
                                                incaricoInCesto.incarico_id
                                            );
                                          if (incaricoInCitta) {
                                            incarico = {
                                              id: incaricoInCitta.id,
                                              nome: incaricoInCitta.nome,
                                              quantita:
                                                incaricoInCitta.quantita,
                                              livello_minimo:
                                                incaricoInCitta.livello_minimo,
                                              immagine:
                                                incaricoInCitta.immagine,
                                              edificio_id: "",
                                              is_obbligatorio: false,
                                              usato_in_cesti: true,
                                            };
                                          }
                                        }

                                        if (!incarico) return null;
                                        const isDisponibile =
                                          isIncaricoDisponibile(
                                            incarico.livello_minimo
                                          );
                                        const progresso = getProgressoIncarico(
                                          incarico.id
                                        );
                                        const quantitaCesto =
                                          getQuantitaIncaricoCesto(
                                            cesto.id,
                                            incarico.id
                                          );

                                        return (
                                          <Box
                                            key={incarico.id}
                                            sx={{
                                              display: "flex",
                                              flexDirection: "column",
                                              alignItems: "center",
                                              gap: 0.5,
                                              filter: isDisponibile
                                                ? "none"
                                                : "grayscale(100%)",
                                              opacity: isDisponibile ? 1 : 0.5,
                                              transition:
                                                "all 0.2s ease-in-out",
                                              width: "32px",
                                              flexShrink: 0,
                                            }}
                                          >
                                            <Avatar
                                              src={incarico.immagine}
                                              variant="rounded"
                                              sx={{
                                                width: 28,
                                                height: 28,
                                                cursor: "pointer",
                                                "&:hover": {
                                                  opacity: 0.8,
                                                },
                                              }}
                                              onClick={() =>
                                                scrollToIncarico(incarico.id)
                                              }
                                            >
                                              {incarico.nome.charAt(0)}
                                            </Avatar>
                                            <Typography
                                              variant="caption"
                                              sx={{
                                                color:
                                                  progresso >= quantitaCesto
                                                    ? "success.main"
                                                    : "text.secondary",
                                                fontWeight: "medium",
                                                fontSize: "0.7rem",
                                                lineHeight: 1,
                                              }}
                                            >
                                              {progresso}/{quantitaCesto}
                                            </Typography>
                                          </Box>
                                        );
                                      })}
                                  </Box>
                                </Box>
                              </TableCell>
                            </TableRow>
                          </TableHead>
                        </Table>
                      </TableContainer>
                    );
                  })}
                </Box>
              </Collapse>
            </>
          )}

        {/* Pulsanti di visualizzazione e ordinamento */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
            px: 2,
            py: 1,
            borderBottom: "1px solid",
            borderColor: "divider",
            bgcolor: "rgba(0, 0, 0, 0.02)",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Visualizzazione:
            </Typography>
            <IconButton
              onClick={() => setVisualizzazioneGlobale(!visualizzazioneGlobale)}
              color={visualizzazioneGlobale ? "primary" : "default"}
              size="small"
              title={
                visualizzazioneGlobale ? "Vista lista" : "Vista per edificio"
              }
            >
              {visualizzazioneGlobale ? <ViewListIcon /> : <ViewModuleIcon />}
            </IconButton>

            <Box>
              <Button
                id="sort-button"
                aria-controls={Boolean(anchorElSort) ? "sort-menu" : undefined}
                aria-haspopup="true"
                aria-expanded={Boolean(anchorElSort) ? "true" : undefined}
                onClick={(event) => setAnchorElSort(event.currentTarget)}
                startIcon={<SortIcon />}
                size="small"
                sx={{
                  textTransform: "none",
                  color: ordinamento.tipo ? "primary.main" : "text.primary",
                }}
              >
                Ordina
              </Button>
              <Menu
                id="sort-menu"
                anchorEl={anchorElSort}
                open={Boolean(anchorElSort)}
                onClose={() => setAnchorElSort(null)}
                MenuListProps={{
                  "aria-labelledby": "sort-button",
                }}
              >
                {/* Ordinamento Alfabetico */}
                <ListSubheader>Alfabetico</ListSubheader>
                <MenuItem
                  onClick={() => {
                    setOrdinamento({ tipo: "alfabetico", direzione: "asc" });
                    setAnchorElSort(null);
                  }}
                  sx={{
                    color:
                      ordinamento.tipo === "alfabetico" &&
                      ordinamento.direzione === "asc"
                        ? "primary.main"
                        : "inherit",
                    minWidth: "200px",
                  }}
                >
                  <ListItemIcon>
                    <ArrowUpwardIcon
                      sx={{
                        color:
                          ordinamento.tipo === "alfabetico" &&
                          ordinamento.direzione === "asc"
                            ? "primary.main"
                            : "inherit",
                      }}
                    />
                  </ListItemIcon>
                  <ListItemText>A-Z</ListItemText>
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    setOrdinamento({ tipo: "alfabetico", direzione: "desc" });
                    setAnchorElSort(null);
                  }}
                  sx={{
                    color:
                      ordinamento.tipo === "alfabetico" &&
                      ordinamento.direzione === "desc"
                        ? "primary.main"
                        : "inherit",
                  }}
                >
                  <ListItemIcon>
                    <ArrowDownwardIcon
                      sx={{
                        color:
                          ordinamento.tipo === "alfabetico" &&
                          ordinamento.direzione === "desc"
                            ? "primary.main"
                            : "inherit",
                      }}
                    />
                  </ListItemIcon>
                  <ListItemText>Z-A</ListItemText>
                </MenuItem>

                <Divider />

                {/* Ordinamento per Livello */}
                <ListSubheader>Livello</ListSubheader>
                <MenuItem
                  onClick={() => {
                    setOrdinamento({ tipo: "livello", direzione: "asc" });
                    setAnchorElSort(null);
                  }}
                  sx={{
                    color:
                      ordinamento.tipo === "livello" &&
                      ordinamento.direzione === "asc"
                        ? "primary.main"
                        : "inherit",
                  }}
                >
                  <ListItemIcon>
                    <ArrowUpwardIcon
                      sx={{
                        color:
                          ordinamento.tipo === "livello" &&
                          ordinamento.direzione === "asc"
                            ? "primary.main"
                            : "inherit",
                      }}
                    />
                  </ListItemIcon>
                  <ListItemText>Dal più basso</ListItemText>
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    setOrdinamento({ tipo: "livello", direzione: "desc" });
                    setAnchorElSort(null);
                  }}
                  sx={{
                    color:
                      ordinamento.tipo === "livello" &&
                      ordinamento.direzione === "desc"
                        ? "primary.main"
                        : "inherit",
                  }}
                >
                  <ListItemIcon>
                    <ArrowDownwardIcon
                      sx={{
                        color:
                          ordinamento.tipo === "livello" &&
                          ordinamento.direzione === "desc"
                            ? "primary.main"
                            : "inherit",
                      }}
                    />
                  </ListItemIcon>
                  <ListItemText>Dal più alto</ListItemText>
                </MenuItem>

                <Divider />

                {/* Ordinamento per Completamento */}
                <ListSubheader>Completamento</ListSubheader>
                <MenuItem
                  onClick={() => {
                    setOrdinamento({ tipo: "completamento", direzione: "asc" });
                    setAnchorElSort(null);
                  }}
                  sx={{
                    color:
                      ordinamento.tipo === "completamento" &&
                      ordinamento.direzione === "asc"
                        ? "primary.main"
                        : "inherit",
                  }}
                >
                  <ListItemIcon>
                    <ArrowUpwardIcon
                      sx={{
                        color:
                          ordinamento.tipo === "completamento" &&
                          ordinamento.direzione === "asc"
                            ? "primary.main"
                            : "inherit",
                      }}
                    />
                  </ListItemIcon>
                  <ListItemText>Da completare</ListItemText>
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    setOrdinamento({
                      tipo: "completamento",
                      direzione: "desc",
                    });
                    setAnchorElSort(null);
                  }}
                  sx={{
                    color:
                      ordinamento.tipo === "completamento" &&
                      ordinamento.direzione === "desc"
                        ? "primary.main"
                        : "inherit",
                  }}
                >
                  <ListItemIcon>
                    <ArrowDownwardIcon
                      sx={{
                        color:
                          ordinamento.tipo === "completamento" &&
                          ordinamento.direzione === "desc"
                            ? "primary.main"
                            : "inherit",
                      }}
                    />
                  </ListItemIcon>
                  <ListItemText>Completati</ListItemText>
                </MenuItem>

                <Divider />

                {/* Reset ordinamento */}
                <MenuItem
                  onClick={() => {
                    setOrdinamento({ tipo: null, direzione: null });
                    setAnchorElSort(null);
                  }}
                  sx={{
                    color:
                      ordinamento.tipo === null ? "primary.main" : "inherit",
                  }}
                >
                  <ListItemIcon>
                    <RestartAltIcon
                      sx={{
                        color:
                          ordinamento.tipo === null
                            ? "primary.main"
                            : "inherit",
                      }}
                    />
                  </ListItemIcon>
                  <ListItemText>Predefinito</ListItemText>
                </MenuItem>
              </Menu>
            </Box>
          </Box>
        </Box>

        {/* Layout con colonna icone + contenuto */}
        <Box>
          {/* Contenuto principale */}
          <Box>
            {visualizzazioneGlobale ? (
              // Vista lista globale
              <Box>
                {incarichiDaMostrare.map((incarico) =>
                  renderIncaricoCard(incarico)
                )}
              </Box>
            ) : (
              // Vista raggruppata per edificio
              <Box>
                {edificiFiltrati.map(([edificioId, nomeEdificio]) => {
                  const incarichiEdificio = getIncarichiEdificio(edificioId);
                  const tuttiNonDisponibili =
                    tuttiIncarichiNonDisponibili(edificioId);

                  if (incarichiEdificio.length === 0) return null;

                  const isExpanded = expandedEdifici.includes(edificioId);
                  const edificioData = edificiData.find(
                    (e) => e.id === edificioId
                  );

                  return (
                    <Box key={edificioId}>
                      {/* Intestazione sempre visibile */}
                      <Box
                        onClick={() => handleExpandEdificio(edificioId)}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          height: "56px",
                          p: 1,
                          borderBottom: "1px solid rgba(0, 0, 0, 0.12)",
                          cursor: "pointer",
                          "&:hover": {
                            bgcolor: "action.hover",
                          },
                          ...(tuttiNonDisponibili && {
                            bgcolor: "grey.100",
                            "& .MuiTypography-root": {
                              color: "text.disabled",
                            },
                          }),
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            flex: 1,
                          }}
                        >
                          <Avatar
                            src={edificioData?.immagine}
                            variant="rounded"
                            sx={{ width: 40, height: 40 }}
                          >
                            {nomeEdificio.charAt(0)}
                          </Avatar>
                          <Typography>{nomeEdificio}</Typography>
                          <Typography
                            component="span"
                            sx={{
                              color: "primary.main",
                              fontStyle: "italic",
                              fontSize: "0.875rem",
                            }}
                          >
                            Liv. {edificioData?.livello}
                          </Typography>
                          <Box
                            sx={{
                              ml: "auto",
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            <Typography color="text.secondary">
                              {incarichiEdificio.length}{" "}
                              {incarichiEdificio.length === 1
                                ? "incarico"
                                : "incarichi"}
                            </Typography>
                            <IconButton
                              size="small"
                              sx={{
                                transform: isExpanded
                                  ? "rotate(180deg)"
                                  : "none",
                                transition: "transform 0.2s",
                              }}
                            >
                              <ExpandMoreIcon />
                            </IconButton>
                          </Box>
                        </Box>
                      </Box>

                      {/* Lista incarichi quando è espanso */}
                      <Collapse in={isExpanded}>
                        <Box>
                          {incarichiEdificio.map((incarico) =>
                            renderIncaricoCard(incarico)
                          )}
                        </Box>
                      </Collapse>
                    </Box>
                  );
                })}
              </Box>
            )}
          </Box>
        </Box>
      </Box>

      {/* Componente nascosto per la stampa */}
      <Box sx={{ display: "none" }}>
        <div ref={stampaRef}>
          <StampaIncarichi {...getDatiStampa()} />
        </div>
      </Box>
    </Layout>
  );
}
