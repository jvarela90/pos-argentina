import React, { useState, useEffect } from 'react'
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
  Alert
} from '@mui/material'
import { Add, Edit, Delete, Warning } from '@mui/icons-material'

interface Product {
  id: string
  name: string
  price: number
  category: string
  stock: number
  minStock: number
  active: boolean
}

const Products: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([
    {
      id: '1',
      name: 'Pan Lactal',
      price: 850,
      category: 'Panadería',
      stock: 25,
      minStock: 5,
      active: true
    },
    {
      id: '2',
      name: 'Leche Entera 1L',
      price: 900,
      category: 'Lácteos',
      stock: 3,
      minStock: 10,
      active: true
    },
    {
      id: '3',
      name: 'Coca Cola 500ml',
      price: 650,
      category: 'Bebidas',
      stock: 50,
      minStock: 15,
      active: true
    }
  ])

  const [open, setOpen] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)

  const lowStockProducts = products.filter(p => p.stock <= p.minStock)

  const handleAddProduct = () => {
    setEditProduct(null)
    setOpen(true)
  }

  const handleEditProduct = (product: Product) => {
    setEditProduct(product)
    setOpen(true)
  }

  const handleClose = () => {
    setOpen(false)
    setEditProduct(null)
  }

  const getStockStatus = (product: Product) => {
    if (product.stock === 0) {
      return <Chip label="Sin Stock" color="error" size="small" />
    } else if (product.stock <= product.minStock) {
      return <Chip label="Stock Bajo" color="warning" size="small" />
    } else {
      return <Chip label="Stock OK" color="success" size="small" />
    }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Gestión de Productos
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleAddProduct}
        >
          Agregar Producto
        </Button>
      </Box>

      {lowStockProducts.length > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Warning />
            <span>
              Tienes {lowStockProducts.length} producto(s) con stock bajo: {' '}
              {lowStockProducts.map(p => p.name).join(', ')}
            </span>
          </Box>
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>Categoría</TableCell>
              <TableCell align="right">Precio</TableCell>
              <TableCell align="center">Stock</TableCell>
              <TableCell align="center">Estado</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id}>
                <TableCell component="th" scope="row">
                  {product.name}
                </TableCell>
                <TableCell>{product.category}</TableCell>
                <TableCell align="right">${product.price.toLocaleString()}</TableCell>
                <TableCell align="center">
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Typography variant="body2">
                      {product.stock} / {product.minStock}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      actual / mínimo
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell align="center">
                  {getStockStatus(product)}
                </TableCell>
                <TableCell align="center">
                  <IconButton 
                    onClick={() => handleEditProduct(product)}
                    color="primary"
                  >
                    <Edit />
                  </IconButton>
                  <IconButton color="error">
                    <Delete />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog para agregar/editar producto */}
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>
          {editProduct ? 'Editar Producto' : 'Agregar Nuevo Producto'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Nombre del Producto"
                defaultValue={editProduct?.name || ''}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Categoría"
                defaultValue={editProduct?.category || ''}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Precio"
                type="number"
                defaultValue={editProduct?.price || ''}
                InputProps={{
                  startAdornment: '$'
                }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Stock Actual"
                type="number"
                defaultValue={editProduct?.stock || ''}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Stock Mínimo"
                type="number"
                defaultValue={editProduct?.minStock || ''}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancelar</Button>
          <Button variant="contained" onClick={handleClose}>
            {editProduct ? 'Actualizar' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default Products