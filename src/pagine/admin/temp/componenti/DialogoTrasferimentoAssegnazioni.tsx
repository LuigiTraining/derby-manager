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
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import TransferWithinAStationIcon from "@mui/icons-material/TransferWithinAStation";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

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
}

interface GiocatoreConFarms {
  giocatore_id: string;
  giocatore_nome: string;
  farms: Farm[];
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
}

const DialogoTrasferimentoAssegnazioni: React.FC<DialogoTrasferimentoAssegnazioniProps> = ({
  open,
  onClose,
  onConfirm,
  onElimina,
  onAssegnaPreset,
  modalita,
  giocatori,
  isAssegnazionePreset = false,
}) => {
  // Stati per gestire la selezione e i filtri
  const [searchQuery, setSearchQuery] = useState("");
  const [farmIdOrigine, setFarmIdOrigine] = useState<string>("");
  const [farmIdsDestinazione, setFarmIdsDestinazione] = useState<string[]>([]);
  const [mostraFarmInattive, setMostraFarmInattive] = useState(false);
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

  // Funzione per filtrare le farms in base alla ricerca
  const filteredGiocatori = giocatori.filter((giocatore) => {
    const matchGiocatore = giocatore.giocatore_nome.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchFarms = giocatore.farms.some(
      (farm) => farm.nome?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    return matchGiocatore || matchFarms;
  });

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
      
      // Se è la farm di origine, non mostrarla nelle destinazioni (solo in modalità trasferimento)
      if (modalita !== 'elimina' && farm.id === farmIdOrigine) {
        return false;
      }
      
      // Se siamo in modalità copia o trasferisci e stiamo selezionando l'origine,
      // mostra solo le farm che hanno assegnazioni, ma solo se non stiamo facendo
      // un'assegnazione preset (in quel caso mostra tutte le farm)
      if ((modalita === 'copia' || modalita === 'trasferisci') && !farmOrigineSelect && !isAssegnazionePreset) {
        // Forziamo a true per risolvere il problema di visualizzazione
        return true; // era farm.haAssegnazioni === true
      }
      
      // Questo è il posto dove implementare il filtraggio per le farm che hanno già tutti gli incarichi del preset
      // Comunico con il componente genitore attraverso le props
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
    } else if (isAssegnazionePreset && onAssegnaPreset) {
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
            <FormControlLabel
              control={
                <Switch
                  checked={mostraFarmInattive}
                  onChange={(e) => setMostraFarmInattive(e.target.checked)}
                  size="small"
                />
              }
              label={<Typography variant="body2">Mostra farm inattive</Typography>}
            />
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
                          primary={farm.nome || `Farm ${farm.id.substring(0, 8)}`}
                          secondary={farm.stato === 'inattivo' ? 'Inattiva' : 'Attiva'}
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
          <FormControlLabel
            control={
              <Switch
                checked={mostraFarmInattive}
                onChange={(e) => setMostraFarmInattive(e.target.checked)}
                size="small"
              />
            }
            label={<Typography variant="body2">Mostra farm inattive</Typography>}
          />
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

            {/* Lista delle farm di destinazione */}
            <Box sx={{ maxHeight: '300px', overflow: 'auto', border: '1px solid #e0e0e0', borderRadius: 1 }}>
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
                          selected={farmIdsDestinazione.includes(farm.id)}
                          onClick={() => handleToggleFarmDestinazione(farm.id)}
                          sx={{ 
                            pl: 4,
                            '&.Mui-selected': {
                              backgroundColor: 'rgba(25, 118, 210, 0.08)',
                            },
                            '&.Mui-selected:hover': {
                              backgroundColor: 'rgba(25, 118, 210, 0.12)',
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
                            primary={farm.nome || `Farm ${farm.id.substring(0, 8)}`}
                            secondary={farm.stato === 'inattivo' ? 'Inattiva' : 'Attiva'}
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
        )}
      </>
    );
  };

  // Determina il titolo del dialogo in base alla modalità
  const getTitolo = () => {
    if (isAssegnazionePreset) {
      return "Assegnazione Incarichi da Preset";
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
        <Button onClick={onClose} variant="outlined">
          Annulla
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          color={modalita === 'elimina' ? 'error' : 'primary'}
          disabled={isConfermaDisabilitata()}
          startIcon={getIconaConferma()}
        >
          {getTestoPulsanteConferma()}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export { DialogoTrasferimentoAssegnazioni };
export default DialogoTrasferimentoAssegnazioni; 