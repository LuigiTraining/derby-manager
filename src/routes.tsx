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
import GestioneRegolamenti from './pagine/regolamento/GestioneRegolamenti';
import { RegolamentiProvider } from './componenti/regolamento/RegolamentiContext';

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
    return <Navigate to="/welcome" replace />;
  }

  if (requireCoordinatore && !['admin', 'coordinatore'].includes(currentUser.ruolo)) {
    return <Navigate to="/welcome" replace />;
  }

  if (requireModOrHigher && !['admin', 'coordinatore', 'moderatore'].includes(currentUser.ruolo)) {
    return <Navigate to="/welcome" replace />;
  }

  if (requireGiocatore && currentUser.ruolo !== 'giocatore') {
    return <Navigate to="/welcome" replace />;
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

      {/* Regolamento pages - Note: L'ordine è importante! */}
      <Route 
        path="/regolamento/edit/:sectionId" 
        element={
          <ProtectedRoute>
            <RegolamentiProvider>
              <GestioneRegolamenti />
            </RegolamentiProvider>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/regolamento/:sectionId" 
        element={
          <ProtectedRoute>
            <RegolamentiProvider>
              <GestioneRegolamenti />
            </RegolamentiProvider>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/regolamento" 
        element={
          <ProtectedRoute>
            <RegolamentiProvider>
              <GestioneRegolamenti />
            </RegolamentiProvider>
          </ProtectedRoute>
        } 
      />

      {/* Dashboard principale (admin, Co-Leader e Gestore) */}
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

      {/* Gestione Edifici (admin, Co-Leader e Gestore) */}
      <Route 
        path="/edifici" 
        element={
          <ProtectedRoute requireModOrHigher>
            <GestioneEdifici />
          </ProtectedRoute>
        } 
      />

      {/* Gestione Incarichi (admin, Co-Leader e Gestore) */}
      <Route 
        path="/incarichi" 
        element={
          <ProtectedRoute requireModOrHigher>
            <GestioneIncarichi />
          </ProtectedRoute>
        } 
      />

      {/* Gestione Cesti (admin, Co-Leader e Gestore) */}
      <Route 
        path="/cesti" 
        element={
          <ProtectedRoute requireModOrHigher>
            <GestioneCesti />
          </ProtectedRoute>
        } 
      />

      {/* Test Gestione Assegnazioni (admin, Co-Leader e Gestore) */}
      <Route 
        path="/test-assegnazioni" 
        element={
          <ProtectedRoute requireModOrHigher>
            <TestGestioneAssegnazioni />
          </ProtectedRoute>
        } 
      />

      {/* Route per Giocatori */}
      <Route 
        path="/giocatore/nuovo/miei-incarichi" 
        element={
          <ProtectedRoute>
            <MieiIncarichiNuovo />
          </ProtectedRoute>
        } 
      />

      {/* Gestione Città (admin, Co-Leader e Gestore) */}
      <Route 
        path="/citta" 
        element={
          <ProtectedRoute requireModOrHigher>
            <GestioneCitta />
          </ProtectedRoute>
        } 
      />

      {/* Rotte Admin */}
      <Route 
        path="/admin/impostazioni" 
        element={
          <ProtectedRoute requireAdmin>
            <Impostazioni />
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/admin/inizializzazione" 
        element={
          <ProtectedRoute requireAdmin>
            <Inizializzazione />
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/admin/derby" 
        element={
          <ProtectedRoute requireAdmin>
            <GestioneDerby />
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/admin/statistiche" 
        element={
          <ProtectedRoute requireAdmin>
            <Statistiche />
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/admin/blocchi" 
        element={
          <ProtectedRoute requireAdmin>
            <Blocchi />
          </ProtectedRoute>
        } 
      />

      {/* Route 404 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
