#!/bin/sh

# Script de entrada para el contenedor del Terminal PWA
# Permite configuración dinámica en tiempo de ejecución

# Configurar variables de entorno si están definidas
if [ ! -z "$VITE_API_URL" ]; then
    echo "Configurando API URL: $VITE_API_URL"
    # Reemplazar placeholder en archivos JavaScript si es necesario
    find /usr/share/nginx/html -type f -name "*.js" -exec sed -i "s|__VITE_API_URL__|${VITE_API_URL}|g" {} \;
fi

if [ ! -z "$VITE_APP_NAME" ]; then
    echo "Configurando App Name: $VITE_APP_NAME"
    find /usr/share/nginx/html -type f -name "*.html" -exec sed -i "s|__VITE_APP_NAME__|${VITE_APP_NAME}|g" {} \;
fi

# Verificar que los archivos estáticos existen
if [ ! -f "/usr/share/nginx/html/index.html" ]; then
    echo "ERROR: index.html no encontrado en /usr/share/nginx/html"
    exit 1
fi

echo "Terminal PWA iniciado correctamente"
echo "Sirviendo contenido desde: /usr/share/nginx/html"
echo "Puerto: 3000"

# Ejecutar el comando original (nginx)
exec "$@"