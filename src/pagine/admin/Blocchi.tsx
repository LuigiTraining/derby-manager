import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Menu,
  MenuItem,
  ListSubheader,
  Divider,
  Chip,
  Avatar,
  Grid,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CloseIcon from '@mui/icons-material/Close';
import Layout from '../../componenti/layout/Layout';
import { collection, query, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../configurazione/firebase';
import { Farm } from '../../tipi/giocatore';
import { Derby } from '../../tipi/derby';
import UploadImmagine from '../../componenti/comune/UploadImmagine';
import { useAuth } from '../../componenti/autenticazione/AuthContext';

// Interfaccia per il tipo Blocco
interface Blocco {
  id: string;
  nome: string;
  immagine: string;
  farms: {
    farm_id: string;
    giocatore_nome: string;
    farm_nome: string;
  }[];
}

export default function Blocchi() {
  // Stati
  const [blocchi, setBlocchi] = useState<Blocco[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [derby, setDerby] = useState<Derby[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingBlocco, setEditingBlocco] = useState<Blocco | null>(null);
  const [nuovoBlocco, setNuovoBlocco] = useState({
    nome: '',
    immagine: '',
  });
  const [addMenuAnchor, setAddMenuAnchor] = useState<{
    bloccoId: string;
    element: HTMLElement;
  } | null>(null);
  const [actionMenuAnchor, setActionMenuAnchor] = useState<{
    bloccoId: string;
    element: HTMLElement;
  } | null>(null);

  const { currentUser } = useAuth();
  const canManage = ['admin', 'coordinatore', 'moderatore'].includes(currentUser?.ruolo || '');

  // Carica i dati iniziali
  useEffect(() => {
    const caricaDati = async () => {
      try {
        // Carica i blocchi
        const blocchiQuery = query(collection(db, 'blocchi'));
        const blocchiSnapshot = await getDocs(blocchiQuery);
        const blocchiData = blocchiSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Blocco[];
        setBlocchi(blocchiData);

        // Carica i giocatori e le loro farm
        const giocatoriQuery = query(collection(db, 'utenti'));
        const giocatoriSnapshot = await getDocs(giocatoriQuery);
        const farmsData: Farm[] = [];
        
        giocatoriSnapshot.docs.forEach(doc => {
          const giocatore = doc.data();
          if (giocatore.ruolo !== 'admin' && giocatore.farms) {
            giocatore.farms.forEach((farm: any, index: number) => {
              const farmId = `${doc.id}_${index}`;
              farmsData.push({
                id: farmId,
                farmId: farmId,
                nome: farm.nome || 'Farm senza nome',
                livello: farm.livello || 1,
                isAttiva: farm.stato === 'attivo',
                diamanti: farm.diamanti || 0,
                immagine: farm.immagine || '',
                giocatore_id: doc.id,
                giocatore_nome: giocatore.nome || 'Giocatore senza nome',
                stato: farm.stato || 'attivo',
                principale: index === 0,
                derby_tags: farm.derby_tags || [],
              });
            });
          }
        });
        
        // Ordina le farm per nome del giocatore
        farmsData.sort((a, b) => {
          const nomeA = a.giocatore_nome || '';
          const nomeB = b.giocatore_nome || '';
          return nomeA.localeCompare(nomeB);
        });
        setFarms(farmsData);

        // Carica i derby
        const derbyQuery = query(collection(db, 'derby'));
        const derbySnapshot = await getDocs(derbyQuery);
        const derbyData = derbySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Derby[];
        setDerby(derbyData);
      } catch (error) {
        console.error('Errore nel caricamento dei dati:', error);
      }
    };

    caricaDati();
  }, []);

  // Gestione del form per nuovo blocco
  const handleSubmit = async () => {
    try {
      if (editingBlocco) {
        // Aggiorna blocco esistente
        await updateDoc(doc(db, 'blocchi', editingBlocco.id), {
          nome: nuovoBlocco.nome,
          immagine: nuovoBlocco.immagine,
        });

        setBlocchi(prev => prev.map(b => 
          b.id === editingBlocco.id 
            ? { ...b, nome: nuovoBlocco.nome, immagine: nuovoBlocco.immagine }
            : b
        ));
      } else {
        // Crea nuovo blocco
        const docRef = await addDoc(collection(db, 'blocchi'), {
          nome: nuovoBlocco.nome,
          immagine: nuovoBlocco.immagine || '',
          farms: [],
        });

        setBlocchi(prev => [...prev, {
          id: docRef.id,
          nome: nuovoBlocco.nome,
          immagine: nuovoBlocco.immagine || '',
          farms: [],
        }]);
      }

      handleCloseDialog();
    } catch (error) {
      console.error('Errore nel salvataggio del blocco:', error);
    }
  };

  // Gestione eliminazione blocco
  const handleDeleteBlocco = async (bloccoId: string) => {
    try {
      await deleteDoc(doc(db, 'blocchi', bloccoId));
      setBlocchi(prev => prev.filter(b => b.id !== bloccoId));
    } catch (error) {
      console.error('Errore nell\'eliminazione del blocco:', error);
    }
  };

  // Gestione aggiunta farm al blocco
  const handleAddFarm = async (bloccoId: string, farm: Farm) => {
    try {
      const blocco = blocchi.find(b => b.id === bloccoId);
      if (!blocco) return;

      const nuovaFarm = {
        farm_id: farm.farmId,
        giocatore_nome: farm.giocatore_nome,
        farm_nome: farm.nome,
      };

      const nuoveFarms = [...blocco.farms, nuovaFarm];

      await updateDoc(doc(db, 'blocchi', bloccoId), {
        farms: nuoveFarms,
      });

      setBlocchi(prev => prev.map(b =>
        b.id === bloccoId
          ? { ...b, farms: nuoveFarms }
          : b
      ));

      setAddMenuAnchor(null);
    } catch (error) {
      console.error('Errore nell\'aggiunta della farm:', error);
    }
  };

  // Gestione rimozione farm dal blocco
  const handleRemoveFarm = async (bloccoId: string, farmId: string) => {
    try {
      const blocco = blocchi.find(b => b.id === bloccoId);
      if (!blocco) return;

      const nuoveFarms = blocco.farms.filter(f => f.farm_id !== farmId);

      await updateDoc(doc(db, 'blocchi', bloccoId), {
        farms: nuoveFarms,
      });

      setBlocchi(prev => prev.map(b =>
        b.id === bloccoId
          ? { ...b, farms: nuoveFarms }
          : b
      ));
    } catch (error) {
      console.error('Errore nella rimozione della farm:', error);
    }
  };

  const handleOpenDialog = (blocco?: Blocco) => {
    if (blocco) {
      setEditingBlocco(blocco);
      setNuovoBlocco({
        nome: blocco.nome,
        immagine: blocco.immagine,
      });
    } else {
      setEditingBlocco(null);
      setNuovoBlocco({
        nome: '',
        immagine: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingBlocco(null);
    setNuovoBlocco({
      nome: '',
      immagine: '',
    });
  };

  // Filtra le farm disponibili per un blocco
  const getFarmDisponibili = (bloccoId: string) => {
    // Trova il blocco corrente
    const bloccoCorrente = blocchi.find(b => b.id === bloccoId);
    if (!bloccoCorrente) return [];

    // Crea un Set delle farm già assegnate in questo blocco
    const farmAssegnateNelBlocco = new Set(bloccoCorrente.farms.map(f => f.farm_id));

    // Trova tutte le farm già assegnate in altri blocchi
    const farmAssegnateAltri = new Set(
      blocchi
        .filter(b => b.id !== bloccoId) // Escludi il blocco corrente
        .flatMap(b => b.farms.map(f => f.farm_id))
    );

    // Ritorna solo le farm che:
    // 1. Non sono già nel blocco corrente
    // 2. Non sono assegnate ad altri blocchi
    return farms.filter(farm => 
      !farmAssegnateNelBlocco.has(farm.farmId) && 
      !farmAssegnateAltri.has(farm.farmId)
    );
  };

  return (
    <Layout>
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        {/* Header con pulsante nuovo blocco - visibile solo a chi può gestire */}
        {canManage && (
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'flex-start', 
            mb: 2
          }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
            >
              Nuovo Blocco
            </Button>
          </Box>
        )}

        {/* Lista dei blocchi */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {blocchi.map(blocco => (
            <Paper 
              key={blocco.id}
              elevation={0}
              sx={{ 
                width: '100%',
                border: 1,
                borderColor: 'divider',
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              {/* Header del blocco */}
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center',
                p: 1.5,
                borderBottom: 1,
                borderColor: 'divider',
                bgcolor: 'grey.50',
              }}>
                <Avatar
                  src={blocco.immagine}
                  variant="rounded"
                  sx={{ 
                    width: 32,
                    height: 32,
                    mr: 1,
                    '& img': {
                      objectFit: 'contain',
                    }
                  }}
                >
                  {blocco.nome[0]}
                </Avatar>
                <Chip
                  label={`${blocco.farms.length}`}
                  size="small"
                  sx={{ 
                    height: 20,
                    mr: 1,
                    bgcolor: 'rgba(0, 0, 0, 0.08)',
                    '& .MuiChip-label': {
                      px: 1,
                      fontSize: '0.75rem',
                    }
                  }}
                />
                <Box sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography sx={{ fontSize: '1rem', fontWeight: 500 }}>{blocco.nome}</Typography>
                    {canManage && (
                      <Box sx={{ ml: 'auto', display: 'flex', gap: 0.5 }}>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAddMenuAnchor({
                              bloccoId: blocco.id,
                              element: e.currentTarget,
                            });
                          }}
                        >
                          <AddIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={(event) => {
                            event.stopPropagation();
                            setActionMenuAnchor({
                              bloccoId: blocco.id,
                              element: event.currentTarget,
                            });
                          }}
                        >
                          <MoreVertIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    )}
                  </Box>
                </Box>
              </Box>

              {/* Lista delle farm */}
              <Box sx={{ py: 0.5 }}>
                {blocco.farms.map((farm, index) => {
                  const farmCompleta = farms.find(f => f.farmId === farm.farm_id);
                  const isAttiva = farmCompleta?.isAttiva ?? false;
                  return (
                    <Box
                      key={farm.farm_id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        px: 2,
                        py: 0.75,
                        '&:hover': {
                          bgcolor: 'action.hover',
                        },
                        ...(isAttiva ? {} : {
                          color: 'text.secondary',
                          bgcolor: 'rgba(0, 0, 0, 0.02)',
                        }),
                      }}
                    >
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography sx={{ 
                          fontSize: '0.875rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                        }}>
                          <span>{farm.giocatore_nome}</span>
                          <span style={{ color: 'rgba(0, 0, 0, 0.38)' }}>-</span>
                          <span>{farm.farm_nome}</span>
                          <span style={{ color: 'rgba(0, 0, 0, 0.38)' }}>-</span>
                          <span style={{ 
                            color: isAttiva ? 'rgb(33, 150, 243)' : 'rgba(0, 0, 0, 0.38)',
                            fontSize: '0.75rem',
                            fontStyle: 'italic',
                          }}>
                            {farmCompleta?.livello || ''}
                          </span>
                        </Typography>
                      </Box>
                      {canManage && (
                        <IconButton
                          size="small"
                          onClick={() => handleRemoveFarm(blocco.id, farm.farm_id)}
                          sx={{ 
                            p: 0.25,
                            color: 'text.secondary',
                            '&:hover': {
                              color: 'error.main',
                            },
                          }}
                        >
                          <CloseIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      )}
                    </Box>
                  );
                })}
              </Box>

              {/* Menu contestuale per azioni (modifica/elimina) */}
              {canManage && (
                <Menu
                  anchorEl={actionMenuAnchor?.bloccoId === blocco.id ? actionMenuAnchor.element : null}
                  open={actionMenuAnchor?.bloccoId === blocco.id}
                  onClose={() => setActionMenuAnchor(null)}
                >
                  <MenuItem onClick={() => {
                    handleOpenDialog(blocco);
                    setActionMenuAnchor(null);
                  }}>
                    <ListItemIcon>
                      <EditIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Modifica</ListItemText>
                  </MenuItem>
                  <MenuItem onClick={() => {
                    handleDeleteBlocco(blocco.id);
                    setActionMenuAnchor(null);
                  }}>
                    <ListItemIcon>
                      <DeleteIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Elimina</ListItemText>
                  </MenuItem>
                </Menu>
              )}
            </Paper>
          ))}
        </Box>

        {/* Dialog e Menu solo per chi può gestire */}
        {canManage && (
          <>
            {/* Dialog per nuovo/modifica blocco */}
            <Dialog 
              open={openDialog} 
              onClose={handleCloseDialog}
              maxWidth="sm"
              fullWidth
            >
              <DialogTitle>
                {editingBlocco ? 'Modifica Blocco' : 'Nuovo Blocco'}
              </DialogTitle>
              <DialogContent>
                <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField
                    label="Nome"
                    fullWidth
                    value={nuovoBlocco.nome}
                    onChange={(e) => setNuovoBlocco(prev => ({
                      ...prev,
                      nome: e.target.value
                    }))}
                  />
                  <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                    <UploadImmagine
                      cartella="blocchi"
                      id={editingBlocco?.id || 'temp'}
                      urlImmagine={nuovoBlocco.immagine}
                      onImmagineCaricata={(url) => setNuovoBlocco(prev => ({
                        ...prev,
                        immagine: url
                      }))}
                      onImmagineEliminata={() => setNuovoBlocco(prev => ({
                        ...prev,
                        immagine: ''
                      }))}
                      dimensione={150}
                    />
                  </Box>
                </Box>
              </DialogContent>
              <DialogActions>
                <Button onClick={handleCloseDialog}>Annulla</Button>
                <Button 
                  onClick={handleSubmit}
                  variant="contained"
                  disabled={!nuovoBlocco.nome}
                >
                  Salva
                </Button>
              </DialogActions>
            </Dialog>

            {/* Menu per aggiungere farm */}
            <Menu
              anchorEl={addMenuAnchor?.element}
              open={Boolean(addMenuAnchor)}
              onClose={() => setAddMenuAnchor(null)}
              disablePortal
              slotProps={{
                paper: {
                  sx: { 
                    maxHeight: '70vh',
                    width: 250,
                  },
                },
              }}
            >
              {addMenuAnchor?.bloccoId && (() => {
                const farmDisponibili = getFarmDisponibili(addMenuAnchor.bloccoId);
                const farmAttive = farmDisponibili.filter(farm => farm.isAttiva);
                const farmInattive = farmDisponibili.filter(farm => !farm.isAttiva);

                return (
                  <>
                    <ListSubheader
                      sx={{
                        py: 0.5,
                        lineHeight: '24px',
                        fontSize: '0.75rem',
                        color: 'rgb(33, 150, 243)',
                      }}
                    >
                      Farm Attive
                    </ListSubheader>
                    {farmAttive.map(farm => (
                      <MenuItem 
                        key={farm.id}
                        onClick={() => handleAddFarm(addMenuAnchor.bloccoId, farm)}
                        sx={{
                          py: 0.5,
                          minHeight: 'unset',
                        }}
                      >
                        <Typography sx={{ fontSize: '0.8rem' }}>
                          {farm.giocatore_nome} - {farm.nome} - 
                          <span style={{ 
                            color: 'rgb(33, 150, 243)',
                            fontStyle: 'italic',
                            marginLeft: '4px',
                          }}>
                            {farm.livello}
                          </span>
                        </Typography>
                      </MenuItem>
                    ))}

                    {farmInattive.length > 0 && (
                      <>
                        <Divider sx={{ my: 0.5 }} />
                        <ListSubheader
                          sx={{ py: 0.5, lineHeight: '24px', fontSize: '0.75rem' }}
                        >
                          Farm Inattive
                        </ListSubheader>
                        {farmInattive.map(farm => (
                          <MenuItem 
                            key={farm.id}
                            onClick={() => handleAddFarm(addMenuAnchor.bloccoId, farm)}
                            sx={{
                              py: 0.5,
                              minHeight: 'unset',
                              color: 'text.secondary',
                            }}
                          >
                            <Typography sx={{ fontSize: '0.8rem' }}>
                              {farm.giocatore_nome} - {farm.nome} - 
                              <span style={{ 
                                color: 'rgba(0, 0, 0, 0.38)',
                                fontStyle: 'italic',
                                marginLeft: '4px',
                              }}>
                                {farm.livello}
                              </span>
                            </Typography>
                          </MenuItem>
                        ))}
                      </>
                    )}
                  </>
                );
              })()}
            </Menu>
          </>
        )}
      </Box>
    </Layout>
  );
} 