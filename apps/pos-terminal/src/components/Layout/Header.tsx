import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  IconButton,
  Chip,
  Avatar
} from '@mui/material';
import {
  Store as StoreIcon,
  Wifi as WifiIcon,
  WifiOff as WifiOffIcon,
  Notifications as NotificationsIcon
} from '@mui/icons-material';

function Header() {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);
  const [currentTime, setCurrentTime] = React.useState(new Date());

  // Actualizar estado de conexión
  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Actualizar reloj cada segundo
  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <AppBar 
      position="static" 
      elevation={2}
      sx={{ 
        backgroundColor: 'primary.main',
        zIndex: (theme) => theme.zIndex.drawer + 1 
      }}
    >
      <Toolbar sx={{ minHeight: 64 }}>
        {/* Logo y título */}
        <Box sx={{ display: 'flex', alignItems: 'center', mr: 3 }}>
          <StoreIcon sx={{ mr: 1, fontSize: 28 }} />
          <Box>
            <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
              Almacén Don Carlos
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.8, lineHeight: 1 }}>
              Terminal POS Argentina
            </Typography>
          </Box>
        </Box>

        {/* Espaciador */}
        <Box sx={{ flexGrow: 1 }} />

        {/* Información central */}
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          mx: 2
        }}>
          <Typography 
            variant="h5" 
            component="div" 
            sx={{ 
              fontWeight: 500, 
              fontFamily: 'monospace',
              letterSpacing: 1
            }}
          >
            {formatTime(currentTime)}
          </Typography>
          <Typography 
            variant="body2" 
            sx={{ 
              opacity: 0.9,
              textTransform: 'capitalize'
            }}
          >
            {formatDate(currentTime)}
          </Typography>
        </Box>

        {/* Espaciador */}
        <Box sx={{ flexGrow: 1 }} />

        {/* Indicadores de estado */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Estado de conexión */}
          <Chip
            icon={isOnline ? <WifiIcon /> : <WifiOffIcon />}
            label={isOnline ? 'Online' : 'Offline'}
            color={isOnline ? 'success' : 'warning'}
            size="small"
            sx={{ 
              backgroundColor: isOnline ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255, 193, 7, 0.2)',
              color: 'white',
              '& .MuiChip-icon': { color: 'white' }
            }}
          />

          {/* Notificaciones */}
          <IconButton color="inherit" size="large">
            <NotificationsIcon />
          </IconButton>

          {/* Usuario */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar 
              sx={{ 
                width: 40, 
                height: 40,
                backgroundColor: 'primary.dark'
              }}
            >
              V
            </Avatar>
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <Typography variant="body2" sx={{ lineHeight: 1.2 }}>
                Vendedor
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                Terminal 01
              </Typography>
            </Box>
          </Box>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

export default Header;