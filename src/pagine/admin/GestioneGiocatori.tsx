import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useTheme,
  useMediaQuery,
  Chip,
  Collapse,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  ToggleButtonGroup,
  ToggleButton,
  Alert,
  Snackbar,
  Card,
  CardContent,
  CardActions,
  FormControlLabel,
  Switch,
  Avatar,
  Tooltip,
  InputAdornment,
  Menu,
  ListItemIcon,
  ListItemText,
  Divider,
  OutlinedInput,
  Checkbox,
  List,
  ListItem,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CircleIcon from "@mui/icons-material/Circle";
import PeopleIcon from "@mui/icons-material/People";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import FilterListIcon from "@mui/icons-material/FilterList";
import ViewListIcon from "@mui/icons-material/ViewList";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import InfoIcon from "@mui/icons-material/Info";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import PersonIcon from "@mui/icons-material/Person";
import SupervisorAccountIcon from "@mui/icons-material/SupervisorAccount";
import Layout from "../../componenti/layout/Layout";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  updateDoc,
  writeBatch,
} from "firebase/firestore"
import { 
  getDocWithRateLimit, 
  getDocsWithRateLimit, 
  setDocWithRateLimit,
  updateDocWithRateLimit,
  deleteDocWithRateLimit,
  addDocWithRateLimit
} from '../../configurazione/firebase';;
import { db } from "../../configurazione/firebase";
import { Giocatore, Farm, StatoFarm } from "../../tipi/giocatore";
import UploadImmagine from "../../componenti/comune/UploadImmagine";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../componenti/autenticazione/AuthContext";
import { countries, getCountryName } from "../../utils/countries";
import * as countryFlags from "country-flag-icons/react/3x2";
import { Derby } from "../../tipi/derby"; // Aggiungo l'import
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";

// Tipo per le opzioni di filtro
type FilterMode = "players" | "farms";
type SortOption =
  | "name"
  | "age"
  | "country"
  | "farmCount"
  | "farmLevel"
  | "farmDiamonds";

// Definizione del tipo per i ruoli
type Ruolo = "admin" | "coordinatore" | "moderatore" | "giocatore";

// Aggiornamento dell'interfaccia Giocatore
interface Giocatore {
  id: string;
  pin: number;
  ruolo: Ruolo;
  nome: string;
  contatto?: string;
  contattoVisibile?: boolean;
  note?: string;
  immagine?: string;
  eta?: number | null;
  nazionalita?: string;
  farms: Farm[];
  vicinati: string[];
  dataRegistrazione: string;
}

// Aggiorno il tipo StatoFarm
type StatoFarm = "attivo" | "inattivo";

interface Farm {
  nome: string;
  tag: string;
  diamanti?: number;
  stato: StatoFarm;
  principale: boolean;
  livello: number;
  derby_tags?: string[]; // Aggiungo questo campo
}

// Funzione per generare un PIN casuale a 6 cifre
const generaPIN = () => {
  return Math.floor(100000 + Math.random() * 900000);
};

// Interfaccia per il form di una farm
interface FarmForm {
  nome: string;
  tag?: string;
  diamanti?: number;
  stato: StatoFarm;
  principale: boolean;
  livello: number;
  immagine?: string;
  derby_tags?: string[]; // Aggiungo questo campo
}

// Farm vuota iniziale
const farmVuota = (): FarmForm => ({
  nome: "",
  tag: "",
  diamanti: undefined,
  stato: "attivo",
  principale: true,
  livello: 1,
  immagine: "",
  derby_tags: [], // Inizializzo come array vuoto
});

// Interfaccia per il form del giocatore
interface GiocatoreForm {
  nome: string;
  pin: number;
  contatto?: string;
  contattoVisibile?: boolean;
  note?: string;
  immagine?: string;
  eta?: number;
  nazionalita?: string;
  farms: FarmForm[];
}

interface FormData {
  nome: string;
  pin: number;
  contatto: string;
  contattoVisibile: boolean;
  note: string;
  eta: string;
  nazionalita: string;
  immagine?: string;
  farms: {
    nome: string;
    tag: string;
    diamanti?: number;
    stato: StatoFarm;
    principale: boolean;
    livello: number;
    derby_tags?: string[];
  }[];
  expandedPersonalInfo: boolean;
  farmExpanded: boolean[];
}

