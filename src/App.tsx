import { ThemeProvider, createTheme } from '@mui/material';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from './componenti/autenticazione/AuthContext';
import { AnnunciProvider } from './componenti/annunci/AnnunciContext';
import AppRoutes from './routes';
import theme from './theme';
import GestioneDerby from './pagine/admin/GestioneDerby';
import Statistiche from './pagine/admin/Statistiche';

// Tema personalizzato di Material-UI
const themeMui = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={themeMui}>
      <Router>
        <AuthProvider>
          <AnnunciProvider>
            <AppRoutes />
          </AnnunciProvider>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;
