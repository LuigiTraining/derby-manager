import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Typography,
  TextField,
  InputAdornment,
  Divider,
  Chip,
  Box,
  CircularProgress,
  Checkbox,
  FormControlLabel,
  Switch,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { collection, getDocs, query, where, orderBy, limit } from "firebase/firestore";
import { db } from "../../../../configurazione/firebase";

// Definizione dei tipi
type StatoFarm = "attivo" | "inattivo";

interface Derby {
  id: string;
  nome: string;
  colore: string;
  attivo: boolean;
  prossimo?: boolean;
}

interface Farm {
  id: string;
  nome: string;
  tag: string;
  diamanti: number;
  stato: StatoFarm;
  principale: boolean;
  livello: number;
  giocatore_id: string;
  giocatore_nome: string;
  derby_tags?: string[];
  derby_type?: string;
}

interface Giocatore {
  id: string;
  nome: string;
  farms: Farm[];
}

interface DialogoSelezioneFarmProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (farmIds: string[]) => void;
  tipoAssegnazione: "incarico" | "cesto";
  riferimentoId: string;
  riferimentoNome: string;
  livelloMinimo?: number;
  farmIdsGiaAssegnate?: string[];
  derbySelezionatoId?: string;
}

const DialogoSelezioneFarm: React.FC<DialogoSelezioneFarmProps> = ({
  open,
  onClose,
  onConfirm,
  tipoAssegnazione,
  riferimentoId,
  riferimentoNome,
  livelloMinimo = 0,
  farmIdsGiaAssegnate = [],
  derbySelezionatoId = "",
}) => {
  const [giocatori, setGiocatori] = useState<Giocatore[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFarmIds, setSelectedFarmIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [mostraFarmInattive, setMostraFarmInattive] = useState(false);
  const [derby, setDerby] = useState<Derby[]>([]);
  const [selectedDerby, setSelectedDerby] = useState<string>("");
  const [userChangedDerby, setUserChangedDerby] = useState<boolean>(false);

  // Carica i giocatori e le loro farm
  useEffect(() => {
    const caricaGiocatori = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Ottieni gli utenti dal database (collezione "utenti" invece di "giocatori")
        const utentiRef = collection(db, "utenti");
        const q = query(utentiRef);
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          setError("Nessun utente trovato nel database");
          setLoading(false);
          return;
        }
        
        const giocatoriMap = new Map<string, Giocatore>();
        
        querySnapshot.forEach((doc) => {
          const utente = doc.data();
          
          // Verifica che sia un giocatore o un moderatore e non un admin
          if (utente.ruolo !== "admin" && utente.farms && Array.isArray(utente.farms)) {
            const farmsValide: Farm[] = [];
            
            utente.farms.forEach((farm: any, index: number) => {
              if (!farm) return;
              
              const farmId = `${doc.id}_${index}`;
              farmsValide.push({
                id: farmId,
                nome: farm.nome || `Farm ${index + 1}`,
                tag: farm.tag || "#",
                diamanti: farm.diamanti || 0,
                stato: farm.stato || "attivo",
                principale: index === 0, // La prima farm è considerata principale
                livello: farm.livello || 1,
                giocatore_id: doc.id,
                giocatore_nome: utente.nome || `Giocatore ${doc.id}`,
                derby_tags: farm.derby_tags || [],
                derby_type: farm.derby_type || ""
              });
            });
            
            if (farmsValide.length > 0) {
              giocatoriMap.set(doc.id, {
                id: doc.id,
                nome: utente.nome || `Giocatore ${doc.id}`,
                farms: farmsValide
              });
            }
          }
        });
        
        const giocatoriData = Array.from(giocatoriMap.values());
        
        // Ordina i giocatori per nome
        giocatoriData.sort((a, b) => a.nome.localeCompare(b.nome));
        
        setGiocatori(giocatoriData);
      } catch (error) {
        console.error("Errore nel caricamento degli utenti:", error);
        setError("Errore nel caricamento degli utenti");
      } finally {
        setLoading(false);
      }
    };
    
    if (open) {
      caricaGiocatori();
      setSelectedFarmIds([]);
    }
  }, [open, farmIdsGiaAssegnate]);

  // Carica i derby disponibili
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

  // Gestisce l'impostazione del derby selezionato
  useEffect(() => {
    if (open) {
      // Se il dialogo è appena stato aperto, controlla se c'è un derby selezionato salvato
      const savedDerbyId = localStorage.getItem(`derbySelezionato_${riferimentoId}`);
      
      if (savedDerbyId && !userChangedDerby) {
        // Se c'è un derby salvato per questo riferimento e l'utente non ha cambiato manualmente il derby
        setSelectedDerby(savedDerbyId);
      } else if (derbySelezionatoId && !userChangedDerby) {
        // Se c'è un derby selezionato nella pagina principale e l'utente non ha cambiato manualmente il derby
        setSelectedDerby(derbySelezionatoId);
      } else if (!userChangedDerby) {
        // Se non c'è un derby salvato e l'utente non ha cambiato manualmente il derby, resetta la selezione
        setSelectedDerby("");
      }
    } else {
      // Quando il dialogo viene chiuso, resetta il flag userChangedDerby
      setUserChangedDerby(false);
    }
  }, [open, derbySelezionatoId, riferimentoId, userChangedDerby]);

  // Gestisce il cambio manuale del derby da parte dell'utente
  const handleDerbyChange = (derbyId: string) => {
    setSelectedDerby(derbyId);
    setUserChangedDerby(true);
    
    // Salva la selezione nel localStorage
    if (derbyId) {
      localStorage.setItem(`derbySelezionato_${riferimentoId}`, derbyId);
    } else {
      localStorage.removeItem(`derbySelezionato_${riferimentoId}`);
    }
  };

  // Filtra i giocatori in base alla query di ricerca e alle opzioni di filtro
  const giocatoriFiltrati = giocatori.filter((giocatore) => {
    // Filtra per query di ricerca
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      const matchGiocatore = giocatore.nome.toLowerCase().includes(searchLower);
      const matchFarm = giocatore.farms.some((farm) => 
        farm.nome.toLowerCase().includes(searchLower) || 
        (farm.tag && farm.tag.toLowerCase().includes(searchLower))
      );
      
      if (!matchGiocatore && !matchFarm) return false;
    }
    
    // Verifica se il giocatore ha almeno una farm che soddisfa i criteri di filtro
    const hasFarmValide = giocatore.farms.some((farm) => {
      // Filtra per stato (attiva/inattiva) - ora mostriamo tutte le farm, ma le inattive saranno in scala di grigi
      if (!mostraFarmInattive && farm.stato !== "attivo") return false;
      
      // Filtra per livello minimo - non mostriamo le farm con livello insufficiente
      if (farm.livello < livelloMinimo) return false;
      
      // Filtra le farm già assegnate
      if (farmIdsGiaAssegnate.includes(farm.id)) return false;
      
      // Filtra per derby selezionato
      if (selectedDerby && farm.derby_tags) {
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
      
      return true;
    });
    
    return hasFarmValide;
  });

  // Filtra le farm di un giocatore in base ai criteri di filtro
  const filteredFarms = (farms: Farm[]) => {
    return farms.filter((farm) => {
      // Filtra per stato (attiva/inattiva) - ora mostriamo tutte le farm, ma le inattive saranno in scala di grigi
      if (!mostraFarmInattive && farm.stato !== "attivo") return false;
      
      // Filtra per livello minimo - non mostriamo le farm con livello insufficiente
      if (farm.livello < livelloMinimo) return false;
      
      // Filtra le farm già assegnate
      if (farmIdsGiaAssegnate.includes(farm.id)) return false;
      
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
      
      return true;
    });
  };

  // Gestisce la selezione/deselezione di una farm
  const handleToggleFarm = (farmId: string) => {
    setSelectedFarmIds((prev) => {
      if (prev.includes(farmId)) {
        return prev.filter(id => id !== farmId);
      } else {
        return [...prev, farmId];
      }
    });
  };

  // Gestisce la selezione di tutte le farm di un giocatore
  const handleSelectAllFarmsOfPlayer = (giocatoreId: string) => {
    const giocatore = giocatori.find(g => g.id === giocatoreId);
    if (!giocatore) return;
    
    const farmsFiltrate = filteredFarms(giocatore.farms);
    const farmIds = farmsFiltrate.map(farm => farm.id);
    
    setSelectedFarmIds((prev) => {
      const currentSelected = new Set(prev);
      let newSelected = [...prev];
      
      // Se tutte le farm del giocatore sono già selezionate, le deseleziona tutte
      const allSelected = farmIds.every(id => currentSelected.has(id));
      
      if (allSelected) {
        newSelected = newSelected.filter(id => !farmIds.includes(id));
      } else {
        // Altrimenti, aggiungi tutte le farm non ancora selezionate
        farmIds.forEach(id => {
          if (!currentSelected.has(id)) {
            newSelected.push(id);
          }
        });
      }
      
      return newSelected;
    });
  };

  // Gestisce la selezione di tutte le farm visibili
  const handleSelectAllVisibleFarms = () => {
    const allVisibleFarmIds = giocatoriFiltrati.flatMap(giocatore => 
      filteredFarms(giocatore.farms).map(farm => farm.id)
    );
    
    setSelectedFarmIds((prev) => {
      const currentSelected = new Set(prev);
      
      // Se tutte le farm visibili sono già selezionate, le deseleziona tutte
      const allSelected = allVisibleFarmIds.every(id => currentSelected.has(id));
      
      if (allSelected) {
        return prev.filter(id => !allVisibleFarmIds.includes(id));
      } else {
        // Altrimenti, aggiungi tutte le farm non ancora selezionate
        const newSelected = [...prev];
        allVisibleFarmIds.forEach(id => {
          if (!currentSelected.has(id)) {
            newSelected.push(id);
          }
        });
        return newSelected;
      }
    });
  };

  // Gestisce la conferma della selezione
  const handleConfirm = () => {
    if (selectedFarmIds.length > 0) {
      // Passa direttamente l'array di farm IDs selezionati
      onConfirm(selectedFarmIds);
    }
  };

  // Conta le farm visibili
  const countVisibleFarms = () => {
    return giocatoriFiltrati.reduce((count, giocatore) => 
      count + filteredFarms(giocatore.farms).length, 0
    );
  };

  // Verifica se tutte le farm visibili sono selezionate
  const areAllVisibleFarmsSelected = () => {
    const allVisibleFarmIds = giocatoriFiltrati.flatMap(giocatore => 
      filteredFarms(giocatore.farms).map(farm => farm.id)
    );
    
    return allVisibleFarmIds.length > 0 && 
           allVisibleFarmIds.every(id => selectedFarmIds.includes(id));
  };

  // Verifica se tutte le farm di un giocatore sono selezionate
  const areAllPlayerFarmsSelected = (giocatoreId: string) => {
    const giocatore = giocatori.find(g => g.id === giocatoreId);
    if (!giocatore) return false;
    
    const farmsFiltrate = filteredFarms(giocatore.farms);
    return farmsFiltrate.length > 0 && 
           farmsFiltrate.every(farm => selectedFarmIds.includes(farm.id));
  };

  // Gestisce il reset dei filtri
  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedDerby("");
    setMostraFarmInattive(false);
    setUserChangedDerby(true);
    localStorage.removeItem(`derbySelezionato_${riferimentoId}`);
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: {
          '&::-webkit-scrollbar': {
            width: '8px',
            height: '8px',
            display: 'none',
          },
          '&:hover::-webkit-scrollbar': {
            display: 'block',
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: 'rgba(0,0,0,0.05)',
            borderRadius: '10px',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'rgba(25, 118, 210, 0.5)',
            borderRadius: '10px',
            '&:hover': {
              backgroundColor: 'rgba(25, 118, 210, 0.7)',
            },
          },
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(25, 118, 210, 0.5) rgba(0,0,0,0.05)',
        }
      }}
    >
      <DialogTitle>
        {/* Titolo rimosso come richiesto */}
      </DialogTitle>
      
      <DialogContent dividers sx={{
        '&::-webkit-scrollbar': {
          width: '8px',
          height: '8px',
          display: 'none',
        },
        '&:hover::-webkit-scrollbar': {
          display: 'block',
        },
        '&::-webkit-scrollbar-track': {
          backgroundColor: 'rgba(0,0,0,0.05)',
          borderRadius: '10px',
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: 'rgba(25, 118, 210, 0.5)',
          borderRadius: '10px',
          '&:hover': {
            backgroundColor: 'rgba(25, 118, 210, 0.7)',
          },
        },
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(25, 118, 210, 0.5) rgba(0,0,0,0.05)',
      }}>
        <Box sx={{ mb: 1 }}>
          <Typography variant="subtitle1" sx={{ fontSize: '0.95rem', fontWeight: 600 }}>
            <strong>{riferimentoNome}</strong>
            {livelloMinimo > 0 && (
              <span style={{ 
                fontSize: '0.85rem', 
                color: '#1976d2', 
                fontStyle: 'italic',
                fontWeight: 400
              }}>
                {` (Liv. ${livelloMinimo})`}
              </span>
            )}
          </Typography>
          {error && (
            <Typography variant="caption" color="error">
              {error}
            </Typography>
          )}
          {farmIdsGiaAssegnate.length > 0 && (
            <Chip
              label={`${farmIdsGiaAssegnate.length} farm già assegnate`}
              color="primary"
              variant="outlined"
              size="small"
              sx={{ mt: 0.5, height: '22px', '& .MuiChip-label': { fontSize: '0.7rem', px: 0.75 } }}
            />
          )}
        </Box>
        
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Cerca giocatore o farm..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ mb: 1 }}
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
        
        <FormControl fullWidth size="small" sx={{ mb: 1 }}>
          <InputLabel id="derby-select-label">Filtra per Derby</InputLabel>
          <Select
            labelId="derby-select-label"
            id="derby-select"
            value={selectedDerby}
            label="Filtra per Derby"
            onChange={(e) => handleDerbyChange(e.target.value)}
          >
            <MenuItem value="">
              <em>Tutti i Derby</em>
            </MenuItem>
            {derby.map((d) => (
              <MenuItem key={d.id} value={d.id}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      backgroundColor: d.colore || '#1976d2',
                      border: '1px solid #ddd'
                    }}
                  />
                  <Typography variant="body2">{d.nome}</Typography>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, mt: 0.5 }}>
          <FormControlLabel
            control={
              <Switch
                checked={mostraFarmInattive}
                onChange={(e) => setMostraFarmInattive(e.target.checked)}
                size="small"
              />
            }
            label={<Typography variant="body2" sx={{ fontSize: '0.8rem' }}>Mostra farm inattive</Typography>}
            sx={{ mr: 1 }}
          />
          
          {(searchQuery || selectedDerby || mostraFarmInattive) && (
            <Button 
              size="small" 
              onClick={handleResetFilters}
              variant="outlined"
              sx={{ fontSize: '0.75rem', py: 0.25, px: 1 }}
            >
              Resetta filtri
            </Button>
          )}
        </Box>
        
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", my: 2 }}>
            <CircularProgress size={24} />
          </Box>
        ) : giocatoriFiltrati.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", my: 1.5 }}>
            Nessun risultato trovato
          </Typography>
        ) : (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={areAllVisibleFarmsSelected()}
                    onChange={handleSelectAllVisibleFarms}
                    indeterminate={selectedFarmIds.length > 0 && !areAllVisibleFarmsSelected()}
                    size="small"
                    sx={{ p: 0.25, '& .MuiSvgIcon-root': { fontSize: '0.9rem' } }}
                  />
                }
                label={
                  <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                    Seleziona tutte ({selectedFarmIds.length}/{countVisibleFarms()})
                  </Typography>
                }
              />
            </Box>
            
            <List sx={{ 
              maxHeight: "400px", 
              overflow: "auto",
              p: 0.5,
              '&::-webkit-scrollbar': {
                width: '6px',
                height: '6px',
                display: 'none',
              },
              '&:hover::-webkit-scrollbar': {
                display: 'block',
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: 'rgba(0,0,0,0.05)',
                borderRadius: '10px',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: 'rgba(25, 118, 210, 0.5)',
                borderRadius: '10px',
                '&:hover': {
                  backgroundColor: 'rgba(25, 118, 210, 0.7)',
                },
              },
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(25, 118, 210, 0.5) rgba(0,0,0,0.05)',
              '& .MuiListItem-root': {
                borderRadius: '4px',
                transition: 'background-color 0.2s ease',
              }
            }}>
              {giocatoriFiltrati.map((giocatore) => {
                const farmsFiltrate = filteredFarms(giocatore.farms);
                if (farmsFiltrate.length === 0) return null;
                
                return (
                  <React.Fragment key={giocatore.id}>
                    <ListItem 
                      sx={{ 
                        bgcolor: "background.paper", 
                        py: 0.25, 
                        mt: 0.25, 
                        mb: 0,
                        borderRadius: '4px',
                        '&:hover': {
                          bgcolor: "rgba(25, 118, 210, 0.04)",
                        }
                      }}
                    >
                      <Checkbox
                        checked={areAllPlayerFarmsSelected(giocatore.id)}
                        onChange={() => handleSelectAllFarmsOfPlayer(giocatore.id)}
                        indeterminate={
                          farmsFiltrate.some(farm => selectedFarmIds.includes(farm.id)) && 
                          !areAllPlayerFarmsSelected(giocatore.id)
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
                            {giocatore.nome}
                          </Typography>
                        }
                      />
                    </ListItem>
                    
                    {farmsFiltrate.map((farm) => (
                      <Box
                        key={farm.id}
                        onClick={() => handleToggleFarm(farm.id)}
                        sx={{
                          pl: 0.5,
                          borderLeft: "1px solid rgba(0, 0, 0, 0.12)",
                          ml: 2,
                          display: 'flex',
                          alignItems: 'center',
                          py: 0.25,
                          mb: 0.25,
                          cursor: 'pointer',
                          bgcolor: selectedFarmIds.includes(farm.id) ? "rgba(25, 118, 210, 0.08)" : 'transparent',
                          '&:hover': {
                            bgcolor: selectedFarmIds.includes(farm.id) ? "rgba(25, 118, 210, 0.12)" : "rgba(0, 0, 0, 0.04)",
                          },
                          filter: farm.stato === "inattivo" ? "grayscale(100%)" : "none",
                        }}
                      >
                        <Checkbox
                          checked={selectedFarmIds.includes(farm.id)}
                          onChange={() => handleToggleFarm(farm.id)}
                          onClick={(e) => e.stopPropagation()}
                          size="small"
                          sx={{ p: 0.25, '& .MuiSvgIcon-root': { fontSize: '0.9rem' } }}
                        />
                        <Avatar 
                          sx={{ 
                            bgcolor: 'rgb(33, 150, 243, 0.1)',
                            color: 'rgb(33, 150, 243)',
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
                          <Typography variant="body2">{farm.nome}</Typography>
                        </Box>
                      </Box>
                    ))}
                    
                    <Divider component="li" sx={{ my: 0.25 }} />
                  </React.Fragment>
                );
              })}
            </List>
          </>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Annulla
        </Button>
        <Button 
          onClick={handleConfirm} 
          color="primary" 
          variant="contained"
          disabled={selectedFarmIds.length === 0}
        >
          Assegna ({selectedFarmIds.length})
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DialogoSelezioneFarm; 