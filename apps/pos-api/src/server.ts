import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import { createServer } from 'http'
import routes from './routes'
import { testConnection } from './db'

const app = express()
const server = createServer(app)

// Middleware
app.use(helmet())
app.use(compression())
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.CORS_ORIGIN || 'https://your-domain.com'] 
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}))

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`)
  next()
})

// API Routes
app.use('/api/v1', routes)

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'POS Argentina API',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      health: '/api/v1/health',
      auth: '/api/v1/auth',
      products: '/api/v1/products',
      customers: '/api/v1/customers',
      sales: '/api/v1/sales'
    }
  })
})

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl
  })
})

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(`Error: ${err.message}`)
  console.error(err.stack)
  
  res.status(err.status || 500).json({ 
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
    timestamp: new Date().toISOString()
  })
})

const PORT = process.env.PORT || 4000

// Inicializar servidor
const startServer = async () => {
  try {
    // Verificar conexión a base de datos
    console.log('🔄 Verificando conexión a base de datos...')
    const dbConnected = await testConnection()
    
    if (!dbConnected) {
      console.error('❌ Error: No se pudo conectar a la base de datos')
      process.exit(1)
    }
    
    // Iniciar servidor
    server.listen(PORT, () => {
      console.log('✅ POS Argentina API Server iniciado exitosamente')
      console.log(`🚀 Servidor corriendo en puerto ${PORT}`)
      console.log(`📍 API Root: http://localhost:${PORT}`)
      console.log(`📍 Health check: http://localhost:${PORT}/api/v1/health`)
      console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`)
      console.log(`📍 Database: ${process.env.DATABASE_URL ? 'PostgreSQL conectado' : 'Usando configuración por defecto'}`)
      console.log(`📍 Endpoints disponibles:`)
      console.log(`   - GET  /api/v1/health`)
      console.log(`   - GET  /api/v1/products`)
      console.log(`   - POST /api/v1/products`)
      console.log(`   - GET  /api/v1/customers`)
      console.log(`   - POST /api/v1/customers`)
      console.log(`   - GET  /api/v1/sales`)
      console.log(`   - POST /api/v1/sales`)
      console.log(`   - POST /api/v1/auth/login`)
    })
  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error)
    process.exit(1)
  }
}

// Manejar cierre del servidor
process.on('SIGTERM', () => {
  console.log('📴 Cerrando servidor...')
  server.close(() => {
    console.log('✅ Servidor cerrado exitosamente')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('📴 Cerrando servidor...')
  server.close(() => {
    console.log('✅ Servidor cerrado exitosamente')
    process.exit(0)
  })
})

// Iniciar
startServer()