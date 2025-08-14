import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  Box,
  Alert,
  CircularProgress,
  Divider
} from '@mui/material';
import {
  MonetizationOn as CashIcon,
  CreditCard as CardIcon,
  Smartphone as PhoneIcon,
  QrCode as QrIcon,
  AccountBalance as BankIcon,
  Store as StoreIcon
} from '@mui/icons-material';
import { usePOS } from '../contexts/POSContext';
import { formatCurrency } from '@pos-argentina/shared';

interface PaymentDialogProps {
  open: boolean;
  onClose: () => void;
  total: number;
}

interface PaymentMethod {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  description: string;
}

function PaymentDialog({ open, onClose, total }: PaymentDialogProps) {
  const { processPayment } = usePOS();
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [cashAmount, setCashAmount] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const paymentMethods: PaymentMethod[] = [
    {
      id: 'cash',
      name: 'Efectivo',
      icon: <CashIcon />,
      color: '#4CAF50',
      description: 'Pago en efectivo con vuelto'
    },
    {
      id: 'credit_card',
      name: 'Tarjeta de Crédito',
      icon: <CardIcon />,
      color: '#2196F3',
      description: 'Visa, Mastercard, American Express'
    },
    {
      id: 'debit_card',
      name: 'Tarjeta de Débito',
      icon: <CardIcon />,
      color: '#FF9800',
      description: 'Débito inmediato'
    },
    {
      id: 'mercadopago',
      name: 'MercadoPago',
      icon: <PhoneIcon />,
      color: '#00B4FF',
      description: 'Pago digital con MercadoPago'
    },
    {
      id: 'qr',
      name: 'QR',
      icon: <QrIcon />,
      color: '#9C27B0',
      description: 'Código QR interoperable'
    },
    {
      id: 'account_credit',
      name: 'Cuenta Corriente',
      icon: <StoreIcon />,
      color: '#795548',
      description: 'Fiado del cliente'
    }
  ];

  const handleMethodSelect = (methodId: string) => {
    setSelectedMethod(methodId);
    setError(null);
    
    // Para efectivo, establecer el total como monto por defecto
    if (methodId === 'cash') {
      setCashAmount(total.toString());
    }
  };

  const handleProcessPayment = async () => {
    if (!selectedMethod) {
      setError('Selecciona un método de pago');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      let amount = total;
      
      // Para efectivo, usar el monto ingresado
      if (selectedMethod === 'cash') {
        amount = parseFloat(cashAmount) || total;
        
        if (amount < total) {
          throw new Error('El monto debe ser mayor o igual al total');
        }
      }

      const success = await processPayment(selectedMethod, amount);

      if (success) {
        setSuccess(true);
        setTimeout(() => {
          handleClose();
        }, 2000);
      } else {
        throw new Error('Error procesando el pago');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (isProcessing) return;
    
    setSelectedMethod(null);
    setCashAmount('');
    setError(null);
    setSuccess(false);
    onClose();
  };

  const getChange = (): number => {
    if (selectedMethod === 'cash' && cashAmount) {
      const paid = parseFloat(cashAmount) || 0;
      return Math.max(0, paid - total);
    }
    return 0;
  };

  const canProceed = (): boolean => {
    if (!selectedMethod) return false;
    
    if (selectedMethod === 'cash') {
      const amount = parseFloat(cashAmount) || 0;
      return amount >= total;
    }
    
    return true;
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: 500 }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h5" component="div" sx={{ fontWeight: 600 }}>
          Procesar Pago
        </Typography>
        <Typography variant="h4" color="primary" sx={{ fontWeight: 700, mt: 1 }}>
          {formatCurrency(total)}
        </Typography>
      </DialogTitle>

      <DialogContent>
        {success ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h4" color="success.main" sx={{ mb: 2 }}>
              ✅
            </Typography>
            <Typography variant="h6" sx={{ mb: 1 }}>
              ¡Pago procesado exitosamente!
            </Typography>
            <Typography color="text.secondary">
              Cerrando automáticamente...
            </Typography>
          </Box>
        ) : (
          <>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Selecciona método de pago:
            </Typography>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              {paymentMethods.map((method) => (
                <Grid item xs={12} sm={6} md={4} key={method.id}>
                  <Card
                    variant="outlined"
                    sx={{
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      border: selectedMethod === method.id ? 2 : 1,
                      borderColor: selectedMethod === method.id ? method.color : 'grey.300',
                      backgroundColor: selectedMethod === method.id ? `${method.color}15` : 'background.paper',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: 2
                      }
                    }}
                    onClick={() => handleMethodSelect(method.id)}
                  >
                    <CardContent sx={{ textAlign: 'center', py: 3 }}>
                      <Box sx={{ color: method.color, mb: 2 }}>
                        {React.cloneElement(method.icon as React.ReactElement, { 
                          sx: { fontSize: 40 } 
                        })}
                      </Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                        {method.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {method.description}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {/* Campo de monto para efectivo */}
            {selectedMethod === 'cash' && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                  Monto recibido:
                </Typography>
                
                <TextField
                  fullWidth
                  type="number"
                  label="Monto en efectivo"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value)}
                  inputProps={{
                    min: total,
                    step: 0.01
                  }}
                  helperText={`Mínimo: ${formatCurrency(total)}`}
                />

                {getChange() > 0 && (
                  <Alert 
                    severity="info" 
                    sx={{ mt: 2 }}
                    icon={<CashIcon />}
                  >
                    <Typography variant="subtitle2">
                      Vuelto: <strong>{formatCurrency(getChange())}</strong>
                    </Typography>
                  </Alert>
                )}
              </Box>
            )}

            {/* Información adicional para otros métodos */}
            {selectedMethod && selectedMethod !== 'cash' && (
              <Alert severity="info" sx={{ mb: 2 }}>
                {selectedMethod === 'mercadopago' && (
                  <>
                    <Typography variant="subtitle2">MercadoPago</Typography>
                    <Typography variant="body2">
                      Se generará un QR para que el cliente escanne con su app de MercadoPago
                    </Typography>
                  </>
                )}
                
                {selectedMethod === 'qr' && (
                  <>
                    <Typography variant="subtitle2">QR Interoperable</Typography>
                    <Typography variant="body2">
                      Compatible con todas las apps bancarias argentinas
                    </Typography>
                  </>
                )}
                
                {(selectedMethod === 'credit_card' || selectedMethod === 'debit_card') && (
                  <>
                    <Typography variant="subtitle2">Tarjeta</Typography>
                    <Typography variant="body2">
                      Se procesará a través de la terminal POS conectada
                    </Typography>
                  </>
                )}
                
                {selectedMethod === 'account_credit' && (
                  <>
                    <Typography variant="subtitle2">Cuenta Corriente</Typography>
                    <Typography variant="body2">
                      Se agregará el monto al "fiado" del cliente seleccionado
                    </Typography>
                  </>
                )}
              </Alert>
            )}

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 0 }}>
        <Button 
          onClick={handleClose} 
          disabled={isProcessing}
          size="large"
        >
          Cancelar
        </Button>
        
        {!success && (
          <Button
            variant="contained"
            onClick={handleProcessPayment}
            disabled={!canProceed() || isProcessing}
            size="large"
            sx={{ minWidth: 140 }}
          >
            {isProcessing ? (
              <>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                Procesando...
              </>
            ) : (
              'Procesar Pago'
            )}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

export default PaymentDialog;