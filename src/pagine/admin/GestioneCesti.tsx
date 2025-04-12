import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Typography,
  Alert,
  Snackbar,
  Grid,
  Avatar,
  Stack,
  useTheme,
  useMediaQuery,
  TextField,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  ListItemAvatar,
  Card,
  CardContent,
  CardActions,
  Autocomplete,
  Tabs,
  Tab,
  MenuItem,
  Menu,
  ListItemIcon,
  FormControl,
  InputLabel,
  OutlinedInput,
  Select,
  Checkbox,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Collapse,
  InputAdornment
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import RemoveIcon from '@mui/icons-material/Remove';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import Layout from '../../componenti/layout/Layout';
import { collection, getDocs, doc, setDoc, deleteDoc, query, where } from 'firebase/firestore'
import { 
  getDocWithRateLimit, 
  getDocsWithRateLimit, 
  setDocWithRateLimit,
  updateDocWithRateLimit,
  deleteDocWithRateLimit,
  addDocWithRateLimit
} from '../../configurazione/firebase';;
import { db } from '../../configurazione/firebase';
import { Cesto, Incarico } from '../../tipi/incarico';
import { ElementoCitta } from '../../tipi/citta';
import { Derby } from '../../tipi/derby';

// Tipo per la tab attiva nel selettore
type TipoSelezione = 'incarichi' | 'visitatori';

// Interfaccia per il form
interface CestoForm {
  nome: string;
  incarichi: {
    incarico_id: string;
    quantita: number;
    quantita_derby?: Record<string, number>;
  }[];
  derby_tags: string[];
}

// Form iniziale vuoto
const formIniziale: CestoForm = {
  nome: '',
  incarichi: [],
  derby_tags: []
};

