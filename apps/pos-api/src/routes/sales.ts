import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { query, handleDatabaseError, transaction } from '../db'

const router = Router()

// Schema para item de venta
const SaleItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().positive(),
  taxRate: z.number().min(0).max(100).default(21)
})

// Schema para venta
const SaleSchema = z.object({
  customerId: z.string().uuid().optional(),
  customerName: z.string().optional(),
  items: z.array(SaleItemSchema).min(1, 'Debe incluir al menos un producto'),
  paymentMethod: z.enum(['cash', 'card', 'transfer', 'fiado']),
  discountAmount: z.number().min(0).default(0),
  notes: z.string().optional()
})


// GET /api/sales - Obtener todas las ventas
router.get('/', async (req: Request, res: Response) => {
  try {
    const { 
      startDate, 
      endDate, 
      customerId, 
      paymentMethod, 
      limit = '50', 
      offset = '0' 
    } = req.query
    
    let whereConditions = []
    let queryParams: any[] = []
    let paramCount = 0

    // Filtrar por rango de fechas
    if (startDate) {
      whereConditions.push(`s.created_at >= $${++paramCount}`)
      queryParams.push(startDate)
    }
    if (endDate) {
      whereConditions.push(`s.created_at <= $${++paramCount}`)
      queryParams.push(endDate)
    }

    // Filtrar por cliente
    if (customerId && typeof customerId === 'string') {
      whereConditions.push(`s.customer_id = $${++paramCount}`)
      queryParams.push(customerId)
    }

    // Filtrar por método de pago
    if (paymentMethod && typeof paymentMethod === 'string') {
      whereConditions.push(`s.payment_method = $${++paramCount}`)
      queryParams.push(paymentMethod)
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''
    
    // Agregar paginación
    const limitClause = `LIMIT $${++paramCount} OFFSET $${++paramCount}`
    queryParams.push(parseInt(limit as string), parseInt(offset as string))

    const queryText = `
      SELECT 
        s.id, s.sale_number, s.customer_id, s.customer_name,
        s.subtotal, s.tax_amount, s.discount_amount, s.total,
        s.payment_method, s.payment_status, s.notes, s.created_at,
        c.first_name, c.last_name
      FROM pos.sales s
      LEFT JOIN pos.customers c ON s.customer_id = c.id
      ${whereClause}
      ORDER BY s.created_at DESC
      ${limitClause}
    `

    const result = await query(queryText, queryParams)
    
    // Consulta para el total de registros
    const countQuery = `SELECT COUNT(*) as total FROM pos.sales s ${whereClause}`
    const countResult = await query(countQuery, queryParams.slice(0, paramCount - 2))
    
    res.json({
      success: true,
      data: result.rows,
      total: parseInt(countResult.rows[0].total),
      page: Math.floor(parseInt(offset as string) / parseInt(limit as string)) + 1,
      limit: parseInt(limit as string)
    })
  } catch (error) {
    console.error('Error fetching sales:', error)
    const errorResponse = handleDatabaseError(error)
    res.status(500).json(errorResponse)
  }
})

// GET /api/sales/:id - Obtener venta por ID
router.get('/:id', (req: Request, res: Response) => {
  const sale = sales.find(s => s.id === req.params.id)
  
  if (!sale) {
    return res.status(404).json({
      success: false,
      error: 'Venta no encontrada'
    })
  }

  res.json({
    success: true,
    data: sale
  })
})

// POST /api/sales - Crear nueva venta
router.post('/', (req: Request, res: Response) => {
  try {
    const validatedData = SaleSchema.parse(req.body)
    
    // Validar que el total calculado coincida
    const calculatedSubtotal = validatedData.items.reduce((sum, item) => sum + item.total, 0)
    const calculatedTotal = calculatedSubtotal + validatedData.tax - validatedData.discount

    if (Math.abs(calculatedTotal - validatedData.total) > 0.01) {
      return res.status(400).json({
        success: false,
        error: 'El total calculado no coincide con el enviado'
      })
    }

    // Generar ID único
    const saleId = `SALE-${String(sales.length + 1).padStart(3, '0')}`
    
    const newSale = {
      id: saleId,
      date: new Date(),
      ...validatedData,
      itemsCount: validatedData.items.reduce((sum, item) => sum + item.quantity, 0),
      status: 'completed' as const,
      userId: 'user_1', // En producción obtener del token JWT
      created: new Date(),
      updated: new Date()
    }

    sales.push(newSale)

    // TODO: Aquí se actualizaría el stock de productos
    // TODO: Si es fiado, se actualizaría el balance del cliente
    // TODO: Se procesarían los puntos de lealtad

    res.status(201).json({
      success: true,
      data: newSale,
      message: 'Venta procesada exitosamente'
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Datos inválidos',
        details: error.errors
      })
    }

    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    })
  }
})

