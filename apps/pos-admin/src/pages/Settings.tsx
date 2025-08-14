import React, { useState } from 'react'
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  TextField,
  Switch,
  FormControlLabel,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert
} from '@mui/material'
import { 
  Store, 
  Receipt, 
  Wifi, 
  Security, 
  Extension,
  Save,
  CloudSync
} from '@mui/icons-material'

interface Module {
  id: string
  name: string
  price: number
  active: boolean
  description: string
}

const Settings: React.FC = () => {
  const [modules, setModules] = useState<Module[]>([
    {
      id: 'pos-core',
      name: 'POS Core',
      price: 12000,
      active: true,
      description: 'Terminal de venta básica'
    },
    {
      id: 'inventory',
      name: 'Gestión de Inventario',
      price: 18000,
      active: true,
      description: 'Control de stock y proveedores'
    },
    {
      id: 'customers',
      name: 'Clientes y Fiado',
      price: 25000,
      active: true,
      description: 'Sistema de clientes con fiado argentino'
    },
    {
      id: 'fiscal',
      name: 'Facturación AFIP',
      price: 35000,
      active: false,
      description: 'Integración con AFIP para facturación electrónica'
    },
    {
      id: 'payments',
      name: 'Pagos Digitales',
      price: 20000,
      active: false,
      description: 'MercadoPago, MODO, transferencias QR'
    }
  ])

  const [storeSettings, setStoreSettings] = useState({
    name: 'Almacén Don Carlos',
    address: 'Av. Rivadavia 1234, CABA',
    phone: '11-4567-8900',
    email: 'info@almacendoncarlos.com.ar',
    cuit: '20-12345678-9'
  })

  const [systemSettings, setSystemSettings] = useState({
    autoBackup: true,
    offlineMode: true,
    printTickets: true,
    syncInterval: 5,
    taxRate: 21
  })

  const [moduleDialog, setModuleDialog] = useState(false)
  const [selectedModule, setSelectedModule] = useState<Module | null>(null)

  const handleModuleToggle = (moduleId: string) => {
    const module = modules.find(m => m.id === moduleId)
    if (module && !module.active) {
      setSelectedModule(module)
      setModuleDialog(true)
    } else {
      setModules(modules.map(m => 
        m.id === moduleId ? { ...m, active: !m.active } : m
      ))
    }
  }

  const handleActivateModule = () => {
    if (selectedModule) {
      setModules(modules.map(m => 
        m.id === selectedModule.id ? { ...m, active: true } : m
      ))
    }
    setModuleDialog(false)
    setSelectedModule(null)
  }

  const totalMonthlyCost = modules
    .filter(m => m.active)
    .reduce((sum, m) => sum + m.price, 0)

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Configuración del Sistema
      </Typography>

      <Grid container spacing={3}>
        {/* Información del Negocio */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader 
              title="Información del Negocio"
              avatar={<Store />}
            />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Nombre del Negocio"
                    value={storeSettings.name}
                    onChange={(e) => setStoreSettings({
                      ...storeSettings,
                      name: e.target.value
                    })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Dirección"
                    value={storeSettings.address}
                    onChange={(e) => setStoreSettings({
                      ...storeSettings,
                      address: e.target.value
                    })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Teléfono"
                    value={storeSettings.phone}
                    onChange={(e) => setStoreSettings({
                      ...storeSettings,
                      phone: e.target.value
                    })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Email"
                    value={storeSettings.email}
                    onChange={(e) => setStoreSettings({
                      ...storeSettings,
                      email: e.target.value
                    })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="CUIT"
                    value={storeSettings.cuit}
                    onChange={(e) => setStoreSettings({
                      ...storeSettings,
                      cuit: e.target.value
                    })}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Configuración del Sistema */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader 
              title="Configuración del Sistema"
              avatar={<Security />}
            />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch 
                        checked={systemSettings.autoBackup}
                        onChange={(e) => setSystemSettings({
                          ...systemSettings,
                          autoBackup: e.target.checked
                        })}
                      />
                    }
                    label="Backup Automático"
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch 
                        checked={systemSettings.offlineMode}
                        onChange={(e) => setSystemSettings({
                          ...systemSettings,
                          offlineMode: e.target.checked
                        })}
                      />
                    }
                    label="Modo Offline"
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch 
                        checked={systemSettings.printTickets}
                        onChange={(e) => setSystemSettings({
                          ...systemSettings,
                          printTickets: e.target.checked
                        })}
                      />
                    }
                    label="Imprimir Tickets Automáticamente"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Intervalo de Sincronización (min)"
                    type="number"
                    value={systemSettings.syncInterval}
                    onChange={(e) => setSystemSettings({
                      ...systemSettings,
                      syncInterval: parseInt(e.target.value)
                    })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Tasa de IVA (%)"
                    type="number"
                    value={systemSettings.taxRate}
                    onChange={(e) => setSystemSettings({
                      ...systemSettings,
                      taxRate: parseFloat(e.target.value)
                    })}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Módulos Instalados */}
        <Grid item xs={12}>
          <Card>
            <CardHeader 
              title="Módulos del Sistema"
              avatar={<Extension />}
              action={
                <Chip 
                  label={`$${totalMonthlyCost.toLocaleString()}/mes`}
                  color="primary"
                  variant="outlined"
                />
              }
            />
            <CardContent>
              <Alert severity="info" sx={{ mb: 2 }}>
                Sistema modular: activa solo los módulos que necesitas para tu negocio.
              </Alert>
              
              <List>
                {modules.map((module, index) => (
                  <React.Fragment key={module.id}>
                    <ListItem>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {module.name}
                            {module.id === 'pos-core' && (
                              <Chip label="Requerido" size="small" color="error" />
                            )}
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" color="textSecondary">
                              {module.description}
                            </Typography>
                            <Typography variant="body2" fontWeight="medium" color="primary">
                              ${module.price.toLocaleString()}/mes
                            </Typography>
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <Switch
                          checked={module.active}
                          onChange={() => handleModuleToggle(module.id)}
                          disabled={module.id === 'pos-core'} // Core es obligatorio
                        />
                      </ListItemSecondaryAction>
                    </ListItem>
                    {index < modules.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Estado de Conexión */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader 
              title="Estado de Conexión"
              avatar={<Wifi />}
            />
            <CardContent>
              <List>
                <ListItem>
                  <ListItemText 
                    primary="Internet"
                    secondary="Conectado"
                  />
                  <Chip label="Online" color="success" size="small" />
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemText 
                    primary="Base de Datos"
                    secondary="PostgreSQL conectada"
                  />
                  <Chip label="OK" color="success" size="small" />
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemText 
                    primary="Última Sincronización"
                    secondary="Hace 2 minutos"
                  />
                  <CloudSync color="action" />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Información del Ticket */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader 
              title="Configuración de Tickets"
              avatar={<Receipt />}
            />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Mensaje en el Ticket"
                    multiline
                    rows={3}
                    defaultValue="¡Gracias por su compra! Vuelva pronto."
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Información Fiscal"
                    multiline
                    rows={2}
                    defaultValue="IVA Responsable Inscripto - CUIT: 20-12345678-9"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Botones de Acción */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button variant="outlined">
              Restaurar Valores
            </Button>
            <Button 
              variant="contained" 
              startIcon={<Save />}
            >
              Guardar Configuración
            </Button>
          </Box>
        </Grid>
      </Grid>

      {/* Dialog de Activación de Módulo */}
      <Dialog open={moduleDialog} onClose={() => setModuleDialog(false)}>
        <DialogTitle>
          Activar Módulo: {selectedModule?.name}
        </DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            {selectedModule?.description}
          </Typography>
          <Typography variant="h6" color="primary" gutterBottom>
            Costo: ${selectedModule?.price.toLocaleString()}/mes
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Este módulo se agregará a tu facturación mensual. 
            Puedes desactivarlo en cualquier momento.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModuleDialog(false)}>
            Cancelar
          </Button>
          <Button 
            variant="contained" 
            onClick={handleActivateModule}
          >
            Activar Módulo
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default Settings