export default function GestioneCesti() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [cesti, setCesti] = useState<Cesto[]>([]);
  const [incarichi, setIncarichi] = useState<Incarico[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingCesto, setEditingCesto] = useState<Cesto | null>(null);
  const [formData, setFormData] = useState<CestoForm>(formIniziale);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [selectedIncarico, setSelectedIncarico] = useState<Incarico | null>(null);
  const [selectedElemento, setSelectedElemento] = useState<ElementoCitta | null>(null);
  const [quantita, setQuantita] = useState<number>(1);
  const [elementiCitta, setElementiCitta] = useState<ElementoCitta[]>([]);
  const [tipoSelezione, setTipoSelezione] = useState<TipoSelezione>('incarichi');
  const [derby, setDerby] = useState<Derby[]>([]);
  const [anchorEl, setAnchorEl] = useState<{ id: string, element: HTMLElement } | null>(null);
  const [expandedQuantita, setExpandedQuantita] = useState<string[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Effetto per il focus automatico
  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [searchOpen]);

  // Funzione per la ricerca
  const matchSearch = useCallback((text: string): boolean => {
    if (!searchQuery) return true;
    return text.toLowerCase().includes(searchQuery.toLowerCase());
  }, [searchQuery]);

  // Filtra i cesti in base alla ricerca
  const cestiFiltrati = useMemo(() => {
    if (!searchQuery) return cesti;
    return cesti.filter(cesto => matchSearch(cesto.nome));
  }, [cesti, searchQuery, matchSearch]);

  // Carica i cesti dal database
  const caricaCesti = async () => {
    try {
      const querySnapshot = await getDocsWithRateLimit(collection(db, 'cesti'));
      const cestiData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Cesto[];

      // Ordina i cesti per livello
      const cestiOrdinati = cestiData.sort((a, b) => {
        const livelloA = calcolaLivelloCesto(a.incarichi);
        const livelloB = calcolaLivelloCesto(b.incarichi);
        return livelloA - livelloB;
      });

      setCesti(cestiOrdinati);
    } catch (error) {
      console.error('Errore nel caricamento dei cesti:', error);
      setError('Errore nel caricamento dei cesti');
    }
  };

  // Carica gli incarichi dal database
  const caricaIncarichi = async () => {
    try {
      const querySnapshot = await getDocsWithRateLimit(collection(db, 'incarichi'));
      const incarichiData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Incarico[];
      setIncarichi(incarichiData);
    } catch (error) {
      console.error('Errore nel caricamento degli incarichi:', error);
    }
  };

  // Carica gli elementi città (visitatori)
  const caricaElementiCitta = async () => {
    try {
      const querySnapshot = await getDocsWithRateLimit(
        query(
          collection(db, 'incarichi_citta'),
          where('tipo', '==', 'visitatore'),
          where('usato_in_cesti', '==', true)
        )
      );
      const elementiData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ElementoCitta[];
      setElementiCitta(elementiData);
    } catch (error) {
      console.error('Errore nel caricamento dei visitatori:', error);
    }
  };

  // Carica i derby dal database
  const caricaDerby = async () => {
    try {
      const derbySnapshot = await getDocsWithRateLimit(collection(db, 'derby'));
      const derbyData = derbySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Derby[];
      setDerby(derbyData);
    } catch (error) {
      console.error('Errore nel caricamento dei derby:', error);
      setError('Errore nel caricamento dei derby');
    }
  };

  useEffect(() => {
    caricaCesti();
    caricaIncarichi();
    caricaElementiCitta();
    caricaDerby();
  }, []);

  const handleAddCesto = () => {
    setEditingCesto(null);
    setFormData(formIniziale);
    setOpenDialog(true);
  };

  const handleEditCesto = (cesto: Cesto) => {
    setEditingCesto(cesto);
    setFormData({
      nome: cesto.nome,
      incarichi: cesto.incarichi,
      derby_tags: cesto.derby_tags,
    });
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setFormData(formIniziale);
    setEditingCesto(null);
    setSelectedIncarico(null);
    setSelectedElemento(null);
    setQuantita(1);
  };

  const handleAddIncarico = () => {
    if (!selectedIncarico && !selectedElemento) return;

    // Se è selezionato un visitatore, lo trattiamo come un incarico
    const elementoId = selectedIncarico?.id || selectedElemento?.id;
    if (!elementoId) return;

    const incaricoEsistente = formData.incarichi.find(
      i => i.incarico_id === elementoId
    );

    if (incaricoEsistente) {
      setError('Questo elemento è già presente nel cesto');
      return;
    }

    // Prepara le quantità per derby se disponibili
    const quantita_derby: Record<string, number> = {};
    if (selectedIncarico?.quantita_derby) {
      derby.forEach(d => {
        if (selectedIncarico.quantita_derby?.[d.id]) {
          quantita_derby[d.id] = selectedIncarico.quantita_derby[d.id];
        }
      });
    }

    setFormData({
      ...formData,
      incarichi: [
        {
          incarico_id: elementoId,
          quantita: quantita,
          ...(Object.keys(quantita_derby).length > 0 && { quantita_derby })
        },
        ...formData.incarichi, // Aggiungo gli incarichi esistenti dopo il nuovo
      ],
    });

    setSelectedIncarico(null);
    setSelectedElemento(null);
    setQuantita(1);
  };

  const handleRemoveIncarico = (incaricoId: string) => {
    setFormData({
      ...formData,
      incarichi: formData.incarichi.filter(i => i.incarico_id !== incaricoId),
    });
  };

  const handleUpdateQuantita = (incaricoId: string, nuovaQuantita: number) => {
    setFormData({
      ...formData,
      incarichi: formData.incarichi.map(inc => 
        inc.incarico_id === incaricoId 
          ? { ...inc, quantita: nuovaQuantita }
          : inc
      ),
    });
  };

  const handleSave = async () => {
    try {
      if (!formData.nome) {
        setError('Il nome è obbligatorio');
        return;
      }

      if (formData.incarichi.length === 0) {
        setError('Aggiungi almeno un incarico al cesto');
        return;
      }

      const cestoData = {
        ...formData,
        id: editingCesto?.id || crypto.randomUUID(),
        derby_tags: formData.derby_tags || []  // Assicuriamoci che derby_tags sia sempre un array
      };

      // Salva il cesto nel database
      await setDocWithRateLimit(doc(db, 'cesti', cestoData.id), cestoData);

      setSuccess(editingCesto ? 'Cesto aggiornato con successo!' : 'Cesto creato con successo!');
      handleCloseDialog();
      caricaCesti();
    } catch (error) {
      console.error('Errore nel salvataggio:', error);
      setError('Errore nel salvataggio del cesto');
    }
  };

  const getIncaricoById = (id: string) => {
    const incarico = incarichi.find(i => i.id === id);
    if (incarico) return incarico;

    // Se non è un incarico standard, cerca tra i visitatori
    const visitatore = elementiCitta.find(e => e.id === id);
    if (visitatore) {
      return {
        id: visitatore.id,
        nome: visitatore.nome,
        quantita: 0, // Non rilevante per i visitatori nel cesto
        livello_minimo: visitatore.livello_minimo,
        immagine: visitatore.immagine,
        edificio_id: null,
        is_obbligatorio: false,
        usato_in_cesti: true
      };
    }
    return undefined;
  };

  // Calcola il livello del cesto
  const calcolaLivelloCesto = (incarichiIds: { incarico_id: string }[]) => {
    return Math.max(
      1, // Livello minimo di default
      ...incarichiIds
        .map(inc => getIncaricoById(inc.incarico_id)?.livello_minimo || 0)
    );
  };

  // Filtra gli incarichi disponibili (non ancora selezionati e usati nei cesti)
  const incarichiDisponibili = useMemo(() => {
    return incarichi
      .filter(incarico => 
        // Solo incarichi usati nei cesti
        incarico.usato_in_cesti &&
        // Non già selezionati nel cesto corrente
        !formData.incarichi.some(i => i.incarico_id === incarico.id)
      )
      .sort((a, b) => a.livello_minimo - b.livello_minimo);
  }, [incarichi, formData.incarichi]);

  // Filtra gli elementi città disponibili (non ancora selezionati)
  const elementiCittaDisponibili = useMemo(() => {
    return elementiCitta
      .filter(elemento => 
        // Non già selezionati nel cesto corrente
        !formData.incarichi.some(i => i.incarico_id === elemento.id)
      )
      .sort((a, b) => a.livello_minimo - b.livello_minimo);
  }, [elementiCitta, formData.incarichi]);

  const toggleQuantitaExpanded = (incaricoId: string) => {
    setExpandedQuantita(prev => 
      prev.includes(incaricoId) 
        ? prev.filter(id => id !== incaricoId)
        : [...prev, incaricoId]
    );
  };

  const renderCestoCard = (cesto: Cesto) => {
    // Calcola il livello del cesto
    const livelloCesto = calcolaLivelloCesto(cesto.incarichi);

    return (
      <Card key={cesto.id} sx={{ 
        mb: 1, 
        '& .MuiCardContent-root:last-child': { pb: 0 }  // Rimuove il padding bottom dell'ultimo elemento
      }}>
        <CardContent sx={{ 
          p: 0,
          '&:last-child': { pb: 0 }  // Rimuove il padding bottom
        }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center',
            position: 'relative',
            pl: 3,  // Spazio per la strisciolina del livello
            minHeight: 48  // Altezza minima fissa per la riga
          }}>
            {/* Strisciolina del livello */}
            <Box
              sx={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: '24px',
                bgcolor: 'rgb(33, 150, 243, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Typography 
                sx={{ 
                  fontSize: '0.75rem',
                  fontStyle: 'italic',
                  color: 'rgb(33, 150, 243)',
                  width: '3ch',
                  textAlign: 'center'
                }}
              >
                {livelloCesto}
              </Typography>
            </Box>

            {/* Contenuto principale */}
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center',
              width: '100%',
              p: 1
            }}>
              {/* Immagini incarichi con quantità */}
              <Box sx={{ display: 'flex', gap: 0.5, mr: 2 }}>
                {cesto.incarichi.map(({ incarico_id, quantita }) => {
                  const incarico = getIncaricoById(incarico_id);
                  if (!incarico) return null;

                  return (
                    <Box key={incarico_id} sx={{ position: 'relative' }}>
                      <Avatar
                        src={incarico.immagine}
                        variant="rounded"
                        sx={{ 
                          width: 32, 
                          height: 32
                        }}
                      >
                        {incarico.nome.charAt(0)}
                      </Avatar>
                      <Typography
                        variant="caption"
                        sx={{ 
                          position: 'absolute',
                          bottom: -8,
                          right: -8,
                          bgcolor: 'background.paper',
                          border: 1,
                          borderColor: 'divider',
                          borderRadius: 1,
                          px: 0.5,
                          fontSize: '0.75rem'
                        }}
                      >
                        x{quantita}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>

              {/* Nome cesto */}
              <Box sx={{ 
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                flexGrow: 1
              }}>
                <Box>
                  <Typography
                    variant="body2"
                    sx={{ 
                      wordBreak: 'break-word',
                      lineHeight: 1.1,
                      fontSize: '0.875rem'
                    }}
                  >
                    {cesto.nome}
                  </Typography>
                  {/* Aggiungo i derby tags */}
                  <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                    {cesto.derby_tags?.map(tagId => {
                      const derbyInfo = derby.find(d => d.id === tagId);
                      if (!derbyInfo) return null;
                      return (
                        <Chip 
                          key={tagId}
                          label={derbyInfo.nome}
                          size="small"
                          sx={{ 
                            height: 16,
                            fontSize: '0.625rem',
                            bgcolor: derbyInfo.colore || '#666',
                            color: 'white',
                            '& .MuiChip-label': { px: 1 }
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
                    setAnchorEl({ id: cesto.id, element: event.currentTarget });
                  }}
                  sx={{ 
                    ml: 'auto',
                    width: 28,
                    height: 28,
                    color: 'text.secondary'
                  }}
                >
                  <MoreVertIcon sx={{ fontSize: 20 }} />
                </IconButton>
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>
    );
  };

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        {/* Contatore cesti */}
        <Box 
          sx={{ 
            mb: 3,
            p: 2,
            bgcolor: 'rgba(33, 150, 243, 0.04)',
            borderRadius: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}
        >
          <Typography 
            variant="body2" 
            color="text.secondary"
            sx={{ 
              fontSize: '0.875rem',
              fontWeight: 500
            }}
          >
            TOTALE CESTI:
          </Typography>
          <Typography 
            sx={{ 
              fontSize: '0.875rem',
              fontWeight: 700,
              color: 'primary.main'
            }}
          >
            {cestiFiltrati.length}
          </Typography>
        </Box>

        <Box sx={{ 
          mb: 2, 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1,
          position: 'sticky',
          top: 0,
          zIndex: 1,
          bgcolor: 'background.default',
          py: 1
        }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddCesto}
          >
            NUOVO CESTO
          </Button>

          <IconButton
            onClick={() => setSearchOpen(!searchOpen)}
            color={searchOpen ? 'primary' : 'default'}
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
              placeholder="Cerca cesti..."
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
                        setSearchQuery('');
                        searchInputRef.current?.focus();
                      }}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
          </Collapse>
        </Box>

        {/* Lista dei cesti */}
        <Grid container spacing={2}>
          <Grid item xs={12}>
            {cestiFiltrati.map(renderCestoCard)}
          </Grid>
        </Grid>

        {/* Menu per Modifica/Elimina */}
        <Menu
          anchorEl={anchorEl?.element}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
        >
          <MenuItem onClick={() => {
            if (anchorEl) {
              const cesto = cesti.find(c => c.id === anchorEl.id);
              if (cesto) {
                handleEditCesto(cesto);
                setAnchorEl(null);
              }
            }
          }}>
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Modifica</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => {
            if (anchorEl && window.confirm('Sei sicuro di voler eliminare questo cesto?')) {
              deleteDocWithRateLimit(doc(db, 'cesti', anchorEl.id));
              caricaCesti();
              setAnchorEl(null);
            }
          }}>
            <ListItemIcon>
              <DeleteIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText sx={{ color: 'error.main' }}>Elimina</ListItemText>
          </MenuItem>
        </Menu>

        {/* Dialog per creazione/modifica cesto */}
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
          <DialogTitle>
            {editingCesto ? 'Modifica Cesto' : 'Nuovo Cesto'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Nome Cesto"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                />
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom component="div">
                  Incarichi nel Cesto
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Grid container spacing={2} alignItems="flex-end">
                    <Grid item xs={12} md={9}>
                      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                        <Tabs 
                          value={tipoSelezione} 
                          onChange={(_, newValue: TipoSelezione) => setTipoSelezione(newValue)}
                        >
                          <Tab label="Incarichi Standard" value="incarichi" />
                          <Tab label="Visitatori Città" value="visitatori" />
                        </Tabs>
                      </Box>

                      {tipoSelezione === 'incarichi' ? (
                        <Autocomplete
                          value={selectedIncarico}
                          onChange={(event, newValue) => {
                            setSelectedIncarico(newValue);
                          }}
                          options={incarichiDisponibili}
                          getOptionLabel={(option) => `${option.nome} (Liv. ${option.livello_minimo})`}
                          renderOption={(props, incarico) => (
                            <Typography
                              component="li"
                              {...props}
                              key={incarico.id}
                              sx={{
                                display: 'flex !important',
                                alignItems: 'center',
                                gap: 1,
                                p: 1
                              }}
                            >
                              <Avatar 
                                src={incarico.immagine} 
                                variant="rounded" 
                                sx={{ width: 32, height: 32, flexShrink: 0 }}
                              >
                                {incarico.nome.charAt(0)}
                              </Avatar>
                              {incarico.nome} - Liv. {incarico.livello_minimo}
                            </Typography>
                          )}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Seleziona Incarico"
                              fullWidth
                            />
                          )}
                          isOptionEqualToValue={(option, value) => option.id === value.id}
                          noOptionsText="Nessun incarico disponibile"
                        />
                      ) : (
                        <Autocomplete
                          value={selectedElemento}
                          onChange={(event, newValue) => {
                            setSelectedElemento(newValue);
                          }}
                          options={elementiCittaDisponibili}
                          getOptionLabel={(option) => `${option.nome} (Liv. ${option.livello_minimo})`}
                          renderOption={(props, elemento) => (
                            <Typography
                              component="li"
                              {...props}
                              key={elemento.id}
                              sx={{
                                display: 'flex !important',
                                alignItems: 'center',
                                gap: 1,
                                p: 1
                              }}
                            >
                              <Avatar 
                                src={elemento.immagine} 
                                variant="rounded" 
                                sx={{ width: 32, height: 32, flexShrink: 0 }}
                              >
                                {elemento.nome.charAt(0)}
                              </Avatar>
                              {elemento.nome} - Liv. {elemento.livello_minimo}
                            </Typography>
                          )}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Seleziona Visitatore"
                              fullWidth
                            />
                          )}
                          isOptionEqualToValue={(option, value) => option.id === value.id}
                          noOptionsText="Nessun visitatore disponibile"
                        />
                      )}
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <Button
                        fullWidth
                        variant="contained"
                        onClick={handleAddIncarico}
                        disabled={!selectedIncarico && !selectedElemento}
                      >
                        Aggiungi
                      </Button>
                    </Grid>
                  </Grid>
                </Box>

                {/* Lista degli incarichi già nel cesto */}
                <Grid item xs={12}>
                  <Box sx={{ mt: 2 }}>
                    {formData.incarichi.map(({ incarico_id, quantita, quantita_derby }) => {
                      const incarico = getIncaricoById(incarico_id);
                      if (!incarico) return null;

                      return (
                        <Box
                          key={incarico_id}
                          sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 2,
                            mb: 2,
                            p: 2,
                            bgcolor: 'background.paper',
                            borderRadius: 1,
                            boxShadow: 1
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Avatar src={incarico.immagine} variant="rounded">
                                {incarico.nome.charAt(0)}
                              </Avatar>
                              <Box>
                                <Typography>{incarico.nome}</Typography>
                                <Chip 
                                  size="small" 
                                  label={`Liv. ${incarico.livello_minimo}`} 
                                  color="secondary" 
                                  variant="outlined"
                                  sx={{ mt: 1 }}
                                />
                              </Box>
                            </Box>
                            <IconButton 
                              color="error" 
                              onClick={() => handleRemoveIncarico(incarico_id)}
                            >
                              <RemoveIcon />
                            </IconButton>
                          </Box>

                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                            <TextField
                              type="number"
                              size="small"
                              label="Quantità Standard"
                              value={quantita === 0 ? '' : quantita}
                              onChange={(e) => {
                                const value = e.target.value === '' ? 0 : parseInt(e.target.value);
                                if (!isNaN(value)) {
                                  handleUpdateQuantita(incarico_id, value);
                                }
                              }}
                              InputProps={{ 
                                inputProps: { min: 0 }
                              }}
                            />

                            {/* Quantità per Derby in Accordion */}
                            <Accordion
                              expanded={expandedQuantita.includes(incarico_id)}
                              onChange={() => toggleQuantitaExpanded(incarico_id)}
                              sx={{
                                '&:before': { display: 'none' },
                                boxShadow: 'none',
                                bgcolor: 'rgba(0, 0, 0, 0.02)',
                              }}
                            >
                              <AccordionSummary
                                expandIcon={<ExpandMoreIcon />}
                                sx={{
                                  minHeight: '40px',
                                  '& .MuiAccordionSummary-content': { margin: '8px 0' }
                                }}
                              >
                                <Typography variant="body2">Quantità per Derby</Typography>
                              </AccordionSummary>
                              <AccordionDetails sx={{ pt: 0 }}>
                                <Stack spacing={2}>
                                  {derby.map(d => (
                                    <TextField
                                      key={d.id}
                                      type="number"
                                      size="small"
                                      label={`Quantità per ${d.nome}`}
                                      value={(quantita_derby?.[d.id] === 0 || !quantita_derby?.[d.id]) ? '' : (quantita_derby?.[d.id] || quantita)}
                                      onChange={(e) => {
                                        const value = e.target.value === '' ? 0 : parseInt(e.target.value);
                                        if (!isNaN(value)) {
                                          const updatedIncarichi = formData.incarichi.map(inc => {
                                            if (inc.incarico_id === incarico_id) {
                                              return {
                                                ...inc,
                                                quantita_derby: {
                                                  ...(inc.quantita_derby || {}),
                                                  [d.id]: value
                                                }
                                              };
                                            }
                                            return inc;
                                          });
                                          setFormData({
                                            ...formData,
                                            incarichi: updatedIncarichi
                                          });
                                        }
                                      }}
                                      InputProps={{ 
                                        inputProps: { min: 0 }
                                      }}
                                    />
                                  ))}
                                </Stack>
                              </AccordionDetails>
                            </Accordion>
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                </Grid>

                {/* Aggiungo il selettore dei Derby Tags */}
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
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {selected.map((value) => {
                            const derbyInfo = derby.find(d => d.id === value);
                            return (
                              <Chip
                                key={value}
                                label={derbyInfo?.nome}
                                size="small"
                                sx={{ 
                                  bgcolor: derbyInfo?.colore || '#666',
                                  color: 'white'
                                }}
                              />
                            );
                          })}
                        </Box>
                      )}
                    >
                      {derby.map((d) => (
                        <MenuItem key={d.id} value={d.id}>
                          <Checkbox checked={formData.derby_tags.indexOf(d.id) > -1} />
                          <Box
                            component="span"
                            sx={{
                              width: 14,
                              height: 14,
                              mr: 1,
                              borderRadius: '50%',
                              display: 'inline-block',
                              bgcolor: d.colore || '#666'
                            }}
                          />
                          {d.nome}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Annulla</Button>
            <Button onClick={handleSave} variant="contained" color="primary">
              Salva
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
}