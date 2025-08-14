import React, { useState } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Box,
  Chip,
  IconButton,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  ShoppingCart as CartIcon,
  Payment as PaymentIcon
} from '@mui/icons-material';
import { usePOS } from '../contexts/POSContext';
import { formatCurrency } from '@pos-argentina/shared';
import PaymentDialog from '../components/PaymentDialog';

function SalesTerminal() {
  const { state, addProductToCart, removeProductFromCart, clearCart } = usePOS();
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Filtrar productos por búsqueda y categoría
  const filteredProducts = state.products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (product.barcode && product.barcode.includes(searchTerm));
    const matchesCategory = !selectedCategory || product.category === selectedCategory;
    
    return matchesSearch && matchesCategory && product.active;
  });

  // Obtener categorías únicas
  const categories = Array.from(new Set(state.products.map(p => p.category)));

  // Calcular totales del carrito
  const cartSummary = {
    itemCount: state.cartItems.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: state.cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0),
    tax: state.cartItems.reduce((sum, item) => sum + (item.price * item.quantity * item.tax / 100), 0),
    total: 0
  };
  cartSummary.total = cartSummary.subtotal + cartSummary.tax;

  const handleAddToCart = (productId: string, quantity: number = 1) => {
    const product = state.products.find(p => p.id === productId);
    if (product) {
      addProductToCart(product, quantity);
    }
  };

  const handleUpdateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeProductFromCart(itemId);
    } else {
      // Encontrar el item actual y actualizar
      const item = state.cartItems.find(i => i.id === itemId);
      if (item) {
        const product = state.products.find(p => p.id === item.productId);
        if (product) {
          // Remover item actual y agregar con nueva cantidad
          removeProductFromCart(itemId);
          addProductToCart(product, newQuantity);
        }
      }
    }
  };

  const handleProcessPayment = () => {
    if (state.cartItems.length === 0) {
      return;
    }
    setPaymentDialogOpen(true);
  };

  if (state.isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <Typography>Cargando sistema POS...</Typography>
      </Box>
    );
  }

  if (state.error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Error: {state.error}
      </Alert>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header con búsqueda y categorías */}
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ pb: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                placeholder="Buscar producto por nombre o código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                  label="Todos"
                  onClick={() => setSelectedCategory(null)}
                  color={!selectedCategory ? 'primary' : 'default'}
                  variant={!selectedCategory ? 'filled' : 'outlined'}
                />
                {categories.map(category => (
                  <Chip
                    key={category}
                    label={category}
                    onClick={() => setSelectedCategory(category)}
                    color={selectedCategory === category ? 'primary' : 'default'}
                    variant={selectedCategory === category ? 'filled' : 'outlined'}
                  />
                ))}
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Grid container spacing={2} sx={{ flex: 1 }}>
        {/* Panel de productos */}
        <Grid item xs={12} lg={8}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Productos ({filteredProducts.length})
              </Typography>
              
              <Grid container spacing={2}>
                {filteredProducts.map(product => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={product.id}>
                    <Card 
                      variant="outlined"
                      sx={{
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: 2
                        }
                      }}
                      onClick={() => handleAddToCart(product.id)}
                    >
                      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                        <Typography 
                          variant="subtitle2" 
                          noWrap 
                          sx={{ fontWeight: 600, mb: 1 }}
                        >
                          {product.name}
                        </Typography>
                        
                        <Typography 
                          variant="h6" 
                          color="primary" 
                          sx={{ fontWeight: 700 }}
                        >
                          {formatCurrency(product.price)}
                        </Typography>
                        
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                          <Chip 
                            size="small" 
                            label={`Stock: ${product.stock}`}
                            color={product.stock <= product.minStock ? 'warning' : 'success'}
                            variant="outlined"
                          />
                          
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddToCart(product.id);
                            }}
                          >
                            <AddIcon />
                          </IconButton>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
                
                {filteredProducts.length === 0 && (
                  <Grid item xs={12}>
                    <Box textAlign="center" py={4}>
                      <Typography color="text.secondary">
                        No se encontraron productos
                      </Typography>
                    </Box>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Panel del carrito */}
        <Grid item xs={12} lg={4}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <CartIcon sx={{ mr: 1 }} />
                <Typography variant="h6">
                  Carrito ({cartSummary.itemCount})
                </Typography>
                {state.cartItems.length > 0 && (
                  <Button
                    size="small"
                    color="error"
                    onClick={clearCart}
                    sx={{ ml: 'auto' }}
                  >
                    Limpiar
                  </Button>
                )}
              </Box>

              {/* Items del carrito */}
              <Box sx={{ flex: 1, overflowY: 'auto', mb: 2 }}>
                {state.cartItems.length === 0 ? (
                  <Box 
                    sx={{ 
                      display: 'flex', 
                      flexDirection: 'column',
                      alignItems: 'center', 
                      justifyContent: 'center',
                      height: 200,
                      color: 'text.secondary'
                    }}
                  >
                    <CartIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
                    <Typography>Carrito vacío</Typography>
                    <Typography variant="body2">
                      Selecciona productos para agregar
                    </Typography>
                  </Box>
                ) : (
                  state.cartItems.map(item => (
                    <Box key={item.id} sx={{ mb: 2, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, flex: 1 }}>
                          {item.name}
                        </Typography>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => removeProductFromCart(item.id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <IconButton
                            size="small"
                            onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                          >
                            <RemoveIcon />
                          </IconButton>
                          
                          <Typography sx={{ mx: 2, minWidth: 20, textAlign: 'center' }}>
                            {item.quantity}
                          </Typography>
                          
                          <IconButton
                            size="small"
                            onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                          >
                            <AddIcon />
                          </IconButton>
                        </Box>
                        
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {formatCurrency(item.price * item.quantity)}
                        </Typography>
                      </Box>
                      
                      <Typography variant="caption" color="text.secondary">
                        {formatCurrency(item.price)} c/u
                      </Typography>
                    </Box>
                  ))
                )}
              </Box>

              {/* Totales */}
              {state.cartItems.length > 0 && (
                <>
                  <Divider sx={{ mb: 2 }} />
                  
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography>Subtotal:</Typography>
                      <Typography>{formatCurrency(cartSummary.subtotal)}</Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography>IVA (21%):</Typography>
                      <Typography>{formatCurrency(cartSummary.tax)}</Typography>
                    </Box>
                    
                    <Divider sx={{ my: 1 }} />
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>Total:</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
                        {formatCurrency(cartSummary.total)}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Botón de pago */}
                  <Button
                    variant="contained"
                    size="large"
                    fullWidth
                    startIcon={<PaymentIcon />}
                    onClick={handleProcessPayment}
                    sx={{ 
                      py: 1.5,
                      fontSize: '1.1rem',
                      fontWeight: 600
                    }}
                  >
                    COBRAR
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Dialog de pago */}
      <PaymentDialog
        open={paymentDialogOpen}
        onClose={() => setPaymentDialogOpen(false)}
        total={cartSummary.total}
      />
    </Box>
  );
}

export default SalesTerminal;