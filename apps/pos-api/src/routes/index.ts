import { Router } from 'express'
import healthRoutes from './health'
import productsRoutes from './products'
import customersRoutes from './customers'
import salesRoutes from './sales'
import authRoutes from './auth'

const router = Router()

// Rutas principales
router.use('/health', healthRoutes)
router.use('/auth', authRoutes)
router.use('/products', productsRoutes)
router.use('/customers', customersRoutes)
router.use('/sales', salesRoutes)

export default router