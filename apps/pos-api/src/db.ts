import pg from 'pg';

const { Pool } = pg;

// Configuración del pool de conexiones
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' 
    ? { rejectUnauthorized: false } 
    : false,
  max: 20, // máximo de conexiones en el pool
  idleTimeoutMillis: 30000, // tiempo de inactividad antes de cerrar conexión
  connectionTimeoutMillis: 2000, // tiempo de espera para nueva conexión
});

// Función helper para consultas
export const query = (text: string, params?: any[]) => {
  console.log('🔍 Executing query:', text, params ? `with params: ${JSON.stringify(params)}` : '');
  return pool.query(text, params);
};

// Función helper para transacciones
export const transaction = async (callback: (client: pg.PoolClient) => Promise<any>) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Eventos del pool
pool.on('connect', (client) => {
  console.log('🗄️  New client connected to PostgreSQL database');
});

pool.on('error', (err, client) => {
  console.error('🚨 Unexpected error on idle client', err);
});

pool.on('acquire', (client) => {
  console.log('📥 Client acquired from pool');
});

pool.on('remove', (client) => {
  console.log('📤 Client removed from pool');
});

// Función para verificar la conexión
export const testConnection = async () => {
  try {
    const result = await query('SELECT NOW() as now, version() as version');
    console.log('✅ Database connection successful:', result.rows[0]);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
};

// Función para cerrar el pool (útil para tests o shutdown)
export const closePool = () => {
  return pool.end();
};

// Función helper para formatear resultados
export const formatDatabaseResult = (result: pg.QueryResult) => ({
  success: true,
  data: result.rows,
  total: result.rowCount || 0
});

// Función helper para manejar errores de base de datos
export const handleDatabaseError = (error: any) => {
  console.error('Database error:', error);
  
  // Códigos de error específicos de PostgreSQL
  switch (error.code) {
    case '23505': // unique_violation
      return { success: false, error: 'Ya existe un registro con esos datos únicos' };
    case '23503': // foreign_key_violation
      return { success: false, error: 'Referencia inválida a otro registro' };
    case '23502': // not_null_violation
      return { success: false, error: 'Campo requerido faltante' };
    case '23514': // check_violation
      return { success: false, error: 'Datos no válidos según las reglas definidas' };
    default:
      return { success: false, error: 'Error interno de base de datos' };
  }
};

export default pool;