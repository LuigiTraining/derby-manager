import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Chip,
} from '@mui/material';
import { Incarico } from '../../tipi/incarico';
import { Cesto } from '../../tipi/cesto';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../configurazione/firebase';

interface StampaIncarichiProps {
  giocatore: string;
  incarichi: Array<IncaricoConCesto>;
  incarichiCitta?: Array<{
    incarico: IncaricoCitta;
    quantita: number;
  }>;
  nomeFarm?: string;
  livelloFarm?: number;
  pin?: number;
  totaleCitta?: number;
}

interface IncaricoConCesto {
  incarico: Incarico;
  quantita: number;
  cesto?: Cesto;
}

// Interfaccia per gli incarichi raggruppati per cesto
interface IncaricoInCesto {
  incarico: Incarico;
  quantita: number;
  cesto: Cesto;
}

const StampaIncarichi: React.FC<StampaIncarichiProps> = ({ 
  giocatore, 
  incarichi,
  incarichiCitta,
  nomeFarm,
  livelloFarm,
  pin,
  totaleCitta
}) => {
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [imageUrls, setImageUrls] = useState<{ [key: string]: string }>({});
  const [edificiNomi, setEdificiNomi] = useState<{ [key: string]: string }>({});

  // Funzione per caricare i nomi degli edifici
  useEffect(() => {
    const caricaEdifici = async () => {
      try {
        const edificiRef = collection(db, 'edifici');
        const snapshot = await getDocs(edificiRef);
        const nomiMap: { [key: string]: string } = {};
        snapshot.docs.forEach(doc => {
          nomiMap[doc.id] = doc.data().nome || '';
        });
        setEdificiNomi(nomiMap);
      } catch (error) {
        console.error('Errore nel caricamento degli edifici:', error);
      }
    };

    caricaEdifici();
  }, []);

  // Funzione per ottenere l'URL pubblico dell'immagine
  const getPublicImageUrl = async (firebaseUrl: string | undefined): Promise<string> => {
    if (!firebaseUrl) return '';
    try {
      if (firebaseUrl.startsWith('https://firebasestorage.googleapis.com')) {
        return firebaseUrl;
      }

      const storage = getStorage();
      
      if (!firebaseUrl.includes('/o/')) {
        const imageRef = ref(storage, firebaseUrl);
        return await getDownloadURL(imageRef);
      }

      const imagePath = firebaseUrl.split('/o/')[1]?.split('?')[0];
      if (!imagePath) return '';
      
      const decodedPath = decodeURIComponent(imagePath);
      const imageRef = ref(storage, decodedPath);
      return await getDownloadURL(imageRef);
    } catch (error) {
      return '';
    }
  };

  // Funzione per convertire URL in Base64
  const convertToBase64 = async (url: string): Promise<string> => {
    try {
      const response = await fetch(url, {
        mode: 'cors',
        credentials: 'omit',
        headers: {
          'Origin': window.location.origin
        }
      });
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch {
      return '';
    }
  };

  // Funzione per precaricare un'immagine
  const preloadImage = async (url: string): Promise<string> => {
    return new Promise(async (resolve) => {
      try {
        const base64Url = await convertToBase64(url);
        const img = new Image();
        img.onload = () => resolve(base64Url);
        img.onerror = () => resolve('');
        img.src = base64Url;
      } catch {
        resolve('');
      }
    });
  };

  // Funzione per raggruppare gli incarichi per cesto
  const incarichiPerCesto = React.useMemo(() => {
    const cestiMap = new Map<string, IncaricoConCesto[]>();
    
    // Prima aggiungiamo gli incarichi standard
    incarichi.forEach(item => {
      if (item.cesto) {
        const cestoId = item.cesto.id;
        if (!cestiMap.has(cestoId)) {
          cestiMap.set(cestoId, []);
        }
        cestiMap.get(cestoId)?.push(item);
      }
    });

    // Poi aggiungiamo gli incarichi città che appartengono a cesti
    if (incarichiCitta) {
      incarichiCitta.forEach(({ incarico, quantita }) => {
        // Cerca se questo incarico città appartiene a un cesto
        const incaricoConCesto = incarichi.find(item => 
          item.cesto && 
          item.cesto.incarichi.some(inc => inc.incarico_id === incarico.id)
        );

        if (incaricoConCesto?.cesto) {
          const cestoId = incaricoConCesto.cesto.id;
          if (!cestiMap.has(cestoId)) {
            cestiMap.set(cestoId, []);
          }
          cestiMap.get(cestoId)?.push({
            incarico: incarico,
            quantita: quantita,
            cesto: incaricoConCesto.cesto
          });
        }
      });
    }
    
    return cestiMap;
  }, [incarichi, incarichiCitta]);

  // Funzione per calcolare il livello del cesto
  const calcolaLivelloCesto = (incarichiCesto: IncaricoConCesto[]): number => {
    return Math.max(...incarichiCesto.map(item => item.incarico.livello_minimo), 1);
  };

  // Carica tutte le immagini all'avvio
  useEffect(() => {
    const loadImages = async () => {
      try {
        const urls: { [key: string]: string } = {};
        
        // Carica le immagini per tutti gli incarichi (sia nei cesti che singoli)
        const tuttiIncarichi = [
          ...incarichi.filter(item => !item.cesto),
          ...Array.from(incarichiPerCesto.values()).flat()
        ];
        
        for (const { incarico } of tuttiIncarichi) {
          if (incarico.immagine) {
            const url = await getPublicImageUrl(incarico.immagine);
            if (url) {
              const base64Url = await preloadImage(url);
              if (base64Url) {
                urls[incarico.id] = base64Url;
              }
            }
          }
        }

        // Carica le immagini per gli incarichi città
        if (incarichiCitta) {
          for (const { incarico } of incarichiCitta) {
            if (incarico.immagine) {
              const url = await getPublicImageUrl(incarico.immagine);
              if (url) {
                const base64Url = await preloadImage(url);
                if (base64Url) {
                  urls[incarico.id] = base64Url;
                }
              }
            }
          }
        }

        setImageUrls(urls);
      } catch (error) {
        console.error('Errore nel caricamento delle immagini:', error);
      } finally {
        setImagesLoaded(true);
      }
    };

    loadImages();
  }, [incarichi, incarichiPerCesto, incarichiCitta]);

  if (!imagesLoaded) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, bgcolor: 'white' }}>
      {/* Intestazione */}
      <Box sx={{ 
        display: 'flex',
        flexDirection: 'column',
        mb: 2
      }}>
        {/* Logo e nome del Vicinato sulla stessa riga */}
        <Box sx={{ 
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 2,
          mb: 2
        }}>
          <img 
            src="/images/logo_percheno_vicinato.png"
            alt="Logo Vicinato"
            style={{
              width: '48px',
              height: '48px',
              objectFit: 'contain'
            }}
          />
          <Typography 
            variant="h5" 
            sx={{ 
              fontWeight: 700,
              color: '#2196f3',
              letterSpacing: 1
            }}
          >
            PERCHÈ NO
          </Typography>
        </Box>

        {/* Dati del giocatore */}
        <Box sx={{ 
          pl: 2,
          mb: 1
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6" sx={{ fontSize: '1.25rem' }}>
              {giocatore}{nomeFarm && <span style={{ fontWeight: 700 }}>{` - ${nomeFarm}`}</span>}
            </Typography>
            {livelloFarm && (
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                bgcolor: 'grey.200',
                borderRadius: 1,
                px: 1,
                py: 0.5,
                gap: 0.5
              }}>
                <Typography variant="body2">
                  {livelloFarm}
                </Typography>
                <img 
                  src="/images/livello.png" 
                  alt="Livello" 
                  style={{ 
                    width: '16px', 
                    height: '16px',
                    objectFit: 'contain'
                  }} 
                />
              </Box>
            )}
          </Box>
        </Box>

        {/* Link al sito e PIN */}
        <Box sx={{ 
          pl: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          mb: 2
        }}>
          <a 
            href="https://derby-manager-perche-no.web.app/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#1976d2',
              fontWeight: 700,
              textDecoration: 'underline',
              fontStyle: 'italic',
              fontSize: '1rem'
            }}
          >
            CLICCA QUI
          </a>
          <Typography 
            sx={{ 
              color: 'text.secondary'
            }}
          >
            per tenere traccia dei tuoi incarichi inserendo il tuo PIN: {pin}
          </Typography>
        </Box>

        {/* Titolo Lista Incarichi con separatore */}
        <Box sx={{ width: '100%' }}>
          <Typography variant="h5" align="center" gutterBottom>
            Lista Incarichi
          </Typography>
          <Box sx={{ 
            width: '100%', 
            height: '1px', 
            bgcolor: 'rgba(0, 0, 0, 0.12)', 
            mb: 3 
          }} />
        </Box>
      </Box>

      {/* Sezione Città */}
      <Box sx={{ mb: 3 }}>
        {/* Header Città */}
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          p: 1,
          bgcolor: 'grey.100',
          borderRadius: 1,
          mb: 2
        }}>
          <Box sx={{ 
            width: 40, 
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <img 
              src="/images/citta.png"
              alt="Città"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain'
              }}
            />
          </Box>
          <Typography variant="h6">
            Città
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
            {totaleCitta || 0}/42
          </Typography>
        </Box>

        {/* Lista incarichi città */}
        {incarichiCitta && incarichiCitta.length > 0 && (
          <Box>
            {incarichiCitta.map(({ incarico, quantita }) => (
              <Box
                key={incarico.id}
                sx={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  minHeight: '56px',
                  p: 1,
                  pl: '32px',
                  borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: '24px',
                    bgcolor: 'rgb(33, 150, 243, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }
                }}
              >
                {/* Livello dell'incarico */}
                <Typography 
                  sx={{ 
                    position: 'absolute',
                    left: 0,
                    width: '24px',
                    fontSize: '0.7rem',
                    fontStyle: 'italic',
                    color: 'rgb(33, 150, 243)',
                    textAlign: 'center',
                    zIndex: 1,
                    lineHeight: '56px'
                  }}
                >
                  {incarico.livello_minimo}
                </Typography>

                {/* Contenuto principale */}
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  gap: 2,
                  width: '100%'
                }}>
                  {/* Immagine */}
                  <Box sx={{ 
                    width: 40, 
                    height: 40,
                    position: 'relative',
                    overflow: 'hidden',
                    borderRadius: '4px',
                    flexShrink: 0
                  }}>
                    {imageUrls[incarico.id] ? (
                      <img
                        src={imageUrls[incarico.id]}
                        alt={incarico.nome}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain'
                        }}
                      />
                    ) : (
                      <Box
                        sx={{
                          width: '100%',
                          height: '100%',
                          bgcolor: 'grey.300',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {incarico.nome.charAt(0)}
                      </Box>
                    )}
                  </Box>

                  {/* Quantità */}
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      fontWeight: 500,
                      bgcolor: 'white',
                      px: 0.75,
                      py: 0.125,
                      borderRadius: 0.5,
                      border: '1px solid rgba(0, 0, 0, 0.12)',
                      lineHeight: 1,
                      fontSize: '0.85rem',
                      flexShrink: 0
                    }}
                  >
                    x{quantita}
                  </Typography>

                  {/* Nome e badge */}
                  <Box sx={{ 
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.5,
                    flexGrow: 1,
                    minWidth: 0
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography 
                        variant="body1"
                        sx={{
                          wordBreak: 'break-word',
                          overflow: 'hidden'
                        }}
                      >
                        {incarico.nome}
                      </Typography>
                      {incarico.edificio_id && edificiNomi[incarico.edificio_id] && (
                        <Typography 
                          sx={{ 
                            fontSize: '0.75rem',
                            color: 'text.secondary',
                            fontStyle: 'italic'
                          }}
                        >
                          ({edificiNomi[incarico.edificio_id]})
                        </Typography>
                      )}
                    </Box>
                    {/* Chip del cesto */}
                    {incarichi.find(item => 
                      item.cesto && 
                      item.cesto.incarichi.some(inc => inc.incarico_id === incarico.id)
                    )?.cesto && (
                      <Box 
                        sx={{ 
                          display: 'inline-block',
                          fontSize: '0.7rem',
                          px: 0.75,
                          py: 0.125,
                          bgcolor: 'rgba(188, 170, 164, 0.2)',
                          color: 'rgb(141, 110, 99)',
                          borderRadius: 0.5,
                          border: '1px solid rgba(141, 110, 99, 0.3)',
                          maxWidth: 'fit-content',
                          ml: 1
                        }}
                      >
                        {incarichi.find(item => 
                          item.cesto && 
                          item.cesto.incarichi.some(inc => inc.incarico_id === incarico.id)
                        )?.cesto?.nome}
                      </Box>
                    )}
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Box>

      {/* Sezione Cesti */}
      {Array.from(incarichiPerCesto.entries()).length > 0 && (
        <Box sx={{ mb: 2 }}>
          {/* Header Cesti */}
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            p: 1,
            bgcolor: 'grey.100',
            borderRadius: 1,
            mb: 2
          }}>
            <Box sx={{ 
              width: 40, 
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <img 
                src="/images/cesto.png"
                alt="Cesti"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  transform: 'scale(1.2)'
                }}
              />
            </Box>
            <Typography variant="h6">
              Cesti
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
              {Array.from(incarichiPerCesto.entries()).length} {Array.from(incarichiPerCesto.entries()).length === 1 ? 'cesto' : 'cesti'}
            </Typography>
          </Box>

          {/* Lista Cesti */}
          {Array.from(incarichiPerCesto.entries()).map(([cestoId, incarichiCesto]) => {
            const cesto = incarichiCesto[0].cesto;
            if (!cesto) return null;
            
            const livelloCesto = calcolaLivelloCesto(incarichiCesto);

            return (
              <Box 
                key={`cesto-${cestoId}`}
                sx={{ 
                  position: 'relative',
                  borderBottom: '1px solid #eee',
                  overflow: 'hidden',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: '24px',
                    bgcolor: 'rgb(33, 150, 243, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }
                }}
              >
                {/* Livello del cesto */}
                <Typography 
                  sx={{ 
                    position: 'absolute',
                    left: 0,
                    width: '24px',
                    fontSize: '0.7rem',
                    fontStyle: 'italic',
                    color: 'rgb(33, 150, 243)',
                    textAlign: 'center',
                    zIndex: 1,
                    lineHeight: '56px'
                  }}
                >
                  {livelloCesto}
                </Typography>

                <Box sx={{ 
                  display: 'flex',
                  alignItems: 'center',
                  p: 1,
                  pl: '32px'
                }}>
                  {/* Nome del cesto */}
                  <Typography sx={{ 
                    fontSize: '0.9rem', 
                    fontWeight: 500,
                    width: '180px',
                    flexShrink: 0
                  }}>
                    {cesto.nome}
                  </Typography>

                  {/* Incarichi del cesto */}
                  <Box sx={{ 
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    flexGrow: 1
                  }}>
                    {incarichiCesto.map(({ incarico, quantita }) => (
                      <Box 
                        key={incarico.id}
                        sx={{ 
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1
                        }}
                      >
                        {/* Immagine */}
                        <Box sx={{ 
                          width: 40, 
                          height: 40,
                          position: 'relative',
                          overflow: 'hidden',
                          borderRadius: '4px',
                          flexShrink: 0
                        }}>
                          {imageUrls[incarico.id] ? (
                            <img
                              src={imageUrls[incarico.id]}
                              alt={incarico.nome}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain'
                              }}
                            />
                          ) : (
                            <Box
                              sx={{
                                width: '100%',
                                height: '100%',
                                bgcolor: 'grey.300',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              {incarico.nome.charAt(0)}
                            </Box>
                          )}
                        </Box>

                        {/* Quantità */}
                        <Typography 
                          variant="caption"
                          sx={{ 
                            fontSize: '0.85rem',
                            fontWeight: 500,
                            bgcolor: 'white',
                            px: 0.5,
                            py: 0.125,
                            borderRadius: 0.5,
                            border: '1px solid rgba(0, 0, 0, 0.12)',
                            lineHeight: 1,
                            flexShrink: 0
                          }}
                        >
                          x{quantita}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              </Box>
            );
          })}
        </Box>
      )}

      {/* Lista incarichi singoli */}
      <Box>
        {incarichi.filter(item => !item.cesto).map(({ incarico, quantita }, index) => (
          <Box 
            key={index}
            sx={{ 
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
              minHeight: '56px',
              p: 0
            }}
          >
            {/* Numero progressivo */}
            <Box sx={{ 
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              minWidth: '45px',
              pl: 1
            }}>
              <Typography sx={{ 
                fontSize: '0.8rem',
                color: 'text.secondary',
                fontWeight: 500,
              }}>
                #{index + 1}
              </Typography>
              <Box sx={{ 
                width: '1px',
                height: '24px',
                bgcolor: 'rgba(0, 0, 0, 0.12)'
              }} />
            </Box>

            {/* Livello dell'incarico */}
            <Box sx={{ 
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              minHeight: '56px',
              pl: '32px',
              flexGrow: 1,
              '&::before': {
                content: '""',
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: '24px',
                bgcolor: 'rgb(33, 150, 243, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }
            }}>
              <Typography 
                sx={{ 
                  position: 'absolute',
                  left: 0,
                  width: '24px',
                  fontSize: '0.7rem',
                  fontStyle: 'italic',
                  color: 'rgb(33, 150, 243)',
                  textAlign: 'center',
                  zIndex: 1,
                  lineHeight: '56px'
                }}
              >
                {incarico.livello_minimo}
              </Typography>

              {/* Contenuto principale */}
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center',
                gap: 2,
                width: '100%'
              }}>
                {/* Immagine */}
                <Box sx={{ 
                  width: 40, 
                  height: 40,
                  position: 'relative',
                  overflow: 'hidden',
                  borderRadius: '4px',
                  flexShrink: 0
                }}>
                  {imageUrls[incarico.id] ? (
                    <img
                      src={imageUrls[incarico.id]}
                      alt={incarico.nome}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain'
                      }}
                    />
                  ) : (
                    <Box
                      sx={{
                        width: '100%',
                        height: '100%',
                        bgcolor: 'grey.300',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {incarico.nome.charAt(0)}
                    </Box>
                  )}
                </Box>

                {/* Quantità */}
                <Typography 
                  variant="caption" 
                  sx={{ 
                    fontWeight: 500,
                    bgcolor: 'white',
                    px: 0.75,
                    py: 0.125,
                    borderRadius: 0.5,
                    border: '1px solid rgba(0, 0, 0, 0.12)',
                    lineHeight: 1,
                    fontSize: '0.85rem',
                    flexShrink: 0
                  }}
                >
                  x{quantita}
                </Typography>

                {/* Nome e dettagli */}
                <Box sx={{ 
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  flexGrow: 1,
                  minWidth: 0
                }}>
                  <Typography sx={{ fontSize: '0.9rem', fontWeight: 500 }}>
                    {incarico.nome}
                  </Typography>
                  {incarico.edificio_id && edificiNomi[incarico.edificio_id] && (
                    <Typography 
                      sx={{ 
                        fontSize: '0.75rem',
                        color: 'text.secondary',
                        fontStyle: 'italic'
                      }}
                    >
                      ({edificiNomi[incarico.edificio_id]})
                    </Typography>
                  )}
                  {/* Chip del cesto */}
                  {incarichi.find(item => 
                    item.cesto && 
                    item.cesto.incarichi.some(inc => inc.incarico_id === incarico.id)
                  )?.cesto && (
                    <Box 
                      sx={{ 
                        display: 'inline-block',
                        fontSize: '0.7rem',
                        px: 0.75,
                        py: 0.125,
                        bgcolor: 'rgba(188, 170, 164, 0.2)',
                        color: 'rgb(141, 110, 99)',
                        borderRadius: 0.5,
                        border: '1px solid rgba(141, 110, 99, 0.3)',
                        maxWidth: 'fit-content',
                        ml: 1
                      }}
                    >
                      {incarichi.find(item => 
                        item.cesto && 
                        item.cesto.incarichi.some(inc => inc.incarico_id === incarico.id)
                      )?.cesto?.nome}
                    </Box>
                  )}
                </Box>
              </Box>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default StampaIncarichi; 