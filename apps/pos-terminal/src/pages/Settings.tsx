import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  TextField,
  Button,
  Divider,
  Alert
} from '@mui/material';
import {
  Store as StoreIcon,
  Receipt as ReceiptIcon,
  Security as SecurityIcon,
  Sync as SyncIcon
} from '@mui/icons-material';

function Settings() {
  const [settings, setSettings] = React.useState({
    // Configuración del comercio
    storeName: 'Almacén Don Carlos',
    storeAddress: 'Av. Corrientes 1234, CABA',
    storePhone: '011-1234-5678',
    storeCuit: '20-12345678-9',
    
    // Configuración de impresión
    autoPrint: true,
    printCopies: 1,
    footerMessage: 'Gracias por su compra - ¡Vuelva pronto!',
    
    // Configuración operativa
    requireCustomer: false,
    allowNegativeStock: false,
    autoBackup: true,
    
    // Configuración de sincronización
    syncInterval: 5, // minutos
    offlineMode: false
  });

  const handleSettingChange = (key: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = () => {
    // Aquí guardarías la configuración
    console.log('Settings saved:', settings);
    alert('Configuración guardada exitosamente');
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Configuración
      </Typography>
      
      <Typography color="text.secondary" paragraph>
        Personaliza el comportamiento de tu sistema POS.
      </Typography>

      <Grid container spacing={3}>
        {/* Configuración del comercio */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <StoreIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">
                  Datos del Comercio
                </Typography>
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Nombre del comercio"
                    value={settings.storeName}
                    onChange={handleSettingChange('storeName')}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Dirección"
                    value={settings.storeAddress}
                    onChange={handleSettingChange('storeAddress')}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Teléfono"
                    value={settings.storePhone}
                    onChange={handleSettingChange('storePhone')}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="CUIT"
                    value={settings.storeCuit}
                    onChange={handleSettingChange('storeCuit')}
                    helperText="Requerido para facturación electrónica"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Configuración de impresión */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <ReceiptIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">
                  Impresión y Tickets
                </Typography>
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.autoPrint}
                        onChange={handleSettingChange('autoPrint')}
                      />
                    }
                    label="Imprimir automáticamente después del pago"
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Copias del ticket"
                    value={settings.printCopies}
                    onChange={handleSettingChange('printCopies')}
                    inputProps={{ min: 1, max: 5 }}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    label="Mensaje del pie de ticket"
                    value={settings.footerMessage}
                    onChange={handleSettingChange('footerMessage')}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Configuración operativa */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <SecurityIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">
                  Operación y Seguridad
                </Typography>
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.requireCustomer}
                        onChange={handleSettingChange('requireCustomer')}
                      />
                    }
                    label="Requerir cliente para todas las ventas"
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.allowNegativeStock}
                        onChange={handleSettingChange('allowNegativeStock')}
                      />
                    }
                    label="Permitir venta con stock negativo"
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.autoBackup}
                        onChange={handleSettingChange('autoBackup')}
                      />
                    }
                    label="Backup automático diario"
                  />
                </Grid>
              </Grid>

              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  Los cambios de seguridad requieren reiniciar la aplicación.
                </Typography>
              </Alert>
            </CardContent>
          </Card>
        </Grid>

        {/* Configuración de sincronización */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <SyncIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">
                  Sincronización
                </Typography>
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.offlineMode}
                        onChange={handleSettingChange('offlineMode')}
                      />
                    }
                    label="Modo offline permanente"
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Intervalo de sincronización (minutos)"
                    value={settings.syncInterval}
                    onChange={handleSettingChange('syncInterval')}
                    inputProps={{ min: 1, max: 60 }}
                    disabled={settings.offlineMode}
                  />
                </Grid>
              </Grid>

              <Alert severity="warning" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  En modo offline, los datos se sincronizarán manualmente.
                  Asegúrate de hacer backups regulares.
                </Typography>
              </Alert>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Acciones */}
      <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        <Button variant="outlined" size="large">
          Restaurar Valores por Defecto
        </Button>
        
        <Button variant="contained" size="large" onClick={handleSave}>
          Guardar Configuración
        </Button>
      </Box>

      {/* Información del sistema */}
      <Divider sx={{ my: 4 }} />
      
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Información del Sistema
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary" display="block">
                Versión
              </Typography>
              <Typography variant="body2">
                v0.1.0-alpha
              </Typography>
            </Grid>
            
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary" display="block">
                Terminal ID
              </Typography>
              <Typography variant="body2">
                TERM-001
              </Typography>
            </Grid>
            
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary" display="block">
                Última Sincronización
              </Typography>
              <Typography variant="body2">
                {new Date().toLocaleString('es-AR')}
              </Typography>
            </Grid>
            
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary" display="block">
                Licencia
              </Typography>
              <Typography variant="body2" color="success.main">
                Activa
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
}

export default Settings;