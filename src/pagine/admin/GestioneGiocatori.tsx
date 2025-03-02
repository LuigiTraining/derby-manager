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
} from "firebase/firestore";
import { db } from "../../configurazione/firebase";
import { Giocatore, Farm, StatoFarm } from "../../tipi/giocatore";
import UploadImmagine from "../../componenti/comune/UploadImmagine";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../componenti/autenticazione/AuthContext";
import { countries, getCountryName } from "../../utils/countries";
import * as countryFlags from "country-flag-icons/react/3x2";
import { Derby } from "../../tipi/derby"; // Aggiungo l'import

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
  livello: undefined,
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
  contatto: string;
  contattoVisibile: boolean;
  note: string;
  eta: string;
  nazionalita: string;
  farms: {
    nome: string;
    tag: string;
    diamanti?: number;
    stato: StatoFarm;
    principale: boolean;
    livello: number;
  }[];
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

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Aggiungi l'hook useTranslation
  const { t } = useTranslation();

  // Carica i derby dal database
  const caricaDerby = async () => {
    try {
      const derbySnapshot = await getDocs(collection(db, "derby"));
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

    // Ordina alfabeticamente entrambi i gruppi
    giocatoriConFarmAttive.sort((a, b) => a.nome.localeCompare(b.nome));
    giocatoriSenzaFarmAttive.sort((a, b) => a.nome.localeCompare(b.nome));

    // Combina i due gruppi
    return [...giocatoriConFarmAttive, ...giocatoriSenzaFarmAttive];
  }, [giocatori, searchQuery, matchSearch]);

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
      const cleanData = {
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
        await updateDoc(doc(db, "utenti", editingGiocatore.id), cleanData);
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
        await setDoc(doc(db, "utenti", pin.toString()), nuovoGiocatore);
        setSuccess("Giocatore creato con successo");
      }

      handleCloseDialog();
      caricaGiocatori(); // Ricarica i dati dopo il salvataggio
    } catch (error) {
      console.error("Errore nel salvataggio:", error);
      setError("Errore nel salvataggio del giocatore");
    }
  };

  const [formData, setFormData] = useState<FormData>({
    nome: "",
    pin: generaPIN(),
    contatto: "",
    contattoVisibile: false,
    note: "",
    immagine: "",
    eta: "",
    nazionalita: "",
    farms: [farmVuota()],
  });

  // Stato per gestire i pannelli espandibili
  const [expandedPlayers, setExpandedPlayers] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("gestioneGiocatori_expandedPlayers");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [expandedPresentations, setExpandedPresentations] = useState<string[]>(
    () => {
      try {
        const saved = localStorage.getItem(
          "gestioneGiocatori_expandedPresentations"
        );
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    }
  );

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

      await setDoc(doc(db, "utenti", giocatore.pin.toString()), {
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

      await updateDoc(giocatoreRef, {
        ruolo: nuovoRuolo,
      });

      setSuccess(
        `Giocatore ${
          nuovoRuolo === "coordinatore"
            ? "promosso a coordinatore"
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

      await updateDoc(giocatoreRef, {
        ruolo: nuovoRuolo,
      });

      setSuccess(
        `Giocatore ${
          nuovoRuolo === "moderatore"
            ? "promosso a moderatore"
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
      await deleteDoc(doc(db, "utenti", selectedGiocatore.id));
      setSuccess("Giocatore eliminato con successo");
      caricaGiocatori();
      setOpenDeleteDialog(false);
    } catch (error) {
      console.error("Errore nell'eliminazione:", error);
      setError("Errore nell'eliminazione del giocatore");
    }
  };

  // Funzione per ricaricare i giocatori
  const caricaGiocatori = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "utenti"));
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

      await setDoc(doc(db, "utenti", giocatore.id), {
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
      <Box sx={{ maxWidth: "100%", overflow: "hidden" }}>
        {/* Header con pulsante Nuovo Giocatore e statistiche */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {["admin", "coordinatore"].includes(currentUser?.ruolo || "") && (
              <Button
                variant="contained"
                onClick={handleAddGiocatore}
                sx={{
                  minWidth: "auto",
                  borderRadius: 2,
                  padding: "4px",
                  width: "32px",
                  height: "32px",
                }}
              >
                <AddIcon />
              </Button>
            )}

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
              sx={{ display: "flex", alignItems: "center", gap: 1, ml: "auto" }}
            >
              <Chip
                icon={<PeopleIcon />}
                label={giocatoriFiltrati.length}
                size="small"
                color={giocatoriFiltrati.length >= 30 ? "success" : "default"}
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
                    color={
                      farmAttive === 0
                        ? "default"
                        : farmAttive >= 30
                        ? "success"
                        : "warning"
                    }
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
                color="default"
                size="small"
              />
            </Box>
          </Box>

          {/* Campo di ricerca collassabile */}
          <Collapse in={searchOpen}>
            <Box sx={{ mt: 2 }}>
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
              justifyContent: "center",
            }}
          >
            <Button
              startIcon={<FilterListIcon />}
              onClick={() => setExpandedFilters(!expandedFilters)}
              sx={{ textTransform: "none", py: 0.5 }}
              size="small"
            >
              Filtri
            </Button>
          </Box>

          {/* Pannello dei filtri collassabile */}
          <Collapse in={expandedFilters}>
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <ToggleButtonGroup
                    value={filterMode}
                    exclusive
                    onChange={(e, value) => value && setFilterMode(value)}
                    size="small"
                    fullWidth
                  >
                    <ToggleButton value="players">
                      <ViewModuleIcon sx={{ mr: 1 }} />
                      Giocatori
                    </ToggleButton>
                    <ToggleButton value="farms">
                      <ViewListIcon sx={{ mr: 1 }} />
                      Farm
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Grid>

                {filterMode === "players" ? (
                  <>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel>Ordina per</InputLabel>
                        <Select
                          value={sortBy}
                          onChange={(e) =>
                            setSortBy(e.target.value as SortOption)
                          }
                          label="Ordina per"
                        >
                          <MenuItem value="name">Nome</MenuItem>
                          <MenuItem value="age">Età</MenuItem>
                          <MenuItem value="country">Paese</MenuItem>
                          <MenuItem value="farmCount">Numero Farm</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel>Filtra per Paese</InputLabel>
                        <Select
                          value={filterCountry}
                          onChange={(e) => setFilterCountry(e.target.value)}
                          label="Filtra per Paese"
                        >
                          <MenuItem value="">Tutti</MenuItem>
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
                            sx={{
                              borderTop: "1px solid #ccc",
                              my: 1,
                              opacity: 0.7,
                            }}
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
                      <Box sx={{ display: "flex", gap: 1 }}>
                        <Button
                          variant={
                            sortDirection === "asc" ? "contained" : "outlined"
                          }
                          size="small"
                          onClick={() => setSortDirection("asc")}
                          sx={{ textTransform: "none" }}
                        >
                          Crescente
                        </Button>
                        <Button
                          variant={
                            sortDirection === "desc" ? "contained" : "outlined"
                          }
                          size="small"
                          onClick={() => setSortDirection("desc")}
                          sx={{ textTransform: "none" }}
                        >
                          Decrescente
                        </Button>
                      </Box>
                    </Grid>
                  </>
                ) : (
                  <>
                    <Grid item xs={12}>
                      <FormControl fullWidth>
                        <InputLabel>Stato Farm</InputLabel>
                        <Select
                          value={filterFarmStatus}
                          onChange={(e) =>
                            setFilterFarmStatus(
                              e.target.value as "all" | "active" | "inactive"
                            )
                          }
                          label="Stato Farm"
                        >
                          <MenuItem value="all">Tutte</MenuItem>
                          <MenuItem value="active">Solo Attive</MenuItem>
                          <MenuItem value="inactive">Solo Inattive</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  </>
                )}
              </Grid>
            </Box>
          </Collapse>
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
              maxWidth: "100%",
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
                      borderBottom: "1px solid",
                      borderColor: "divider",
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
                        p: 1.5,
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                        cursor: "pointer",
                        flexWrap: { xs: "wrap", sm: "nowrap" },
                      }}
                    >
                      {/* Prima riga: numero, avatar e nome */}
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 2,
                          flexGrow: 1,
                          minWidth: 0,
                        }}
                      >
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            minWidth: "20px",
                            textAlign: "right",
                          }}
                        >
                          {index + 1}
                        </Typography>
                        <Box sx={{ display: "flex", flexDirection: "column" }}>
                          <Typography
                            variant="subtitle1"
                            sx={{
                              fontWeight: "bold",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
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
                                fontSize: "0.7rem",
                                lineHeight: 1,
                                mt: -0.5,
                              }}
                            >
                              {giocatore.ruolo.charAt(0).toUpperCase() +
                                giocatore.ruolo.slice(1)}
                            </Typography>
                          )}
                        </Box>
                      </Box>

                      {/* Seconda colonna: chips e info */}
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          flexShrink: 0,
                        }}
                      >
                        {/* Farm status */}
                        <Chip
                          label={`${
                            giocatore.farms.filter((f) => f.stato === "attivo")
                              .length
                          }/${giocatore.farms.length}`}
                          size="small"
                          color={
                            giocatore.farms.every((f) => f.stato === "attivo")
                              ? "primary"
                              : giocatore.farms.some(
                                  (f) => f.stato === "attivo"
                                )
                              ? "warning"
                              : "default"
                          }
                          sx={{
                            height: 24,
                            bgcolor: giocatore.farms.every(
                              (f) => f.stato === "attivo"
                            )
                              ? "primary.main"
                              : giocatore.farms.some(
                                  (f) => f.stato === "attivo"
                                )
                              ? "rgba(237, 108, 2, 0.7)"
                              : undefined,
                          }}
                        />

                        {/* Info Button */}
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
                            sx={{ p: 0.5 }}
                          >
                            <InfoIcon fontSize="small" />
                          </IconButton>
                        )}

                        {/* Nazionalità - solo bandiera */}
                        {giocatore.nazionalita && (
                          <Box sx={{ display: "flex", alignItems: "center" }}>
                            {getCountryFlag(giocatore.nazionalita)}
                          </Box>
                        )}
                      </Box>

                      {/* Terza colonna: azioni */}
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          ml: "auto",
                        }}
                      >
                        {(canEditGiocatore(giocatore) ||
                          currentUser?.pin === giocatore.pin) && (
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 0.5,
                            }}
                          >
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyPin(giocatore.pin);
                              }}
                              sx={{ p: 0.5 }}
                            >
                              <ContentCopyIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenMenu(e, giocatore);
                              }}
                            >
                              <MoreVertIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        )}
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
                            p: 1.5,
                            borderRadius: 1,
                            bgcolor: "action.hover",
                            color: "text.secondary",
                            fontSize: "0.875rem",
                            whiteSpace: "pre-wrap",
                            mx: 2,
                            display: "flex",
                            flexDirection: "column",
                            gap: 1,
                          }}
                        >
                          {/* Avatar */}
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "center",
                              mb: 1,
                            }}
                          >
                            <Avatar
                              src={giocatore.immagine || undefined}
                              sx={{ width: 80, height: 80 }}
                            >
                              {giocatore.nome.charAt(0).toUpperCase()}
                            </Avatar>
                          </Box>

                          {/* PIN */}
                          {(canEditGiocatore(giocatore) ||
                            currentUser?.pin === giocatore.pin) && (
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                              }}
                            >
                              <Typography
                                variant="subtitle2"
                                color="text.primary"
                              >
                                PIN:
                              </Typography>
                              <Typography
                                onClick={() => handleCopyPin(giocatore.pin)}
                                sx={{
                                  cursor: "pointer",
                                  "&:hover": {
                                    color: "primary.main",
                                    textDecoration: "underline",
                                  },
                                }}
                              >
                                {giocatore.pin}
                              </Typography>
                            </Box>
                          )}

                          {/* Nazionalità nel box espandibile */}
                          {giocatore.nazionalita && (
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                              }}
                            >
                              <Typography
                                variant="subtitle2"
                                color="text.primary"
                              >
                                Nazionalità:
                              </Typography>
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1,
                                }}
                              >
                                {getCountryFlag(giocatore.nazionalita)}
                                <Typography>
                                  {getCustomCountryName({
                                    code: giocatore.nazionalita,
                                    name: getCountryName(giocatore.nazionalita),
                                  })}{" "}
                                  ({getCustomCountryCode(giocatore.nazionalita)}
                                  )
                                </Typography>
                              </Box>
                            </Box>
                          )}

                          {/* Età */}
                          {giocatore.eta && (
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                              }}
                            >
                              <Typography
                                variant="subtitle2"
                                color="text.primary"
                              >
                                Età:
                              </Typography>
                              <Chip
                                label={`${giocatore.eta} anni`}
                                size="small"
                                color="default"
                                sx={{ height: 24 }}
                              />
                            </Box>
                          )}

                          {/* Contatto */}
                          {giocatore.contatto &&
                            (currentUser?.ruolo === "admin" ||
                              currentUser?.pin === giocatore.pin ||
                              giocatore.contattoVisibile) && (
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1,
                                }}
                              >
                                <Typography
                                  variant="subtitle2"
                                  color="text.primary"
                                >
                                  Contatto:
                                </Typography>
                                <Typography
                                  onClick={() => {
                                    navigator.clipboard.writeText(
                                      giocatore.contatto || ""
                                    );
                                    setSuccess(
                                      "Contatto copiato negli appunti!"
                                    );
                                  }}
                                  sx={{
                                    cursor: "pointer",
                                    "&:hover": {
                                      color: "primary.main",
                                      textDecoration: "underline",
                                    },
                                  }}
                                >
                                  {giocatore.contatto}
                                </Typography>
                                {!giocatore.contattoVisibile &&
                                  currentUser?.ruolo !== "admin" &&
                                  currentUser?.pin === giocatore.pin && (
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      sx={{ ml: 1 }}
                                    >
                                      (Visibile solo a te)
                                    </Typography>
                                  )}
                              </Box>
                            )}

                          {/* Note */}
                          {giocatore.note && (
                            <Box sx={{ mt: 1 }}>
                              <Typography
                                variant="subtitle2"
                                color="text.primary"
                                sx={{ mb: 0.5 }}
                              >
                                Note:
                              </Typography>
                              <Typography>{giocatore.note}</Typography>
                            </Box>
                          )}
                        </Box>
                      </Collapse>
                    )}

                    {/* Contenuto espandibile con le farm */}
                    <Box
                      sx={{
                        maxHeight: expandedPlayers.includes(giocatore.id)
                          ? "1000px"
                          : "0px",
                        transition: "max-height 0.3s ease-in-out",
                        overflow: "hidden",
                      }}
                    >
                      <Box sx={{ px: 2, pb: 2, bgcolor: "background.paper" }}>
                        {mostraFarms.map((farm, farmIndex) => (
                          <Paper
                            key={farmIndex}
                            sx={{
                              p: 1,
                              bgcolor:
                                farm.stato === "attivo"
                                  ? "#ffffff"
                                  : "action.disabledBackground",
                              position: "relative",
                              borderRadius: 0,
                              mb: 0,
                              border: "1px solid",
                              borderColor: "divider",
                              boxShadow: "none",
                              "&:hover": {
                                bgcolor:
                                  farm.stato === "attivo"
                                    ? "rgba(255, 255, 255, 0.9)"
                                    : "action.disabledBackground",
                              },
                            }}
                          >
                            <Box
                              sx={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 1,
                              }}
                            >
                              {/* Nome farm e corona */}
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  width: "100%",
                                }}
                              >
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1,
                                  }}
                                >
                                  <Typography
                                    variant="subtitle1"
                                    sx={{ fontWeight: "bold" }}
                                  >
                                    {farm.nome}
                                    {farm.principale && (
                                      <Typography
                                        component="span"
                                        sx={{ ml: 1 }}
                                      >
                                        👑
                                      </Typography>
                                    )}
                                  </Typography>
                                </Box>

                                {/* Sposto il livello e lo stato sulla destra */}
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 2,
                                  }}
                                >
                                  <Chip
                                    size="small"
                                    label={
                                      farm.stato === "attivo"
                                        ? "Attiva"
                                        : "Inattiva"
                                    }
                                    color={
                                      farm.stato === "attivo"
                                        ? "success"
                                        : "default"
                                    }
                                    icon={
                                      <CircleIcon
                                        sx={{ fontSize: "12px !important" }}
                                      />
                                    }
                                    sx={{
                                      height: 20,
                                      cursor:
                                        currentUser?.ruolo === "admin" ||
                                        currentUser?.ruolo === "coordinatore" ||
                                        currentUser?.id === giocatore.id
                                          ? "pointer"
                                          : "default",
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      // Permetti la modifica solo a admin, coordinatori o al proprietario
                                      if (
                                        currentUser?.ruolo === "admin" ||
                                        currentUser?.ruolo === "coordinatore" ||
                                        currentUser?.id === giocatore.id
                                      ) {
                                        handleToggleFarmStatus(
                                          giocatore,
                                          farmIndex
                                        );
                                      }
                                    }}
                                  />
                                  <Box
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      bgcolor: "grey.200",
                                      borderRadius: 1,
                                      px: 1,
                                      py: 0.5,
                                      gap: 0.5,
                                      minWidth: "80px",
                                      justifyContent: "center",
                                    }}
                                  >
                                    <Typography
                                      variant="body2"
                                      sx={{
                                        width: "36px",
                                        textAlign: "center",
                                      }}
                                    >
                                      {farm.livello}
                                    </Typography>
                                    <img
                                      src="/images/livello.png"
                                      alt="Livello"
                                      style={{
                                        width: "16px",
                                        height: "16px",
                                        objectFit: "contain",
                                      }}
                                    />
                                    {(currentUser?.ruolo === "admin" ||
                                      currentUser?.ruolo === "coordinatore" ||
                                      currentUser?.pin === giocatore.pin) && (
                                      <IconButton
                                        size="small"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (farm.livello < 999) {
                                            handleUpdateFarmLevel(
                                              giocatore,
                                              farmIndex
                                            );
                                          } else {
                                            setError(
                                              "Il livello massimo è 999"
                                            );
                                          }
                                        }}
                                        sx={{
                                          ml: 0.5,
                                          bgcolor: "primary.main",
                                          color: "white",
                                          "&:hover": {
                                            bgcolor: "primary.dark",
                                          },
                                          width: 20,
                                          height: 20,
                                          "& .MuiSvgIcon-root": {
                                            fontSize: 16,
                                          },
                                        }}
                                      >
                                        <AddIcon />
                                      </IconButton>
                                    )}
                                  </Box>
                                </Box>
                              </Box>

                              {/* Tag con funzione copia */}
                              {(farm.tag || farm.diamanti) && (
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1,
                                  }}
                                >
                                  {farm.tag && (
                                    <>
                                      <Box
                                        onClick={() => {
                                          navigator.clipboard.writeText(
                                            getCleanTag(farm.tag!)
                                          );
                                          setSuccess(
                                            "Tag copiato negli appunti!"
                                          );
                                        }}
                                        sx={{
                                          cursor: "pointer",
                                          bgcolor: "action.hover",
                                          px: 1,
                                          py: 0.5,
                                          borderRadius: 1,
                                          display: "flex",
                                          alignItems: "center",
                                          gap: 1,
                                          width: "fit-content",
                                          "&:hover": {
                                            bgcolor: "action.selected",
                                          },
                                        }}
                                      >
                                        <Typography
                                          variant="body2"
                                          sx={{
                                            fontFamily: "monospace",
                                          }}
                                        >
                                          {farm.tag}
                                        </Typography>
                                      </Box>
                                    </>
                                  )}
                                  {farm.diamanti && (
                                    <Typography
                                      variant="body1"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const newValue = prompt(
                                          "Inserisci il nuovo valore dei diamanti:",
                                          farm.diamanti?.toString()
                                        );
                                        if (newValue !== null) {
                                          const numValue = parseInt(newValue);
                                          if (
                                            !isNaN(numValue) &&
                                            numValue >= 0
                                          ) {
                                            const farmsAggiornate = [
                                              ...giocatore.farms,
                                            ];
                                            farmsAggiornate[farmIndex] = {
                                              ...farmsAggiornate[farmIndex],
                                              diamanti: numValue,
                                            };

                                            setDoc(
                                              doc(db, "utenti", giocatore.id),
                                              {
                                                ...giocatore,
                                                farms: farmsAggiornate,
                                              }
                                            )
                                              .then(() => {
                                                setSuccess(
                                                  "Diamanti aggiornati con successo!"
                                                );
                                              })
                                              .catch((error) => {
                                                console.error(
                                                  "Errore nell'aggiornamento dei diamanti:",
                                                  error
                                                );
                                                setError(
                                                  "Errore nell'aggiornamento dei diamanti"
                                                );
                                              });
                                          } else {
                                            setError(
                                              "Inserisci un numero valido maggiore o uguale a 0"
                                            );
                                          }
                                        }
                                      }}
                                      sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 0.5,
                                        cursor: "pointer",
                                        "&:hover": {
                                          color: "primary.main",
                                          textDecoration: "underline",
                                        },
                                      }}
                                    >
                                      💎 {farm.diamanti}
                                    </Typography>
                                  )}
                                </Box>
                              )}

                              {/* Derby Tags */}
                              <Box
                                sx={{
                                  display: "flex",
                                  gap: 0.5,
                                  mt: 0.5,
                                  flexWrap: "wrap",
                                }}
                              >
                                {farm.derby_tags?.map((tagId) => {
                                  const derbyInfo = derby.find(
                                    (d) => d.id === tagId
                                  );
                                  if (!derbyInfo) return null;
                                  return (
                                    <Chip
                                      key={tagId}
                                      label={derbyInfo.nome}
                                      size="small"
                                      sx={{
                                        height: 16,
                                        fontSize: "0.625rem",
                                        bgcolor: derbyInfo.colore || "#666",
                                        color: "white",
                                        "& .MuiChip-label": { px: 1 },
                                      }}
                                    />
                                  );
                                })}
                              </Box>
                            </Box>
                          </Paper>
                        ))}
                      </Box>
                    </Box>
                  </Paper>
                </React.Fragment>
              );
            })}
          </Box>
        ) : (
          // Vista Farm (tabella)
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell
                    onClick={() => handleSortClick("farmName")}
                    sx={{
                      cursor: "pointer",
                      "&:hover": { bgcolor: "action.hover" },
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
                    sx={{ "&:nth-of-type(odd)": { bgcolor: "action.hover" } }}
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
                        color={farm.status === "attivo" ? "success" : "default"}
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
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
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
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: "flex", gap: 1 }}>
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
                    disabled={!currentUser?.ruolo === "admin"}
                    InputProps={{ inputProps: { min: 0, max: 999999 } }}
                  />
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Età"
                  type="number"
                  value={formData.eta || ""}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    setFormData({
                      ...formData,
                      eta: !isNaN(value) ? value.toString() : undefined,
                    });
                  }}
                  InputProps={{ inputProps: { min: 0, max: 150 } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Nazionalità</InputLabel>
                  <Select
                    value={formData.nazionalita || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, nazionalita: e.target.value })
                    }
                    label="Nazionalità"
                  >
                    <MenuItem value="">Tutti</MenuItem>
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
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <TextField
                    fullWidth
                    label="Contatto"
                    value={formData.contatto}
                    onChange={(e) =>
                      setFormData({ ...formData, contatto: e.target.value })
                    }
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.contattoVisibile}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            contattoVisibile: e.target.checked,
                          })
                        }
                      />
                    }
                    label="Mostra agli altri"
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
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle1">Immagine Profilo</Typography>
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
                  dimensione={150}
                />
              </Grid>

              {/* Farm Section */}
              {formData.farms.map((farm, index) => (
                <Grid item xs={12} key={index}>
                  <Card variant="outlined">
                    <CardContent>
                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <Typography variant="h6">
                            Farm {index + 1}
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
                                            : false,
                                      })
                                    );
                                    setFormData({
                                      ...formData,
                                      farms: newFarms,
                                    });
                                  }}
                                />
                              }
                              label="Principale"
                            />
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            label="Nome Farm"
                            value={farm.nome}
                            onChange={(e) =>
                              handleFarmChange(index, "nome", e.target.value)
                            }
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
                                ? "Il tag deve essere di 8 caratteri (lettere e numeri)"
                                : ""
                            }
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
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
                            margin="normal"
                            InputProps={{ inputProps: { min: 1 } }}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
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
                          />
                        </Grid>

                        {/* Selettore Derby Tags */}
                        <Grid item xs={12}>
                          <FormControl fullWidth>
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
                                  />
                                  <Box
                                    component="span"
                                    sx={{
                                      width: 14,
                                      height: 14,
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
                          <FormControlLabel
                            control={
                              <Switch
                                checked={farm.stato === "attivo"}
                                onChange={(e) =>
                                  handleFarmChange(
                                    index,
                                    "stato",
                                    e.target.checked ? "attivo" : "inattivo"
                                  )
                                }
                                disabled={!currentUser?.ruolo === "admin"}
                              />
                            }
                            label={
                              farm.stato === "attivo"
                                ? "Farm Attiva"
                                : "Farm Inattiva"
                            }
                          />
                        </Grid>
                      </Grid>
                    </CardContent>
                    {formData.farms.length > 1 && (
                      <CardActions>
                        <Button
                          size="small"
                          color="error"
                          onClick={() => {
                            const newFarms = formData.farms.filter(
                              (_, i) => i !== index
                            );
                            setFormData({ ...formData, farms: newFarms });
                          }}
                        >
                          Rimuovi Farm
                        </Button>
                      </CardActions>
                    )}
                  </Card>
                </Grid>
              ))}
              <Grid item xs={12}>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    setFormData({
                      ...formData,
                      farms: [
                        ...formData.farms,
                        {
                          nome: "",
                          tag: "",
                          diamanti: undefined,
                          stato: "attivo",
                          principale: false,
                          livello: 1,
                          derby_tags: [],
                        },
                      ],
                    });
                  }}
                >
                  Aggiungi Farm
                </Button>
              </Grid>
            </Grid>
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
                    ? "Rimuovi da coordinatore"
                    : "Promuovi a coordinatore"}
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
                    ? "Rimuovi da moderatore"
                    : "Promuovi a moderatore"}
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
