import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Checkbox,
  List,
  ListItem,
  ListItemText,
  FormControlLabel,
  FormGroup,
  Divider,
  InputAdornment,
  IconButton,
  Paper,
  Alert,
  Tabs,
  Tab
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import { PresetAssegnazioni } from '../../../../tipi/preset';
import { creaPreset, aggiornaPreset } from '../../../../servizi/presetsService';
import { Incarico, IncaricoCitta } from '../../../../tipi/incarico';
import { Cesto } from '../../../../tipi/cesto';
import { Edificio } from '../../../../tipi/edificio';

// Interfaccia per il pannello di tab
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
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      style={{ width: '100%' }}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 2 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

interface DialogoGestionePresetProps {
  open: boolean;
  onClose: () => void;
  onSalva: (nome: string, descrizione: string, incarichi: string[]) => void;
  preset?: PresetAssegnazioni | null;
  incarichiDisponibili?: Incarico[];
  incarichiCittaDisponibili?: IncaricoCitta[];
  cestiDisponibili?: Cesto[];
  edifici?: Edificio[];
}

const DialogoGestionePreset: React.FC<DialogoGestionePresetProps> = ({
  open,
  onClose,
  onSalva,
  preset = null,
  incarichiDisponibili = [],
  incarichiCittaDisponibili = [],
  cestiDisponibili = [],
  edifici = []
}) => {
  const [nome, setNome] = useState('');
  const [descrizione, setDescrizione] = useState('');
  const [incarichiSelezionati, setIncarichiSelezionati] = useState<string[]>([]);
  const [filtroIncarichi, setFiltroIncarichi] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [ordinamentoAlfabetico, setOrdinamentoAlfabetico] = useState(true);
  
  // Gestione cambio tab
  const handleChangeTab = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  // Toggle ordinamento
  const toggleOrdinamento = () => {
    setOrdinamentoAlfabetico(prev => !prev);
  };
  
  // Reset del form quando si apre il dialogo o cambia il preset
  useEffect(() => {
    if (open) {
      console.log("Incarichi disponibili:", incarichiDisponibili.length, incarichiDisponibili);
      console.log("Incarichi città disponibili:", incarichiCittaDisponibili.length, incarichiCittaDisponibili);
      console.log("Cesti disponibili:", cestiDisponibili.length, cestiDisponibili);
      
      const totaleDisponibili = incarichiDisponibili.length + incarichiCittaDisponibili.length + cestiDisponibili.length;
      if (totaleDisponibili === 0) {
        setErrorMessage("Nessun incarico disponibile. Verifica che gli incarichi siano stati caricati correttamente.");
      } else {
        setErrorMessage(null);
      }
      
      if (preset) {
        console.log("Impostazione dati preset:", preset);
        setNome(preset.nome);
        setDescrizione(preset.descrizione || '');
        setIncarichiSelezionati([...preset.incarichi]);
      } else {
        setNome('');
        setDescrizione('');
        setIncarichiSelezionati([]);
      }
      
      // Reset del filtro
      setFiltroIncarichi('');
      // Reset del tab selezionato
      setTabValue(0);
    }
  }, [open, preset, incarichiDisponibili, incarichiCittaDisponibili, cestiDisponibili]);
  
  // Funzione per ottenere il nome dell'edificio dato l'ID
  const getNomeEdificio = (edificioId: string | null): string => {
    if (!edificioId) return "Edificio sconosciuto";
    const edificio = edifici.find(e => e.id === edificioId);
    return edificio ? edificio.nome : edificioId;
  };
  
  const handleToggleIncarico = (incaricoId: string) => {
    setIncarichiSelezionati(prev => 
      prev.includes(incaricoId)
        ? prev.filter(id => id !== incaricoId)
        : [...prev, incaricoId]
    );
  };
  
  const handleSelectAll = (tipo: 'incarichi' | 'citta' | 'cesti') => {
    let elementiDisponibili: any[] = [];
    
    switch(tipo) {
      case 'incarichi':
        elementiDisponibili = incarichiDisponibili;
        break;
      case 'citta':
        elementiDisponibili = incarichiCittaDisponibili;
        break;
      case 'cesti':
        elementiDisponibili = cestiDisponibili;
        break;
    }
    
    // Assicuriamoci che elementiDisponibili sia definito
    if (!elementiDisponibili || elementiDisponibili.length === 0) {
      console.warn(`Impossibile selezionare: ${tipo} è vuoto o undefined`);
      return;
    }
    
    const elementiFiltrati = elementiDisponibili
      .filter(elemento => 
        elemento.nome.toLowerCase().includes(filtroIncarichi.toLowerCase()))
      .map(elemento => elemento.id);
      
    // Se tutti gli elementi filtrati sono già selezionati, deseleziona tutti
    const tuttiSelezionati = elementiFiltrati.every(id => incarichiSelezionati.includes(id));
    
    if (tuttiSelezionati) {
      // Deseleziona solo gli elementi che sono nel filtro attuale
      setIncarichiSelezionati(prev => prev.filter(id => !elementiFiltrati.includes(id)));
    } else {
      // Aggiungi solo gli elementi che non sono già selezionati
      setIncarichiSelezionati(prev => {
        const nuoviSelezionati = new Set([...prev]);
        elementiFiltrati.forEach(id => nuoviSelezionati.add(id));
        return Array.from(nuoviSelezionati);
      });
    }
  };
  
  const handleSubmit = () => {
    if (!nome.trim()) {
      setErrorMessage("Il nome del preset è obbligatorio");
      return;
    }
    
    if (incarichiSelezionati.length === 0) {
      setErrorMessage("Seleziona almeno un incarico");
      return;
    }
    
    console.log("Salvataggio preset:", {
      nome,
      descrizione,
      incarichi: incarichiSelezionati,
      isModifica: !!preset
    });
    
    onSalva(nome, descrizione, incarichiSelezionati);
  };
  
  // Filtra gli incarichi disponibili in base al testo di ricerca
  const incarichiFiltrati = incarichiDisponibili && incarichiDisponibili.length > 0
    ? incarichiDisponibili
        .filter(incarico => incarico.nome.toLowerCase().includes(filtroIncarichi.toLowerCase()))
        .sort((a, b) => {
          if (ordinamentoAlfabetico) {
            return a.nome.localeCompare(b.nome);
          } else {
            if (a.livello_minimo !== b.livello_minimo) {
              return a.livello_minimo - b.livello_minimo;
            }
            return a.nome.localeCompare(b.nome);
          }
        })
    : [];
    
  // Filtra gli incarichi città disponibili in base al testo di ricerca
  const incarichiCittaFiltrati = incarichiCittaDisponibili && incarichiCittaDisponibili.length > 0
    ? incarichiCittaDisponibili
        .filter(incarico => incarico.nome.toLowerCase().includes(filtroIncarichi.toLowerCase()))
        .sort((a, b) => {
          if (ordinamentoAlfabetico) {
            return a.nome.localeCompare(b.nome);
          } else {
            if (a.livello_minimo !== b.livello_minimo) {
              return a.livello_minimo - b.livello_minimo;
            }
            return a.nome.localeCompare(b.nome);
          }
        })
    : [];
    
  // Filtra i cesti disponibili in base al testo di ricerca
  const cestiFiltrati = cestiDisponibili && cestiDisponibili.length > 0
    ? cestiDisponibili
        .filter(cesto => cesto.nome.toLowerCase().includes(filtroIncarichi.toLowerCase()))
        .sort((a, b) => {
          if (ordinamentoAlfabetico) {
            return a.nome.localeCompare(b.nome);
          } else {
            return a.nome.localeCompare(b.nome);
          }
        })
    : [];
    
  // Controlla se tutti gli elementi filtrati sono selezionati
  const tuttiSelezionatiIncarichi = incarichiFiltrati.length > 0 && 
    incarichiFiltrati.every(incarico => incarichiSelezionati.includes(incarico.id));
    
  const tuttiSelezionatiCitta = incarichiCittaFiltrati.length > 0 && 
    incarichiCittaFiltrati.every(incarico => incarichiSelezionati.includes(incarico.id));
    
  const tuttiSelezionatiCesti = cestiFiltrati.length > 0 && 
    cestiFiltrati.every(cesto => incarichiSelezionati.includes(cesto.id));
  
  // Conteggio totale degli elementi selezionati divisi per tipo
  const conteggioSelezionati = {
    incarichi: incarichiDisponibili.filter(i => incarichiSelezionati.includes(i.id)).length,
    citta: incarichiCittaDisponibili.filter(i => incarichiSelezionati.includes(i.id)).length,
    cesti: cestiDisponibili.filter(i => incarichiSelezionati.includes(i.id)).length,
    totale: incarichiSelezionati.length
  };
  
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {preset ? 'Modifica preset' : 'Crea nuovo preset'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Nome preset"
            fullWidth
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
            autoFocus
          />
          
          <TextField
            label="Descrizione (opzionale)"
            fullWidth
            value={descrizione}
            onChange={(e) => setDescrizione(e.target.value)}
            multiline
            rows={2}
          />
          
          <Divider sx={{ my: 1 }} />
          
          {errorMessage && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {errorMessage}
            </Alert>
          )}
          
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Seleziona incarichi da includere nel preset ({conteggioSelezionati.totale} selezionati)
            </Typography>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <TextField
                placeholder="Cerca incarichi..."
                variant="outlined"
                size="small"
                value={filtroIncarichi}
                onChange={(e) => setFiltroIncarichi(e.target.value)}
                sx={{ mb: 1, width: '60%' }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                  endAdornment: filtroIncarichi ? (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => setFiltroIncarichi('')}
                        edge="end"
                      >
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ) : null,
                }}
              />

              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button 
                  onClick={toggleOrdinamento}
                  variant="outlined"
                  size="small"
                  color="info"
                >
                  {ordinamentoAlfabetico ? 'Ordina per livello' : 'Ordina alfabetico'}
                </Button>
                
                <Button 
                  onClick={() => handleSelectAll(tabValue === 0 ? 'incarichi' : tabValue === 1 ? 'citta' : 'cesti')}
                  variant="outlined"
                  size="small"
                  disabled={(tabValue === 0 && incarichiFiltrati.length === 0) || 
                           (tabValue === 1 && incarichiCittaFiltrati.length === 0) || 
                           (tabValue === 2 && cestiFiltrati.length === 0)}
                >
                  {(tabValue === 0 && tuttiSelezionatiIncarichi) || 
                   (tabValue === 1 && tuttiSelezionatiCitta) || 
                   (tabValue === 2 && tuttiSelezionatiCesti) 
                    ? 'Deseleziona tutti' : 'Seleziona tutti'}
                </Button>
              </Box>
            </Box>
            
            {/* Tab per selezionare i diversi tipi di incarichi */}
            <Tabs 
              value={tabValue} 
              onChange={handleChangeTab}
              variant="fullWidth"
              sx={{ 
                borderBottom: 1, 
                borderColor: 'divider', 
                mb: 2,
                '& .MuiTab-root': {
                  textTransform: 'none',
                  minWidth: 100
                }
              }}
            >
              <Tab 
                label={`INCARICHI (${conteggioSelezionati.incarichi}/${incarichiDisponibili.length})`} 
                id="tab-0" 
                aria-controls="tabpanel-0" 
              />
              <Tab 
                label={`CITTÀ (${conteggioSelezionati.citta}/${incarichiCittaDisponibili.length})`} 
                id="tab-1" 
                aria-controls="tabpanel-1" 
              />
              <Tab 
                label={`CESTI (${conteggioSelezionati.cesti}/${cestiDisponibili.length})`} 
                id="tab-2" 
                aria-controls="tabpanel-2" 
              />
            </Tabs>
            
            {/* Contenuto dei tab */}
            <TabPanel value={tabValue} index={0}>
              {incarichiFiltrati.length === 0 ? (
                <Alert severity="info">
                  {incarichiDisponibili && incarichiDisponibili.length > 0 
                    ? 'Nessun incarico corrisponde ai criteri di ricerca.' 
                    : 'Nessun incarico disponibile. Verifica che gli incarichi siano stati caricati.'}
                </Alert>
              ) : (
                <List
                  sx={{
                    maxHeight: 300,
                    overflow: 'auto',
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                  }}
                >
                  {incarichiFiltrati.map((incarico) => (
                    <ListItem
                      key={incarico.id}
                      component="li"
                      disablePadding
                      sx={{
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        '&:last-child': {
                          borderBottom: 'none',
                        },
                      }}
                    >
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={incarichiSelezionati.includes(incarico.id)}
                            onChange={() => handleToggleIncarico(incarico.id)}
                            color="primary"
                          />
                        }
                        label={
                          <Box>
                            <Typography variant="body1">
                              {incarico.nome}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {getNomeEdificio(incarico.edificio_id)}
                              {incarico.livello_minimo > 0 && ` • Livello ${incarico.livello_minimo}`}
                            </Typography>
                          </Box>
                        }
                        sx={{ width: '100%', px: 1 }}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </TabPanel>
            
            <TabPanel value={tabValue} index={1}>
              {incarichiCittaFiltrati.length === 0 ? (
                <Alert severity="info">
                  {incarichiCittaDisponibili && incarichiCittaDisponibili.length > 0 
                    ? 'Nessun incarico città corrisponde ai criteri di ricerca.' 
                    : 'Nessun incarico città disponibile. Verifica che gli incarichi siano stati caricati.'}
                </Alert>
              ) : (
                <List
                  sx={{
                    maxHeight: 300,
                    overflow: 'auto',
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                  }}
                >
                  {incarichiCittaFiltrati.map((incarico) => (
                    <ListItem
                      key={incarico.id}
                      component="li"
                      disablePadding
                      sx={{
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        '&:last-child': {
                          borderBottom: 'none',
                        },
                      }}
                    >
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={incarichiSelezionati.includes(incarico.id)}
                            onChange={() => handleToggleIncarico(incarico.id)}
                            color="primary"
                          />
                        }
                        label={
                          <Box>
                            <Typography variant="body1">
                              {incarico.nome}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {incarico.livello_minimo > 0 && `Livello ${incarico.livello_minimo}`}
                            </Typography>
                          </Box>
                        }
                        sx={{ width: '100%', px: 1 }}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </TabPanel>
            
            <TabPanel value={tabValue} index={2}>
              {cestiFiltrati.length === 0 ? (
                <Alert severity="info">
                  {cestiDisponibili && cestiDisponibili.length > 0 
                    ? 'Nessun cesto corrisponde ai criteri di ricerca.' 
                    : 'Nessun cesto disponibile. Verifica che i cesti siano stati caricati.'}
                </Alert>
              ) : (
                <List
                  sx={{
                    maxHeight: 300,
                    overflow: 'auto',
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                  }}
                >
                  {cestiFiltrati.map((cesto) => (
                    <ListItem
                      key={cesto.id}
                      component="li"
                      disablePadding
                      sx={{
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        '&:last-child': {
                          borderBottom: 'none',
                        },
                      }}
                    >
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={incarichiSelezionati.includes(cesto.id)}
                            onChange={() => handleToggleIncarico(cesto.id)}
                            color="primary"
                          />
                        }
                        label={
                          <Box>
                            <Typography variant="body1">
                              {cesto.nome}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {cesto.livello > 0 && `Livello ${cesto.livello}`}
                            </Typography>
                          </Box>
                        }
                        sx={{ width: '100%', px: 1 }}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </TabPanel>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">Annulla</Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          color="primary"
          disabled={!nome.trim() || incarichiSelezionati.length === 0}
        >
          Salva
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DialogoGestionePreset; 