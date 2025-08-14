# 📝 Actualizar URLs después de crear el repositorio

Una vez que hayas creado el repositorio en GitHub, actualiza estas URLs en el README.md:

## 🔄 Buscar y reemplazar:

1. `TU_USUARIO` -> tu username de GitHub real
2. En `README.md` línea ~54: 
   ```
   git clone https://github.com/jvarela90/pos-argentina.git
   ```
   
3. En `README.md` línea ~102:
   ```
   wget https://raw.githubusercontent.com/jvarela90/pos-argentina/main/scripts/vm-setup.sh
   ```

## 🏷️ Opcional: Crear Release

Después de subir el código, crear el primer release:

1. Ir a tu repo en GitHub
2. Click en "Releases" → "Create a new release"  
3. Tag: `v1.0.0-beta`
4. Title: `🚀 POS Argentina v1.0.0-beta - Sistema Completo`
5. Description:
```markdown
# 🏪 Primera Release Beta - POS Argentina

## ✅ Características Implementadas
- ✅ Sistema POS modular completo
- ✅ Terminal PWA + Admin Panel
- ✅ API REST con PostgreSQL
- ✅ Docker Compose setup
- ✅ 30+ pruebas automatizadas
- ✅ Guías de despliegue en VM

## 🚀 Quick Start
```bash
git clone https://github.com/TU_USUARIO/pos-argentina.git
cd pos-argentina
docker compose up -d
```

## 📖 Documentación
- [Guía de VM](docs/vm-deployment-guide.md)
- [Validación del Sistema](scripts/validate-system.js)
- [Pruebas Completas](scripts/test-complete-system.sh)
```

## 🎯 URLs que funcionarán después:

- **Repositorio**: https://github.com/jvarela90/pos-argentina
- **Clone**: `git clone https://github.com/jvarela90/pos-argentina.git`
- **Issues**: https://github.com/jvarela90/pos-argentina/issues
- **Releases**: https://github.com/jvarela90/pos-argentina/releases

¡Listo para compartir! 🎉