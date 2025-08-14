import React, { useState } from 'react'
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Grid,
  Card,
  CardContent,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material'
import { Receipt, Visibility, Print } from '@mui/icons-material'

interface Sale {
  id: string
  date: string
  customer?: string
  items: number
  subtotal: number
  tax: number
  total: number
  paymentMethod: string
  status: 'completed' | 'pending' | 'cancelled'
}

interface SaleItem {
  name: string
  quantity: number
  price: number
  total: number
}

const Sales: React.FC = () => {
  const [sales] = useState<Sale[]>([
    {
      id: 'SALE-001',
      date: '2024-01-15 14:30',
      customer: 'María González',
      items: 3,
      subtotal: 2500,
      tax: 525,
      total: 3025,
      paymentMethod: 'Efectivo',
      status: 'completed'
    },
    {
      id: 'SALE-002',
      date: '2024-01-15 13:45',
      items: 2,
      subtotal: 1800,
      tax: 378,
      total: 2178,
      paymentMethod: 'Tarjeta',
      status: 'completed'
    },
    {
      id: 'SALE-003',
      date: '2024-01-15 12:20',
      customer: 'Carlos Fernández',
      items: 5,
      subtotal: 4200,
      tax: 882,
      total: 5082,
      paymentMethod: 'Fiado',
      status: 'completed'
    },
    {
      id: 'SALE-004',
      date: '2024-01-15 11:15',
      items: 1,
      subtotal: 850,
      tax: 178.5,
      total: 1028.5,
      paymentMethod: 'QR MercadoPago',
      status: 'completed'
    }
  ])

  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [open, setOpen] = useState(false)
  const [dateFilter, setDateFilter] = useState('')

  const saleItems: SaleItem[] = [
    { name: 'Pan Lactal', quantity: 2, price: 850, total: 1700 },
    { name: 'Leche Entera 1L', quantity: 1, price: 900, total: 900 },
    { name: 'Coca Cola 500ml', quantity: 1, price: 650, total: 650 }
  ]

  const todaySales = sales.filter(sale => 
    sale.date.startsWith('2024-01-15')
  )

  const todayStats = {
    totalSales: todaySales.length,
    totalAmount: todaySales.reduce((sum, sale) => sum + sale.total, 0),
    totalItems: todaySales.reduce((sum, sale) => sum + sale.items, 0),
    averageTicket: todaySales.length > 0 
      ? todaySales.reduce((sum, sale) => sum + sale.total, 0) / todaySales.length 
      : 0
  }

  const handleViewSale = (sale: Sale) => {
    setSelectedSale(sale)
    setOpen(true)
  }

  const handleClose = () => {
    setOpen(false)
    setSelectedSale(null)
  }

  const getStatusChip = (status: Sale['status']) => {
    const statusConfig = {
      completed: { label: 'Completada', color: 'success' as const },
      pending: { label: 'Pendiente', color: 'warning' as const },
      cancelled: { label: 'Cancelada', color: 'error' as const }
    }

    const config = statusConfig[status]
    return <Chip label={config.label} color={config.color} size="small" />
  }

  const getPaymentMethodChip = (method: string) => {
    const methodColors: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
      'Efectivo': 'success',
      'Tarjeta': 'primary',
      'Fiado': 'warning',
      'QR MercadoPago': 'info'
    }

    return (
      <Chip 
        label={method} 
        color={methodColors[method] || 'default'} 
        size="small" 
        variant="outlined"
      />
    )
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Ventas
      </Typography>

      {/* Estadísticas del día */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Ventas Hoy
              </Typography>
              <Typography variant="h5">
                {todayStats.totalSales}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Facturado
              </Typography>
              <Typography variant="h5" color="primary">
                ${todayStats.totalAmount.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Productos Vendidos
              </Typography>
              <Typography variant="h5">
                {todayStats.totalItems}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Ticket Promedio
              </Typography>
              <Typography variant="h5">
                ${todayStats.averageTicket.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filtros */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
        <TextField
          label="Filtrar por fecha"
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          InputLabelProps={{
            shrink: true,
          }}
        />
        <Button variant="outlined">
          Exportar
        </Button>
      </Box>

      {/* Tabla de ventas */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Venta</TableCell>
              <TableCell>Fecha</TableCell>
              <TableCell>Cliente</TableCell>
              <TableCell align="center">Items</TableCell>
              <TableCell align="right">Total</TableCell>
              <TableCell align="center">Pago</TableCell>
              <TableCell align="center">Estado</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sales.map((sale) => (
              <TableRow key={sale.id}>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {sale.id}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {new Date(sale.date).toLocaleString('es-AR')}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {sale.customer || 'Cliente ocasional'}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Typography variant="body2">
                    {sale.items}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" fontWeight="medium">
                    ${sale.total.toLocaleString()}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  {getPaymentMethodChip(sale.paymentMethod)}
                </TableCell>
                <TableCell align="center">
                  {getStatusChip(sale.status)}
                </TableCell>
                <TableCell align="center">
                  <Button
                    size="small"
                    startIcon={<Visibility />}
                    onClick={() => handleViewSale(sale)}
                  >
                    Ver
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog de detalle de venta */}
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Receipt />
          Detalle de Venta - {selectedSale?.id}
        </DialogTitle>
        <DialogContent>
          {selectedSale && (
            <Box>
              {/* Información de la venta */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    Fecha
                  </Typography>
                  <Typography variant="body1">
                    {new Date(selectedSale.date).toLocaleString('es-AR')}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    Cliente
                  </Typography>
                  <Typography variant="body1">
                    {selectedSale.customer || 'Cliente ocasional'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    Método de Pago
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    {getPaymentMethodChip(selectedSale.paymentMethod)}
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    Estado
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    {getStatusChip(selectedSale.status)}
                  </Box>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              {/* Items de la venta */}
              <Typography variant="h6" gutterBottom>
                Productos
              </Typography>
              <List>
                {saleItems.map((item, index) => (
                  <ListItem key={index} sx={{ px: 0 }}>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography>
                            {item.name} x {item.quantity}
                          </Typography>
                          <Typography fontWeight="medium">
                            ${item.total.toLocaleString()}
                          </Typography>
                        </Box>
                      }
                      secondary={`$${item.price} c/u`}
                    />
                  </ListItem>
                ))}
              </List>

              <Divider sx={{ my: 2 }} />

              {/* Totales */}
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="body1">
                  Subtotal: ${selectedSale.subtotal.toLocaleString()}
                </Typography>
                <Typography variant="body1">
                  IVA (21%): ${selectedSale.tax.toLocaleString()}
                </Typography>
                <Typography variant="h6" fontWeight="bold" sx={{ mt: 1 }}>
                  Total: ${selectedSale.total.toLocaleString()}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>
            Cerrar
          </Button>
          <Button variant="outlined" startIcon={<Print />}>
            Reimprimir Ticket
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default Sales