export default function GestioneGiocatori() {
  const [giocatori, setGiocatori] = useState<Giocatore[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingGiocatore, setEditingGiocatore] = useState<Giocatore | null>(
    null
  );
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const { currentUser } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const [selectedGiocatore, setSelectedGiocatore] = useState<Giocatore | null>(
    null
  );
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [derby, setDerby] = useState<Derby[]>([]); // Aggiungo lo state per i derby

  // Stati per filtri e visualizzazione con inizializzazione da localStorage
  const [filterMode, setFilterMode] = useState<FilterMode>(() => {
    try {
      return (
        (localStorage.getItem("gestioneGiocatori_filterMode") as FilterMode) ||
        "players"
      );
    } catch {
      return "players";
    }
  });
  
  const [sortBy, setSortBy] = useState<SortOption>(() => {
    try {
      return (
        (localStorage.getItem("gestioneGiocatori_sortBy") as SortOption) ||
        "name"
      );
    } catch {
      return "name";
    }
  });

  const [sortDirection, setSortDirection] = useState<"asc" | "desc">(() => {
    try {
      return (
        (localStorage.getItem("gestioneGiocatori_sortDirection") as
          | "asc"
          | "desc") || "asc"
      );
    } catch {
      return "asc";
    }
  });
  
  const [filterCountry, setFilterCountry] = useState<string>(() => {
    try {
      return localStorage.getItem("gestioneGiocatori_filterCountry") || "";
    } catch {
      return "";
    }
  });

  const [filterFarmStatus, setFilterFarmStatus] = useState<
    "all" | "active" | "inactive"
  >(() => {
    try {
      return (
        (localStorage.getItem("gestioneGiocatori_filterFarmStatus") as
          | "all"
          | "active"
          | "inactive") || "all"
      );
    } catch {
      return "all";
    }
  });

  // Stati per l'ordinamento delle farm con inizializzazione da localStorage
  const [farmSortBy, setFarmSortBy] = useState<
    "farmName" | "playerName" | "level" | "diamonds" | "status"
  >(() => {
    try {
      return (
        (localStorage.getItem("gestioneGiocatori_farmSortBy") as
          | "farmName"
          | "playerName"
          | "level"
          | "diamonds"
          | "status") || "farmName"
      );
    } catch {
      return "farmName";
    }
  });

  const [farmSortDirection, setFarmSortDirection] = useState<"asc" | "desc">(
    () => {
      try {
        return (
          (localStorage.getItem("gestioneGiocatori_farmSortDirection") as
            | "asc"
            | "desc") || "asc"
        );
      } catch {
        return "asc";
      }
    }
  );

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Aggiungi l'hook useTranslation
  const { t } = useTranslation();

  // Carica i derby dal database
  const caricaDerby = async () => {
    try {
      const derbySnapshot = await getDocsWithRateLimit(collection(db, "derby"));
      const derbyData = derbySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Derby[];
      setDerby(derbyData);
    } catch (error) {
      console.error("Errore nel caricamento dei derby:", error);
    }
  };

  useEffect(() => {
    caricaDerby();
  }, []);

  // Funzione per la ricerca case-insensitive e gestione caratteri speciali
  const matchSearch = useCallback(
    (text: string | undefined | null) => {
      if (!searchQuery) return true;
      if (!text) return false;
      
      const normalizedText = text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      const normalizedQuery = searchQuery
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      return normalizedText.includes(normalizedQuery);
    },
    [searchQuery]
  );

  // Filtra i giocatori in base alla ricerca
  const giocatoriFiltrati = useMemo(() => {
    let risultati = searchQuery
      ? giocatori.filter(
          (giocatore) =>
            // Cerca nel nome del giocatore
            matchSearch(giocatore.nome) ||
            // Cerca nei nomi delle farm
            giocatore.farms.some((farm) => matchSearch(farm.nome))
        )
      : giocatori;

    // Dividi i giocatori in due gruppi: con farm attive e con tutte farm inattive
    const giocatoriConFarmAttive = risultati.filter((g) =>
      g.farms.some((f) => f.stato === "attivo")
    );
    const giocatoriSenzaFarmAttive = risultati.filter((g) =>
      g.farms.every((f) => f.stato === "inattivo")
    );

    // Applichiamo l'ordinamento prima ai giocatori con farm attive
    const ordina = (a: Giocatore, b: Giocatore) => {
      let comparison = 0;
      switch (sortBy) {
        case "name":
          comparison = a.nome.localeCompare(b.nome);
          break;
        case "age":
          comparison = (a.eta || 0) - (b.eta || 0);
          break;
        case "country":
          comparison = (a.nazionalita || "").localeCompare(b.nazionalita || "");
          break;
        case "farmCount":
          comparison = a.farms.length - b.farms.length;
          break;
        default:
          comparison = a.nome.localeCompare(b.nome);
      }
      return sortDirection === "asc" ? comparison : -comparison;
    };

    giocatoriConFarmAttive.sort(ordina);
    giocatoriSenzaFarmAttive.sort(ordina);

    // Combina i due gruppi
    return [...giocatoriConFarmAttive, ...giocatoriSenzaFarmAttive];
  }, [giocatori, searchQuery, matchSearch, sortBy, sortDirection]);

  // Effetto per gestire l'espansione automatica durante la ricerca
  useEffect(() => {
    if (searchQuery) {
      // Espande automaticamente i giocatori che hanno farm corrispondenti alla ricerca
      const giocatoriDaEspandere = giocatoriFiltrati
        .filter((g) => g.farms.some((f) => matchSearch(f.nome)))
        .map((g) => g.id);
      setExpandedPlayers(giocatoriDaEspandere);
    } else {
      // Se non c'è ricerca attiva, ripristina lo stato precedente
      try {
        const saved = localStorage.getItem("expandedPlayers");
        if (saved) {
          setExpandedPlayers(JSON.parse(saved));
        }
      } catch {
        setExpandedPlayers([]);
      }
    }
  }, [searchQuery, giocatoriFiltrati, matchSearch]);

  // Funzione per filtrare le farm da mostrare per ogni giocatore
  const getFarmsFiltrate = useCallback(
    (farms: Farm[]) => {
      if (!searchQuery) return farms;
      return farms.filter((farm) => matchSearch(farm.nome));
    },
    [searchQuery, matchSearch]
  );

  // Verifica se l'utente può modificare un giocatore
  const canEditGiocatore = (giocatore: Giocatore | null) => {
    if (!currentUser || !giocatore) return false;

    // Admin, coordinatore e moderatore possono modificare tutti tranne admin e coordinatori
    if (["admin", "coordinatore", "moderatore"].includes(currentUser.ruolo)) {
      if (currentUser.ruolo === "admin") {
        return giocatore.ruolo !== "admin";
      }
      // Il coordinatore e moderatore non possono modificare admin e coordinatori
      return !["admin", "coordinatore"].includes(giocatore.ruolo);
    }

    // Gli utenti normali possono modificare solo il proprio profilo
    return currentUser.id === giocatore.id;
  };

  // Verifica se l'utente può vedere i dettagli completi di un giocatore
  const canViewFullDetails = (giocatore: Giocatore) => {
    if (!currentUser) return false;

    // Admin, coordinatore e moderatore possono vedere tutti i dettagli
    if (["admin", "coordinatore", "moderatore"].includes(currentUser.ruolo)) {
      return true;
    }

    // Gli utenti normali possono vedere i dettagli completi solo del proprio profilo
    return currentUser.id === giocatore.id;
  };

  // Verifica se l'utente può aggiungere nuovi giocatori
  const canAddGiocatore = () => {
    return ["admin", "coordinatore"].includes(currentUser?.ruolo || "");
  };

  useEffect(() => {
    // Sottoscrizione ai cambiamenti della collezione utenti
    const unsubscribe = onSnapshot(
      collection(db, "utenti"),
      (snapshot) => {
        const giocatoriData = snapshot.docs
          .map((doc) => ({
            ...(doc.data() as Giocatore),
            id: doc.id,
          }))
          .filter((g) => g.ruolo !== "admin"); // Mostriamo sia giocatori che moderatori, escludiamo solo gli admin
        setGiocatori(giocatoriData);
      },
      (error) => {
        console.error("Errore nell'ascolto dei cambiamenti:", error);
        setError("Errore nel caricamento dei giocatori");
      }
    );

    // Pulizia della sottoscrizione quando il componente viene smontato
    return () => unsubscribe();
  }, []);

  const handleEditGiocatore = (giocatore: Giocatore) => {
    setEditingGiocatore(giocatore);
    setFormData({
      nome: giocatore.nome,
      pin: giocatore.pin,
      contatto: giocatore.contatto || "",
      contattoVisibile: giocatore.contattoVisibile || false,
      note: giocatore.note || "",
      immagine: giocatore.immagine || "",
      eta: giocatore.eta?.toString() || "",
      nazionalita: giocatore.nazionalita || "",
      farms: giocatore.farms.map((farm) => ({
        nome: farm.nome,
        tag: farm.tag || "",
        diamanti: farm.diamanti,
        stato: farm.stato,
        principale: farm.principale,
        livello: farm.livello,
        immagine: farm.immagine || "",
        derby_tags: farm.derby_tags || [],
      })),
      expandedPersonalInfo: false,
      farmExpanded: giocatore.farms.map(() => false),
    });
    setOpenDialog(true);
  };

  const handleAddGiocatore = () => {
    setEditingGiocatore(null);
    setFormData({
      nome: "",
      pin: generaPIN(),
      contatto: "",
      contattoVisibile: false,
      note: "",
      immagine: "",
      eta: "",
      nazionalita: "",
      farms: [farmVuota()],
      expandedPersonalInfo: true,
      farmExpanded: [true],
    });
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setError("");
  };

  const handleAddFarm = () => {
    setFormData({
      ...formData,
      farms: [...formData.farms, farmVuota()],
    });
  };

  const handleRemoveFarm = (index: number) => {
    if (formData.farms.length > 1) {
      setFormData({
        ...formData,
        farms: formData.farms.filter((_, i) => i !== index),
      });
    }
  };

  const handleFarmChange = (
    index: number,
    field: keyof FormData["farms"][0],
    value: any
  ) => {
    const newFarms = [...formData.farms];
    newFarms[index] = {
      ...newFarms[index],
      [field]: value,
    };
    setFormData({
      ...formData,
      farms: newFarms,
    });
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess("Copiato negli appunti!");
  };

  const handleSave = async () => {
    try {
      // Validazione base
      if (!formData.nome) {
        setError("Il nome è obbligatorio");
        return;
      }

      // Prepara i dati delle farm rimuovendo i campi undefined
      const farmData = formData.farms.map((farm) => {
        const cleanFarm: Farm = {
          nome: farm.nome || "",
          tag: farm.tag || "",
          stato: farm.stato,
          principale: Boolean(farm.principale),
          livello: Number(farm.livello) || 1, // Se undefined o NaN, usa 1 come default
          derby_tags: farm.derby_tags || [],
        };

        // Aggiungi diamanti solo se è un numero valido
        if (farm.diamanti !== undefined && farm.diamanti !== null) {
          cleanFarm.diamanti = Number(farm.diamanti);
        }

        return cleanFarm;
      });

      // Prepara i dati del giocatore rimuovendo i campi undefined
      const cleanData: any = {
        nome: formData.nome,
        contatto: formData.contatto || "",
        contattoVisibile: Boolean(formData.contattoVisibile),
        note: formData.note || "",
        farms: farmData,
        nazionalita: formData.nazionalita || "",
        dataRegistrazione: editingGiocatore
          ? editingGiocatore.dataRegistrazione
          : new Date().toISOString(),
      };

      // Aggiungi età solo se è un valore valido
      if (formData.eta) {
        cleanData["eta"] = Number(formData.eta);
      }

      // Aggiungi immagine solo se esiste
      if (formData.immagine) {
        cleanData["immagine"] = formData.immagine;
      }

      if (editingGiocatore) {
        // Aggiornamento giocatore esistente
        await updateDocWithRateLimit(doc(db, "utenti", editingGiocatore.id), cleanData);
        setSuccess("Giocatore aggiornato con successo");
      } else {
        // Creazione nuovo giocatore
        const pin = generaPIN();
        const nuovoGiocatore = {
          ...cleanData,
          pin,
          ruolo: "giocatore" as Ruolo,
          vicinati: [],
          id: crypto.randomUUID(),
        };
        await setDocWithRateLimit(doc(db, "utenti", pin.toString()), nuovoGiocatore);
        setSuccess("Giocatore creato con successo");
      }

      handleCloseDialog();
      caricaGiocatori(); // Ricarica i dati dopo il salvataggio
    } catch (error) {
      console.error("Errore nel salvataggio:", error);
      setError("Errore nel salvataggio del giocatore");
    }
  };

  const [expandedPlayers, setExpandedPlayers] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("expandedPlayers") || "[]");
    } catch {
      return [];
    }
  });
  const [expandedPresentations, setExpandedPresentations] = useState<string[]>(
    []
  );
  const [formData, setFormData] = useState<FormData>({
    nome: "",
    pin: generaPIN(),
    contatto: "",
    contattoVisibile: false,
    note: "",
    eta: "",
    nazionalita: "",
    farms: [farmVuota()],
    expandedPersonalInfo: true,
    farmExpanded: [true],
  });

  // Inizializzazione dello stato dei filtri senza localStorage
  const [expandedFilters, setExpandedFilters] = useState(false);

  // Aggiungo l'effetto per chiudere i filtri quando la pagina viene ricaricata
  useEffect(() => {
    const handleBeforeUnload = () => {
      setExpandedFilters(false);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // Aggiungo l'effetto per chiudere i filtri quando si cambia pagina
  useEffect(() => {
    return () => {
      setExpandedFilters(false);
    };
  }, [location.pathname]);

  // Funzione per gestire l'espansione del pannello
  const handleExpand = (giocatoreId: string) => {
    setExpandedPlayers((prev) => {
      const isExpanded = prev.includes(giocatoreId);
      if (isExpanded) {
        // Se stiamo chiudendo il pannello del giocatore, chiudiamo anche le informazioni
        setExpandedPresentations((prev) =>
          prev.filter((id) => id !== giocatoreId)
        );
        return prev.filter((id) => id !== giocatoreId);
      } else {
        return [...prev, giocatoreId];
      }
    });
  };

  // Funzione per espandere/collassare tutti i giocatori
  const handleExpandAll = () => {
    if (expandedPlayers.length === giocatoriFiltrati.length) {
      setExpandedPlayers([]);
    } else {
      setExpandedPlayers(giocatoriFiltrati.map((g) => g.id));
    }
  };

  // Funzione per gestire l'espansione della presentazione
  const handleExpandPresentation = (giocatoreId: string) => {
    setExpandedPresentations((prev) => {
      const isExpanded = prev.includes(giocatoreId);
      if (isExpanded) {
        return prev.filter((id) => id !== giocatoreId);
      } else {
        return [...prev, giocatoreId];
      }
    });
  };

  // Ordina i giocatori alfabeticamente
  const giocatoriOrdinati = [...giocatori].sort((a, b) =>
    a.nome.toLowerCase().localeCompare(b.nome.toLowerCase())
  );

  // Funzione per copiare il PIN negli appunti
  const handleCopyPin = (pin: number) => {
    navigator.clipboard.writeText(pin.toString());
    setSuccess("PIN copiato negli appunti!");
  };

  // Funzione per aggiornare il livello della farm
  const handleUpdateFarmLevel = async (
    giocatore: Giocatore,
    farmIndex: number
  ) => {
    try {
      const farmAggiornata = {
        ...giocatore.farms[farmIndex],
        livello: giocatore.farms[farmIndex].livello + 1,
      };

      const farmsAggiornate = [...giocatore.farms];
      farmsAggiornate[farmIndex] = farmAggiornata;

      await setDocWithRateLimit(doc(db, "utenti", giocatore.pin.toString()), {
        ...giocatore,
        farms: farmsAggiornate,
      });

      setSuccess("Livello aggiornato con successo!");
    } catch (error) {
      console.error("Errore nell'aggiornamento del livello:", error);
      setError("Errore nell'aggiornamento del livello");
    }
  };

  // Funzioni di utilità per la gestione del tag
  const formatTag = (tag: string): string => {
    // Rimuove il cancelletto se presente e converte in maiuscolo
    const cleanTag = tag.replace("#", "").toUpperCase();
    // Aggiunge il cancelletto all'inizio
    return `#${cleanTag}`;
  };

  const isValidTag = (tag: string): boolean => {
    if (!tag) return true; // Tag vuoto è permesso
    // Rimuovi spazi e #
    const cleanTag = tag.replace(/[\s#]/g, "").toUpperCase();
    // Verifica che il tag sia composto solo da lettere e numeri e sia lungo 8 o 9 caratteri
    return /^[A-Z0-9]{8,9}$/.test(cleanTag);
  };

  const getCleanTag = (tag: string): string => {
    // Rimuovi spazi e # e converti in maiuscolo
    return tag.replace(/[\s#]/g, "").toUpperCase();
  };

  // Effetti per salvare gli stati nel localStorage
  useEffect(() => {
    localStorage.setItem("gestioneGiocatori_filterMode", filterMode);
  }, [filterMode]);

  useEffect(() => {
    localStorage.setItem("gestioneGiocatori_sortBy", sortBy);
  }, [sortBy]);

  useEffect(() => {
    localStorage.setItem("gestioneGiocatori_sortDirection", sortDirection);
  }, [sortDirection]);

  useEffect(() => {
    localStorage.setItem("gestioneGiocatori_filterCountry", filterCountry);
  }, [filterCountry]);

  useEffect(() => {
    localStorage.setItem(
      "gestioneGiocatori_filterFarmStatus",
      filterFarmStatus
    );
  }, [filterFarmStatus]);

  useEffect(() => {
    localStorage.setItem("gestioneGiocatori_farmSortBy", farmSortBy);
  }, [farmSortBy]);

  useEffect(() => {
    localStorage.setItem(
      "gestioneGiocatori_farmSortDirection",
      farmSortDirection
    );
  }, [farmSortDirection]);

  useEffect(() => {
    localStorage.setItem("gestioneGiocatori_searchOpen", String(searchOpen));
  }, [searchOpen]);

  useEffect(() => {
    localStorage.setItem(
      "gestioneGiocatori_expandedFilters",
      String(expandedFilters)
    );
  }, [expandedFilters]);

  useEffect(() => {
    try {
      localStorage.setItem(
        "gestioneGiocatori_expandedPlayers",
        JSON.stringify(expandedPlayers)
      );
    } catch (error) {
      console.error("Errore nel salvataggio dei giocatori espansi:", error);
    }
  }, [expandedPlayers]);

  useEffect(() => {
    try {
      localStorage.setItem(
        "gestioneGiocatori_expandedPresentations",
        JSON.stringify(expandedPresentations)
      );
    } catch (error) {
      console.error(
        "Errore nel salvataggio delle presentazioni espanse:",
        error
      );
    }
  }, [expandedPresentations]);

  // Nazioni principali
  const mainCountries = countries.filter((country) =>
    ["IT", "GB", "FR", "ES"].includes(country.code)
  );
  const otherCountries = countries.filter(
    (country) => !["IT", "GB", "FR", "ES"].includes(country.code)
  );

  // Funzione per personalizzare la visualizzazione dei nomi delle nazioni
  const getCustomCountryName = (country: { code: string; name: string }) => {
    if (country.code === "GB") return "Inglese";
    return country.name;
  };

  // Funzione per personalizzare la visualizzazione dei codici paese
  const getCustomCountryCode = (code: string) => {
    if (code === "GB") return "EN";
    return code;
  };

  // Funzione per ottenere la bandiera del paese
  const getCountryFlag = (code: string) => {
    const flagCode = code === "GB" ? "GB" : code;
    // @ts-ignore
    const FlagComponent = countryFlags[flagCode];
    return FlagComponent ? (
      <FlagComponent style={{ width: "24px", marginRight: "8px" }} />
    ) : (
      <PeopleIcon sx={{ mr: 1 }} />
    );
  };

  // Funzione per gestire il click sulle intestazioni delle colonne
  const handleSortClick = (
    column: "farmName" | "playerName" | "level" | "diamonds" | "status"
  ) => {
    if (farmSortBy === column) {
      setFarmSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setFarmSortBy(column);
      setFarmSortDirection("asc");
    }
  };

  // Funzione per ottenere l'icona di ordinamento
  const getSortIcon = (
    column: "farmName" | "playerName" | "level" | "diamonds" | "status"
  ) => {
    if (farmSortBy !== column) return null;
    return farmSortDirection === "asc" ? (
      <ExpandMoreIcon />
    ) : (
      <ExpandLessIcon />
    );
  };

  // Funzione per ottenere tutte le farm
  const getAllFarms = useMemo(() => {
    const farms: Array<{
      farmName: string;
      playerName: string;
      level: number;
      diamonds: number;
      status: string;
      tag: string;
      playerId: string;
    }> = [];

    giocatori.forEach((giocatore) => {
      giocatore.farms.forEach((farm) => {
        farms.push({
          farmName: farm.nome,
          playerName: giocatore.nome,
          level: farm.livello,
          diamonds: farm.diamanti || 0,
          status: farm.stato,
          tag: farm.tag || "",
          playerId: giocatore.id,
        });
      });
    });

    return farms;
  }, [giocatori]);

  // Funzione per ordinare e filtrare
  const filteredItems = useMemo(() => {
    // Prima applichiamo il filtro di ricerca
    let risultati = searchQuery
      ? giocatori.filter(
          (giocatore) =>
            matchSearch(giocatore.nome) ||
            giocatore.farms.some((farm) => matchSearch(farm.nome))
        )
      : giocatori;

    if (filterMode === "players") {
      // Applichiamo il filtro per paese
      if (filterCountry) {
        risultati = risultati.filter((g) => g.nazionalita === filterCountry);
      }

      // Applichiamo l'ordinamento
      return risultati.sort((a, b) => {
        let comparison = 0;
        switch (sortBy) {
          case "name":
            comparison = a.nome.localeCompare(b.nome);
            break;
          case "age":
            comparison = (a.eta || 0) - (b.eta || 0);
            break;
          case "country":
            comparison = (a.nazionalita || "").localeCompare(
              b.nazionalita || ""
            );
            break;
          case "farmCount":
            comparison = a.farms.length - b.farms.length;
            break;
        }
        return sortDirection === "asc" ? comparison : -comparison;
      });
    } else {
      // Logica per la vista farm
      const farms = risultati.flatMap((giocatore) =>
        giocatore.farms.map((farm) => ({
          farmName: farm.nome,
          playerName: giocatore.nome,
          level: farm.livello,
          diamonds: farm.diamanti || 0,
          status: farm.stato,
          tag: farm.tag || "",
          playerId: giocatore.id,
        }))
      );

      // Applichiamo il filtro per stato farm
      let farmsFiltrate = farms;
      if (filterFarmStatus !== "all") {
        farmsFiltrate = farms.filter((farm) =>
          filterFarmStatus === "active"
            ? farm.status === "attivo"
            : farm.status === "inattivo"
        );
      }

      // Applichiamo l'ordinamento delle farm
      return farmsFiltrate.sort((a, b) => {
        let comparison = 0;
        switch (farmSortBy) {
          case "farmName":
            comparison = a.farmName.localeCompare(b.farmName);
            break;
          case "playerName":
            comparison = a.playerName.localeCompare(b.playerName);
            break;
          case "level":
            comparison = a.level - b.level;
            break;
          case "diamonds":
            comparison = a.diamonds - b.diamonds;
            break;
          case "status":
            comparison =
              (a.status === "attivo" ? 1 : 0) - (b.status === "attivo" ? 1 : 0);
            break;
        }
        return farmSortDirection === "asc" ? comparison : -comparison;
      });
    }
  }, [
    giocatori,
    filterMode,
    sortBy,
    sortDirection,
    filterCountry,
    filterFarmStatus,
    farmSortBy,
    farmSortDirection,
    searchQuery,
    matchSearch,
  ]);

  // Correzione degli errori di tipo
  const disabled = currentUser?.ruolo !== "admin";

  const handleOpenMenu = (
    event: React.MouseEvent<HTMLElement>,
    giocatore: Giocatore
  ) => {
    setAnchorEl(event.currentTarget);
    setSelectedGiocatore(giocatore);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const handleToggleCoordinatore = async () => {
    if (!selectedGiocatore || currentUser?.ruolo !== "admin") return;

    try {
      const nuovoRuolo: Ruolo =
        selectedGiocatore.ruolo === "coordinatore"
          ? "giocatore"
          : "coordinatore";
      const giocatoreRef = doc(db, "utenti", selectedGiocatore.id);

      await updateDocWithRateLimit(giocatoreRef, {
        ruolo: nuovoRuolo,
      });

      setSuccess(
        `Giocatore ${
          nuovoRuolo === "coordinatore"
            ? "promosso a Co-Leader"
            : "degradato a giocatore"
        } con successo`
      );
      handleCloseMenu();
    } catch (error) {
      console.error("Errore nella modifica del ruolo:", error);
      setError("Errore nella modifica del ruolo");
    }
  };

  const handleToggleModeratore = async () => {
    if (
      !selectedGiocatore ||
      !["admin", "coordinatore"].includes(currentUser?.ruolo || "")
    )
      return;

    // Il coordinatore non può modificare altri coordinatori o moderatori
    if (
      currentUser?.ruolo === "coordinatore" &&
      ["coordinatore", "moderatore"].includes(selectedGiocatore.ruolo)
    ) {
      return;
    }

    try {
      const nuovoRuolo: Ruolo =
        selectedGiocatore.ruolo === "moderatore" ? "giocatore" : "moderatore";
      const giocatoreRef = doc(db, "utenti", selectedGiocatore.id);

      await updateDocWithRateLimit(giocatoreRef, {
        ruolo: nuovoRuolo,
      });

      setSuccess(
        `Giocatore ${
          nuovoRuolo === "moderatore"
            ? "promosso a Gestore"
            : "degradato a giocatore"
        } con successo`
      );
      handleCloseMenu();
    } catch (error) {
      console.error("Errore nella modifica del ruolo:", error);
      setError("Errore nella modifica del ruolo");
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedGiocatore) return;

    try {
      // Prima eliminiamo tutte le assegnazioni relative alle farm del giocatore
      await eliminaAssegnazioniGiocatore(selectedGiocatore);
      
      // Poi eliminiamo il giocatore
      await deleteDocWithRateLimit(doc(db, "utenti", selectedGiocatore.id));
      setSuccess("Giocatore eliminato con successo");
      caricaGiocatori();
      setOpenDeleteDialog(false);
    } catch (error) {
      console.error("Errore nell'eliminazione:", error);
      setError("Errore nell'eliminazione del giocatore");
    }
  };

  // Funzione per eliminare tutte le assegnazioni e i progressi di un giocatore
  const eliminaAssegnazioniGiocatore = async (giocatore: Giocatore) => {
    try {
      // Ottieni l'ID del giocatore
      const userIdPrefix = giocatore.id;
      const pinGiocatore = giocatore.pin.toString();
      
      // Costruisci gli ID farm del giocatore (nel formato userId_index o pin_index)
      // Consideriamo entrambi i formati possibili per essere sicuri
      const farmIds = [
        ...giocatore.farms.map((_, index) => `${userIdPrefix}_${index}`),
        ...giocatore.farms.map((_, index) => `${pinGiocatore}_${index}`)
      ];
      console.log(`IDs farm da cercare:`, farmIds);
      
      // Batch per le operazioni multiple
      const batch = writeBatch(db);
      let contatoreAssegnazioni = 0;
      let contatoreProgressi = 0;
      
      // 1. Eliminazione delle assegnazioni
      const assegnazioniRef = collection(db, "assegnazioni");
      const assegnazioniSnapshot = await getDocsWithRateLimit(assegnazioniRef);
      
      assegnazioniSnapshot.forEach((doc) => {
        const assegnazione = doc.data();
        // Verifica se farm_id corrisponde a una delle farm del giocatore
        if (assegnazione.farm_id && farmIds.includes(assegnazione.farm_id)) {
          batch.delete(doc.ref);
          contatoreAssegnazioni++;
          console.log(`Eliminata assegnazione con farm_id ${assegnazione.farm_id}`, doc.id);
        }
      });
      
      // 2. Eliminazione dei progressi
      const progressiRef = collection(db, "progressi");
      const progressiSnapshot = await getDocsWithRateLimit(progressiRef);
      
      console.log(`Esaminando ${progressiSnapshot.size} documenti di progressi`);
      
      // Stampa dettagli di ogni progresso per debug
      progressiSnapshot.forEach((doc) => {
        const progresso = doc.data();
        console.log(`Progresso ID ${doc.id}:`, progresso);
        
        // Verifica esatta con farmIds
        if (progresso.farm_id && farmIds.includes(progresso.farm_id)) {
          batch.delete(doc.ref);
          contatoreProgressi++;
          console.log(`MATCH ESATTO: Eliminato progresso con farm_id ${progresso.farm_id}`, doc.id);
        } 
        // Verifica alternativa che controlla se il farm_id inizia con il PIN del giocatore
        else if (progresso.farm_id && progresso.farm_id.startsWith(`${pinGiocatore}_`)) {
          batch.delete(doc.ref);
          contatoreProgressi++;
          console.log(`MATCH PER PIN: Eliminato progresso con farm_id ${progresso.farm_id}`, doc.id);
        }
        // Se il farm_id include il PIN da qualche parte
        else if (progresso.farm_id && progresso.farm_id.includes(pinGiocatore)) {
          batch.delete(doc.ref);
          contatoreProgressi++;
          console.log(`MATCH PER PIN INCLUSO: Eliminato progresso con farm_id ${progresso.farm_id}`, doc.id);
        }
      });
      
      // 3. Esecuzione del batch se ci sono documenti da eliminare
      if (contatoreAssegnazioni > 0 || contatoreProgressi > 0) {
        await batch.commit();
        const messaggio = `Eliminati ${contatoreAssegnazioni} assegnazioni e ${contatoreProgressi} progressi per il giocatore ${giocatore.nome}`;
        console.log(messaggio);
        setSuccess(messaggio);
      } else {
        console.log(`Nessuna assegnazione o progresso trovato per il giocatore ${giocatore.nome}`);
      }
      
      return { assegnazioni: contatoreAssegnazioni, progressi: contatoreProgressi };
    } catch (error) {
      console.error("Errore nell'eliminazione delle assegnazioni e progressi:", error);
      throw error;
    }
  };

  // Funzione per ricaricare i giocatori
  const caricaGiocatori = async () => {
    try {
      const querySnapshot = await getDocsWithRateLimit(collection(db, "utenti"));
      const giocatoriData = querySnapshot.docs
        .map((doc) => ({
          ...(doc.data() as Giocatore),
          id: doc.id,
        }))
        .filter((g) => g.ruolo !== "admin");
      setGiocatori(giocatoriData);
    } catch (error) {
      console.error("Errore nel caricamento dei giocatori:", error);
      setError("Errore nel caricamento dei giocatori");
    }
  };

  const handleSearchClick = () => {
    setSearchOpen(!searchOpen);
    // Se stiamo aprendo la ricerca, attendiamo il render e poi diamo il focus
    if (!searchOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  };

  // Funzione per aggiornare lo stato della farm
  const handleToggleFarmStatus = async (
    giocatore: Giocatore,
    farmIndex: number
  ) => {
    try {
      const nuovoStato: StatoFarm =
        giocatore.farms[farmIndex].stato === "attivo" ? "inattivo" : "attivo";
      const farmsAggiornate = [...giocatore.farms];
      farmsAggiornate[farmIndex] = {
        ...farmsAggiornate[farmIndex],
        stato: nuovoStato,
      };

      await setDocWithRateLimit(doc(db, "utenti", giocatore.id), {
        ...giocatore,
        farms: farmsAggiornate,
      });

      setSuccess(
        `Farm ${
          nuovoStato === "attivo" ? "attivata" : "disattivata"
        } con successo`
      );
    } catch (error) {
      console.error("Errore nell'aggiornamento dello stato della farm:", error);
      setError("Errore nell'aggiornamento dello stato della farm");
    }
  };

  return (
    <Layout>
      <Box
        component="main"
        sx={{
          p: 3,
          width: "100%",
          maxWidth: "1200px",
          mx: "auto", // Margini automatici a destra e sinistra per centrare
        }}
      >
        {/* Pulsante grande Nuovo Giocatore a larghezza intera */}
        {["admin", "coordinatore"].includes(currentUser?.ruolo || "") && (
          <Button
            variant="contained"
            onClick={handleAddGiocatore}
            sx={{
              width: "100%",
              borderRadius: 2,
              padding: "10px",
              mb: 2,
              fontSize: "1rem",
              fontWeight: "bold",
              textTransform: "none"
            }}
            startIcon={<AddIcon />}
          >
            NUOVO GIOCATORE
          </Button>
        )}
        
        {/* Header con pulsante Nuovo Giocatore e statistiche */}
        <Box sx={{ mb: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            {/* Rimuovo il pulsante di aggiunta che era qui */}

            {/* Pulsante ricerca */}
            <IconButton
              onClick={handleSearchClick}
              color={searchOpen ? "primary" : "default"}
              size="small"
            >
              <SearchIcon />
            </IconButton>

            {/* Pulsante espandi/collassa tutto */}
            <Button
              onClick={() => {
                if (expandedPlayers.length === giocatoriFiltrati.length) {
                  setExpandedPlayers([]);
                  setExpandedPresentations([]); // Chiude anche tutte le sezioni info
                } else {
                  setExpandedPlayers(giocatoriFiltrati.map((g) => g.id));
                }
              }}
              startIcon={
                expandedPlayers.length === giocatoriFiltrati.length ? (
                  <ExpandLessIcon />
                ) : (
                  <ExpandMoreIcon />
                )
              }
              size="small"
              sx={{ textTransform: "none" }}
            >
              {expandedPlayers.length === giocatoriFiltrati.length
                ? t("azioni.comprimi")
                : t("azioni.espandi")}
            </Button>

            <Box
              sx={{ 
                display: "flex", 
                alignItems: "center", 
                gap: 0.5, 
                ml: "auto" 
              }}
            >
              <Chip
                icon={<PeopleIcon />}
                label={giocatoriFiltrati.length}
                size="small"
                color="primary"
              />

              {/* Conteggio farm attive */}
              {(() => {
                const farmAttive = giocatoriFiltrati.reduce(
                  (acc, g) =>
                    acc + g.farms.filter((f) => f.stato === "attivo").length,
                  0
                );
                return (
                  <Chip
                    icon={<CheckCircleIcon />}
                    label={farmAttive}
                    size="small"
                    color="success"
                  />
                );
              })()}

              {/* Conteggio farm inattive */}
              <Chip
                icon={<ErrorIcon />}
                label={giocatoriFiltrati.reduce(
                  (acc, g) =>
                    acc + g.farms.filter((f) => f.stato === "inattivo").length,
                  0
                )}
                color="error"
                size="small"
              />
            </Box>
          </Box>

          {/* Campo di ricerca collassabile */}
          <Collapse in={searchOpen}>
            <Box sx={{ mt: 1 }}>
              <TextField
                fullWidth
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cerca giocatori o farm..."
                size="small"
                inputRef={searchInputRef}
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
                        onClick={() => setSearchQuery("")}
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
          </Collapse>
        </Box>

        {/* Header con pulsante Filtri */}
        <Paper sx={{ p: 1, mb: 1 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center", // Cambiato da space-between a center
              flexWrap: "wrap",
              width: "100%"
            }}
          >
            <Box sx={{ 
              display: "flex", 
              alignItems: "center", 
              gap: 1,
              flexWrap: "wrap",
              justifyContent: "center", // Aggiunto per centrare gli elementi
              width: "auto",
              mb: { xs: 1, sm: 0 }
            }}>
              {/* Pulsante toggle vista (GIOCATORI/FARM) */}
              <IconButton 
                onClick={() => setFilterMode(filterMode === "players" ? "farms" : "players")}
                color="primary"
                size="small"
                sx={{ 
                  p: 1,
                  bgcolor: "action.hover",
                  borderRadius: 1
                }}
              >
                {filterMode === "players" ? <ViewModuleIcon /> : <ViewListIcon />}
              </IconButton>
              
              {/* Pulsanti ordinamento per vista GIOCATORI */}
              {filterMode === "players" && (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                  <Button
                    size="small"
                    variant={sortBy === "name" ? "contained" : "outlined"}
                    onClick={() => {
                      if (sortBy === "name") {
                        setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                      } else {
                        setSortBy("name");
                        setSortDirection("asc");
                      }
                    }}
                    endIcon={sortBy === "name" ? (
                      sortDirection === "asc" ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />
                    ) : null}
                    sx={{ textTransform: "none" }}
                  >
                    Nome
                  </Button>
                  
                  <Button
                    size="small"
                    variant={sortBy === "farmCount" ? "contained" : "outlined"}
                    onClick={() => {
                      if (sortBy === "farmCount") {
                        setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                      } else {
                        setSortBy("farmCount");
                        setSortDirection("asc");
                      }
                    }}
                    endIcon={sortBy === "farmCount" ? (
                      sortDirection === "asc" ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />
                    ) : null}
                    sx={{ textTransform: "none" }}
                  >
                    Farm
                  </Button>
                  
                  <Button
                    size="small"
                    variant={sortBy === "country" ? "contained" : "outlined"}
                    onClick={() => {
                      if (sortBy === "country") {
                        setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                      } else {
                        setSortBy("country");
                        setSortDirection("asc");
                      }
                    }}
                    endIcon={sortBy === "country" ? (
                      sortDirection === "asc" ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />
                    ) : null}
                    sx={{ textTransform: "none" }}
                  >
                    Paese
                  </Button>
                </Box>
              )}
              
              {/* Switch per filtro farm attive/inattive nella vista FARM */}
              {filterMode === "farms" && (
                <FormControlLabel
                  control={
                    <Switch
                      checked={filterFarmStatus === "active"}
                      onChange={(e) => setFilterFarmStatus(e.target.checked ? "active" : "all")}
                      size="small"
                    />
                  }
                  label="Solo farm attive"
                  sx={{ ml: 1 }}
                />
              )}
            </Box>
          </Box>
        </Paper>

        {/* Header con statistiche */}
        <Box
          sx={{
            px: 2,
            py: 1,
            mb: 2,
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            justifyContent: "space-between",
            gap: 2,
          }}
        ></Box>

        {/* Visualizzazione dei risultati */}
        {filterMode === "players" ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 0.5,
              width: "100%",
            }}
          >
            {giocatoriFiltrati.map((giocatore, index) => {
              const hasActiveFarms = giocatore.farms.some(
                (f) => f.stato === "attivo"
              );
              const farmsFiltrate = getFarmsFiltrate(giocatore.farms);
              const mostraFarms =
                !searchQuery || matchSearch(giocatore.nome)
                  ? giocatore.farms
                  : farmsFiltrate;
              const isFirstInactive =
                !hasActiveFarms &&
                giocatoriFiltrati[index - 1]?.farms.some(
                  (f) => f.stato === "attivo"
                );

              return (
                <React.Fragment key={giocatore.id}>
                  {isFirstInactive && (
                    <Divider
                      sx={{ my: 2, borderColor: "divider", borderWidth: 1 }}
                    />
                  )}
                  <Paper
                    elevation={1}
                    sx={{
                      overflow: "hidden",
                      transition: "all 0.3s ease",
                      borderRadius: "8px",
                      mb: 0.5,
                      bgcolor: !hasActiveFarms
                        ? "action.hover"
                        : "rgba(227, 242, 253, 0.7)",
                      "&:hover": {
                        bgcolor: !hasActiveFarms
                          ? "action.hover"
                          : "rgba(227, 242, 253, 0.9)",
                      },
                    }}
                  >
                    {/* Header del giocatore */}
                    <Box
                      onClick={() => handleExpand(giocatore.id)}
                      sx={{
                        px: 1.5,
                        py: 0.75,
                        display: "flex",
                        alignItems: "center",
                        cursor: "pointer",
                        width: "100%",
                      }}
                    >
                      {/* Prima colonna: numero e nome */}
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 0.75,
                          flexGrow: 1,
                          overflow: "hidden",
                          minWidth: 0,
                        }}
                      >
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            minWidth: "18px",
                            textAlign: "right",
                            fontSize: "0.8rem"
                          }}
                        >
                          {index + 1}.
                        </Typography>
                        <Box sx={{ display: "flex", flexDirection: "column", minWidth: 0, flexGrow: 1 }}>
                          <Typography
                            variant="subtitle1"
                            sx={{
                              fontWeight: "medium",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              fontSize: "0.9rem",
                              lineHeight: 1.2
                            }}
                          >
                            {giocatore.nome}
                          </Typography>
                          {["moderatore", "coordinatore"].includes(
                            giocatore.ruolo
                          ) && (
                            <Typography
                              variant="caption"
                              sx={{
                                fontStyle: "italic",
                                color: "text.secondary",
                                fontSize: "0.65rem",
                                lineHeight: 1,
                              }}
                            >
                              {giocatore.ruolo === "coordinatore" 
                                ? "Co-Leader"
                                : giocatore.ruolo === "moderatore" 
                                  ? "Gestore" 
                                  : giocatore.ruolo.charAt(0).toUpperCase() + giocatore.ruolo.slice(1)}
                            </Typography>
                          )}
                        </Box>
                      </Box>

                      {/* Colonna centrale: chips e info */}
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 0.5,
                          flexShrink: 0,
                          mr: 0.75,
                        }}
                      >
                        {/* Farm status */}
                        <Chip
                          label={`${
                            giocatore.farms.filter((f) => f.stato === "attivo")
                              .length
                          }/${giocatore.farms.length}`}
                          size="small"
                          color="default"
                          sx={{
                            height: 18,
                            fontSize: "0.7rem",
                          }}
                        />

                        {/* Info Button - compattato */}
                        {(giocatore.note ||
                          giocatore.contatto ||
                          giocatore.eta ||
                          giocatore.nazionalita) && (
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleExpandPresentation(giocatore.id);
                            }}
                            color={
                              expandedPresentations.includes(giocatore.id)
                                ? "primary"
                                : "default"
                            }
                            sx={{ p: 0.2 }}
                          >
                            <InfoIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        )}

                        {/* Nazionalità - solo bandiera */}
                        {giocatore.nazionalita && (
                          <Box sx={{ height: 16, display: "flex", alignItems: "center" }}>
                            {getCountryFlag(giocatore.nazionalita)}
                          </Box>
                        )}
                      </Box>

                      {/* Colonna destra: azioni */}
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 0.25,
                          flexShrink: 0,
                        }}
                      >
                        {(canEditGiocatore(giocatore) ||
                          currentUser?.pin === giocatore.pin) && (
                          <>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyPin(giocatore.pin);
                              }}
                              sx={{ p: 0.2 }}
                            >
                              <ContentCopyIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenMenu(e, giocatore);
                              }}
                              sx={{ p: 0.2 }}
                            >
                              <MoreVertIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                          </>
                        )}
                        {/* Rimuovo la freccia espandi/collassa, il click sulla riga espande già */}
                      </Box>
                    </Box>

                    {/* Presentazione espandibile */}
                    {(giocatore.note ||
                      giocatore.contatto ||
                      giocatore.eta ||
                      giocatore.nazionalita ||
                      giocatore.pin) && (
                      <Collapse
                        in={expandedPresentations.includes(giocatore.id)}
                      >
                        <Box
                          sx={{
                            p: 1.25,
                            borderRadius: 1,
                            bgcolor: "action.hover",
                            color: "text.secondary",
                            fontSize: "0.8rem",
                            whiteSpace: "pre-wrap",
                            mx: 1.5,
                            mb: 1,
                            display: "flex",
                            flexDirection: "column",
                            gap: 0.75,
                          }}
                        >
                          {/* Contenuto presentazione */}
                          {/* Immagine del profilo */}
                          {giocatore.immagine && (
                            <Box 
                              sx={{ 
                                width: "100%", 
                                display: "flex", 
                                justifyContent: "center", 
                                mb: 1 
                              }}
                            >
                              <Avatar 
                                src={giocatore.immagine} 
                                alt={giocatore.nome}
                                sx={{ 
                                  width: 80, 
                                  height: 80,
                                  border: "2px solid white"
                                }}
                              />
                            </Box>
                          )}

                          {giocatore.contatto && canViewFullDetails(giocatore) && (
                            <Box>
                              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                Contatto:
                              </Typography>{" "}
                              <Box 
                                component="span" 
                                onClick={() => {
                                  navigator.clipboard.writeText(giocatore.contatto || "");
                                  setSuccess("Contatto copiato negli appunti!");
                                }}
                                sx={{ 
                                  cursor: 'pointer',
                                  '&:hover': {
                                    color: 'primary.main',
                                    textDecoration: 'underline'
                                  }
                                }}
                              >
                                {giocatore.contatto}
                              </Box>
                              {giocatore.contattoVisibile && (
                                <Chip
                                  label="Visibile"
                                  size="small"
                                  color="primary"
                                  variant="outlined"
                                  sx={{ ml: 1, height: 16, fontSize: '0.65rem' }}
                                />
                              )}
                            </Box>
                          )}

                          {giocatore.eta && (
                            <Box>
                              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                Età:
                              </Typography>{" "}
                              {giocatore.eta} anni
                            </Box>
                          )}

                          {giocatore.nazionalita && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                Nazionalità:
                              </Typography>{" "}
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                {getCountryFlag(giocatore.nazionalita)}
                                {getCustomCountryName({ 
                                  code: giocatore.nazionalita, 
                                  name: countries.find(c => c.code === giocatore.nazionalita)?.name || giocatore.nazionalita 
                                })}
                              </Box>
                            </Box>
                          )}

                          {/* Presentazione visibile a tutti */}
                          {giocatore.note && (
                            <Box>
                              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                Presentazione:
                              </Typography>
                              <Box sx={{ mt: 0.5 }}>{giocatore.note}</Box>
                            </Box>
                          )}

                          {/* PIN - solo admin, coordinatore, moderatore oppure utente stesso */}
                          {canViewFullDetails(giocatore) && (
                            <Box>
                              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                PIN:
                              </Typography>{" "}
                              <Box 
                                component="span" 
                                onClick={() => handleCopyPin(giocatore.pin)}
                                sx={{ 
                                  cursor: 'pointer',
                                  fontFamily: 'monospace',
                                  '&:hover': {
                                    color: 'primary.main',
                                    textDecoration: 'underline'
                                  }
                                }}
                              >
                                {giocatore.pin}
                              </Box>
                            </Box>
                          )}
                        </Box>
                      </Collapse>
                    )}

                    {/* Lista delle farms espandibile */}
                    <Collapse in={expandedPlayers.includes(giocatore.id)}>
                      <Box sx={{ px: 1.5, pb: 1.25 }}>
                        <List disablePadding dense sx={{ mt: 0 }}>
                          {mostraFarms.map((farm, farmIndex) => (
                            <React.Fragment key={farmIndex}>
                              <ListItem 
                                disablePadding 
                              sx={{
                                  py: 0.25, 
                                  bgcolor: farm.stato === "inattivo" ? "rgba(0,0,0,0.03)" : "transparent",
                                  borderRadius: "4px",
                                }}
                              >
                                <Box sx={{ display: "flex", alignItems: "center", width: "100%" }}>
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                      flexGrow: 1,
                                      overflow: "hidden"
                                    }}
                                  >
                                    {/* Nome farm */}
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                        flexGrow: 1,
                                        overflow: "hidden"
                                      }}
                                    >
                                      {/* Icona copia tag e Nome farm */}
                                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, overflow: "hidden" }}>
                                        <IconButton
                                size="small"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (farm.tag) {
                                              handleCopy(farm.tag);
                                            }
                                          }}
                                          disabled={!farm.tag}
                                sx={{
                                            p: 0,
                                            width: 16,
                                            height: 16,
                                            opacity: farm.tag ? 1 : 0.4,
                                            color: farm.tag ? "primary.main" : "text.disabled"
                                          }}
                                        >
                                          <ContentCopyIcon fontSize="inherit" />
                                        </IconButton>
                                <Typography
                                  sx={{
                                            flexGrow: 1, 
                                            fontWeight: farm.principale ? 600 : 400,
                                            color: farm.stato === "inattivo" ? "text.disabled" : "text.primary",
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap",
                                            fontSize: "0.85rem",
                                          }}
                                        >
                                          {farm.nome}
                                </Typography>
                              </Box>
                            </Box>
                        </Box>
                                  
                                  {/* Informazioni farm */}
                              <Box 
                                sx={{ 
                                  display: "flex", 
                                  alignItems: "center", 
                                  gap: 0.75, 
                                  ml: 1,
                                  flexShrink: 0
                                }}
                              >
                                {/* Diamanti prima del livello */}
                                <Box 
                                  sx={{ 
                                    display: "flex", 
                                    alignItems: "center", 
                                    gap: 0.5,
                                    color: farm.stato === "inattivo" ? "text.disabled" : "text.secondary",
                                  }}
                                >
                                  {/* Prima mostro i diamanti */}
                                  {farm.diamanti !== undefined && (
                                    <Typography
                                      sx={{ 
                                        display: "flex", 
                                        alignItems: "center", 
                                        fontSize: "0.75rem",
                                      }}
                                    >
                                      💎{farm.diamanti}
                                    </Typography>
                                  )}
                                  
                                  {/* Poi mostro il livello e pulsante + */}
                                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.25, ml: 0.5 }}>
                                    <img
                                      src="/images/livello.png"
                                      alt="Livello"
                                      style={{
                                        width: "12px",
                                        height: "12px",
                                        marginRight: "2px",
                                      }}
                                    />
                                    <Typography sx={{ fontSize: "0.75rem" }}>
                                      {farm.livello}
                                    </Typography>
                                    
                                    {/* Pulsante + */}
                                    {canEditGiocatore(giocatore) && (
                                      <IconButton
                                        size="small"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (farm.livello < 999) {
                                            handleUpdateFarmLevel(giocatore, farmIndex);
                                          } else {
                                            setError("Il livello massimo è 999");
                                          }
                                        }}
                                        sx={{
                                          p: 0,
                                          ml: 0.25,
                                          width: 14,
                                          height: 14,
                                          bgcolor: "primary.main",
                                          color: "white",
                                          "&:hover": {
                                            bgcolor: "primary.dark",
                                          },
                                          "& .MuiSvgIcon-root": {
                                            fontSize: 10
                                          }
                                        }}
                                      >
                                        <AddIcon fontSize="inherit" />
                                      </IconButton>
                                    )}
                                  </Box>
                                </Box>
                                
                                {/* Toggle stato - switch stile mobile piccolo */}
                                {canEditGiocatore(giocatore) && (
                                  <Switch
                                    checked={farm.stato === "attivo"}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      handleToggleFarmStatus(giocatore, farmIndex);
                                    }}
                                    size="small"
                                    sx={{
                                      ml: 0.5,
                                      '& .MuiSwitch-switchBase.Mui-checked': {
                                        color: '#fff',
                                        '& + .MuiSwitch-track': {
                                          backgroundColor: 'success.main',
                                          opacity: 1,
                                        },
                                      },
                                      '& .MuiSwitch-track': {
                                        backgroundColor: 'grey.400',
                                      }
                                    }}
                                  />
                                )}
                              </Box>
                            </Box>
                              </ListItem>
                            </React.Fragment>
                        ))}
                        </List>
                      </Box>
                    </Collapse>
                  </Paper>
                </React.Fragment>
              );
            })}
          </Box>
        ) : (
          // Vista Farm (tabella)
          <TableContainer 
            component={Paper}
            sx={{
              width: "100%",
              overflowX: "auto"
            }}
          >
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell
                    onClick={() => handleSortClick("farmName")}
                    sx={{
                      cursor: "pointer",
                      "&:hover": { bgcolor: "action.hover" },
                      whiteSpace: "nowrap"
                    }}
                  >
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                    >
                      Farm
                      {getSortIcon("farmName")}
                    </Box>
                  </TableCell>
                  <TableCell
                    onClick={() => handleSortClick("playerName")}
                    sx={{
                      cursor: "pointer",
                      "&:hover": { bgcolor: "action.hover" },
                      whiteSpace: "nowrap"
                    }}
                  >
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                    >
                      Giocatore
                      {getSortIcon("playerName")}
                    </Box>
                  </TableCell>
                  <TableCell
                    align="right"
                    onClick={() => handleSortClick("level")}
                    sx={{
                      cursor: "pointer",
                      "&:hover": { bgcolor: "action.hover" },
                      whiteSpace: "nowrap"
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.5,
                        justifyContent: "flex-end",
                      }}
                    >
                      <img
                        src="/images/livello.png"
                        alt="Livello"
                        style={{
                          width: "16px",
                          height: "16px",
                          objectFit: "contain",
                        }}
                      />
                      {getSortIcon("level")}
                    </Box>
                  </TableCell>
                  <TableCell
                    align="right"
                    onClick={() => handleSortClick("diamonds")}
                    sx={{
                      cursor: "pointer",
                      "&:hover": { bgcolor: "action.hover" },
                      whiteSpace: "nowrap"
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.5,
                        justifyContent: "flex-end",
                      }}
                    >
                      💎
                      {getSortIcon("diamonds")}
                    </Box>
                  </TableCell>
                  <TableCell
                    onClick={() => handleSortClick("status")}
                    sx={{
                      cursor: "pointer",
                      "&:hover": { bgcolor: "action.hover" },
                      whiteSpace: "nowrap"
                    }}
                  >
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                    >
                      Stato
                      {getSortIcon("status")}
                    </Box>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredItems.map((farm, index) => (
                  <TableRow
                    key={`${farm.playerId}-${farm.farmName}`}
                    sx={{ 
                      "&:nth-of-type(odd)": { bgcolor: "action.hover" },
                      "& .MuiTableCell-root": {
                        py: 0.75,
                        px: 1
                      }
                    }}
                  >
                    <TableCell component="th" scope="row">
                      <Typography
                        onClick={() => {
                          if (farm.tag) {
                            navigator.clipboard.writeText(
                              getCleanTag(farm.tag)
                            );
                            setSuccess("Tag copiato negli appunti!");
                          }
                        }}
                        sx={{
                          cursor: farm.tag ? "pointer" : "default",
                          "&:hover": farm.tag
                            ? {
                                textDecoration: "underline",
                                color: "primary.main",
                              }
                            : {},
                        }}
                      >
                        {farm.farmName}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography
                        onClick={() => {
                          const giocatore = giocatori.find(
                            (g) => g.id === farm.playerId
                          );
                          if (
                            giocatore &&
                            (currentUser?.id === giocatore.id ||
                              ["admin", "coordinatore", "moderatore"].includes(
                                currentUser?.ruolo || ""
                              ))
                          ) {
                            navigator.clipboard.writeText(
                              giocatore.pin.toString()
                            );
                            setSuccess("PIN copiato negli appunti!");
                          }
                        }}
                        sx={{
                          cursor:
                            currentUser?.id === farm.playerId ||
                            ["admin", "coordinatore", "moderatore"].includes(
                              currentUser?.ruolo || ""
                            )
                              ? "pointer"
                              : "default",
                          "&:hover":
                            currentUser?.id === farm.playerId ||
                            ["admin", "coordinatore", "moderatore"].includes(
                              currentUser?.ruolo || ""
                            )
                              ? {
                                  textDecoration: "underline",
                                  color: "primary.main",
                                }
                              : {},
                        }}
                      >
                        {farm.playerName}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">{farm.level}</TableCell>
                    <TableCell align="right">{farm.diamonds}</TableCell>
                    <TableCell>
                      <Chip
                        label={farm.status === "attivo" ? "Attiva" : "Inattiva"}
                        color="default"
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        {/* Dialog per aggiungere/modificare giocatore */}
        <Dialog
          open={openDialog}
          onClose={handleCloseDialog}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            {editingGiocatore ? "Modifica Giocatore" : "Nuovo Giocatore"}
          </DialogTitle>
          <DialogContent sx={{ px: { xs: 1, sm: 3 } }}>
            <Paper
              elevation={0}
              variant="outlined"
              sx={{ 
                mb: 2, 
                mt: 1,
                borderRadius: '8px',
                overflow: 'hidden'
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  py: 1,
                  px: 2,
                  cursor: "pointer",
                  bgcolor: 'background.paper'
                }}
                onClick={() => {
                  setFormData({
                    ...formData,
                    expandedPersonalInfo: !formData.expandedPersonalInfo,
                  });
                }}
              >
                <Typography sx={{ fontWeight: 'medium', fontSize: '0.95rem' }}>
                  Dati Personali
                </Typography>
                {formData.expandedPersonalInfo ? (
                  <ExpandLessIcon fontSize="small" color="primary" />
                ) : (
                  <ExpandMoreIcon fontSize="small" color="primary" />
                )}
              </Box>

              <Collapse in={formData.expandedPersonalInfo}>
                <Box sx={{ p: 2, pt: 1, bgcolor: 'background.paper' }}>
                  <Grid container spacing={1}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Nome"
                  value={formData.nome}
                  onChange={(e) =>
                    setFormData({ ...formData, nome: e.target.value })
                  }
                  disabled={
                    !canEditGiocatore(
                      editingGiocatore ||
                        ({ pin: "", ruolo: "giocatore" } as Giocatore)
                    )
                  }
                        size="small"
                        margin="dense"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="PIN"
                    value={formData.pin}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value.length <= 6 && /^\d*$/.test(value)) {
                        setFormData({ ...formData, pin: parseInt(value) || 0 });
                      }
                    }}
                        disabled={currentUser?.ruolo !== "admin"}
                    InputProps={{ inputProps: { min: 0, max: 999999 } }}
                        size="small"
                        margin="dense"
                  />
              </Grid>
                    <Grid item xs={6} sm={3}>
                <TextField
                  fullWidth
                  label="Età"
                  type="number"
                  value={formData.eta || ""}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    setFormData({
                      ...formData,
                            eta: !isNaN(value) ? value.toString() : "",
                    });
                  }}
                  InputProps={{ inputProps: { min: 0, max: 150 } }}
                        size="small"
                        margin="dense"
                />
              </Grid>
                    <Grid item xs={6} sm={9}>
                      <FormControl fullWidth size="small" margin="dense">
                  <InputLabel>Nazionalità</InputLabel>
                  <Select
                    value={formData.nazionalita || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, nazionalita: e.target.value })
                    }
                    label="Nazionalità"
                  >
                          <MenuItem value="">Nessuna</MenuItem>
                    {mainCountries.map((country) => (
                      <MenuItem
                        key={country.code}
                        value={country.code}
                        sx={{ display: "flex", alignItems: "center" }}
                      >
                        {getCountryFlag(country.code)}
                        {getCustomCountryName(country)} (
                        {getCustomCountryCode(country.code)})
                      </MenuItem>
                    ))}
                    <MenuItem
                      disabled
                      sx={{ borderTop: "1px solid #ccc", my: 1, opacity: 0.7 }}
                    >
                      ─────────────
                    </MenuItem>
                    {otherCountries.map((country) => (
                      <MenuItem
                        key={country.code}
                        value={country.code}
                        sx={{ display: "flex", alignItems: "center" }}
                      >
                        {getCountryFlag(country.code)}
                        {country.name} ({country.code})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <TextField
                    fullWidth
                    label="Contatto"
                    value={formData.contatto}
                    onChange={(e) =>
                      setFormData({ ...formData, contatto: e.target.value })
                    }
                          size="small"
                          margin="dense"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                              size="small"
                        checked={formData.contattoVisibile}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            contattoVisibile: e.target.checked,
                          })
                        }
                      />
                    }
                          label={
                            <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>
                              Visibile
                            </Typography>
                          }
                  />
                </Box>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Presentazione"
                  value={formData.note}
                  onChange={(e) =>
                    setFormData({ ...formData, note: e.target.value })
                  }
                        size="small"
                        margin="dense"
                />
              </Grid>
              <Grid item xs={12}>
                      <Typography variant="body2" sx={{ mb: 1 }}>Immagine Profilo</Typography>
                <UploadImmagine
                  cartella="giocatori"
                  id={editingGiocatore?.id || "nuovo"}
                  urlImmagine={formData.immagine}
                  onImmagineCaricata={(url) =>
                    setFormData({ ...formData, immagine: url })
                  }
                  onImmagineEliminata={() =>
                    setFormData({ ...formData, immagine: "" })
                  }
                        dimensione={120}
                />
              </Grid>
                  </Grid>
                </Box>
              </Collapse>
            </Paper>

            {/* Miglioro il layout del dialog per i farm */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="body1" sx={{ fontWeight: 'medium', fontSize: '0.95rem' }}>
                Farm ({formData.farms.length})
              </Typography>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => {
                  const newFarms = [
                    ...formData.farms,
                    {
                      nome: "",
                      tag: "",
                      diamanti: undefined,
                      stato: "attivo",
                      principale: formData.farms.length === 0,
                      livello: 1,
                      derby_tags: [],
                    },
                  ];
                  const newFarmExpanded = [...formData.farmExpanded, true];
                                    setFormData({
                                      ...formData,
                                      farms: newFarms,
                    farmExpanded: newFarmExpanded,
                                    });
                                  }}
                size="small"
                sx={{ py: 0.2, px: 1 }}
              >
                Aggiungi Farm
              </Button>
            </Box>

            {formData.farms.map((farm, index) => (
              <Paper
                elevation={0}
                variant="outlined"
                sx={{ 
                  mb: 0.5,
                  borderRadius: '8px',
                  overflow: 'hidden'
                }}
                key={index}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    py: 0.5,
                    px: 1.5,
                    cursor: "pointer",
                    bgcolor: 'background.paper',
                  }}
                  onClick={() => {
                    const newFarmExpanded = [...formData.farmExpanded];
                    newFarmExpanded[index] = !newFarmExpanded[index];
                    setFormData({
                      ...formData,
                      farmExpanded: newFarmExpanded,
                    });
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, overflow: "hidden" }}>
                    <Typography 
                      sx={{ 
                        fontWeight: farm.principale ? 'bold' : 'normal',
                        fontSize: '0.9rem',
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                      }}
                    >
                      {farm.nome || `Farm ${index + 1}`}
                      {farm.principale && (
                        <Typography 
                          component="span" 
                          sx={{ ml: 0.5, fontSize: '0.8rem' }}
                        >
                          👑
                        </Typography>
                      )}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Switch
                      checked={farm.stato === "attivo"}
                      onChange={(e) =>
                        handleFarmChange(
                          index,
                          "stato",
                          e.target.checked ? "attivo" : "inattivo"
                        )
                      }
                      size="small"
                      sx={{ ml: 'auto', mr: 0.5 }}
                    />
                    {formData.farmExpanded[index] ? (
                      <ExpandLessIcon fontSize="small" color="primary" />
                    ) : (
                      <ExpandMoreIcon fontSize="small" color="primary" />
                    )}
                  </Box>
                </Box>

                <Collapse in={formData.farmExpanded[index]}>
                  <Box sx={{ p: 1.5, pt: 1, bgcolor: 'background.paper' }}>
                    <Grid container spacing={1}>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            label="Nome Farm"
                            value={farm.nome}
                            onChange={(e) =>
                              handleFarmChange(index, "nome", e.target.value)
                            }
                          size="small"
                          margin="dense"
                          sx={{ mt: 0 }}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            label="Tag"
                            value={farm.tag}
                            onChange={(e) => {
                              const value = e.target.value;
                              // Se il tag è vuoto, permettiamo di salvarlo
                              if (!value) {
                                handleFarmChange(index, "tag", "");
                                return;
                              }

                              // Formatta il tag (aggiunge # e converte in maiuscolo)
                              const formattedTag = formatTag(value);

                              // Verifica la validità del tag
                              if (isValidTag(formattedTag)) {
                                handleFarmChange(index, "tag", formattedTag);
                              } else {
                                // Se il tag non è valido, non aggiorniamo il valore
                                // ma permettiamo comunque la digitazione per non bloccare l'utente
                                handleFarmChange(
                                  index,
                                  "tag",
                                  value.toUpperCase()
                                );
                              }
                            }}
                            error={farm.tag !== "" && !isValidTag(farm.tag)}
                            helperText={
                              farm.tag !== "" && !isValidTag(farm.tag)
                              ? "Tag deve essere 8 caratteri"
                                : ""
                            }
                          size="small"
                          margin="dense"
                          sx={{ mt: 0 }}
                          />
                        </Grid>
                      <Grid item xs={6} sm={3}>
                          <TextField
                            fullWidth
                            type="number"
                            label="Livello"
                            value={farm.livello || ""}
                            onChange={(e) =>
                              handleFarmChange(
                                index,
                                "livello",
                                e.target.value
                                  ? parseInt(e.target.value)
                                  : undefined
                              )
                            }
                            InputProps={{ inputProps: { min: 1 } }}
                          size="small"
                          margin="dense"
                          sx={{ mt: 0 }}
                          />
                        </Grid>
                      <Grid item xs={6} sm={3}>
                          <TextField
                            fullWidth
                            type="number"
                            label="Diamanti"
                            value={farm.diamanti || ""}
                            onChange={(e) =>
                              handleFarmChange(
                                index,
                                "diamanti",
                                e.target.value
                                  ? parseInt(e.target.value)
                                  : undefined
                              )
                            }
                          size="small"
                          margin="dense"
                          sx={{ mt: 0 }}
                          />
                        </Grid>

                        {/* Selettore Derby Tags */}
                        <Grid item xs={12}>
                        <FormControl fullWidth size="small" margin="dense" sx={{ mt: 0.5 }}>
                            <InputLabel>Derby Tags</InputLabel>
                            <Select
                              multiple
                              value={farm.derby_tags || []}
                              onChange={(e) =>
                                handleFarmChange(
                                  index,
                                  "derby_tags",
                                  e.target.value
                                )
                              }
                              input={<OutlinedInput label="Derby Tags" />}
                              renderValue={(selected) => (
                                <Box
                                  sx={{
                                    display: "flex",
                                    flexWrap: "wrap",
                                    gap: 0.5,
                                  }}
                                >
                                  {selected.map((value) => {
                                    const derbyInfo = derby.find(
                                      (d) => d.id === value
                                    );
                                    return (
                                      <Chip
                                        key={value}
                                        label={derbyInfo?.nome}
                                        size="small"
                                        sx={{
                                          bgcolor: derbyInfo?.colore || "#666",
                                          color: "white",
                                        height: 18,
                                        fontSize: '0.65rem'
                                        }}
                                      />
                                    );
                                  })}
                                </Box>
                              )}
                            >
                              {derby.map((d) => (
                                <MenuItem key={d.id} value={d.id}>
                                  <Checkbox
                                    checked={
                                      (farm.derby_tags || []).indexOf(d.id) > -1
                                    }
                                  size="small"
                                  />
                                  <Box
                                    component="span"
                                    sx={{
                                    width: 12,
                                    height: 12,
                                      mr: 1,
                                      borderRadius: "50%",
                                      display: "inline-block",
                                      bgcolor: d.colore || "#666",
                                    }}
                                  />
                                  {d.nome}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>

                        <Grid item xs={12}>
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 0.5 }}>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={farm.principale}
                                onChange={(e) => {
                                  const newFarms = formData.farms.map(
                                    (f, i) => ({
                                      ...f,
                                      principale:
                                        i === index
                                          ? e.target.checked
                                          : i === formData.farms.findIndex(f => f.principale) && e.target.checked 
                                            ? false 
                                            : f.principale,
                                    })
                                  );
                                  setFormData({
                                    ...formData,
                                    farms: newFarms,
                                  });
                                }}
                                size="small"
                              />
                            }
                            label={
                              <Typography variant="body2" sx={{ fontSize: "0.8rem" }}>
                                Farm Principale
                              </Typography>
                            }
                          />
                          
                    {formData.farms.length > 1 && (
                        <Button
                          size="small"
                          color="error"
                              variant="outlined"
                          onClick={() => {
                            const newFarms = formData.farms.filter(
                              (_, i) => i !== index
                            );
                                const newFarmExpanded = formData.farmExpanded.filter(
                                  (_, i) => i !== index
                                );
                    setFormData({
                      ...formData,
                                  farms: newFarms,
                                  farmExpanded: newFarmExpanded
                    });
                  }}
                              sx={{ py: 0, minWidth: "auto", fontSize: "0.75rem" }}
                >
                              Rimuovi
                </Button>
                          )}
                        </Box>
              </Grid>
            </Grid>
                  </Box>
                </Collapse>
              </Paper>
            ))}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Annulla</Button>
            <Button onClick={handleSave} variant="contained">
              Salva
            </Button>
          </DialogActions>
        </Dialog>

        {/* Menu delle azioni */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleCloseMenu}
        >
          {/* Modifica giocatore - visibile a admin, coordinatore, o al proprio profilo */}
          {(canEditGiocatore(selectedGiocatore) ||
            currentUser?.pin === selectedGiocatore?.pin) && (
            <MenuItem
              onClick={() => {
                handleEditGiocatore(selectedGiocatore!);
                handleCloseMenu();
              }}
            >
              <ListItemIcon>
                <EditIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Modifica</ListItemText>
            </MenuItem>
          )}

          {/* Solo l'admin può promuovere a coordinatore */}
          {currentUser?.ruolo === "admin" &&
            selectedGiocatore &&
            selectedGiocatore.ruolo !== "admin" && (
              <MenuItem onClick={handleToggleCoordinatore}>
                <ListItemIcon>
                  <SupervisorAccountIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>
                  {selectedGiocatore.ruolo === "coordinatore"
                    ? "Rimuovi da Co-Leader"
                    : "Promuovi a Co-Leader"}
                </ListItemText>
              </MenuItem>
            )}

          {/* Admin e coordinatore possono promuovere a moderatore */}
          {["admin", "coordinatore"].includes(currentUser?.ruolo || "") &&
            selectedGiocatore &&
            !["admin", "coordinatore"].includes(selectedGiocatore.ruolo) && (
              <MenuItem onClick={handleToggleModeratore}>
                <ListItemIcon>
                  <AdminPanelSettingsIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>
                  {selectedGiocatore.ruolo === "moderatore"
                    ? "Rimuovi da Gestore"
                    : "Promuovi a Gestore"}
                </ListItemText>
              </MenuItem>
            )}

          {/* Admin e coordinatore possono eliminare */}
          {["admin", "coordinatore"].includes(currentUser?.ruolo || "") &&
            selectedGiocatore &&
            !["admin", "coordinatore"].includes(selectedGiocatore.ruolo) && (
              <MenuItem
                onClick={() => {
                  handleCloseMenu();
                  setOpenDeleteDialog(true);
                }}
              >
                <ListItemIcon>
                  <DeleteIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Elimina</ListItemText>
              </MenuItem>
            )}
        </Menu>

        {/* Dialog di conferma eliminazione */}
        <Dialog
          open={openDeleteDialog}
          onClose={() => setOpenDeleteDialog(false)}
        >
          <DialogTitle>Conferma Eliminazione</DialogTitle>
          <DialogContent>
            <Typography>
              Sei sicuro di voler eliminare il giocatore{" "}
              {selectedGiocatore?.nome}?
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDeleteDialog(false)}>Annulla</Button>
            <Button
              onClick={handleConfirmDelete}
              color="error"
              variant="contained"
            >
              Elimina
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar per i messaggi */}
        <Snackbar
          open={!!error || !!success}
          autoHideDuration={6000}
          onClose={() => {
            setError("");
            setSuccess("");
          }}
        >
          <Alert
            onClose={() => {
              setError("");
              setSuccess("");
            }}
            severity={error ? "error" : "success"}
          >
            {error || success}
          </Alert>
        </Snackbar>
      </Box>
    </Layout>
  );
}
