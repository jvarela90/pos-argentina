import React, { useState } from 'react'
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip
} from '@mui/material'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts'
import { Download, TrendingUp, Inventory, People } from '@mui/icons-material'

const Reports: React.FC = () => {
  const [reportType, setReportType] = useState('sales')
  const [dateRange, setDateRange] = useState('week')

  // Datos de ejemplo para gráficos
  const salesData = [
    { name: 'Lun', ventas: 12, monto: 15420 },
    { name: 'Mar', ventas: 19, monto: 24680 },
    { name: 'Mié', ventas: 15, monto: 18950 },
    { name: 'Jue', ventas: 22, monto: 28340 },
    { name: 'Vie', ventas: 28, monto: 35680 },
    { name: 'Sáb', ventas: 35, monto: 45290 },
    { name: 'Dom', ventas: 18, monto: 23150 }
  ]

  const categoryData = [
    { name: 'Bebidas', value: 35, color: '#0088FE' },
    { name: 'Lácteos', value: 25, color: '#00C49F' },
    { name: 'Panadería', value: 20, color: '#FFBB28' },
    { name: 'Limpieza', value: 15, color: '#FF8042' },
    { name: 'Otros', value: 5, color: '#8884D8' }
  ]

  const topProducts = [
    { name: 'Coca Cola 500ml', cantidad: 145, ingresos: 94250 },
    { name: 'Pan Lactal', cantidad: 89, ingresos: 75650 },
    { name: 'Leche Entera 1L', cantidad: 67, ingresos: 60300 },
    { name: 'Aceite Girasol', cantidad: 45, ingresos: 81000 },
    { name: 'Arroz 1kg', cantidad: 38, ingresos: 45600 }
  ]

  const customerStats = [
    { nombre: 'María González', compras: 12, total: 45680, puntos: 2340 },
    { nombre: 'Ana Martínez', compras: 8, total: 28750, puntos: 1890 },
    { nombre: 'Carlos Fernández', compras: 15, total: 52340, puntos: 3120 },
    { nombre: 'Roberto Silva', compras: 6, total: 18920, puntos: 980 }
  ]

  const renderContent = () => {
    switch (reportType) {
      case 'sales':
        return (
          <Grid container spacing={3}>
            {/* KPIs */}
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TrendingUp color="primary" />
                    <Box>
                      <Typography color="textSecondary" variant="body2">
                        Ventas Totales
                      </Typography>
                      <Typography variant="h6">
                        149
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" variant="body2">
                    Ingresos
                  </Typography>
                  <Typography variant="h6" color="primary">
                    $191,510
                  </Typography>
                  <Typography variant="body2" color="success.main">
                    +12.5% vs semana anterior
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" variant="body2">
                    Ticket Promedio
                  </Typography>
                  <Typography variant="h6">
                    $1,285
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" variant="body2">
                    Productos Vendidos
                  </Typography>
                  <Typography variant="h6">
                    384
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Gráfico de ventas por día */}
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Ventas por Día
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={salesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value, name) => [
                        name === 'monto' ? `$${value}` : value,
                        name === 'monto' ? 'Monto' : 'Ventas'
                      ]}
                    />
                    <Bar dataKey="ventas" fill="#8884d8" name="ventas" />
                    <Bar dataKey="monto" fill="#82ca9d" name="monto" />
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>

            {/* Ventas por categoría */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Ventas por Categoría
                </Typography>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>

            {/* Top productos */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Productos Más Vendidos
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Producto</TableCell>
                        <TableCell align="center">Cantidad</TableCell>
                        <TableCell align="right">Ingresos</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {topProducts.map((product, index) => (
                        <TableRow key={index}>
                          <TableCell>{product.name}</TableCell>
                          <TableCell align="center">{product.cantidad}</TableCell>
                          <TableCell align="right">${product.ingresos.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>
          </Grid>
        )

      case 'inventory':
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Estado del Inventario
                </Typography>
                <Typography variant="body1">
                  Reportes de inventario en desarrollo...
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        )

      case 'customers':
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Análisis de Clientes
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Cliente</TableCell>
                        <TableCell align="center">Compras</TableCell>
                        <TableCell align="right">Total Gastado</TableCell>
                        <TableCell align="center">Puntos</TableCell>
                        <TableCell align="center">Categoría</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {customerStats.map((customer, index) => (
                        <TableRow key={index}>
                          <TableCell>{customer.nombre}</TableCell>
                          <TableCell align="center">{customer.compras}</TableCell>
                          <TableCell align="right">${customer.total.toLocaleString()}</TableCell>
                          <TableCell align="center">{customer.puntos}</TableCell>
                          <TableCell align="center">
                            <Chip 
                              label={customer.total > 40000 ? 'VIP' : customer.total > 20000 ? 'Frecuente' : 'Regular'}
                              color={customer.total > 40000 ? 'success' : customer.total > 20000 ? 'primary' : 'default'}
                              size="small"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>
          </Grid>
        )

      default:
        return null
    }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Reportes y Análisis
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Download />}
        >
          Exportar PDF
        </Button>
      </Box>

      {/* Filtros */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel>Tipo de Reporte</InputLabel>
              <Select
                value={reportType}
                label="Tipo de Reporte"
                onChange={(e) => setReportType(e.target.value)}
              >
                <MenuItem value="sales">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TrendingUp />
                    Ventas
                  </Box>
                </MenuItem>
                <MenuItem value="inventory">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Inventory />
                    Inventario
                  </Box>
                </MenuItem>
                <MenuItem value="customers">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <People />
                    Clientes
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel>Período</InputLabel>
              <Select
                value={dateRange}
                label="Período"
                onChange={(e) => setDateRange(e.target.value)}
              >
                <MenuItem value="day">Hoy</MenuItem>
                <MenuItem value="week">Esta Semana</MenuItem>
                <MenuItem value="month">Este Mes</MenuItem>
                <MenuItem value="quarter">Este Trimestre</MenuItem>
                <MenuItem value="year">Este Año</MenuItem>
                <MenuItem value="custom">Personalizado</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {dateRange === 'custom' && (
            <>
              <Grid item xs={12} sm={2}>
                <TextField
                  fullWidth
                  label="Desde"
                  type="date"
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={2}>
                <TextField
                  fullWidth
                  label="Hasta"
                  type="date"
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
              </Grid>
            </>
          )}
        </Grid>
      </Paper>

      {/* Contenido del reporte */}
      {renderContent()}
    </Box>
  )
}

export default Reports