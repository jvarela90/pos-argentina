import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { query, handleDatabaseError, transaction } from '../db'

const router = Router()

// Schema de validación para clientes
const CustomerSchema = z.object({
  firstName: z.string().min(1, 'Nombre es requerido'),
  lastName: z.string().min(1, 'Apellido es requerido'),
  email: z.string().email('Email inválido').optional(),
  phone: z.string().min(8, 'Teléfono inválido').optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  postalCode: z.string().optional(),
  taxId: z.string().optional(),
  creditLimit: z.number().min(0, 'Límite de crédito no puede ser negativo').default(0),
  active: z.boolean().default(true)
})


// GET /api/customers - Obtener todos los clientes
router.get('/', async (req: Request, res: Response) => {
  try {
    const { search, active, hasDebt, limit = '50', offset = '0' } = req.query
    
    let whereConditions = []
    let queryParams: any[] = []
    let paramCount = 0

    // Filtrar por estado activo (por defecto solo activos)
    if (active !== 'false') {
      whereConditions.push(`active = $${++paramCount}`)
      queryParams.push(active === 'false' ? false : true)
    }

    // Filtrar por búsqueda
    if (search && typeof search === 'string') {
      whereConditions.push(`(
        first_name ILIKE $${++paramCount} OR 
        last_name ILIKE $${paramCount} OR 
        email ILIKE $${paramCount} OR 
        phone ILIKE $${paramCount} OR 
        tax_id ILIKE $${paramCount}
      )`)
      queryParams.push(`%${search}%`)
    }

    // Filtrar por deuda
    if (hasDebt === 'true') {
      whereConditions.push(`current_balance > $${++paramCount}`)
      queryParams.push(0)
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''
    
    // Agregar paginación
    const limitClause = `LIMIT $${++paramCount} OFFSET $${++paramCount}`
    queryParams.push(parseInt(limit as string), parseInt(offset as string))

    const queryText = `
      SELECT id, first_name, last_name, email, phone, address, city, province, 
             postal_code, tax_id, credit_limit, current_balance, active, 
             created_at, updated_at
      FROM pos.customers 
      ${whereClause}
      ORDER BY first_name ASC, last_name ASC
      ${limitClause}
    `

    const result = await query(queryText, queryParams)
    
    // Consulta para estadísticas
    const statsQuery = `
      SELECT 
        COUNT(*) as total_customers,
        COUNT(*) FILTER (WHERE active = true) as active_customers,
        COUNT(*) FILTER (WHERE current_balance > 0) as customers_with_debt,
        COALESCE(SUM(current_balance), 0) as total_debt
      FROM pos.customers
    `
    const statsResult = await query(statsQuery)
    
    res.json({
      success: true,
      data: result.rows,
      total: result.rowCount || 0,
      stats: statsResult.rows[0]
    })
  } catch (error) {
    console.error('Error fetching customers:', error)
    const errorResponse = handleDatabaseError(error)
    res.status(500).json(errorResponse)
  }
})

// GET /api/customers/:id - Obtener cliente por ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const result = await query('SELECT * FROM pos.customers WHERE id = $1', [id])
    
    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Cliente no encontrado'
      })
    }

    res.json({
      success: true,
      data: result.rows[0]
    })
  } catch (error) {
    console.error('Error fetching customer:', error)
    const errorResponse = handleDatabaseError(error)
    res.status(500).json(errorResponse)
  }
})

