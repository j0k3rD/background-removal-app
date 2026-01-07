# Configuración en Dokploy

## Variables de Entorno Requeridas

Configura estas variables en **Environment Settings** de cada servicio en Dokploy:

### Variables Globales (para todos los servicios)

```
REDIS_URL=redis://redis:6379/0
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/0
UPLOAD_DIR=/data/uploads
RESULT_DIR=/data/results
NEXT_PUBLIC_API_URL=http://192.168.100.111:8000
FRONTEND_PORT=3001
BACKEND_PORT=8000
NVIDIA_VISIBLE_DEVICES=all
SECRET_KEY=@7W!9RSSS*B98*&Pzx3m$T3!7h5t8%pkURr%Ct@D
```

### IMPORTANTE: Frontend

El frontend necesita `NEXT_PUBLIC_API_URL` **durante el build**, no solo en runtime.

**Solución en Dokploy:**
1. Ve a la configuración del servicio `frontend`
2. En **Build Arguments**, agrega:
   - `NEXT_PUBLIC_API_URL` = `http://192.168.100.111:8000`

O si Dokploy no tiene build args, edita el `docker-compose.yml` y agrega manualmente en la sección build del frontend:

```yaml
frontend:
  build:
    context: ./frontend
    dockerfile: Dockerfile
    args:
      NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL}
```

## Verificación

Después de configurar:
1. Reconstruye el frontend: `docker-compose build --no-cache frontend`
2. Reinicia todos los servicios: `docker-compose up -d`
3. Verifica en el navegador que las llamadas vayan a `http://192.168.100.111:8000` y no a `localhost:8000`

## Troubleshooting

Si el frontend sigue usando `localhost:8000`:
- Las variables `NEXT_PUBLIC_*` se inyectan en tiempo de BUILD
- Necesitas reconstruir la imagen después de cambiar `NEXT_PUBLIC_API_URL`
- Verifica que la variable esté en Build Args, no solo en Environment Variables
