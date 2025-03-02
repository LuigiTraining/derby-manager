import React, { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
  Alert,
  Snackbar,
  Grid,
  FormControlLabel,
  Switch,
  Avatar,
  Stack,
  useTheme,
  useMediaQuery,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Tabs,
  Tab,
  Card,
  CardContent,
  Menu,
  ListItemIcon,
  ListItemText,
  Checkbox,
  OutlinedInput,
  InputAdornment,
  Collapse,
  Tooltip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import ViewListIcon from "@mui/icons-material/ViewList";
import SortByAlphaIcon from "@mui/icons-material/SortByAlpha";
import SortIcon from "@mui/icons-material/Sort";
import Layout from "../../componenti/layout/Layout";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
  updateDoc,
  addDoc,
} from "firebase/firestore";
import { db } from "../../configurazione/firebase";
import { Incarico, IncaricoCitta } from "../../tipi/incarico";
import { ElementoCitta } from "../../tipi/citta";
import { Derby } from "../../tipi/derby";
import UploadImmagine from "../../componenti/comune/UploadImmagine";

// Interfaccia per il form
interface IncaricoForm {
  nome: string;
  quantita: number;
  quantita_derby: Record<string, number>;
  livello_minimo: number;
  immagine: string;
  edificio_id: string | null;
  is_obbligatorio: boolean;
  usato_in_cesti: boolean;
  derby_tags: string[];
}

// Form iniziale vuoto
const formIniziale: IncaricoForm = {
  nome: "",
  quantita: 1,
  quantita_derby: {},
  livello_minimo: 1,
  immagine: "",
  edificio_id: null,
  is_obbligatorio: false,
  usato_in_cesti: false,
  derby_tags: [],
};

interface EdificioConLivello {
  id: string;
  nome: string;
  livello: number;
  immagine: string;
}

interface IncaricoCittaForm {
  id?: string;
  nome: string;
  descrizione: string;
  immagine: string;
  quantita: number;
  quantita_derby?: Record<string, number>;
  livello_minimo: number;
  elemento_id: string;
  tipo: "edificio" | "visitatore";
  usato_in_cesti: boolean;
  derby_tags: string[];
}

const formInizialeCitta: IncaricoCittaForm = {
  nome: "",
  descrizione: "",
  immagine: "",
  quantita: 1,
  livello_minimo: 1,
  elemento_id: "",
  tipo: "edificio",
  usato_in_cesti: false,
  derby_tags: [],
};

// Aggiungo il tipo per la tab attiva
type TabAttiva = "standard" | "citta";

