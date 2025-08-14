import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { query, handleDatabaseError, formatDatabaseResult } from '../db'

const router = Router()

// Schema de validación para productos
const ProductSchema = z.object({
  name: z.string().min(1, 'Nombre es requerido'),
  price: z.number().positive('Precio debe ser positivo'),
  category: z.string().min(1, 'Categoría es requerida'),
  barcode: z.string().optional(),
  stock: z.number().int().min(0, 'Stock no puede ser negativo'),
  minStock: z.number().int().min(0, 'Stock mínimo no puede ser negativo'),
  tax: z.number().min(0).max(100, 'IVA debe estar entre 0 y 100'),
  active: z.boolean().default(true)
})

// GET /api/products - Obtener todos los productos
router.get('/', async (req: Request, res: Response) => {
  try {
    const { category, search, active, limit = '50', offset = '0' } = req.query
    
    let whereConditions = []
    let queryParams: any[] = []
    let paramCount = 0

    // Filtrar por estado activo (por defecto solo activos)
    if (active !== 'false') {
      whereConditions.push(`active = $${++paramCount}`)
      queryParams.push(active === 'false' ? false : true)
    }

    // Filtrar por categoría
    if (category && typeof category === 'string') {
      whereConditions.push(`category ILIKE $${++paramCount}`)
      queryParams.push(`%${category}%`)
    }

    // Filtrar por búsqueda (nombre, categoría o código de barras)
    if (search && typeof search === 'string') {
      whereConditions.push(`(name ILIKE $${++paramCount} OR category ILIKE $${paramCount} OR barcode ILIKE $${paramCount})`)
      queryParams.push(`%${search}%`)
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''
    
    // Agregar paginación
    const limitClause = `LIMIT $${++paramCount} OFFSET $${++paramCount}`
    queryParams.push(parseInt(limit as string), parseInt(offset as string))

    const queryText = `
      SELECT id, name, description, barcode, price, cost, category, stock, min_stock, max_stock, unit, tax_rate, active, created_at, updated_at
      FROM pos.products 
      ${whereClause}
      ORDER BY name ASC
      ${limitClause}
    `

    const result = await query(queryText, queryParams)
    
    // Consulta para el total de registros (sin paginación)
    const countQuery = `SELECT COUNT(*) as total FROM pos.products ${whereClause}`
    const countResult = await query(countQuery, queryParams.slice(0, paramCount - 2))
    
    res.json({
      success: true,
      data: result.rows,
      total: parseInt(countResult.rows[0].total),
      page: Math.floor(parseInt(offset as string) / parseInt(limit as string)) + 1,
      limit: parseInt(limit as string)
    })
  } catch (error) {
    console.error('Error fetching products:', error)
    const errorResponse = handleDatabaseError(error)
    res.status(500).json(errorResponse)
  }
})

// GET /api/products/:id - Obtener producto por ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const result = await query('SELECT * FROM pos.products WHERE id = $1', [id])
    
    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Producto no encontrado'
      })
    }

    res.json({
      success: true,
      data: result.rows[0]
    })
  } catch (error) {
    console.error('Error fetching product:', error)
    const errorResponse = handleDatabaseError(error)
    res.status(500).json(errorResponse)
  }
})

// POST /api/products - Crear nuevo producto
router.post('/', async (req: Request, res: Response) => {
  try {
    const validatedData = ProductSchema.parse(req.body)
    const { name, price, category, barcode, stock, minStock, tax, active } = validatedData

    const result = await query(`
      INSERT INTO pos.products (name, price, category, barcode, stock, min_stock, tax_rate, active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [name, price, category, barcode, stock, minStock, tax, active])

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Producto creado exitosamente'
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Datos inválidos',
        details: error.errors
      })
    }

    console.error('Error creating product:', error)
    const errorResponse = handleDatabaseError(error)
    res.status(500).json(errorResponse)
  }
})

// PUT /api/products/:id - Actualizar producto
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const validatedData = ProductSchema.partial().parse(req.body)
    
    // Verificar que el producto existe
    const existingProduct = await query('SELECT id FROM pos.products WHERE id = $1', [id])
    if (existingProduct.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Producto no encontrado'
      })
    }

    // Construir query dinámico basado en los campos a actualizar
    const updateFields = []
    const values = []
    let paramCount = 0

    Object.entries(validatedData).forEach(([key, value]) => {
      if (value !== undefined) {
        const dbField = key === 'minStock' ? 'min_stock' : key === 'tax' ? 'tax_rate' : key
        updateFields.push(`${dbField} = $${++paramCount}`)
        values.push(value)
      }
    })

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No hay campos para actualizar'
      })
    }

    updateFields.push(`updated_at = $${++paramCount}`)
    values.push(new Date())
    values.push(id) // Para el WHERE

    const updateQuery = `
      UPDATE pos.products 
      SET ${updateFields.join(', ')}
      WHERE id = $${++paramCount}
      RETURNING *
    `

    const result = await query(updateQuery, values)

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Producto actualizado exitosamente'
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Datos inválidos',
        details: error.errors
      })
    }

    console.error('Error updating product:', error)
    const errorResponse = handleDatabaseError(error)
    res.status(500).json(errorResponse)
  }
})

// DELETE /api/products/:id - Eliminar producto (soft delete)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    
    // Soft delete - marcar como inactivo en lugar de eliminar
    const result = await query(`
      UPDATE pos.products 
      SET active = false, updated_at = NOW()
      WHERE id = $1 AND active = true
      RETURNING id, name
    `, [id])
    
    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Producto no encontrado o ya está inactivo'
      })
    }

    res.json({
      success: true,
      message: `Producto '${result.rows[0].name}' desactivado exitosamente`
    })
  } catch (error) {
    console.error('Error deleting product:', error)
    const errorResponse = handleDatabaseError(error)
    res.status(500).json(errorResponse)
  }
})

// GET /api/products/barcode/:barcode - Buscar por código de barras
router.get('/barcode/:barcode', async (req: Request, res: Response) => {
  try {
    const { barcode } = req.params
    const result = await query(`
      SELECT * FROM pos.products 
      WHERE barcode = $1 AND active = true
    `, [barcode])
    
    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Producto no encontrado'
      })
    }

    res.json({
      success: true,
      data: result.rows[0]
    })
  } catch (error) {
    console.error('Error fetching product by barcode:', error)
    const errorResponse = handleDatabaseError(error)
    res.status(500).json(errorResponse)
  }
})

// GET /api/products/low-stock - Productos con stock bajo
router.get('/alerts/low-stock', async (req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT * FROM pos.products 
      WHERE active = true AND stock <= min_stock
      ORDER BY (stock - min_stock) ASC, name ASC
    `)

    res.json({
      success: true,
      data: result.rows,
      total: result.rowCount || 0
    })
  } catch (error) {
    console.error('Error fetching low stock products:', error)
    const errorResponse = handleDatabaseError(error)
    res.status(500).json(errorResponse)
  }
})

export default router