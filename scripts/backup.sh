#!/bin/bash

# Script de backup automático para POS Argentina
# Ejecuta respaldos de la base de datos PostgreSQL

# Configuración
BACKUP_DIR="/backup"
DATE=$(date +"%Y%m%d_%H%M%S")
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}

# Archivo de log
LOG_FILE="$BACKUP_DIR/backup.log"

# Función de logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Crear directorio de backup si no existe
mkdir -p "$BACKUP_DIR"

log "Iniciando backup de base de datos..."

# Nombre del archivo de backup
BACKUP_FILE="$BACKUP_DIR/pos_argentina_$DATE.sql"

# Realizar backup de PostgreSQL
if pg_dump -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" > "$BACKUP_FILE"; then
    log "Backup exitoso: $BACKUP_FILE"
    
    # Comprimir el archivo
    if gzip "$BACKUP_FILE"; then
        log "Archivo comprimido: $BACKUP_FILE.gz"
        BACKUP_FILE="$BACKUP_FILE.gz"
    else
        log "ERROR: No se pudo comprimir el archivo de backup"
    fi
    
    # Verificar el tamaño del archivo
    BACKUP_SIZE=$(stat -f%z "$BACKUP_FILE" 2>/dev/null || stat -c%s "$BACKUP_FILE" 2>/dev/null)
    log "Tamaño del backup: $BACKUP_SIZE bytes"
    
    # Subir a S3 si está configurado
    if [ ! -z "$S3_BUCKET" ] && [ ! -z "$S3_ACCESS_KEY" ] && [ ! -z "$S3_SECRET_KEY" ]; then
        log "Subiendo backup a S3..."
        
        # Configurar AWS CLI (simplificado para el ejemplo)
        export AWS_ACCESS_KEY_ID="$S3_ACCESS_KEY"
        export AWS_SECRET_ACCESS_KEY="$S3_SECRET_KEY"
        
        # Comando aws s3 cp (requiere aws-cli instalado)
        if command -v aws >/dev/null 2>&1; then
            if aws s3 cp "$BACKUP_FILE" "s3://$S3_BUCKET/backups/$(basename $BACKUP_FILE)"; then
                log "Backup subido exitosamente a S3"
            else
                log "ERROR: No se pudo subir el backup a S3"
            fi
        else
            log "WARNING: aws-cli no está instalado, omitiendo subida a S3"
        fi
    fi
    
else
    log "ERROR: Falló el backup de la base de datos"
    exit 1
fi

# Limpiar backups antiguos
log "Limpiando backups antiguos (más de $RETENTION_DAYS días)..."

find "$BACKUP_DIR" -name "pos_argentina_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete 2>/dev/null

# Contar backups restantes
BACKUP_COUNT=$(find "$BACKUP_DIR" -name "pos_argentina_*.sql.gz" -type f | wc -l)
log "Backups restantes: $BACKUP_COUNT archivos"

# Verificar espacio en disco
DISK_USAGE=$(df "$BACKUP_DIR" | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 85 ]; then
    log "WARNING: Uso de disco alto ($DISK_USAGE%)"
fi

log "Backup completado exitosamente"