import { Router, Request, Response } from 'express'
import { z } from 'zod'

const router = Router()

// Schema de validación para login
const LoginSchema = z.object({
  username: z.string().min(1, 'Usuario es requerido'),
  password: z.string().min(1, 'Contraseña es requerida')
})

// Usuarios de ejemplo (en producción esto vendría de la base de datos con hash)
const users = [
  {
    id: 'user_1',
    username: 'admin',
    password: 'admin123', // En producción sería hasheada
    name: 'Administrador',
    role: 'admin',
    permissions: ['all'],
    active: true,
    created: new Date('2024-01-01')
  },
  {
    id: 'user_2',
    username: 'vendedor',
    password: 'vendedor123',
    name: 'Juan Pérez',
    role: 'cashier',
    permissions: ['sales', 'customers', 'products:read'],
    active: true,
    created: new Date('2024-01-01')
  }
]

// POST /api/auth/login - Iniciar sesión
router.post('/login', (req: Request, res: Response) => {
  try {
    const { username, password } = LoginSchema.parse(req.body)
    
    // Buscar usuario
    const user = users.find(u => 
      u.username === username && u.password === password && u.active
    )

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas'
      })
    }

    // En producción aquí se generaría un JWT real
    const token = `fake-jwt-${user.id}-${Date.now()}`

    // No devolver la contraseña
    const { password: _, ...userWithoutPassword } = user

    res.json({
      success: true,
      data: {
        user: userWithoutPassword,
        token,
        expiresIn: 86400 // 24 horas
      },
      message: 'Sesión iniciada exitosamente'
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

// POST /api/auth/logout - Cerrar sesión
router.post('/logout', (req: Request, res: Response) => {
  // En producción aquí se invalidaría el JWT
  res.json({
    success: true,
    message: 'Sesión cerrada exitosamente'
  })
})

// GET /api/auth/me - Obtener información del usuario actual
router.get('/me', (req: Request, res: Response) => {
  // En producción aquí se verificaría el JWT del header Authorization
  const authHeader = req.headers.authorization
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Token no proporcionado'
    })
  }

  const token = authHeader.substring(7)
  
  // Simular verificación de JWT
  if (!token.startsWith('fake-jwt-')) {
    return res.status(401).json({
      success: false,
      error: 'Token inválido'
    })
  }

  // Extraer ID del usuario del token falso
  const userId = token.split('-')[2]
  const user = users.find(u => u.id === userId)

  if (!user || !user.active) {
    return res.status(401).json({
      success: false,
      error: 'Usuario no encontrado o inactivo'
    })
  }

  const { password: _, ...userWithoutPassword } = user

  res.json({
    success: true,
    data: userWithoutPassword
  })
})

// POST /api/auth/change-password - Cambiar contraseña
router.post('/change-password', (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Contraseña actual y nueva son requeridas'
      })
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'La nueva contraseña debe tener al menos 6 caracteres'
      })
    }

    // En producción aquí se verificaría el JWT y se actualizaría la contraseña hasheada
    
    res.json({
      success: true,
      message: 'Contraseña actualizada exitosamente'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    })
  }
})

// GET /api/auth/users - Obtener lista de usuarios (solo admin)
router.get('/users', (req: Request, res: Response) => {
  // En producción aquí se verificaría que el usuario sea admin
  
  const usersWithoutPasswords = users.map(({ password, ...user }) => user)

  res.json({
    success: true,
    data: usersWithoutPasswords,
    total: usersWithoutPasswords.length
  })
})

// POST /api/auth/users - Crear nuevo usuario (solo admin)
router.post('/users', (req: Request, res: Response) => {
  try {
    const { username, password, name, role } = req.body
    
    if (!username || !password || !name || !role) {
      return res.status(400).json({
        success: false,
        error: 'Todos los campos son requeridos'
      })
    }

    // Verificar que no exista el usuario
    const existingUser = users.find(u => u.username === username)
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'El usuario ya existe'
      })
    }

    const permissions = role === 'admin' 
      ? ['all'] 
      : ['sales', 'customers', 'products:read']

    const newUser = {
      id: `user_${Date.now()}`,
      username,
      password, // En producción se hashearía
      name,
      role,
      permissions,
      active: true,
      created: new Date()
    }

    users.push(newUser)

    const { password: _, ...userWithoutPassword } = newUser

    res.status(201).json({
      success: true,
      data: userWithoutPassword,
      message: 'Usuario creado exitosamente'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    })
  }
})

export default router