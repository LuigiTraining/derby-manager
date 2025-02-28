import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Divider,
  useTheme,
  useMediaQuery,
  IconButton,
} from '@mui/material';
import { useAuth } from '../../componenti/autenticazione/AuthContext';
import { doc, getDoc, collection, setDoc } from 'firebase/firestore';
import { db } from '../../configurazione/firebase';
import RefreshIcon from '@mui/icons-material/Refresh';

interface Requisito {
  id: string;
  testo: string;
  obbligatorio: boolean;
}

interface Impostazioni {
  requisiti: Requisito[];
  descrizione_registrazione?: string;
  descrizione_presentazione?: string;
}

// Aggiungo interfaccia per il rate limiting
interface RateLimitEntry {
  timestamp: number;
  count: number;
}

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [isInputFocused, setIsInputFocused] = useState(false);

  // Stati
  const [loading, setLoading] = useState(true);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [openRegistrazione, setOpenRegistrazione] = useState(false);
  const [requisiti, setRequisiti] = useState<Requisito[]>([]);
  const [requisitiAccettati, setRequisitiAccettati] = useState<string[]>([]);
  const [formRegistrazione, setFormRegistrazione] = useState({
    nome: '',
    contatto: '',
    presentazione: '',
    nome_farm: '',
    livello_farm: '',
    honeypot: ''
  });
  const [captcha, setCaptcha] = useState({ num1: 0, num2: 0, risposta: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [descrizioneRegistrazione, setDescrizioneRegistrazione] = useState('');
  const [descrizionePresentation, setDescrizionePresentation] = useState('');

  // Verifica sessione esistente all'avvio
  useEffect(() => {
    const checkExistingSession = async () => {
      const savedPin = localStorage.getItem('userPin');
      if (savedPin) {
        try {
          const initialRoute = await login(parseInt(savedPin));
          navigate(initialRoute);
        } catch (error) {
          console.error('Errore nel ripristino della sessione:', error);
          localStorage.removeItem('userPin');
        }
      }
      setLoading(false);
    };

    checkExistingSession();
  }, [navigate, login]);

  // Carica i requisiti dal database
  useEffect(() => {
    const caricaRequisiti = async () => {
      try {
        const docRef = doc(db, 'impostazioni', 'requisiti_iscrizione');
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data() as Impostazioni;
          setRequisiti(data.requisiti || []);
          setDescrizioneRegistrazione(data.descrizione_registrazione || '');
          setDescrizionePresentation(data.descrizione_presentazione || '');
        }
      } catch (error) {
        console.error('Errore nel caricamento dei requisiti:', error);
      }
    };

    caricaRequisiti();
  }, []);

  // Inizializza il captcha quando si apre il form
  useEffect(() => {
    if (openRegistrazione) {
      generaNuovoCaptcha();
    }
  }, [openRegistrazione]);

  // Se sta caricando, mostra un indicatore di caricamento
  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Typography>Caricamento...</Typography>
      </Box>
    );
  }

  // Genera un nuovo captcha
  const generaNuovoCaptcha = () => {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    setCaptcha({ num1, num2, risposta: '' });
  };

  // Gestione login con PIN
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Verifica che il PIN sia composto solo da numeri e sia della lunghezza corretta
      if (!/^\d+$/.test(pin) || (pin.length !== 6 && pin.length !== 10)) {
        throw new Error('PIN non valido');
      }
      
      // Login e ottieni la route iniziale
      const initialRoute = await login(parseInt(pin));
      navigate(initialRoute);
    } catch (error) {
      setError('PIN non valido');
    }
  };

  // Gestione richiesta di registrazione
  const handleRegistrazione = async () => {
    try {
      setIsSubmitting(true);

      // Validazione dei campi obbligatori
      if (!formRegistrazione.nome) {
        throw new Error('Il nome è obbligatorio');
      }
      if (!formRegistrazione.contatto) {
        throw new Error('Il contatto è obbligatorio');
      }

      // Verifica honeypot
      if (formRegistrazione.honeypot) {
        // Se il campo honeypot è stato compilato, fingiamo che tutto sia ok
        setOpenRegistrazione(false);
        setError('Richiesta inviata con successo! Un amministratore la esaminerà presto.');
        return;
      }

      // Verifica captcha
      if (parseInt(captcha.risposta) !== captcha.num1 + captcha.num2) {
        throw new Error('La verifica anti-spam non è corretta');
      }

      // Rate limiting usando localStorage
      const now = Date.now();
      const rateLimitKey = 'registration_attempts';
      const rateLimitData: RateLimitEntry = JSON.parse(localStorage.getItem(rateLimitKey) || '{"timestamp":0,"count":0}');
      
      // Reset del contatore dopo 12 ore
      if (now - rateLimitData.timestamp > 12 * 60 * 60 * 1000) {
        rateLimitData.count = 0;
        rateLimitData.timestamp = now;
      }

      // Verifica limite richieste
      if (rateLimitData.count >= 10) {
        throw new Error('Hai raggiunto il limite di richieste per oggi. Riprova tra qualche ora.');
      }

      // Creazione della richiesta nel database
      const richiestaRef = doc(collection(db, 'richieste_registrazione'));
      await setDoc(richiestaRef, {
        nome: formRegistrazione.nome,
        contatto: formRegistrazione.contatto,
        presentazione: formRegistrazione.presentazione,
        farm: {
          nome: formRegistrazione.nome_farm || 'Farm di ' + formRegistrazione.nome,
          livello: parseInt(formRegistrazione.livello_farm) || 1,
          stato: 'in_attesa'
        },
        requisiti_accettati: requisitiAccettati,
        stato: 'in_attesa',
        data_richiesta: new Date().toISOString(),
        ip_hash: window.btoa(navigator.userAgent), // Salviamo un hash dell'user agent per tracciamento base
      });
      
      // Aggiorna il rate limiting
      rateLimitData.count++;
      localStorage.setItem(rateLimitKey, JSON.stringify(rateLimitData));

      setOpenRegistrazione(false);
      setError('Richiesta inviata con successo! Un amministratore la esaminerà presto.');
      
      // Reset dei form
      setFormRegistrazione({
        nome: '',
        contatto: '',
        presentazione: '',
        nome_farm: '',
        livello_farm: '',
        honeypot: ''
      });
      setRequisitiAccettati([]);
      setCaptcha({ num1: 0, num2: 0, risposta: '' });
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Errore durante l\'invio della richiesta. Riprova.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Gestione toggle dei requisiti
  const handleToggleRequisito = (id: string) => {
    setRequisitiAccettati(prev => {
      if (prev.includes(id)) {
        return prev.filter(reqId => reqId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // Funzione per verificare se il form è valido
  const isFormValid = () => {
    // Verifica solo i campi base obbligatori
    return !!(formRegistrazione.nome && formRegistrazione.contatto);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'auto',
        backgroundImage: isMobile 
          ? 'url("/images/anniversary_hero-mobile.jpg")'
          : 'url("/images/anniversary_desktop.jpg")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          zIndex: 0,
        }
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 6,
          width: '100%',
          maxWidth: 400,
          textAlign: 'center',
          borderRadius: 2,
          position: 'relative',
          mx: 2,
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          zIndex: 1,
          transform: isInputFocused && isMobile ? 'translateY(-170px)' : 'translateY(0)',
          transition: 'transform 0.3s ease',
        }}
      >
        {/* Logo del gioco */}
        <Box
          component="img"
          src="/images/hero_logo.png"
          alt="Hay Day Logo"
          sx={{
            width: '80%',
            maxWidth: 200,
            height: 'auto',
            mb: 3,
          }}
        />

        {/* Logo e titolo del vicinato */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: isMobile ? 'row' : 'column',
            gap: 2,
            mb: 4,
          }}
        >
          <Box
            component="img"
            src="/images/logo_percheno_vicinato.png"
            alt="Logo Perchè No"
            sx={{
              width: isMobile ? '40px' : '60px',
              height: 'auto',
            }}
          />
          <Typography 
            variant={isMobile ? "h4" : "h3"}
            sx={{ 
              fontWeight: 'bold',
              letterSpacing: 1,
              color: 'primary.main',
              whiteSpace: 'nowrap',
            }}
          >
            PERCHÈ NO
          </Typography>
        </Box>
        
        <form onSubmit={handleLogin}>
          <TextField
            fullWidth
            label="PIN"
            type="password"
            value={pin}
            onChange={(e) => {
              // Accetta solo numeri
              const value = e.target.value.replace(/[^\d]/g, '');
              setPin(value);
            }}
            margin="normal"
            inputProps={{
              inputMode: "numeric",
              pattern: "[0-9]*"
            }}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
            sx={{ mb: 3 }}
          />
          
          <Button
            fullWidth
            variant="contained"
            type="submit"
            size="large"
            sx={{ 
              mb: 2,
              py: 1.5,
              fontSize: '1.1rem'
            }}
          >
            ACCEDI
          </Button>
        </form>

        <Button
          fullWidth
          onClick={() => setOpenRegistrazione(true)}
          variant="outlined"
          size="large"
          sx={{ 
            mt: 1,
            py: 1.5,
            fontSize: '1rem'
          }}
        >
          VOGLIO UNIRMI AL VICINATO
        </Button>

        {/* Dialog per la registrazione */}
        <Dialog 
          open={openRegistrazione} 
          onClose={() => setOpenRegistrazione(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Richiesta di partecipazione</DialogTitle>
          <DialogContent>
            {descrizioneRegistrazione && (
              <Typography 
                sx={{ 
                  mt: 2, 
                  mb: 3,
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.5
                }}
              >
                {descrizioneRegistrazione}
                </Typography>
            )}

            {requisiti.length > 0 && (
              <Box sx={{ mt: 2 }}>
                {/* Prima i requisiti obbligatori */}
                {requisiti.filter(r => r.obbligatorio).length > 0 && (
                  <FormGroup>
                    {requisiti.filter(r => r.obbligatorio).map((requisito) => (
                      <FormControlLabel
                        key={requisito.id}
                        control={
                          <Checkbox
                            checked={requisitiAccettati.includes(requisito.id)}
                            onChange={() => handleToggleRequisito(requisito.id)}
                          />
                        }
                        label={
                          <Box component="span" sx={{ display: 'flex', alignItems: 'center', color: 'error.main' }}>
                            {requisito.testo}
                            <Box component="span" sx={{ ml: 0.5 }}>*</Box>
                          </Box>
                        }
                      />
                    ))}
                  </FormGroup>
                )}

                {/* Poi i requisiti facoltativi */}
                {requisiti.filter(r => !r.obbligatorio).length > 0 && (
                  <>
                    <Typography variant="subtitle2" sx={{ mt: 2, mb: 1, color: 'text.secondary', fontWeight: 'bold' }}>
                      Requisiti Consigliati
                    </Typography>
                    <FormGroup>
                      {requisiti.filter(r => !r.obbligatorio).map((requisito) => (
                        <FormControlLabel
                          key={requisito.id}
                          control={
                            <Checkbox
                              checked={requisitiAccettati.includes(requisito.id)}
                              onChange={() => handleToggleRequisito(requisito.id)}
                            />
                          }
                          label={requisito.testo}
                        />
                      ))}
                    </FormGroup>
                  </>
                )}

                <Divider sx={{ my: 2 }} />
              </Box>
            )}

            <TextField
              fullWidth
              label="Nome"
              value={formRegistrazione.nome}
              onChange={(e) => setFormRegistrazione({...formRegistrazione, nome: e.target.value})}
              margin="normal"
              required
              error={!formRegistrazione.nome}
              helperText={!formRegistrazione.nome ? 'Il nome è obbligatorio' : ''}
            />
            <TextField
              fullWidth
              label="Contatto"
              value={formRegistrazione.contatto}
              onChange={(e) => setFormRegistrazione({...formRegistrazione, contatto: e.target.value})}
              margin="normal"
              required
              error={!formRegistrazione.contatto}
              helperText={!formRegistrazione.contatto ? 'Il contatto è obbligatorio' : ''}
            />

            {descrizionePresentation && (
              <Typography 
                variant="body2" 
                color="text.secondary"
                sx={{ 
                  mt: 2,
                  mb: 1,
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.5
                }}
              >
                {descrizionePresentation}
              </Typography>
            )}
            
            <TextField
              fullWidth
              label="Presentazione"
              value={formRegistrazione.presentazione}
              onChange={(e) => setFormRegistrazione({...formRegistrazione, presentazione: e.target.value})}
              margin="normal"
              multiline
              rows={3}
            />
            <TextField
              fullWidth
              label="Nome Farm"
              value={formRegistrazione.nome_farm}
              onChange={(e) => setFormRegistrazione({...formRegistrazione, nome_farm: e.target.value})}
              margin="normal"
              helperText="Se non specificato, verrà usato 'Farm di [nome]'"
            />
            <TextField
              fullWidth
              label="Livello Farm"
              type="number"
              value={formRegistrazione.livello_farm}
              onChange={(e) => setFormRegistrazione({...formRegistrazione, livello_farm: e.target.value})}
              margin="normal"
              helperText="Se non specificato, verrà impostato a 1"
            />

            {/* Campo honeypot nascosto */}
            <TextField
              sx={{ display: 'none' }}
              value={formRegistrazione.honeypot}
              onChange={(e) => setFormRegistrazione({...formRegistrazione, honeypot: e.target.value})}
            />

            {/* Verifica anti-spam */}
            <Box sx={{ mb: 2, mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Verifica anti-spam
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography>
                  {captcha.num1} + {captcha.num2} =
                </Typography>
                <TextField
                  size="small"
                  value={captcha.risposta}
                  onChange={(e) => setCaptcha({...captcha, risposta: e.target.value})}
                  sx={{ width: '80px' }}
                  inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                />
                <IconButton onClick={generaNuovoCaptcha} size="small">
                  <RefreshIcon />
                </IconButton>
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => {
              setOpenRegistrazione(false);
              setRequisitiAccettati([]);
              setFormRegistrazione({
                nome: '',
                contatto: '',
                presentazione: '',
                nome_farm: '',
                livello_farm: '',
                honeypot: ''
              });
              setCaptcha({ num1: 0, num2: 0, risposta: '' });
            }}>
              Annulla
            </Button>
            <Button 
              onClick={handleRegistrazione} 
              variant="contained"
              disabled={!isFormValid() || isSubmitting}
            >
              {isSubmitting ? 'Invio in corso...' : 'Invia Richiesta'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar per gli errori */}
        <Snackbar
          open={!!error}
          autoHideDuration={6000}
          onClose={() => setError('')}
        >
          <Alert severity={error.includes('successo') ? 'success' : 'error'} onClose={() => setError('')}>
            {error}
          </Alert>
        </Snackbar>
      </Paper>
    </Box>
  );
}
