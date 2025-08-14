import React from 'react'
import { 
  Grid, 
  Paper, 
  Typography, 
  Card, 
  CardContent,
  Box
} from '@mui/material'

const Dashboard: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Ventas Hoy
              </Typography>
              <Typography variant="h5" component="h2">
                $125,480
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Productos
              </Typography>
              <Typography variant="h5" component="h2">
                1,247
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Clientes
              </Typography>
              <Typography variant="h5" component="h2">
                342
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Stock Bajo
              </Typography>
              <Typography variant="h5" component="h2" color="error">
                23
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Panel de Administración
            </Typography>
            <Typography>
              Bienvenido al panel de administración de POS Argentina. 
              Aquí podrás gestionar productos, clientes, ver reportes y configurar tu sistema.
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}

export default Dashboard