export default function GestioneIncarichi() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { t } = useTranslation();

  // Funzione per tradurre il nome dell'incarico
  const getTranslatedName = (nome: string) => {
    // Verifica se esiste una traduzione per questo incarico
    const traduzione = t(`incarichi.${nome}`, {
      defaultValue: nome,
    });
    return traduzione;
  };

  const [incarichi, setIncarichi] = useState<Incarico[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingIncarico, setEditingIncarico] = useState<Incarico | null>(null);
  const [formData, setFormData] = useState<IncaricoForm>(formIniziale);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [edifici, setEdifici] = useState<{ id: string; nome: string }[]>([]);
  const [edificiConIncarichi, setEdificiConIncarichi] = useState<
    Map<string, Incarico[]>
  >(new Map());
  const [edificiDettagli, setEdificiDettagli] = useState<EdificioConLivello[]>(
    []
  );
  const [expandedEdifici, setExpandedEdifici] = useState<string[]>([]);
  const [tuttiEspansi, setTuttiEspansi] = useState(false);
  const [openDialogCitta, setOpenDialogCitta] = useState(false);
  const [formDataCitta, setFormDataCitta] = useState<{
    id?: string;
    nome: string;
    descrizione: string;
    immagine: string;
    quantita: number;
    quantita_derby?: Record<string, number>;
    livello_minimo: number;
    usato_in_cesti: boolean;
    elemento_id: string;
    tipo?: "edificio" | "visitatore";
    derby_tags?: string[];
  }>({
    nome: "",
    descrizione: "",
    immagine: "",
    quantita: 1,
    livello_minimo: 1,
    usato_in_cesti: false,
    elemento_id: "",
    tipo: "edificio",
    derby_tags: [],
  });
  const [elementiCitta, setElementiCitta] = useState<ElementoCitta[]>([]);
  const [tipoIncaricoCitta, setTipoIncaricoCitta] = useState<
    "edificio" | "visitatore"
  >("edificio");
  const [tabAttiva, setTabAttiva] = useState<TabAttiva>("standard");
  const [incarichiCitta, setIncarichiCitta] = useState<IncaricoCitta[]>([]);
  const [derby, setDerby] = useState<Derby[]>([]);
  const [anchorEl, setAnchorEl] = useState<{
    id: string;
    element: HTMLElement;
  } | null>(null);

  // Stati per la ricerca
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [visualizzazioneLineare, setVisualizzazioneLineare] = useState(() => {
    try {
      return localStorage.getItem("visualizzazioneLineare") === "true";
    } catch {
      return false;
    }
  });

  const [ordinamentoAlfabetico, setOrdinamentoAlfabetico] = useState(() => {
    try {
      return localStorage.getItem("ordinamentoAlfabetico") === "true";
    } catch {
      return false;
    }
  });

  const [ordinamentoAlfabeticoInverso, setOrdinamentoAlfabeticoInverso] =
    useState(() => {
      try {
        return localStorage.getItem("ordinamentoAlfabeticoInverso") === "true";
      } catch {
        return false;
      }
    });

  const [ordinamentoLivello, setOrdinamentoLivello] = useState(() => {
    try {
      return localStorage.getItem("ordinamentoLivello") === "true";
    } catch {
      return false;
    }
  });

  const [ordinamentoLivelloInverso, setOrdinamentoLivelloInverso] = useState(
    () => {
      try {
        return localStorage.getItem("ordinamentoLivelloInverso") === "true";
      } catch {
        return false;
      }
    }
  );

  // Effetto per il focus automatico
  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [searchOpen]);

  // Funzione per la ricerca
  const matchSearch = useCallback(
    (text: string): boolean => {
      if (!searchQuery) return true;
      return text.toLowerCase().includes(searchQuery.toLowerCase());
    },
    [searchQuery]
  );

  // Effetto per gestire l'espansione automatica quando si cerca
  useEffect(() => {
    if (searchQuery) {
      // Trova tutti gli edifici che contengono incarichi che corrispondono alla ricerca
      const edificiDaEspandere = edificiDettagli
        .filter((edificio) => {
          const incarichiEdificio = incarichi.filter(
            (i) => i.edificio_id === edificio.id
          );
          return (
            incarichiEdificio.some((i) =>
              i.nome.toLowerCase().includes(searchQuery.toLowerCase())
            ) || edificio.nome.toLowerCase().includes(searchQuery.toLowerCase())
          );
        })
        .map((edificio) => edificio.id);

      // Espande gli edifici trovati
      setExpandedEdifici((prev) => [
        ...new Set([...prev, ...edificiDaEspandere]),
      ]);
    }
  }, [searchQuery, edificiDettagli, incarichi]);

  // Carica gli incarichi dal database
  const caricaIncarichi = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "incarichi"));
      const incarichiData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Incarico[];
      setIncarichi(incarichiData);
    } catch (error) {
      console.error("Errore nel caricamento degli incarichi:", error);
      setError("Errore nel caricamento degli incarichi");
    }
  };

  // Carica gli edifici dal database con il loro livello
  const caricaEdifici = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "edifici"));
      const edificiData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as EdificioConLivello[];

      // Ordina gli edifici per livello
      edificiData.sort((a, b) => a.livello - b.livello);
      setEdificiDettagli(edificiData);
    } catch (error) {
      console.error("Errore nel caricamento degli edifici:", error);
    }
  };

  // Carica gli elementi città
  const caricaElementiCitta = async () => {
    try {
      const elementiQuery = query(collection(db, "elementi_citta"));
      const snapshot = await getDocs(elementiQuery);
      const elementiData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ElementoCitta[];
      setElementiCitta(elementiData);
    } catch (error) {
      console.error("Errore nel caricamento degli elementi città:", error);
      setError("Errore nel caricamento degli elementi città");
    }
  };

  // Carica gli incarichi città dal database
  const caricaIncarichiCitta = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "incarichi_citta"));
      const incarichiData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as IncaricoCitta[];
      setIncarichiCitta(incarichiData);
    } catch (error) {
      console.error("Errore nel caricamento degli incarichi città:", error);
      setError("Errore nel caricamento degli incarichi città");
    }
  };

  // Carica i derby dal database
  const caricaDerby = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "derby"));
      const derbyData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Derby[];
      setDerby(derbyData);
    } catch (error) {
      console.error("Errore nel caricamento dei derby:", error);
    }
  };

  // Effetti per salvare le preferenze nel localStorage
  useEffect(() => {
    localStorage.setItem(
      "visualizzazioneLineare",
      String(visualizzazioneLineare)
    );
  }, [visualizzazioneLineare]);

  useEffect(() => {
    localStorage.setItem(
      "ordinamentoAlfabetico",
      String(ordinamentoAlfabetico)
    );
  }, [ordinamentoAlfabetico]);

  useEffect(() => {
    localStorage.setItem(
      "ordinamentoAlfabeticoInverso",
      String(ordinamentoAlfabeticoInverso)
    );
  }, [ordinamentoAlfabeticoInverso]);

  useEffect(() => {
    localStorage.setItem("ordinamentoLivello", String(ordinamentoLivello));
  }, [ordinamentoLivello]);

  useEffect(() => {
    localStorage.setItem(
      "ordinamentoLivelloInverso",
      String(ordinamentoLivelloInverso)
    );
  }, [ordinamentoLivelloInverso]);

  // Organizza gli incarichi per edificio
  const organizzaIncarichi = (incarichi: Incarico[]) => {
    const incarichiPerEdificio = new Map<string, Incarico[]>();

    if (visualizzazioneLineare) {
      // In modalità lineare, mettiamo tutti gli incarichi in un unico gruppo
      const tuttiIncarichi = [...incarichi].filter(
        (inc) =>
          !searchQuery ||
          inc.nome.toLowerCase().includes(searchQuery.toLowerCase())
      );

      // Applica gli ordinamenti
      tuttiIncarichi.sort((a, b) => {
        if (ordinamentoAlfabetico) {
          return ordinamentoAlfabeticoInverso
            ? b.nome.localeCompare(a.nome)
            : a.nome.localeCompare(b.nome);
        }
        if (ordinamentoLivello) {
          const compareLivello = ordinamentoLivelloInverso
            ? b.livello_minimo - a.livello_minimo
            : a.livello_minimo - b.livello_minimo;
          return compareLivello || a.nome.localeCompare(b.nome);
        }
        return a.livello_minimo - b.livello_minimo;
      });

      incarichiPerEdificio.set("tutti", tuttiIncarichi);
    } else {
      // Inizializza la mappa con gli edifici esistenti
      edificiDettagli.forEach((edificio) => {
        incarichiPerEdificio.set(edificio.id, []);
      });

      // Distribuisci gli incarichi nei gruppi appropriati
      incarichi.forEach((incarico) => {
        if (incarico.edificio_id) {
          // Applica il filtro di ricerca
          if (
            !searchQuery ||
            incarico.nome.toLowerCase().includes(searchQuery.toLowerCase())
          ) {
            const incarichiEsistenti =
              incarichiPerEdificio.get(incarico.edificio_id) || [];
            incarichiEsistenti.push(incarico);
            incarichiPerEdificio.set(incarico.edificio_id, incarichiEsistenti);
          }
        }
      });

      // Ordina gli incarichi all'interno di ogni gruppo
      incarichiPerEdificio.forEach((incarichiGruppo, key) => {
        incarichiGruppo.sort((a, b) => {
          if (ordinamentoAlfabetico) {
            return ordinamentoAlfabeticoInverso
              ? b.nome.localeCompare(a.nome)
              : a.nome.localeCompare(b.nome);
          }
          if (ordinamentoLivello) {
            const compareLivello = ordinamentoLivelloInverso
              ? b.livello_minimo - a.livello_minimo
              : a.livello_minimo - b.livello_minimo;
            return compareLivello || a.nome.localeCompare(b.nome);
          }
          return a.livello_minimo - b.livello_minimo;
        });
      });
    }

    setEdificiConIncarichi(incarichiPerEdificio);
  };

  useEffect(() => {
    caricaIncarichi();
    caricaEdifici();
    caricaElementiCitta();
    caricaIncarichiCitta();
    caricaDerby();
  }, []);

  useEffect(() => {
    if (incarichi.length > 0) {
      organizzaIncarichi(incarichi);
    }
  }, [
    incarichi,
    edificiDettagli,
    visualizzazioneLineare,
    ordinamentoAlfabetico,
    ordinamentoAlfabeticoInverso,
    ordinamentoLivello,
    ordinamentoLivelloInverso,
  ]);

  const handleAddIncarico = () => {
    setEditingIncarico(null);
    setFormData(formIniziale);
    setOpenDialog(true);
  };

  const handleEditIncarico = (incarico: Incarico) => {
    setEditingIncarico(incarico);
    setFormData({
      nome: incarico.nome,
      quantita: incarico.quantita,
      quantita_derby: incarico.quantita_derby || {},
      livello_minimo: incarico.livello_minimo,
      immagine: incarico.immagine,
      edificio_id: incarico.edificio_id || null,
      is_obbligatorio: incarico.is_obbligatorio,
      usato_in_cesti: incarico.usato_in_cesti || false,
      derby_tags: incarico.derby_tags || [],
    });
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setFormData(formIniziale);
    setEditingIncarico(null);
  };

  const handleSave = async () => {
    try {
      if (!formData.nome) {
        setError("Il nome è obbligatorio");
        return;
      }

      if (formData.quantita < 1) {
        setError("La quantità deve essere maggiore di 0");
        return;
      }

      if (formData.livello_minimo < 1) {
        setError("Il livello minimo deve essere maggiore di 0");
        return;
      }

      if (!formData.edificio_id) {
        setError("L'edificio è obbligatorio");
        return;
      }

      // Verifica che tutte le quantità per derby siano valide
      for (const [derbyId, quantita] of Object.entries(
        formData.quantita_derby
      )) {
        if (quantita < 1) {
          setError(
            `La quantità per il derby ${
              derby.find((d) => d.id === derbyId)?.nome || derbyId
            } deve essere maggiore di 0`
          );
          return;
        }
      }

      const incaricoData = {
        ...formData,
        id: editingIncarico?.id || crypto.randomUUID(),
      };

      // Salva l'incarico nel database
      await setDoc(doc(db, "incarichi", incaricoData.id), incaricoData);

      setSuccess(
        editingIncarico
          ? "Incarico aggiornato con successo!"
          : "Incarico creato con successo!"
      );
      handleCloseDialog();
      caricaIncarichi();
    } catch (error) {
      console.error("Errore nel salvataggio:", error);
      setError("Errore nel salvataggio dell'incarico");
    }
  };

  const handleChange = (edificioId: string) => {
    setExpandedEdifici((prev) => {
      // Se c'è una ricerca attiva e l'edificio contiene risultati, non permettere la chiusura
      if (searchQuery) {
        const incarichiEdificio = incarichi.filter(
          (i) => i.edificio_id === edificioId
        );
        const haMatch = incarichiEdificio.some((i) =>
          i.nome.toLowerCase().includes(searchQuery.toLowerCase())
        );
        if (haMatch && prev.includes(edificioId)) {
          return prev;
        }
      }

      // Comportamento normale
      if (prev.includes(edificioId)) {
        return prev.filter((id) => id !== edificioId);
      } else {
        return [...prev, edificioId];
      }
    });
  };

  const handleExpandAll = () => {
    setTuttiEspansi((prev) => {
      if (prev) {
        setExpandedEdifici([]);
      } else {
        setExpandedEdifici(edificiDettagli.map((ed) => ed.id));
      }
      return !prev;
    });
  };

  const handleAddIncaricoCitta = (tipo: "edificio" | "visitatore") => {
    setTipoIncaricoCitta(tipo);
    setFormDataCitta({ ...formInizialeCitta, tipo });
    setOpenDialogCitta(true);
  };

  const handleCloseDialogCitta = () => {
    setOpenDialogCitta(false);
    setFormDataCitta({
      nome: "",
      descrizione: "",
      immagine: "",
      quantita: 1,
      quantita_derby: {},
      livello_minimo: 1,
      usato_in_cesti: false,
      elemento_id: "",
      tipo: "edificio",
      derby_tags: [],
    });
  };

  const handleSalvaIncaricoCitta = async () => {
    try {
      if (!formDataCitta.elemento_id) {
        setError("Seleziona un elemento");
        return;
      }

      if (formDataCitta.quantita < 1) {
        setError("La quantità deve essere maggiore di 0");
        return;
      }

      const elemento = elementiCitta.find(
        (e) => e.id === formDataCitta.elemento_id
      );
      if (!elemento) {
        setError("Elemento non trovato");
        return;
      }

      const incaricoData: IncaricoCitta = {
        id: formDataCitta.id || crypto.randomUUID(),
        nome: elemento.nome,
        quantita: formDataCitta.quantita,
        quantita_derby: formDataCitta.quantita_derby || {},
        livello_minimo: elemento.livello_minimo || 1,
        elemento_id: elemento.id,
        immagine: elemento.immagine || "",
        is_obbligatorio: false,
        usato_in_cesti: formDataCitta.usato_in_cesti || false,
        data_creazione: Timestamp.now(),
        derby_tags: formDataCitta.derby_tags || [],
      };

      // Aggiungiamo il tipo solo se è definito
      if (tipoIncaricoCitta) {
        incaricoData.tipo = tipoIncaricoCitta;
      }

      if (formDataCitta.id) {
        await updateDoc(
          doc(db, "incarichi_citta", formDataCitta.id),
          incaricoData as any
        );
        setSuccess("Incarico città aggiornato con successo!");
      } else {
        await setDoc(doc(db, "incarichi_citta", incaricoData.id), incaricoData);
        setSuccess("Incarico città creato con successo!");
      }

      handleCloseDialogCitta();
      caricaIncarichiCitta();
    } catch (error) {
      console.error("Errore nel salvataggio dell'incarico città:", error);
      setError("Errore nel salvataggio dell'incarico città");
    }
  };

  // Funzione per eliminare un incarico città
  const handleDeleteIncaricoCitta = async (incarico: IncaricoCitta) => {
    if (
      !window.confirm(`Sei sicuro di voler eliminare questo incarico città?`)
    ) {
      return;
    }

    try {
      await deleteDoc(doc(db, "incarichi_citta", incarico.id));
      setSuccess("Incarico città eliminato con successo!");
      caricaIncarichiCitta();
    } catch (error) {
      console.error("Errore nell'eliminazione:", error);
      setError("Errore nell'eliminazione dell'incarico città");
    }
  };

  const handleEditIncaricoCitta = (incarico: IncaricoCitta) => {
    setFormDataCitta({
      id: incarico.id,
      nome: incarico.nome,
      descrizione: "",
      immagine: incarico.immagine || "",
      quantita: incarico.quantita,
      quantita_derby: incarico.quantita_derby || {},
      livello_minimo: incarico.livello_minimo,
      usato_in_cesti: incarico.usato_in_cesti || false,
      elemento_id: incarico.elemento_id || "",
      tipo: incarico.tipo || "edificio",
      derby_tags: incarico.derby_tags || [],
    });
    setTipoIncaricoCitta(incarico.tipo || "edificio");
    setOpenDialogCitta(true);
  };

  // Modifica il renderIncaricoCittaCard per renderlo simile al renderIncaricoCard e rimuovo le informazioni non necessarie
  const renderIncaricoCittaCard = (incarico: IncaricoCitta) => (
    <Box
      key={incarico.id}
      sx={{
        borderBottom: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        "&:last-child": {
          borderBottom: "none",
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          position: "relative",
          pl: 3,
          minHeight: 48,
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
            p: 1,
          }}
        >
          {/* Immagine con quantità */}
          <Box sx={{ position: "relative", mr: 2 }}>
            <Avatar
              src={incarico.immagine}
              variant="rounded"
              sx={{
                width: 32,
                height: 32,
              }}
            >
              {incarico.nome.charAt(0)}
            </Avatar>
            <Typography
              variant="caption"
              sx={{
                position: "absolute",
                bottom: -8,
                right: -8,
                bgcolor: "background.paper",
                border: 1,
                borderColor: "divider",
                borderRadius: 1,
                px: 0.5,
                fontSize: "0.75rem",
              }}
            >
              x{incarico.quantita}
            </Typography>
          </Box>

          {/* Nome e chip */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              flexGrow: 1,
            }}
          >
            <Box>
              <Typography
                variant="body2"
                sx={{
                  wordBreak: "break-word",
                  lineHeight: 1.1,
                  fontSize: "0.875rem",
                }}
              >
                {incarico.nome}
              </Typography>
              <Box sx={{ display: "flex", gap: 0.5, mt: 0.5 }}>
                {incarico.usato_in_cesti && (
                  <Chip
                    label="Usato in Cesti"
                    size="small"
                    sx={{
                      height: 16,
                      fontSize: "0.625rem",
                      bgcolor: "#2196f3",
                      color: "white",
                      "& .MuiChip-label": { px: 1 },
                    }}
                  />
                )}
                {incarico.derby_tags?.map((tagId) => {
                  const derbyInfo = derby.find((d) => d.id === tagId);
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

            <IconButton
              size="small"
              onClick={(event) => {
                event.stopPropagation();
                setAnchorEl({ id: incarico.id, element: event.currentTarget });
              }}
              sx={{
                ml: "auto",
                width: 28,
                height: 28,
                color: "text.secondary",
              }}
            >
              <MoreVertIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Box>
        </Box>
      </Box>
    </Box>
  );

  const renderIncaricoCard = (incarico: Incarico) => {
    return (
      <Box
        key={incarico.id}
        sx={{
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
          "&:last-child": {
            borderBottom: "none",
          },
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            position: "relative",
            pl: 3,
            minHeight: 48,
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
              p: 1,
            }}
          >
            {/* Immagine con quantità */}
            <Box sx={{ position: "relative", mr: 2 }}>
              <Avatar
                src={incarico.immagine}
                variant="rounded"
                sx={{
                  width: 32,
                  height: 32,
                }}
              >
                {incarico.nome.charAt(0)}
              </Avatar>
              <Typography
                variant="caption"
                sx={{
                  position: "absolute",
                  bottom: -8,
                  right: -8,
                  bgcolor: "background.paper",
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 1,
                  px: 0.5,
                  fontSize: "0.75rem",
                }}
              >
                x{incarico.quantita}
              </Typography>
            </Box>

            {/* Nome e chip */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                flexGrow: 1,
              }}
            >
              <Box>
                <Typography
                  variant="body2"
                  sx={{
                    wordBreak: "break-word",
                    lineHeight: 1.1,
                    fontSize: "0.875rem",
                  }}
                >
                  {getTranslatedName(incarico.nome)}
                </Typography>
                <Box
                  sx={{ display: "flex", gap: 0.5, mt: 0.5, flexWrap: "wrap" }}
                >
                  {incarico.is_obbligatorio && (
                    <Chip
                      label="Obbligatorio"
                      size="small"
                      sx={{
                        height: 16,
                        fontSize: "0.625rem",
                        bgcolor: "#ff8c00",
                        color: "white",
                        "& .MuiChip-label": { px: 1 },
                      }}
                    />
                  )}
                  {incarico.usato_in_cesti && (
                    <Chip
                      label="Usato in Cesti"
                      size="small"
                      sx={{
                        height: 16,
                        fontSize: "0.625rem",
                        bgcolor: "#2196f3",
                        color: "white",
                        "& .MuiChip-label": { px: 1 },
                      }}
                    />
                  )}
                  {incarico.derby_tags?.map((tagId) => {
                    const derbyInfo = derby.find((d) => d.id === tagId);
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

              <IconButton
                size="small"
                onClick={(event) => {
                  event.stopPropagation();
                  setAnchorEl({
                    id: incarico.id,
                    element: event.currentTarget,
                  });
                }}
                sx={{
                  ml: "auto",
                  width: 28,
                  height: 28,
                  color: "text.secondary",
                }}
              >
                <MoreVertIcon sx={{ fontSize: 20 }} />
              </IconButton>
            </Box>
          </Box>
        </Box>
      </Box>
    );
  };

  return (
    <Layout>
      <Box sx={{ pt: 2, px: 0 }}>
        {/* Tabs per switchare tra incarichi standard e città */}
        <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
          <Tabs
            value={tabAttiva}
            onChange={(_, newValue: TabAttiva) => setTabAttiva(newValue)}
          >
            <Tab label="Incarichi Standard" value="standard" />
            <Tab label="Incarichi Città" value="citta" />
          </Tabs>
        </Box>

        {tabAttiva === "standard" ? (
          <>
            {/* Contatore incarichi standard */}
            <Box
              sx={{
                mb: 3,
                p: 2,
                bgcolor: "rgba(33, 150, 243, 0.04)",
                borderRadius: 1,
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  fontSize: "0.875rem",
                  fontWeight: 500,
                }}
              >
                TOTALE INCARICHI STANDARD:
              </Typography>
              <Typography
                sx={{
                  fontSize: "0.875rem",
                  fontWeight: 700,
                  color: "primary.main",
                }}
              >
                {incarichi.length}
              </Typography>
            </Box>

            {/* Toolbar con i pulsanti di controllo */}
            <Box
              sx={{
                mb: 2,
                display: "flex",
                alignItems: "center",
                gap: 1,
                px: 2,
                position: "sticky",
                top: 0,
                zIndex: 1,
                bgcolor: "background.default",
                py: 1,
              }}
            >
              <Button
                variant="contained"
                size="small"
                onClick={handleAddIncarico}
                sx={{
                  minWidth: "auto",
                  width: 24,
                  height: 24,
                  p: 0,
                }}
              >
                <AddIcon sx={{ fontSize: 16 }} />
              </Button>

              <Tooltip
                title={
                  visualizzazioneLineare
                    ? "Visualizza per edificio"
                    : "Visualizza lineare"
                }
              >
                <IconButton
                  onClick={() =>
                    setVisualizzazioneLineare(!visualizzazioneLineare)
                  }
                  color={visualizzazioneLineare ? "primary" : "default"}
                  size="small"
                >
                  <ViewListIcon />
                </IconButton>
              </Tooltip>

              <Tooltip
                title={
                  ordinamentoAlfabetico
                    ? ordinamentoAlfabeticoInverso
                      ? "Ordina dalla A alla Z"
                      : "Ordina dalla Z alla A"
                    : "Ordina alfabeticamente"
                }
              >
                <IconButton
                  onClick={() => {
                    if (!ordinamentoAlfabetico) {
                      setOrdinamentoAlfabetico(true);
                      setOrdinamentoAlfabeticoInverso(false);
                      setOrdinamentoLivello(false);
                      setOrdinamentoLivelloInverso(false);
                    } else {
                      setOrdinamentoAlfabeticoInverso(
                        !ordinamentoAlfabeticoInverso
                      );
                    }
                  }}
                  color={ordinamentoAlfabetico ? "primary" : "default"}
                  size="small"
                >
                  <SortByAlphaIcon
                    sx={{
                      transform: ordinamentoAlfabeticoInverso
                        ? "rotate(180deg)"
                        : "none",
                      transition: "transform 0.2s",
                    }}
                  />
                </IconButton>
              </Tooltip>

              <Tooltip
                title={
                  ordinamentoLivello
                    ? ordinamentoLivelloInverso
                      ? "Ordina per livello crescente"
                      : "Ordina per livello decrescente"
                    : "Ordina per livello"
                }
              >
                <IconButton
                  onClick={() => {
                    if (!ordinamentoLivello) {
                      setOrdinamentoLivello(true);
                      setOrdinamentoLivelloInverso(!ordinamentoLivelloInverso);
                      setOrdinamentoAlfabetico(false);
                      setOrdinamentoAlfabeticoInverso(false);
                    }
                  }}
                  color={ordinamentoLivello ? "primary" : "default"}
                  size="small"
                >
                  <SortIcon
                    sx={{
                      transform: ordinamentoLivelloInverso
                        ? "rotate(180deg)"
                        : "none",
                      transition: "transform 0.2s",
                    }}
                  />
                </IconButton>
              </Tooltip>

              <IconButton
                onClick={() => setSearchOpen(!searchOpen)}
                color={searchOpen ? "primary" : "default"}
                size="small"
              >
                <SearchIcon />
              </IconButton>

              <Collapse in={searchOpen} sx={{ flexGrow: 1 }}>
                <TextField
                  fullWidth
                  inputRef={searchInputRef}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cerca edifici o incarichi..."
                  size="small"
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
              </Collapse>
            </Box>

            {/* Lista degli incarichi */}
            <Box
              sx={{
                px: 0,
                border: 1,
                borderColor: "divider",
                borderRadius: 1,
                overflow: "hidden",
              }}
            >
              {visualizzazioneLineare
                ? // Visualizzazione lineare
                  edificiConIncarichi.get("tutti")?.map((incarico) => {
                    const edificio = edificiDettagli.find(
                      (e) => e.id === incarico.edificio_id
                    );

                    return (
                      <Box
                        key={incarico.id}
                        sx={{
                          borderBottom: "1px solid",
                          borderColor: "divider",
                          "&:last-child": {
                            borderBottom: "none",
                          },
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            position: "relative",
                            pl: 3,
                            minHeight: 48,
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
                              p: 1,
                            }}
                          >
                            {/* Immagine con quantità */}
                            <Box sx={{ position: "relative", mr: 2 }}>
                              <Avatar
                                src={incarico.immagine}
                                variant="rounded"
                                sx={{
                                  width: 32,
                                  height: 32,
                                }}
                              >
                                {incarico.nome.charAt(0)}
                              </Avatar>
                              <Typography
                                variant="caption"
                                sx={{
                                  position: "absolute",
                                  bottom: -8,
                                  right: -8,
                                  bgcolor: "background.paper",
                                  border: 1,
                                  borderColor: "divider",
                                  borderRadius: 1,
                                  px: 0.5,
                                  fontSize: "0.75rem",
                                }}
                              >
                                x{incarico.quantita}
                              </Typography>
                            </Box>

                            {/* Nome e chip */}
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                                flexGrow: 1,
                              }}
                            >
                              <Box>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    wordBreak: "break-word",
                                    lineHeight: 1.1,
                                    fontSize: "0.875rem",
                                  }}
                                >
                                  {getTranslatedName(incarico.nome)}
                                </Typography>
                                <Box
                                  sx={{
                                    display: "flex",
                                    gap: 0.5,
                                    mt: 0.5,
                                    flexWrap: "wrap",
                                  }}
                                >
                                  {edificio && (
                                    <Chip
                                      label={edificio.nome}
                                      size="small"
                                      sx={{
                                        height: 16,
                                        fontSize: "0.625rem",
                                        bgcolor: "rgba(0, 0, 0, 0.08)",
                                        "& .MuiChip-label": { px: 1 },
                                      }}
                                    />
                                  )}
                                  {incarico.is_obbligatorio && (
                                    <Chip
                                      label="Obbligatorio"
                                      size="small"
                                      sx={{
                                        height: 16,
                                        fontSize: "0.625rem",
                                        bgcolor: "#ff8c00",
                                        color: "white",
                                        "& .MuiChip-label": { px: 1 },
                                      }}
                                    />
                                  )}
                                  {incarico.usato_in_cesti && (
                                    <Chip
                                      label="Usato in Cesti"
                                      size="small"
                                      sx={{
                                        height: 16,
                                        fontSize: "0.625rem",
                                        bgcolor: "#2196f3",
                                        color: "white",
                                        "& .MuiChip-label": { px: 1 },
                                      }}
                                    />
                                  )}
                                  {incarico.derby_tags?.map((tagId) => {
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

                              <IconButton
                                size="small"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setAnchorEl({
                                    id: incarico.id,
                                    element: event.currentTarget,
                                  });
                                }}
                                sx={{
                                  ml: "auto",
                                  width: 28,
                                  height: 28,
                                  color: "text.secondary",
                                }}
                              >
                                <MoreVertIcon sx={{ fontSize: 20 }} />
                              </IconButton>
                            </Box>
                          </Box>
                        </Box>
                      </Box>
                    );
                  })
                : // Visualizzazione per edificio (mantieni il codice esistente)
                  edificiDettagli
                    .filter((edificio) => {
                      if (!searchQuery) return true;
                      // Cerca nel nome dell'edificio
                      if (
                        edificio.nome
                          .toLowerCase()
                          .includes(searchQuery.toLowerCase())
                      )
                        return true;
                      // Cerca negli incarichi dell'edificio
                      const incarichiEdificio = incarichi.filter(
                        (i) => i.edificio_id === edificio.id
                      );
                      return incarichiEdificio.some((i) =>
                        i.nome.toLowerCase().includes(searchQuery.toLowerCase())
                      );
                    })
                    .map((edificio, index) => {
                      const incarichiEdificio =
                        edificiConIncarichi.get(edificio.id) || [];
                      if (incarichiEdificio.length === 0) return null;

                      // Filtra gli incarichi in base alla ricerca
                      const incarichiMostrati = searchQuery
                        ? incarichiEdificio.filter((i) =>
                            i.nome
                              .toLowerCase()
                              .includes(searchQuery.toLowerCase())
                          )
                        : incarichiEdificio;

                      if (incarichiMostrati.length === 0) return null;

                      return (
                        <Accordion
                          key={edificio.id}
                          expanded={expandedEdifici.includes(edificio.id)}
                          onChange={() => handleChange(edificio.id)}
                          sx={{
                            "&:before": {
                              display: "none",
                            },
                            boxShadow: "none",
                            borderRadius: 0,
                            borderBottom:
                              index !== edificiDettagli.length - 1
                                ? "1px solid"
                                : "none",
                            borderColor: "divider",
                            "&:first-of-type": {
                              borderTop: "none",
                            },
                            "&:not(:first-of-type):before": {
                              display: "none",
                            },
                            "& .MuiAccordionSummary-root": {
                              minHeight: 56,
                              bgcolor: "rgba(0, 0, 0, 0.02)",
                            },
                          }}
                        >
                          <AccordionSummary
                            expandIcon={<ExpandMoreIcon />}
                            sx={{
                              "& .MuiAccordionSummary-content": {
                                m: 0,
                              },
                            }}
                          >
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 2,
                                width: "100%",
                              }}
                            >
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 2,
                                }}
                              >
                                <Avatar
                                  src={edificio.immagine}
                                  variant="rounded"
                                  sx={{ width: 40, height: 40 }}
                                >
                                  {edificio.nome.charAt(0)}
                                </Avatar>
                              </Box>
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  width: "100%",
                                }}
                              >
                                <Box>
                                  <Typography
                                    sx={{
                                      fontSize: "0.95rem",
                                      fontWeight: 500,
                                      lineHeight: 1.2,
                                    }}
                                  >
                                    {edificio.nome}
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      color: "primary.main",
                                      fontStyle: "italic",
                                      fontSize: "0.75rem",
                                    }}
                                  >
                                    Liv. {edificio.livello}
                                  </Typography>
                                </Box>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{
                                    ml: "auto",
                                    fontSize: "0.75rem",
                                  }}
                                >
                                  {incarichiEdificio.length}{" "}
                                  {incarichiEdificio.length === 1
                                    ? "incarico"
                                    : "incarichi"}
                                </Typography>
                              </Box>
                            </Box>
                          </AccordionSummary>
                          <AccordionDetails sx={{ p: 0 }}>
                            <Box
                              sx={{
                                borderTop: 1,
                                borderColor: "divider",
                                bgcolor: "background.paper",
                              }}
                            >
                              {incarichiMostrati.map(renderIncaricoCard)}
                            </Box>
                          </AccordionDetails>
                        </Accordion>
                      );
                    })}
            </Box>
          </>
        ) : (
          <>
            {/* Contatore incarichi città */}
            <Box
              sx={{
                mb: 3,
                p: 2,
                bgcolor: "rgba(33, 150, 243, 0.04)",
                borderRadius: 1,
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  fontSize: "0.875rem",
                  fontWeight: 500,
                }}
              >
                TOTALE INCARICHI CITTÀ:
              </Typography>
              <Typography
                sx={{
                  fontSize: "0.875rem",
                  fontWeight: 700,
                  color: "primary.main",
                }}
              >
                {incarichiCitta.length}
              </Typography>
            </Box>

            <Box
              sx={{
                mb: 2,
                display: "flex",
                alignItems: "center",
                gap: 1,
                px: 2,
              }}
            >
              <IconButton
                onClick={() => {
                  const nuovoStato = !tuttiEspansi;
                  setTuttiEspansi(nuovoStato);
                  setExpandedEdifici(
                    nuovoStato ? ["edifici_citta", "visitatori_citta"] : []
                  );
                }}
                size="small"
              >
                {tuttiEspansi ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </Box>

            {/* Lista incarichi città */}
            <Box
              sx={{
                px: 0,
                border: 1,
                borderColor: "divider",
                borderRadius: 1,
                overflow: "hidden",
              }}
            >
              {/* Sezione Edifici */}
              <Accordion
                expanded={expandedEdifici.includes("edifici_citta")}
                onChange={() => handleChange("edifici_citta")}
                sx={{
                  "&:before": {
                    display: "none",
                  },
                  boxShadow: "none",
                  borderRadius: 0,
                  borderBottom: "1px solid",
                  borderColor: "divider",
                  "&:first-of-type": {
                    borderTop: "none",
                  },
                  "&:not(:first-of-type):before": {
                    display: "none",
                  },
                  "& .MuiAccordionSummary-root": {
                    minHeight: 56,
                    bgcolor: "rgba(0, 0, 0, 0.02)",
                  },
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  sx={{
                    "& .MuiAccordionSummary-content": {
                      m: 0,
                    },
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                      width: "100%",
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <Button
                        variant="contained"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddIncaricoCitta("edificio");
                        }}
                        sx={{
                          minWidth: "auto",
                          width: 24,
                          height: 24,
                          p: 0,
                        }}
                      >
                        <AddIcon sx={{ fontSize: 16 }} />
                      </Button>
                      <Typography
                        sx={{
                          fontSize: "0.95rem",
                          fontWeight: 500,
                          lineHeight: 1.2,
                        }}
                      >
                        Edifici
                      </Typography>
                    </Box>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        ml: "auto",
                        fontSize: "0.75rem",
                      }}
                    >
                      {
                        incarichiCitta.filter((inc) => inc.tipo === "edificio")
                          .length
                      }{" "}
                      incarichi
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 0 }}>
                  <Box
                    sx={{
                      borderTop: 1,
                      borderColor: "divider",
                      bgcolor: "background.paper",
                    }}
                  >
                    {incarichiCitta
                      .filter((inc) => inc.tipo === "edificio")
                      .map(renderIncaricoCittaCard)}
                  </Box>
                </AccordionDetails>
              </Accordion>

              {/* Sezione Visitatori */}
              <Accordion
                expanded={expandedEdifici.includes("visitatori_citta")}
                onChange={() => handleChange("visitatori_citta")}
                sx={{
                  "&:before": {
                    display: "none",
                  },
                  boxShadow: "none",
                  borderRadius: 0,
                  "&:first-of-type": {
                    borderTop: "none",
                  },
                  "&:not(:first-of-type):before": {
                    display: "none",
                  },
                  "& .MuiAccordionSummary-root": {
                    minHeight: 56,
                    bgcolor: "rgba(0, 0, 0, 0.02)",
                  },
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  sx={{
                    "& .MuiAccordionSummary-content": {
                      m: 0,
                    },
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                      width: "100%",
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <Button
                        variant="contained"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddIncaricoCitta("visitatore");
                        }}
                        sx={{
                          minWidth: "auto",
                          width: 24,
                          height: 24,
                          p: 0,
                        }}
                      >
                        <AddIcon sx={{ fontSize: 16 }} />
                      </Button>
                      <Typography
                        sx={{
                          fontSize: "0.95rem",
                          fontWeight: 500,
                          lineHeight: 1.2,
                        }}
                      >
                        Visitatori
                      </Typography>
                    </Box>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        ml: "auto",
                        fontSize: "0.75rem",
                      }}
                    >
                      {
                        incarichiCitta.filter(
                          (inc) => inc.tipo === "visitatore"
                        ).length
                      }{" "}
                      incarichi
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 0 }}>
                  <Box
                    sx={{
                      borderTop: 1,
                      borderColor: "divider",
                      bgcolor: "background.paper",
                    }}
                  >
                    {incarichiCitta
                      .filter((inc) => inc.tipo === "visitatore")
                      .map(renderIncaricoCittaCard)}
                  </Box>
                </AccordionDetails>
              </Accordion>
            </Box>
          </>
        )}

        <Dialog
          open={openDialog}
          onClose={handleCloseDialog}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            {editingIncarico ? "Modifica Incarico" : "Nuovo Incarico"}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Nome Incarico"
                  value={formData.nome}
                  onChange={(e) =>
                    setFormData({ ...formData, nome: e.target.value })
                  }
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Livello Minimo"
                  value={
                    formData.livello_minimo === 0 ? "" : formData.livello_minimo
                  }
                  onChange={(e) => {
                    if (e.target.value === "") {
                      setFormData({ ...formData, livello_minimo: 0 });
                    } else {
                      const value = parseInt(e.target.value);
                      if (!isNaN(value) && value >= 0) {
                        setFormData({ ...formData, livello_minimo: value });
                      }
                    }
                  }}
                  InputProps={{
                    inputProps: { min: 1 },
                    startAdornment: (
                      <InputAdornment position="start">
                        <img
                          src="/images/livello.png"
                          alt="Livello"
                          style={{
                            width: "16px",
                            height: "16px",
                            marginRight: "4px",
                          }}
                        />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Quantità Default"
                  value={formData.quantita === 0 ? "" : formData.quantita}
                  onChange={(e) => {
                    if (e.target.value === "") {
                      setFormData({ ...formData, quantita: 0 });
                    } else {
                      const value = parseInt(e.target.value);
                      if (!isNaN(value) && value >= 0) {
                        setFormData({ ...formData, quantita: value });
                      }
                    }
                  }}
                  InputProps={{ inputProps: { min: 1 } }}
                />
              </Grid>

              {/* Quantità per Derby */}
              <Grid item xs={12}>
                <Accordion>
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    sx={{
                      backgroundColor: "rgba(0, 0, 0, 0.03)",
                      borderRadius: "4px",
                      "&.Mui-expanded": {
                        borderBottomLeftRadius: 0,
                        borderBottomRightRadius: 0,
                      },
                    }}
                  >
                    <Typography variant="subtitle1">
                      Quantità per Derby
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={2}>
                      {derby.map((d) => (
                        <Grid item xs={12} sm={6} key={d.id}>
                          <TextField
                            fullWidth
                            type="number"
                            label={`Quantità per ${d.nome}`}
                            value={
                              formData.quantita_derby[d.id] === 0
                                ? ""
                                : formData.quantita_derby[d.id] ||
                                  formData.quantita
                            }
                            onChange={(e) => {
                              if (e.target.value === "") {
                                setFormData({
                                  ...formData,
                                  quantita_derby: {
                                    ...formData.quantita_derby,
                                    [d.id]: 0,
                                  },
                                });
                              } else {
                                const value = parseInt(e.target.value);
                                if (!isNaN(value) && value >= 0) {
                                  setFormData({
                                    ...formData,
                                    quantita_derby: {
                                      ...formData.quantita_derby,
                                      [d.id]: value,
                                    },
                                  });
                                }
                              }
                            }}
                            InputProps={{ inputProps: { min: 1 } }}
                          />
                        </Grid>
                      ))}
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              </Grid>

              <Grid item xs={12}>
                <FormControl fullWidth required sx={{ mt: 2 }}>
                  <InputLabel>Edificio</InputLabel>
                  <Select
                    value={formData.edificio_id || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        edificio_id: e.target.value as string | null,
                      })
                    }
                    label="Edificio"
                    required
                  >
                    {edificiDettagli.map((edificio) => (
                      <MenuItem key={edificio.id} value={edificio.id}>
                        {edificio.nome} (Livello {edificio.livello})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.is_obbligatorio}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          is_obbligatorio: e.target.checked,
                        })
                      }
                    />
                  }
                  label="Incarico Obbligatorio"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.usato_in_cesti}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          usato_in_cesti: e.target.checked,
                        })
                      }
                    />
                  }
                  label="Usato nei Cesti"
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Icona
                </Typography>
                <UploadImmagine
                  cartella="incarichi"
                  id={editingIncarico?.id || "nuovo"}
                  urlImmagine={formData.immagine}
                  onImmagineCaricata={(url) =>
                    setFormData({ ...formData, immagine: url })
                  }
                  onImmagineEliminata={() =>
                    setFormData({ ...formData, immagine: "" })
                  }
                  dimensione={100}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Derby Tags</InputLabel>
                  <Select
                    multiple
                    value={formData.derby_tags}
                    onChange={(e) => {
                      const value = e.target.value as string[];
                      setFormData({ ...formData, derby_tags: value });
                    }}
                    input={<OutlinedInput label="Derby Tags" />}
                    renderValue={(selected) => (
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                        {selected.map((value) => {
                          const derbyInfo = derby.find((d) => d.id === value);
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
                          checked={formData.derby_tags.indexOf(d.id) > -1}
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
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Annulla</Button>
            <Button onClick={handleSave} variant="contained">
              Salva
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={openDialogCitta}
          onClose={handleCloseDialogCitta}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            Nuovo Incarico{" "}
            {tipoIncaricoCitta === "edificio" ? "Edificio" : "Visitatore"} Città
          </DialogTitle>
          <DialogContent>
            <Box
              sx={{ pt: 2, display: "flex", flexDirection: "column", gap: 2 }}
            >
              <FormControl fullWidth size="small">
                <InputLabel>
                  Seleziona{" "}
                  {tipoIncaricoCitta === "edificio" ? "Edificio" : "Visitatore"}
                </InputLabel>
                <Select
                  value={formDataCitta.elemento_id}
                  onChange={(e) => {
                    const elementoSelezionato = elementiCitta.find(
                      (el) => el.id === e.target.value
                    );
                    setFormDataCitta({
                      ...formDataCitta,
                      elemento_id: e.target.value,
                      livello_minimo: elementoSelezionato?.livello_minimo || 1,
                    });
                  }}
                >
                  {elementiCitta
                    .filter((e) => e.tipo === tipoIncaricoCitta)
                    .map((elemento) => (
                      <MenuItem key={elemento.id} value={elemento.id}>
                        {elemento.nome} (Liv. {elemento.livello_minimo})
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>

              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Quantità"
                    value={
                      formDataCitta.quantita === 0 ? "" : formDataCitta.quantita
                    }
                    onChange={(e) => {
                      if (e.target.value === "") {
                        setFormDataCitta({ ...formDataCitta, quantita: 0 });
                      } else {
                        const value = parseInt(e.target.value);
                        if (!isNaN(value) && value >= 0) {
                          setFormDataCitta({
                            ...formDataCitta,
                            quantita: value,
                          });
                        }
                      }
                    }}
                    size="small"
                    InputProps={{ inputProps: { min: 1 } }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Livello Minimo"
                    value={
                      formDataCitta.livello_minimo === 0
                        ? ""
                        : formDataCitta.livello_minimo
                    }
                    onChange={(e) => {
                      if (e.target.value === "") {
                        setFormDataCitta({
                          ...formDataCitta,
                          livello_minimo: 0,
                        });
                      } else {
                        const value = parseInt(e.target.value);
                        if (!isNaN(value) && value >= 0) {
                          setFormDataCitta({
                            ...formDataCitta,
                            livello_minimo: value,
                          });
                        }
                      }
                    }}
                    size="small"
                    InputProps={{ inputProps: { min: 1 } }}
                  />
                </Grid>
              </Grid>

              {/* Quantità per Derby */}
              <Grid item xs={12}>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>
                  Quantità per Derby
                </Typography>
                <Grid container spacing={2}>
                  {derby.map((d) => (
                    <Grid item xs={12} sm={6} key={d.id}>
                      <TextField
                        fullWidth
                        type="number"
                        label={`Quantità per ${d.nome}`}
                        value={
                          formDataCitta.quantita_derby?.[d.id] === 0
                            ? ""
                            : formDataCitta.quantita_derby?.[d.id] ||
                              formDataCitta.quantita
                        }
                        onChange={(e) => {
                          if (e.target.value === "") {
                            setFormDataCitta({
                              ...formDataCitta,
                              quantita_derby: {
                                ...formDataCitta.quantita_derby,
                                [d.id]: 0,
                              },
                            });
                          } else {
                            const value = parseInt(e.target.value);
                            if (!isNaN(value) && value >= 0) {
                              setFormDataCitta({
                                ...formDataCitta,
                                quantita_derby: {
                                  ...formDataCitta.quantita_derby,
                                  [d.id]: value,
                                },
                              });
                            }
                          }
                        }}
                        InputProps={{ inputProps: { min: 1 } }}
                        size="small"
                      />
                    </Grid>
                  ))}
                </Grid>
              </Grid>

              {/* Aggiungo lo switch per Usato nei Cesti */}
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formDataCitta.usato_in_cesti || false}
                      onChange={(e) =>
                        setFormDataCitta({
                          ...formDataCitta,
                          usato_in_cesti: e.target.checked,
                        })
                      }
                    />
                  }
                  label="Usato nei Cesti"
                />
              </Grid>

              {/* Aggiungo il selettore dei Derby Tags */}
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Derby Tags</InputLabel>
                  <Select
                    multiple
                    value={formDataCitta.derby_tags || []}
                    onChange={(e) => {
                      const value = e.target.value as string[];
                      setFormDataCitta({
                        ...formDataCitta,
                        derby_tags: value,
                      });
                    }}
                    input={<OutlinedInput label="Derby Tags" />}
                    renderValue={(selected) => (
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                        {selected.map((value) => {
                          const derbyInfo = derby.find((d) => d.id === value);
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
                            (formDataCitta.derby_tags || []).indexOf(d.id) > -1
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
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={handleCloseDialogCitta}>Annulla</Button>
            <Button onClick={handleSalvaIncaricoCitta} variant="contained">
              Salva
            </Button>
          </DialogActions>
        </Dialog>

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

        {/* Menu per Modifica/Elimina */}
        <Menu
          anchorEl={anchorEl?.element}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
        >
          <MenuItem
            onClick={() => {
              if (anchorEl) {
                // Cerca prima negli incarichi standard
                const incaricoStandard = incarichi.find(
                  (i) => i.id === anchorEl.id
                );
                if (incaricoStandard) {
                  handleEditIncarico(incaricoStandard);
                  setAnchorEl(null);
                  return;
                }

                // Se non trovato, cerca negli incarichi città
                const incaricoCitta = incarichiCitta.find(
                  (i) => i.id === anchorEl.id
                );
                if (incaricoCitta) {
                  handleEditIncaricoCitta(incaricoCitta);
                  setAnchorEl(null);
                }
              }
            }}
          >
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Modifica</ListItemText>
          </MenuItem>
          <MenuItem
            onClick={() => {
              if (
                anchorEl &&
                window.confirm("Sei sicuro di voler eliminare questo incarico?")
              ) {
                // Cerca prima negli incarichi standard
                const incaricoStandard = incarichi.find(
                  (i) => i.id === anchorEl.id
                );
                if (incaricoStandard) {
                  deleteDoc(doc(db, "incarichi", anchorEl.id));
                  caricaIncarichi();
                  setAnchorEl(null);
                  return;
                }

                // Se non trovato, cerca negli incarichi città
                const incaricoCitta = incarichiCitta.find(
                  (i) => i.id === anchorEl.id
                );
                if (incaricoCitta) {
                  handleDeleteIncaricoCitta(incaricoCitta);
                  setAnchorEl(null);
                }
              }
            }}
          >
            <ListItemIcon>
              <DeleteIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText sx={{ color: "error.main" }}>Elimina</ListItemText>
          </MenuItem>
        </Menu>
      </Box>
    </Layout>
  );
}