// POST /api/customers - Crear nuevo cliente
router.post('/', async (req: Request, res: Response) => {
  try {
    const validatedData = CustomerSchema.parse(req.body)
    const { firstName, lastName, email, phone, address, city, province, postalCode, taxId, creditLimit, active } = validatedData

    // Verificar duplicados por email o tax_id si están presentes
    if (email || taxId) {
      const duplicateCheck = await query(`
        SELECT id FROM pos.customers 
        WHERE (email = $1 AND $1 IS NOT NULL) OR (tax_id = $2 AND $2 IS NOT NULL)
      `, [email || null, taxId || null])
      
      if (duplicateCheck.rowCount > 0) {
        return res.status(400).json({
          success: false,
          error: 'Ya existe un cliente con este email o CUIT/DNI'
        })
      }
    }

    const result = await query(`
      INSERT INTO pos.customers (first_name, last_name, email, phone, address, 
                                 city, province, postal_code, tax_id, credit_limit, active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [firstName, lastName, email, phone, address, city, province, postalCode, taxId, creditLimit, active])

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Cliente creado exitosamente'
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Datos inválidos',
        details: error.errors
      })
    }

    console.error('Error creating customer:', error)
    const errorResponse = handleDatabaseError(error)
    res.status(500).json(errorResponse)
  }
})

// PUT /api/customers/:id - Actualizar cliente
router.put('/:id', (req: Request, res: Response) => {
  try {
    const customerIndex = customers.findIndex(c => c.id === req.params.id)
    
    if (customerIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Cliente no encontrado'
      })
    }

    const validatedData = CustomerSchema.partial().parse(req.body)
    
    customers[customerIndex] = {
      ...customers[customerIndex],
      ...validatedData,
      updated: new Date()
    }

    res.json({
      success: true,
      data: customers[customerIndex],
      message: 'Cliente actualizado exitosamente'
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

// GET /api/customers/:id/fiado - Obtener historial de fiado
router.get('/:id/fiado', (req: Request, res: Response) => {
  const customer = customers.find(c => c.id === req.params.id)
  
  if (!customer) {
    return res.status(404).json({
      success: false,
      error: 'Cliente no encontrado'
    })
  }

  const customerTransactions = fiadoTransactions.filter(t => t.customerId === req.params.id)
    .sort((a, b) => b.date.getTime() - a.date.getTime())

  res.json({
    success: true,
    data: {
      customer: {
        id: customer.id,
        name: customer.name,
        fiadoBalance: customer.fiadoBalance,
        fiadoLimit: customer.fiadoLimit
      },
      transactions: customerTransactions,
      total: customerTransactions.length
    }
  })
})

// POST /api/customers/:id/fiado - Otorgar fiado
router.post('/:id/fiado', (req: Request, res: Response) => {
  try {
    const { amount, description, saleId } = req.body
    
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Monto inválido'
      })
    }

    const customerIndex = customers.findIndex(c => c.id === req.params.id)
    
    if (customerIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Cliente no encontrado'
      })
    }

    const customer = customers[customerIndex]

    // Verificar límite de crédito
    if (customer.fiadoBalance + amount > customer.fiadoLimit) {
      return res.status(400).json({
        success: false,
        error: 'Límite de crédito excedido',
        details: {
          currentBalance: customer.fiadoBalance,
          creditLimit: customer.fiadoLimit,
          requestedAmount: amount
        }
      })
    }

    // Crear transacción
    const transaction = {
      id: `fiado_${Date.now()}`,
      customerId: req.params.id,
      type: 'debt' as const,
      amount,
      description: description || 'Compra a fiado',
      saleId,
      date: new Date(),
      userId: 'user_1' // En producción obtener del token JWT
    }

    fiadoTransactions.push(transaction)

    // Actualizar balance del cliente
    customers[customerIndex] = {
      ...customer,
      fiadoBalance: customer.fiadoBalance + amount,
      updated: new Date()
    }

    res.status(201).json({
      success: true,
      data: {
        transaction,
        newBalance: customers[customerIndex].fiadoBalance
      },
      message: 'Fiado otorgado exitosamente'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    })
  }
})

// POST /api/customers/:id/payment - Registrar pago de fiado
router.post('/:id/payment', (req: Request, res: Response) => {
  try {
    const { amount, paymentMethod, notes } = req.body
    
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Monto inválido'
      })
    }

    const customerIndex = customers.findIndex(c => c.id === req.params.id)
    
    if (customerIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Cliente no encontrado'
      })
    }

    const customer = customers[customerIndex]

    // Crear transacción de pago
    const transaction = {
      id: `payment_${Date.now()}`,
      customerId: req.params.id,
      type: 'payment' as const,
      amount,
      description: `Pago de fiado - ${paymentMethod || 'efectivo'}`,
      paymentMethod: paymentMethod || 'cash',
      notes,
      date: new Date(),
      userId: 'user_1'
    }

    fiadoTransactions.push(transaction)

    // Actualizar balance del cliente
    const newBalance = Math.max(0, customer.fiadoBalance - amount)
    customers[customerIndex] = {
      ...customer,
      fiadoBalance: newBalance,
      updated: new Date()
    }

    res.status(201).json({
      success: true,
      data: {
        transaction,
        newBalance,
        paidAmount: Math.min(amount, customer.fiadoBalance)
      },
      message: 'Pago registrado exitosamente'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    })
  }
})

export default router