// GET /api/sales/reports/daily - Reporte diario
router.get('/reports/daily', (req: Request, res: Response) => {
  const { date } = req.query
  
  const targetDate = date ? new Date(date as string) : new Date()
  const startOfDay = new Date(targetDate)
  startOfDay.setHours(0, 0, 0, 0)
  
  const endOfDay = new Date(targetDate)
  endOfDay.setHours(23, 59, 59, 999)

  const dailySales = sales.filter(s => 
    s.date >= startOfDay && s.date <= endOfDay && s.status === 'completed'
  )

  const report = {
    date: targetDate.toISOString().split('T')[0],
    summary: {
      totalSales: dailySales.length,
      totalAmount: dailySales.reduce((sum, s) => sum + s.total, 0),
      totalItems: dailySales.reduce((sum, s) => sum + s.itemsCount, 0),
      averageTicket: dailySales.length > 0 
        ? dailySales.reduce((sum, s) => sum + s.total, 0) / dailySales.length 
        : 0
    },
    paymentMethods: dailySales.reduce((acc, s) => {
      if (!acc[s.paymentMethod]) {
        acc[s.paymentMethod] = { count: 0, amount: 0 }
      }
      acc[s.paymentMethod].count += 1
      acc[s.paymentMethod].amount += s.total
      return acc
    }, {} as Record<string, { count: number; amount: number }>),
    hourlyBreakdown: Array.from({ length: 24 }, (_, hour) => {
      const hourSales = dailySales.filter(s => s.date.getHours() === hour)
      return {
        hour,
        sales: hourSales.length,
        amount: hourSales.reduce((sum, s) => sum + s.total, 0)
      }
    })
  }

  res.json({
    success: true,
    data: report
  })
})

// GET /api/sales/reports/weekly - Reporte semanal
router.get('/reports/weekly', (req: Request, res: Response) => {
  const today = new Date()
  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - today.getDay())
  startOfWeek.setHours(0, 0, 0, 0)

  const weeklySales = sales.filter(s => 
    s.date >= startOfWeek && s.status === 'completed'
  )

  const dailyBreakdown = Array.from({ length: 7 }, (_, dayIndex) => {
    const day = new Date(startOfWeek)
    day.setDate(startOfWeek.getDate() + dayIndex)
    
    const daySales = weeklySales.filter(s => 
      s.date.toDateString() === day.toDateString()
    )

    return {
      date: day.toISOString().split('T')[0],
      day: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][dayIndex],
      sales: daySales.length,
      amount: daySales.reduce((sum, s) => sum + s.total, 0)
    }
  })

  res.json({
    success: true,
    data: {
      period: 'weekly',
      startDate: startOfWeek.toISOString().split('T')[0],
      summary: {
        totalSales: weeklySales.length,
        totalAmount: weeklySales.reduce((sum, s) => sum + s.total, 0),
        averageDaily: weeklySales.reduce((sum, s) => sum + s.total, 0) / 7
      },
      dailyBreakdown
    }
  })
})

export default router