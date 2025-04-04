import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './componenti/autenticazione/AuthContext';
import Login from './pagine/autenticazione/Login';
import Welcome from './pagine/Welcome';
import Dashboard from './pagine/admin/Dashboard';
import GestioneGiocatori from './pagine/admin/GestioneGiocatori';
import GestioneEdifici from './pagine/admin/GestioneEdifici';
import GestioneIncarichi from './pagine/admin/GestioneIncarichi';
import GestioneCesti from './pagine/admin/GestioneCesti';
import TestGestioneAssegnazioni from './pagine/admin/TestGestioneAssegnazioni';
import GestioneCitta from './pagine/admin/GestioneCitta';
import Impostazioni from './pagine/admin/Impostazioni';
import WikiPage from './componenti/wiki/WikiPage';
import Inizializzazione from './pagine/admin/Inizializzazione';
import GestioneDerby from './pagine/admin/GestioneDerby';
import Statistiche from './pagine/admin/Statistiche';
import Blocchi from './pagine/admin/Blocchi';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import PaginaInCostruzione from './componenti/wiki/PaginaInCostruzione';
import MieiIncarichiNuovo from "./pagine/giocatore/nuovo/MieiIncarichiNuovo";

// Modifichiamo il componente ProtectedRoute per supportare i moderatori
const ProtectedRoute: React.FC<{ 
  children: React.ReactElement, 
  requireAdmin?: boolean,
  requireCoordinatore?: boolean,
  requireModOrHigher?: boolean,
  requireGiocatore?: boolean 
}> = ({ children, requireAdmin = false, requireCoordinatore = false, requireModOrHigher = false, requireGiocatore = false }) => {
  const { currentUser, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div>Caricamento...</div>;
  }

  if (!currentUser) {
    // Redirect al login preservando l'URL tentato
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireAdmin && currentUser.ruolo !== 'admin') {
    return <Navigate to="/miei-incarichi" replace />;
  }

  if (requireCoordinatore && !['admin', 'coordinatore'].includes(currentUser.ruolo)) {
    return <Navigate to="/miei-incarichi" replace />;
  }

  if (requireModOrHigher && !['admin', 'coordinatore', 'moderatore'].includes(currentUser.ruolo)) {
    return <Navigate to="/miei-incarichi" replace />;
  }

  if (requireGiocatore && currentUser.ruolo !== 'giocatore') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default function AppRoutes() {
  const { currentUser } = useAuth();
  const location = useLocation();

  // Se l'utente è già autenticato e prova ad accedere al login, reindirizza alla pagina appropriata
  if (currentUser && location.pathname === '/login') {
    return <Navigate to="/welcome" replace />;
  }

  return (
    <Routes>
      {/* Route pubblica */}
      <Route path="/login" element={<Login />} />

      {/* Route protette */}
      <Route path="/" element={
        <Navigate to={currentUser ? '/welcome' : '/login'} replace />
      } />
      
      {/* Welcome page */}
      <Route 
        path="/welcome" 
        element={
          <ProtectedRoute>
            <Welcome />
          </ProtectedRoute>
        } 
      />

      {/* Wiki pages */}
      <Route 
        path="/wiki/*" 
        element={
          <ProtectedRoute>
            <PaginaInCostruzione />
          </ProtectedRoute>
        } 
      />

      {/* Tutorial pages */}
      <Route 
        path="/tutorial/*" 
        element={
          <ProtectedRoute>
            <PaginaInCostruzione />
          </ProtectedRoute>
        } 
      />

      {/* Regolamento pages */}
      <Route 
        path="/regolamento/*" 
        element={
          <ProtectedRoute>
            <PaginaInCostruzione />
          </ProtectedRoute>
        } 
      />

      {/* Dashboard principale (admin, coordinatore e moderatori) */}
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute requireModOrHigher>
            <Dashboard />
          </ProtectedRoute>
        } 
      />

      {/* Gestione Giocatori (accessibile a tutti) */}
      <Route 
        path="/giocatori" 
        element={
          <ProtectedRoute>
            <GestioneGiocatori />
          </ProtectedRoute>
        } 
      />

      {/* Gestione Edifici (admin, coordinatore e moderatori) */}
      <Route 
        path="/edifici" 
        element={
          <ProtectedRoute requireModOrHigher>
            <GestioneEdifici />
          </ProtectedRoute>
        } 
      />

      {/* Gestione Incarichi (admin, coordinatore e moderatori) */}
      <Route 
        path="/incarichi" 
        element={
          <ProtectedRoute requireModOrHigher>
            <GestioneIncarichi />
          </ProtectedRoute>
        } 
      />

      {/* Gestione Cesti (admin, coordinatore e moderatori) */}
      <Route 
        path="/cesti" 
        element={
          <ProtectedRoute requireModOrHigher>
            <GestioneCesti />
          </ProtectedRoute>
        } 
      />

      {/* Gestione Città (admin, coordinatore e moderatori) */}
      <Route 
        path="/citta" 
        element={
          <ProtectedRoute requireModOrHigher>
            <GestioneCitta />
          </ProtectedRoute>
        } 
      />

      {/* Gestione Assegnazioni (admin, coordinatore e moderatori) */}
      <Route
        path="/admin/assegnazioni"
        element={
          <Navigate to="/admin/test-assegnazioni" replace />
        }
      />

      {/* Test Nuova Gestione Assegnazioni (admin, coordinatore e moderatori) */}
      <Route
        path="/admin/test-assegnazioni"
        element={
          <ProtectedRoute requireModOrHigher>
            <TestGestioneAssegnazioni />
          </ProtectedRoute>
        }
      />

      {/* Lista incarichi personali (tutti tranne admin) */}
      <Route
        path="/miei-incarichi"
        element={
          <Navigate to="/giocatore/nuovo/miei-incarichi" replace />
        }
      />

      {/* Impostazioni (solo admin e coordinatore) */}
      <Route 
        path="/impostazioni" 
        element={
          <ProtectedRoute requireCoordinatore>
            <Impostazioni />
          </ProtectedRoute>
        } 
      />

      {/* Inizializzazione (solo admin) */}
      <Route 
        path="/inizializzazione" 
        element={
          <ProtectedRoute requireAdmin>
            <Inizializzazione />
          </ProtectedRoute>
        } 
      />

      {/* Gestione Derby (admin e coordinatori) */}
      <Route 
        path="/admin/derby" 
        element={
          <ProtectedRoute requireCoordinatore>
            <GestioneDerby />
          </ProtectedRoute>
        } 
      />

      {/* Statistiche (admin e coordinatori) */}
      <Route 
        path="/admin/statistiche" 
        element={
          <ProtectedRoute requireCoordinatore>
            <Statistiche />
          </ProtectedRoute>
        } 
      />

      {/* Blocchi (visibile a tutti, gestibile solo da admin e coordinatori) */}
      <Route 
        path="/admin/blocchi" 
        element={
          <ProtectedRoute>
            <Blocchi />
          </ProtectedRoute>
        } 
      />

      {/* Nuovi Miei Incarichi */}
      <Route
        path="/giocatore/nuovo/miei-incarichi"
        element={
          <ProtectedRoute>
            <MieiIncarichiNuovo />
          </ProtectedRoute>
        }
      />

      {/* Route di fallback */}
      <Route path="*" element={<Navigate to="/welcome" replace />} />
    </Routes>
  );
}
