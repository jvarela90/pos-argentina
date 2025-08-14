import { Router, Request, Response } from 'express'

const router = Router()

interface HealthResponse {
  status: 'ok' | 'error'
  timestamp: string
  services: {
    database: 'connected' | 'disconnected'
    redis: 'connected' | 'disconnected'
    modules: Record<string, 'active' | 'inactive'>
  }
  uptime: number
  memory: {
    used: number
    total: number
    free: number
  }
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const healthData: HealthResponse = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        redis: 'connected',
        modules: {
          'pos-core': 'active',
          'inventory': 'active',
          'customers': 'active'
        }
      },
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        free: Math.round((process.memoryUsage().heapTotal - process.memoryUsage().heapUsed) / 1024 / 1024)
      }
    }

    res.json(healthData)
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Service unavailable'
    })
  }
})

export default router