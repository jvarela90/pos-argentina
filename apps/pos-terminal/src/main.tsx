import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import App from './App';
import { POSProvider } from './contexts/POSContext';
import { registerSW } from 'virtual:pwa-register';

// Tema para Argentina con colores apropiados
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2', // Azul argentino
      light: '#42a5f5',
      dark: '#1565c0',
    },
    secondary: {
      main: '#f57c00', // Naranja complementario
      light: '#ffb74d',
      dark: '#e65100',
    },
    success: {
      main: '#388e3c', // Verde para éxito
    },
    error: {
      main: '#d32f2f', // Rojo para errores
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    }
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 500,
    },
    button: {
      textTransform: 'none', // Sin mayúsculas forzadas
      fontWeight: 500,
    }
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
        sizeLarge: {
          fontSize: '1.1rem',
          padding: '12px 24px',
          minHeight: 48,
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }
      }
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          }
        }
      }
    }
  }
});

// Registrar Service Worker para PWA
const updateSW = registerSW({
  onNeedRefresh() {
    // Mostrar notificación para actualizar
    console.log('🔄 Nueva versión disponible, recargando...');
    updateSW(true);
  },
  onOfflineReady() {
    console.log('📱 Aplicación lista para funcionar offline');
  },
});

// Inicializar aplicación
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <POSProvider>
          <App />
        </POSProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
);

// Log de inicio para debugging
console.log('🏪 POS Argentina Terminal inicializado');
console.log('Environment:', import.meta.env.MODE);
console.log('PWA enabled:', 'serviceWorker' in navigator);