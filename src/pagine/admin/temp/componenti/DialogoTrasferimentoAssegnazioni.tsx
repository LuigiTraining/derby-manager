import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  TextField,
  InputAdornment,
  Box,
  CircularProgress,
  FormControlLabel,
  Switch,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  ListItemSecondaryAction,
  IconButton,
  Divider,
  RadioGroup,
  Radio,
  Chip,
  Alert,
  ListItemButton,
  Checkbox,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import TransferWithinAStationIcon from "@mui/icons-material/TransferWithinAStation";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../../../../configurazione/firebase";

// Definizione dei tipi
interface Farm {
  id: string;
  nome?: string;
  tag?: string;
  diamanti?: number;
  stato?: string;
  principale?: boolean;
  livello?: number;
  haAssegnazioni?: boolean;
  derby_tags?: string[]; // Array di ID dei derby associati alla farm
  presetCompleto?: boolean; // Nuova proprietà che indica se la farm ha completato il preset
}

interface GiocatoreConFarms {
  giocatore_id: string;
  giocatore_nome: string;
  farms: Farm[];
}

// Definizione del tipo Derby
interface Derby {
  id: string;
  nome: string;
  colore: string;
  attivo: boolean;
  prossimo?: boolean;
}

// Definizione dell'interfaccia per le props del componente
interface DialogoTrasferimentoAssegnazioniProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (farmIdOrigine: string, farmIdsDestinazione: string[], modalita: 'copia' | 'trasferisci') => void;
  onElimina?: (farmIds: string[]) => void;
  onAssegnaPreset?: (farmIds: string[]) => void;
  modalita: 'copia' | 'trasferisci' | 'elimina';
  giocatori: GiocatoreConFarms[];
  isAssegnazionePreset?: boolean;
  presetNome?: string; // Nome del preset selezionato
  farmIdsGiaAssegnate?: string[]; // Array di farm IDs che hanno già tutti gli incarichi del preset assegnati
}

