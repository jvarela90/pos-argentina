import React, { useState } from 'react'
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Tabs,
  Tab,
  Card,
  CardContent,
  Avatar
} from '@mui/material'
import { Add, Edit, AccountCircle, CreditCard, History } from '@mui/icons-material'

interface Customer {
  id: string
  name: string
  email: string
  phone: string
  fiadoBalance: number
  fiadoLimit: number
  loyaltyPoints: number
  status: 'active' | 'inactive' | 'blocked'
}

interface FiadoTransaction {
  id: string
  date: string
  type: 'debt' | 'payment'
  amount: number
  description: string
}

const Customers: React.FC = () => {
  const [customers] = useState<Customer[]>([
    {
      id: '1',
      name: 'María González',
      email: 'maria.gonzalez@email.com',
      phone: '11-4567-8901',
      fiadoBalance: 15420,
      fiadoLimit: 50000,
      loyaltyPoints: 2340,
      status: 'active'
    },
    {
      id: '2',
      name: 'Carlos Fernández',
      email: 'carlos.fernandez@email.com',
      phone: '11-2345-6789',
      fiadoBalance: 0,
      fiadoLimit: 30000,
      loyaltyPoints: 890,
      status: 'active'
    },
    {
      id: '3',
      name: 'Ana Martínez',
      email: 'ana.martinez@email.com',
      phone: '11-3456-7890',
      fiadoBalance: 28750,
      fiadoLimit: 75000,
      loyaltyPoints: 4560,
      status: 'active'
    }
  ])

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [tabValue, setTabValue] = useState(0)
  const [open, setOpen] = useState(false)

  const fiadoTransactions: FiadoTransaction[] = [
    {
      id: '1',
      date: '2024-01-15',
      type: 'debt',
      amount: 5420,
      description: 'Compra varios productos'
    },
    {
      id: '2',
      date: '2024-01-10',
      type: 'payment',
      amount: 10000,
      description: 'Pago en efectivo'
    },
    {
      id: '3',
      date: '2024-01-08',
      type: 'debt',
      amount: 20000,
      description: 'Compra semanal'
    }
  ]

  const getStatusChip = (status: Customer['status']) => {
    const statusConfig = {
      active: { label: 'Activo', color: 'success' as const },
      inactive: { label: 'Inactivo', color: 'default' as const },
      blocked: { label: 'Bloqueado', color: 'error' as const }
    }

    const config = statusConfig[status]
    return <Chip label={config.label} color={config.color} size="small" />
  }

  const getFiadoStatus = (balance: number, limit: number) => {
    const percentage = (balance / limit) * 100
    
    if (balance === 0) {
      return <Chip label="Sin Deuda" color="success" size="small" />
    } else if (percentage < 50) {
      return <Chip label="Deuda Baja" color="info" size="small" />
    } else if (percentage < 80) {
      return <Chip label="Deuda Media" color="warning" size="small" />
    } else {
      return <Chip label="Deuda Alta" color="error" size="small" />
    }
  }

  const handleCustomerDetail = (customer: Customer) => {
    setSelectedCustomer(customer)
    setOpen(true)
  }

  const handleClose = () => {
    setOpen(false)
    setSelectedCustomer(null)
    setTabValue(0)
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Gestión de Clientes
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
        >
          Agregar Cliente
        </Button>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Clientes
              </Typography>
              <Typography variant="h5">
                {customers.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Clientes con Fiado
              </Typography>
              <Typography variant="h5">
                {customers.filter(c => c.fiadoBalance > 0).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Deuda
              </Typography>
              <Typography variant="h5" color="error">
                ${customers.reduce((sum, c) => sum + c.fiadoBalance, 0).toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Puntos de Lealtad
              </Typography>
              <Typography variant="h5" color="primary">
                {customers.reduce((sum, c) => sum + c.loyaltyPoints, 0).toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Cliente</TableCell>
              <TableCell>Contacto</TableCell>
              <TableCell align="center">Fiado</TableCell>
              <TableCell align="center">Puntos</TableCell>
              <TableCell align="center">Estado</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {customers.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar>
                      <AccountCircle />
                    </Avatar>
                    <Box>
                      <Typography variant="body1" fontWeight="medium">
                        {customer.name}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Box>
                    <Typography variant="body2">{customer.email}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      {customer.phone}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell align="center">
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Typography variant="body2" fontWeight="medium">
                      ${customer.fiadoBalance.toLocaleString()}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      de ${customer.fiadoLimit.toLocaleString()}
                    </Typography>
                    {getFiadoStatus(customer.fiadoBalance, customer.fiadoLimit)}
                  </Box>
                </TableCell>
                <TableCell align="center">
                  <Typography variant="body2" color="primary" fontWeight="medium">
                    {customer.loyaltyPoints.toLocaleString()}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  {getStatusChip(customer.status)}
                </TableCell>
                <TableCell align="center">
                  <IconButton 
                    onClick={() => handleCustomerDetail(customer)}
                    color="primary"
                  >
                    <Edit />
                  </IconButton>
                  <IconButton color="info">
                    <History />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog de detalle del cliente */}
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedCustomer?.name}
        </DialogTitle>
        <DialogContent>
          <Tabs value={tabValue} onChange={(_, value) => setTabValue(value)} sx={{ mb: 3 }}>
            <Tab label="Información General" />
            <Tab label="Historial de Fiado" />
            <Tab label="Puntos de Lealtad" />
          </Tabs>

          {tabValue === 0 && selectedCustomer && (
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Nombre"
                  defaultValue={selectedCustomer.name}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email"
                  defaultValue={selectedCustomer.email}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Teléfono"
                  defaultValue={selectedCustomer.phone}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Límite de Fiado"
                  type="number"
                  defaultValue={selectedCustomer.fiadoLimit}
                  InputProps={{
                    startAdornment: '$'
                  }}
                />
              </Grid>
            </Grid>
          )}

          {tabValue === 1 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Historial de Transacciones
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Fecha</TableCell>
                      <TableCell>Tipo</TableCell>
                      <TableCell>Descripción</TableCell>
                      <TableCell align="right">Monto</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {fiadoTransactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>{transaction.date}</TableCell>
                        <TableCell>
                          <Chip 
                            label={transaction.type === 'debt' ? 'Deuda' : 'Pago'}
                            color={transaction.type === 'debt' ? 'error' : 'success'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{transaction.description}</TableCell>
                        <TableCell align="right">
                          <Typography 
                            color={transaction.type === 'debt' ? 'error' : 'success'}
                            fontWeight="medium"
                          >
                            {transaction.type === 'debt' ? '+' : '-'}${transaction.amount.toLocaleString()}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {tabValue === 2 && selectedCustomer && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Puntos de Lealtad
              </Typography>
              <Card sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="h4" color="primary" gutterBottom>
                    {selectedCustomer.loyaltyPoints.toLocaleString()}
                  </Typography>
                  <Typography color="textSecondary">
                    Puntos disponibles
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Equivale a ${Math.floor(selectedCustomer.loyaltyPoints / 100).toLocaleString()} en descuentos
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cerrar</Button>
          <Button variant="contained" onClick={handleClose}>
            Guardar Cambios
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default Customers