const DialogoTrasferimentoAssegnazioni: React.FC<DialogoTrasferimentoAssegnazioniProps> = ({
  open,
  onClose,
  onConfirm,
  onElimina,
  onAssegnaPreset,
  modalita,
  giocatori,
  isAssegnazionePreset,
  presetNome,
  farmIdsGiaAssegnate = []
}) => {
  // Stati per gestire la selezione e i filtri
  const [searchQuery, setSearchQuery] = useState("");
  const [farmIdOrigine, setFarmIdOrigine] = useState<string>("");
  const [farmIdsDestinazione, setFarmIdsDestinazione] = useState<string[]>([]);
  const [mostraFarmInattive, setMostraFarmInattive] = useState(false);
  const [mostraTagDerby, setMostraTagDerby] = useState(false);
  const [mostraGiaAssegnati, setMostraGiaAssegnati] = useState(true);
  const [derby, setDerby] = useState<Derby[]>([]);
  const [selectedDerby, setSelectedDerby] = useState<string>("");
  const [derbyMenuOpen, setDerbyMenuOpen] = useState(false);
  const [farmOrigineSelect, setFarmOrigineSelect] = useState<{
    giocatore_id: string;
    giocatore_nome: string;
    farm_id: string;
    farm_nome: string;
  } | null>(null);
  const [farmsDaEliminare, setFarmsDaEliminare] = useState<string[]>([]);

  // Reset dello stato quando il dialogo si apre o quando cambia modalità
  useEffect(() => {
    if (open) {
      setSearchQuery("");
      setFarmIdOrigine("");
      setFarmIdsDestinazione([]);
      setFarmOrigineSelect(null);
      setFarmsDaEliminare([]);
      setSelectedDerby("");
      setMostraGiaAssegnati(true);
    }
  }, [open, modalita]);

  // Effetto per gestire il cambio di modalità
  useEffect(() => {
    // Resetta le selezioni quando cambia la modalità
    if (modalita === 'elimina') {
      setFarmIdOrigine("");
      setFarmOrigineSelect(null);
      setFarmIdsDestinazione([]);
    } else if (farmsDaEliminare.length > 0) {
      setFarmsDaEliminare([]);
    }
  }, [modalita]);

  // Carica i derby disponibili quando il dialogo si apre
  useEffect(() => {
    const caricaDerby = async () => {
      try {
        const derbyRef = collection(db, "derby");
        const q = query(derbyRef, orderBy("nome", "asc"));
        const querySnapshot = await getDocs(q);
        
        const derbyData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Derby[];
        
        setDerby(derbyData);
      } catch (error) {
        console.error("Errore nel caricamento dei derby:", error);
      }
    };
    
    if (open) {
      caricaDerby();
    }
  }, [open]);

  // Funzione per filtrare le farms in base alla ricerca
  const filteredGiocatori = giocatori.filter((giocatore) => {
    const matchGiocatore = giocatore.giocatore_nome.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchFarms = giocatore.farms.some(
      (farm) => farm.nome?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    return matchGiocatore || matchFarms;
  });

  // Funzione per verificare se una farm ha già tutti gli incarichi del preset assegnati
  const isFarmGiaAssegnata = (farmId: string) => {
    // Verifica attraverso la lista di farmIdsGiaAssegnate passata come prop
    if (farmIdsGiaAssegnate && farmIdsGiaAssegnate.length > 0 && farmIdsGiaAssegnate.includes(farmId)) {
      return true;
    }
    
    // Verifica anche attraverso la proprietà presetCompleto della farm
    if (isAssegnazionePreset) {
      // Cerca la farm in tutti i giocatori
      for (const giocatore of giocatori) {
        const farm = giocatore.farms.find(f => f.id === farmId);
        if (farm && farm.presetCompleto) {
          return true;
        }
      }
    }
    
    return false;
  };

  // Funzione per filtrare le farms in base allo stato (attive/inattive)
  const getFarmsFiltrate = (giocatore: { giocatore_id: string; giocatore_nome: string; farms: Farm[] }) => {
    console.log("Filtrando farms per giocatore:", giocatore.giocatore_nome, 
                "isAssegnazionePreset:", isAssegnazionePreset, 
                "Modalità:", modalita, 
                "farmOrigineSelect:", farmOrigineSelect);
    
    return giocatore.farms.filter((farm: any) => {
      // Debug
      if (isAssegnazionePreset) {
        console.log(`Farm ${farm.nome || farm.id}: stato=${farm.stato}, haAssegnazioni=${farm.haAssegnazioni}`);
      }
      
      // Se non mostriamo le farm inattive, filtra solo quelle attive
      if (!mostraFarmInattive && farm.stato === "inattivo") {
        return false;
      }
      
      // Se non mostriamo le farm già assegnate e questa farm ha già il preset completo, non mostrarla
      if (!mostraGiaAssegnati && isFarmGiaAssegnata(farm.id)) {
        return false;
      }
      
      // Se è la farm di origine, non mostrarla nelle destinazioni (solo in modalità trasferimento)
      if (modalita !== 'elimina' && farm.id === farmIdOrigine) {
        return false;
      }
      
      // Filtra per derby selezionato
      if (selectedDerby && farm.derby_tags) {
        // Verifica se la farm ha il derby selezionato nei suoi tag
        if (!Array.isArray(farm.derby_tags)) {
          return false;
        }
        
        // Verifica se l'ID del derby è presente nei tag della farm
        if (!farm.derby_tags.includes(selectedDerby)) {
          return false;
        }
      } else if (selectedDerby) {
        // Se non ci sono derby_tags ma è selezionato un derby, non mostrare la farm
        return false;
      }
      
      // Se siamo in modalità copia o trasferisci e stiamo selezionando l'origine,
      // mostra solo le farm che hanno assegnazioni, ma solo se non stiamo facendo
      // un'assegnazione preset (in quel caso mostra tutte le farm)
      if ((modalita === 'copia' || modalita === 'trasferisci') && !farmOrigineSelect && !isAssegnazionePreset) {
        // Forziamo a true per risolvere il problema di visualizzazione
        return true; // era farm.haAssegnazioni === true
      }
      
      // Mostriamo TUTTE le farm, anche quelle che hanno già tutti gli incarichi del preset assegnati
      // Le farm con preset completo verranno visualizzate con lo stile speciale (verde con spunta)
      return true;
    });
  };

  // Handler per selezionare la farm di origine
  const handleSelectFarmOrigine = (giocatoreId: string, giocatoreNome: string, farmId: string, farmNome: string) => {
    setFarmIdOrigine(farmId);
    setFarmOrigineSelect({
      giocatore_id: giocatoreId,
      giocatore_nome: giocatoreNome,
      farm_id: farmId,
      farm_nome: farmNome
    });
    // Resetta le farm di destinazione
    setFarmIdsDestinazione([]);
  };

  // Handler per toggle delle farm di destinazione
  const handleToggleFarmDestinazione = (farmId: string) => {
    // Non fare nulla se la farm ha già il preset completo
    if (isFarmGiaAssegnata(farmId)) {
      return;
    }
    
    setFarmIdsDestinazione((prev) => {
      if (prev.includes(farmId)) {
        return prev.filter((id) => id !== farmId);
      } else {
        return [...prev, farmId];
      }
    });
  };

  // Handler per toggle delle farm da eliminare
  const handleToggleFarmDaEliminare = (farmId: string) => {
    setFarmsDaEliminare(prev => 
      prev.includes(farmId) 
        ? prev.filter(id => id !== farmId) 
        : [...prev, farmId]
    );
  };

  // Handler per toggle di tutte le farm di un giocatore come destinazione
  const handleSelectAllFarmsOfPlayer = (giocatoreId: string) => {
    const giocatore = giocatori.find((g) => g.giocatore_id === giocatoreId);
    if (!giocatore) return;

    const farmsFiltrate = getFarmsFiltrate(giocatore);
    const farmIds = farmsFiltrate.map((farm) => farm.id);
    
    if (modalita === 'elimina') {
      // Se tutte le farm del giocatore sono già selezionate, deselezionare tutte
      const tutteSelezionate = farmIds.every((id) => farmsDaEliminare.includes(id));
      
      if (tutteSelezionate) {
        setFarmsDaEliminare((prev) => prev.filter((id) => !farmIds.includes(id)));
      } else {
        // Altrimenti, aggiungi tutte le farm non ancora selezionate
        const nuoveFarmIds = farmIds.filter((id) => !farmsDaEliminare.includes(id));
        setFarmsDaEliminare((prev) => [...prev, ...nuoveFarmIds]);
      }
    } else {
      // Se tutte le farm del giocatore sono già selezionate, deselezionare tutte
      const tutteSelezionate = farmIds.every((id) => farmIdsDestinazione.includes(id));
      
      if (tutteSelezionate) {
        setFarmIdsDestinazione((prev) => prev.filter((id) => !farmIds.includes(id)));
      } else {
        // Altrimenti, aggiungi tutte le farm non ancora selezionate
        const nuoveFarmIds = farmIds.filter((id) => !farmIdsDestinazione.includes(id));
        setFarmIdsDestinazione((prev) => [...prev, ...nuoveFarmIds]);
      }
    }
  };

  // Handler per confermare l'azione
  const handleConfirm = () => {
    if (modalita === 'elimina' && onElimina) {
      onElimina(farmsDaEliminare);
    } else if (onAssegnaPreset) {
      onAssegnaPreset(farmIdsDestinazione);
    } else if (farmIdOrigine && farmIdsDestinazione.length > 0) {
      // Ci assicuriamo che modalita sia 'copia' o 'trasferisci' prima di chiamare onConfirm
      if (modalita === 'copia' || modalita === 'trasferisci') {
        onConfirm(farmIdOrigine, farmIdsDestinazione, modalita);
      }
    }
  };

  // Verifica se tutte le farm visibili di un giocatore sono selezionate
  const areAllPlayerFarmsSelected = (giocatoreId: string) => {
    const giocatore = giocatori.find((g) => g.giocatore_id === giocatoreId);
    if (!giocatore) return false;

    const farmsFiltrate = getFarmsFiltrate(giocatore);
    if (modalita === 'elimina') {
      return farmsFiltrate.length > 0 && farmsFiltrate.every((farm) => farmsDaEliminare.includes(farm.id));
    } else {
      return farmsFiltrate.length > 0 && farmsFiltrate.every((farm) => farmIdsDestinazione.includes(farm.id));
    }
  };

  // Gestisce il reset dei filtri
  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedDerby("");
    setMostraFarmInattive(false);
    setMostraTagDerby(false);
    setMostraGiaAssegnati(true);
  };

  // Gestisce il cambio del derby selezionato
  const handleDerbyChange = (event: React.MouseEvent<HTMLElement>, derbyId: string) => {
    if (selectedDerby === derbyId) {
      setSelectedDerby("");
    } else {
      setSelectedDerby(derbyId);
    }
    setDerbyMenuOpen(false);
  };

  // Controlla se ci sono filtri attivi
  const hasActiveFilters = () => {
    return searchQuery !== "" || selectedDerby !== "" || mostraFarmInattive || mostraTagDerby || !mostraGiaAssegnati;
  };

  // Renderizza il contenuto appropriato in base alla modalità selezionata
  const renderContenuto = () => {
    if (modalita === 'elimina') {
      return (
        <>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Seleziona le farm di cui vuoi eliminare tutte le assegnazioni. Questa operazione non può essere annullata.
          </Alert>
          
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle2">
              Seleziona le farm da cui eliminare le assegnazioni:
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={mostraFarmInattive}
                  onChange={(e) => setMostraFarmInattive(e.target.checked)}
                  size="small"
                />
              }
                label={<Typography variant="body2" sx={{ fontSize: '0.8rem' }}>Mostra farm inattive</Typography>}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={mostraTagDerby}
                    onChange={(e) => setMostraTagDerby(e.target.checked)}
                    size="small"
                  />
                }
                label={<Typography variant="body2" sx={{ fontSize: '0.8rem' }}>Mostra tag derby</Typography>}
              />
            </Box>
          </Box>
          
          <TextField
            fullWidth
            size="small"
            placeholder="Cerca giocatore o farm..."
            variant="outlined"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ mb: 2 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />

          <Box sx={{ maxHeight: '400px', overflow: 'auto', border: '1px solid #e0e0e0', borderRadius: 1 }}>
            <List dense>
              {filteredGiocatori.map((giocatore) => {
                const farmsFiltrate = getFarmsFiltrate(giocatore);
                if (farmsFiltrate.length === 0) return null;
                
                return (
                  <React.Fragment key={giocatore.giocatore_id}>
                    <ListItem>
                      <ListItemText 
                        primary={
                          <Typography variant="subtitle2">
                            {giocatore.giocatore_nome}
                          </Typography>
                        }
                      />
                      <ListItemSecondaryAction>
                        <Tooltip title="Seleziona tutte le farm di questo giocatore">
                          <IconButton 
                            edge="end" 
                            size="small"
                            onClick={() => handleSelectAllFarmsOfPlayer(giocatore.giocatore_id)}
                            color={areAllPlayerFarmsSelected(giocatore.giocatore_id) ? "primary" : "default"}
                          >
                            <ContentCopyIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </ListItemSecondaryAction>
                    </ListItem>
                    {farmsFiltrate.map((farm) => (
                      <ListItemButton 
                        key={farm.id}
                        selected={farmsDaEliminare.includes(farm.id)}
                        onClick={() => handleToggleFarmDaEliminare(farm.id)}
                        sx={{ 
                          pl: 4,
                          '&.Mui-selected': {
                            backgroundColor: 'rgba(211, 47, 47, 0.08)',
                          },
                          '&.Mui-selected:hover': {
                            backgroundColor: 'rgba(211, 47, 47, 0.12)',
                          }
                        }}
                      >
                        <ListItemAvatar sx={{ minWidth: 36 }}>
                          <Avatar 
                            sx={{ 
                              width: 24, 
                              height: 24, 
                              fontSize: '0.75rem',
                              bgcolor: farm.stato === 'inattivo' ? 'grey.400' : 'primary.main'
                            }}
                          >
                            {farm.livello || '?'}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText 
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Typography variant="body2">
                                {farm.nome || `Farm ${farm.id.substring(0, 8)}`}
                              </Typography>
                              {farm.haAssegnazioni && (
                                <Tooltip title="Questa farm ha delle assegnazioni">
                                  <Box 
                                    component="span" 
                                    sx={{ 
                                      display: 'inline-block', 
                                      width: 8, 
                                      height: 8, 
                                      borderRadius: '50%', 
                                      backgroundColor: 'success.main',
                                      ml: 1
                                    }} 
                                  />
                                </Tooltip>
                              )}
                            </Box>
                          }
                          secondary={
                            <>
                              <Typography variant="caption" component="span">
                                {farm.stato === 'inattivo' ? 'Inattiva' : 'Attiva'}
                              </Typography>
                              
                              {/* Mostra i derby tags associati alla farm solo se lo switch è attivato */}
                              {mostraTagDerby && farm.derby_tags && farm.derby_tags.length > 0 && (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.3 }}>
                                  {farm.derby_tags.map((tagId) => {
                                    // Trova il derby corrispondente all'ID del tag
                                    const derbyInfo = derby.find(d => d.id === tagId);
                                    if (!derbyInfo) return null;
                                    
                                    return (
                                      <Tooltip key={tagId} title={derbyInfo.nome} arrow placement="top">
                                        <Chip
                                          label={derbyInfo.nome}
                                          size="small"
                                          sx={{ 
                                            height: 16,
                                            fontSize: '0.62rem',
                                            backgroundColor: derbyInfo.colore || 'primary.main',
                                            color: 'white',
                                            '& .MuiChip-label': { 
                                              px: 0.6,
                                              py: 0,
                                              lineHeight: 1.2
                                            }
                                          }}
                                        />
                                      </Tooltip>
                                    );
                                  })}
                                </Box>
                              )}
                            </>
                          }
                          primaryTypographyProps={{ variant: 'body2' }}
                          secondaryTypographyProps={{ variant: 'caption' }}
                        />
                      </ListItemButton>
                    ))}
                    <Divider />
                  </React.Fragment>
                );
              })}
            </List>
          </Box>
        </>
      );
    }

    return (
      <>
        {/* Selettore farm origine - visibile solo se non stiamo facendo un'assegnazione di preset */}
        {!isAssegnazionePreset && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Seleziona la farm di origine:
            </Typography>
            {farmOrigineSelect && (
              <Box sx={{ mb: 2 }}>
                <Chip 
                  label={`${farmOrigineSelect.giocatore_nome} - ${farmOrigineSelect.farm_nome}`}
                  color="primary"
                  onDelete={() => {
                    setFarmIdOrigine("");
                    setFarmOrigineSelect(null);
                    setFarmIdsDestinazione([]);
                  }}
                  sx={{ fontSize: '0.9rem' }}
                />
              </Box>
            )}
            {!farmOrigineSelect && (
              <Box sx={{ maxHeight: '200px', overflow: 'auto', border: '1px solid #e0e0e0', borderRadius: 1, mb: 2 }}>
                <List dense>
                  {giocatori.map((giocatore) => (
                    <React.Fragment key={giocatore.giocatore_id}>
                      <ListItem>
                        <ListItemText 
                          primary={
                            <Typography variant="subtitle2">
                              {giocatore.giocatore_nome}
                            </Typography>
                          }
                        />
                      </ListItem>
                      {giocatore.farms.map((farm) => (
                        <ListItemButton 
                          key={farm.id}
                          onClick={() => handleSelectFarmOrigine(
                            giocatore.giocatore_id, 
                            giocatore.giocatore_nome, 
                            farm.id, 
                            farm.nome || `Farm ${farm.id.split('_')[1]}`
                          )}
                          sx={{ pl: 4 }}
                          disabled={!farm.haAssegnazioni && (modalita === 'copia' || modalita === 'trasferisci')}
                        >
                          <ListItemText 
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Typography variant="body2">
                                  {farm.nome || `Farm ${farm.id.substring(0, 8)}`}
                                </Typography>
                                {farm.haAssegnazioni && (
                                  <Tooltip title="Questa farm ha delle assegnazioni">
                                    <Box 
                                      component="span" 
                                      sx={{ 
                                        display: 'inline-block', 
                                        width: 8, 
                                        height: 8, 
                                        borderRadius: '50%', 
                                        backgroundColor: 'success.main',
                                        ml: 1
                                      }} 
                                    />
                                  </Tooltip>
                                )}
                              </Box>
                            }
                            secondary={`Livello: ${farm.livello || '?'}`}
                          />
                        </ListItemButton>
                      ))}
                      <Divider />
                    </React.Fragment>
                  ))}
                </List>
              </Box>
            )}
          </Box>
        )}

        {/* Titolo per la selezione delle farm di destinazione */}
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle2">
            {isAssegnazionePreset 
              ? "Seleziona le farm a cui assegnare gli incarichi del preset:" 
              : "Seleziona le farms di destinazione:"}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={mostraFarmInattive}
                  onChange={(e) => setMostraFarmInattive(e.target.checked)}
                  size="small"
                />
              }
              label={<Typography variant="body2" sx={{ fontSize: '0.8rem' }}>Mostra farm inattive</Typography>}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={mostraTagDerby}
                  onChange={(e) => setMostraTagDerby(e.target.checked)}
                  size="small"
                />
              }
              label={<Typography variant="body2" sx={{ fontSize: '0.8rem' }}>Mostra tag derby</Typography>}
            />
            {isAssegnazionePreset && (
              <FormControlLabel
                control={
                  <Switch
                    checked={mostraGiaAssegnati}
                    onChange={(e) => setMostraGiaAssegnati(e.target.checked)}
                    size="small"
                  />
                }
                label={<Typography variant="body2" sx={{ fontSize: '0.8rem' }}>Mostra già assegnati</Typography>}
              />
            )}
          </Box>
        </Box>

        {/* Filtri e ricerca per farm destinazione */}
        {(farmOrigineSelect || isAssegnazionePreset) && (
          <>
            <TextField
              fullWidth
              size="small"
              placeholder="Cerca giocatore o farm..."
              variant="outlined"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />

            {/* Menu a tendina per filtrare per derby */}
            <Box sx={{ position: 'relative', mb: 2 }}>
              <Box
                onClick={() => setDerbyMenuOpen(!derbyMenuOpen)}
                sx={{
                  border: '1px solid #e0e0e0',
                  borderRadius: 1,
                  p: 1.5,
                  cursor: 'pointer',
                  bgcolor: 'background.paper',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  '&:hover': {
                    bgcolor: 'rgba(0, 0, 0, 0.02)',
                  },
                }}
              >
                <Typography variant="body2" color={selectedDerby ? 'text.primary' : 'text.secondary'}>
                  {selectedDerby 
                    ? `Filtra per Derby: ${derby.find(d => d.id === selectedDerby)?.nome || 'Sconosciuto'}`
                    : 'Filtra per Derby'}
                </Typography>
                <Box
                  component="span"
                  sx={{
                    width: 0,
                    height: 0,
                    borderLeft: '5px solid transparent',
                    borderRight: '5px solid transparent',
                    borderTop: '5px solid #666',
                    transition: 'transform 0.2s',
                    transform: derbyMenuOpen ? 'rotate(180deg)' : 'none',
                  }}
                />
              </Box>

              {/* Dropdown menu per i derby */}
              {derbyMenuOpen && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    bgcolor: 'background.paper',
                    boxShadow: 3,
                    borderRadius: 1,
                    zIndex: 1000,
                    maxHeight: '300px',
                    overflow: 'auto',
                  }}
                >
                  <List dense>
                    <ListItem sx={{ bgcolor: 'rgba(0, 0, 0, 0.04)' }}>
                      <ListItemText primary={<Typography variant="body2">Tutti i Derby</Typography>} />
                    </ListItem>
                    {derby.map((d) => (
                      <ListItemButton
                        key={d.id}
                        selected={selectedDerby === d.id}
                        onClick={(e) => handleDerbyChange(e, d.id)}
                        sx={{
                          pl: 2,
                          '&.Mui-selected': {
                            bgcolor: 'rgba(25, 118, 210, 0.08)',
                          },
                          '&.Mui-selected:hover': {
                            bgcolor: 'rgba(25, 118, 210, 0.12)',
                          },
                        }}
                      >
                        <Box
                          component="span"
                          sx={{
                            display: 'inline-block',
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            bgcolor: d.colore || 'primary.main',
                            mr: 1.5,
                          }}
                        />
                        <ListItemText primary={<Typography variant="body2">{d.nome}</Typography>} />
                      </ListItemButton>
                    ))}
                  </List>
                </Box>
              )}
            </Box>

            {/* Checkbox "Seleziona tutto" */}
            <Box sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={
                      // Controlla se tutte le farm visibili (filtrate e non già assegnate) sono selezionate
                      filteredGiocatori
                        .flatMap(giocatore => getFarmsFiltrate(giocatore)
                          .filter(farm => !isFarmGiaAssegnata(farm.id))
                          .map(farm => farm.id))
                        .every(farmId => farmIdsDestinazione.includes(farmId)) &&
                      // Assicurati che ci sia almeno una farm selezionabile
                      filteredGiocatori
                        .flatMap(giocatore => getFarmsFiltrate(giocatore)
                          .filter(farm => !isFarmGiaAssegnata(farm.id))).length > 0
                    }
                    onChange={(e) => {
                      const allVisibleFarmIds = filteredGiocatori
                        .flatMap(giocatore => getFarmsFiltrate(giocatore)
                          .filter(farm => !isFarmGiaAssegnata(farm.id))
                          .map(farm => farm.id));
                      
                      if (e.target.checked) {
                        // Seleziona tutte le farm visibili filtrate (tranne quelle già assegnate)
                        setFarmIdsDestinazione(Array.from(new Set([...farmIdsDestinazione, ...allVisibleFarmIds])));
                      } else {
                        // Deseleziona tutte le farm visibili
                        setFarmIdsDestinazione(farmIdsDestinazione.filter(id => !allVisibleFarmIds.includes(id)));
                      }
                    }}
                    sx={{ '& .MuiSvgIcon-root': { fontSize: '1.2rem' } }}
                  />
                }
                label={
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    Seleziona tutto
                  </Typography>
                }
              />
            </Box>

            {/* Lista delle farm di destinazione - stile modificato per imitare DialogoSelezioneFarmNuovo */}
            <Box sx={{ maxHeight: '400px', overflow: 'auto', border: '1px solid #e0e0e0', borderRadius: 1 }}>
              <List dense>
                {filteredGiocatori.map((giocatore) => {
                  const farmsFiltrate = getFarmsFiltrate(giocatore);
                  if (farmsFiltrate.length === 0) return null;
                  
                  const selezionaTutte = areAllPlayerFarmsSelected(giocatore.giocatore_id);
                  
                  return (
                    <React.Fragment key={giocatore.giocatore_id}>
                      <ListItem sx={{ bgcolor: "background.paper", py: 0.25, mt: 0.25, mb: 0, borderRadius: '4px' }}>
                        <Checkbox
                          checked={selezionaTutte}
                          onChange={() => handleSelectAllFarmsOfPlayer(giocatore.giocatore_id)}
                          indeterminate={
                            farmsFiltrate.some(farm => farmIdsDestinazione.includes(farm.id)) && 
                            !selezionaTutte
                          }
                          size="small"
                          sx={{ p: 0.25, '& .MuiSvgIcon-root': { fontSize: '0.9rem' } }}
                        />
                        <ListItemText 
                          primary={
                            <Typography 
                              variant="subtitle1" 
                              sx={{ 
                                fontWeight: "bold", 
                                fontSize: '0.85rem', 
                                color: 'primary.main',
                                lineHeight: 1.2
                              }}
                            >
                              {giocatore.giocatore_nome}
                            </Typography>
                          }
                        />
                      </ListItem>
                      
                      {farmsFiltrate.map((farm) => (
                        <Box
                          key={farm.id}
                          onClick={() => handleToggleFarmDestinazione(farm.id)}
                          sx={{ 
                            pl: 0.5,
                            borderLeft: "1px solid rgba(0, 0, 0, 0.12)",
                            ml: 2,
                            display: 'flex',
                            alignItems: 'center',
                            py: 0.25,
                            mb: 0.25,
                            cursor: 'pointer',
                            bgcolor: farmIdsDestinazione.includes(farm.id)
                              ? "rgba(25, 118, 210, 0.08)" 
                              : 'transparent',
                            '&:hover': {
                              bgcolor: farmIdsDestinazione.includes(farm.id)
                                ? "rgba(25, 118, 210, 0.12)" 
                                : "rgba(0, 0, 0, 0.04)",
                            },
                            filter: farm.stato === "inattivo" ? "grayscale(100%)" : "none",
                            borderRadius: '4px',
                          }}
                        >
                          {!isFarmGiaAssegnata(farm.id) && (
                            <Checkbox
                              checked={farmIdsDestinazione.includes(farm.id)}
                              onChange={() => handleToggleFarmDestinazione(farm.id)}
                              onClick={(e) => e.stopPropagation()}
                              size="small"
                              sx={{ p: 0.25, '& .MuiSvgIcon-root': { fontSize: '0.9rem' } }}
                            />
                          )}
                          {isFarmGiaAssegnata(farm.id) && (
                            <Box 
                              sx={{ 
                                width: 20, 
                                height: 20, 
                                display: 'flex', 
                                justifyContent: 'center', 
                                alignItems: 'center', 
                                color: 'success.main',
                                ml: 0.3,
                                mr: 0.3
                              }}
                            >
                              <Box 
                                component="span" 
                                sx={{ 
                                  fontSize: '0.8rem', 
                                  fontWeight: 'bold', 
                                  color: '#4caf50'
                                }}
                              >
                                ✓
                              </Box>
                            </Box>
                          )}
                          <Avatar 
                            sx={{ 
                              bgcolor: isFarmGiaAssegnata(farm.id) ? 'rgba(76, 175, 80, 0.1)' : 'rgb(33, 150, 243, 0.1)',
                              color: isFarmGiaAssegnata(farm.id) ? '#4caf50' : 'rgb(33, 150, 243)',
                              width: 20,
                              height: 20,
                              fontSize: '0.7rem',
                              mr: 1,
                              fontStyle: 'italic'
                            }}
                          >
                            {farm.livello}
                          </Avatar>
                          <Box sx={{ flexGrow: 1 }}>
                            <Typography 
                              variant="body2"
                              sx={{
                                color: isFarmGiaAssegnata(farm.id) ? '#4caf50' : 'inherit', 
                                fontWeight: isFarmGiaAssegnata(farm.id) ? 'bold' : 'normal'
                              }}
                            >
                              {farm.nome}
                              {isFarmGiaAssegnata(farm.id) && (
                                <Typography 
                                  component="span"
                                  variant="caption"
                                  sx={{ 
                                    ml: 0.5,
                                    color: 'success.main',
                                    fontSize: '0.7rem'
                                  }}
                                >
                                  (già assegnato)
                                </Typography>
                              )}
                            </Typography>
                            
                            {/* Mostra i derby tags associati alla farm solo se lo switch è attivato */}
                            {mostraTagDerby && farm.derby_tags && farm.derby_tags.length > 0 && (
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.2 }}>
                                {farm.derby_tags.map((tagId) => {
                                  // Trova il derby corrispondente all'ID del tag
                                  const derbyInfo = derby.find(d => d.id === tagId);
                                  if (!derbyInfo) return null;
                                  
                                  return (
                                    <Tooltip key={tagId} title={derbyInfo.nome} arrow placement="top">
                                      <Chip
                                        label={derbyInfo.nome}
                                        size="small"
                                        sx={{ 
                                          height: 16,
                                          fontSize: '0.62rem',
                                          backgroundColor: derbyInfo.colore || 'primary.main',
                                          color: 'white',
                                          '& .MuiChip-label': { 
                                            px: 0.6,
                                            py: 0,
                                            lineHeight: 1.2
                                          }
                                        }}
                                      />
                                    </Tooltip>
                                  );
                                })}
                              </Box>
                            )}
                          </Box>
                        </Box>
                      ))}
                      
                      <Divider component="li" sx={{ my: 0.25 }} />
                    </React.Fragment>
                  );
                })}
              </List>
            </Box>
          </>
        )}

        {/* Pulsante di reset per i filtri */}
        {hasActiveFilters() && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
            <Button
              size="small"
              variant="outlined"
              onClick={handleResetFilters}
              sx={{ fontSize: '0.75rem', py: 0.25, px: 1 }}
            >
              Resetta filtri
            </Button>
          </Box>
        )}
      </>
    );
  };

  // Determina il titolo del dialogo in base alla modalità
  const getTitolo = () => {
    if (isAssegnazionePreset) {
      return presetNome || "Assegnazione Incarichi da Preset";
    }
    
    switch (modalita) {
      case 'copia':
        return "Copia Assegnazioni";
      case 'trasferisci':
        return "Trasferisci Assegnazioni";
      case 'elimina':
        return "Elimina Assegnazioni";
      default:
        return "Gestione Assegnazioni";
    }
  };

  // Determina il testo del pulsante di conferma in base alla modalità
  const getTestoPulsanteConferma = () => {
    if (isAssegnazionePreset) {
      return "Assegna";
    }
    
    switch (modalita) {
      case 'copia':
        return "Copia";
      case 'trasferisci':
        return "Trasferisci";
      case 'elimina':
        return "Elimina";
      default:
        return "Conferma";
    }
  };

  // Ottiene l'icona per il pulsante di conferma
  const getIconaConferma = () => {
    switch (modalita) {
      case 'copia':
        return <ContentCopyIcon />;
      case 'trasferisci':
        return <TransferWithinAStationIcon />;
      case 'elimina':
        return <DeleteOutlineIcon />;
      default:
        return null;
    }
  };

  // Determina se il pulsante di conferma debba essere disabilitato
  const isConfermaDisabilitata = () => {
    if (modalita === 'elimina') {
      return farmsDaEliminare.length === 0;
    }
    if (isAssegnazionePreset) {
      return farmIdsDestinazione.length === 0;
    }
    return !farmIdOrigine || farmIdsDestinazione.length === 0;
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          maxHeight: 'calc(100% - 64px)',
        }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {modalita === 'copia' && <ContentCopyIcon sx={{ mr: 1 }} />}
          {modalita === 'trasferisci' && <TransferWithinAStationIcon sx={{ mr: 1 }} />}
          {modalita === 'elimina' && <DeleteOutlineIcon sx={{ mr: 1, color: 'error.main' }} />}
          {getTitolo()}
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        {renderContenuto()}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Annulla
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          color={modalita === 'elimina' ? 'error' : 'primary'}
          disabled={isConfermaDisabilitata()}
          startIcon={getIconaConferma()}
        >
          {modalita === 'elimina' 
            ? getTestoPulsanteConferma() 
            : isAssegnazionePreset 
              ? `Assegna (${farmIdsDestinazione.length})`
              : getTestoPulsanteConferma()
          }
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export { DialogoTrasferimentoAssegnazioni };
export default DialogoTrasferimentoAssegnazioni; 