# Background Removal App

Aplicación full-stack para eliminar fondos de imágenes usando IA (rembg con modelo birefnet-general) acelerada por GPU NVIDIA.

## Stack Tecnológico

- **Frontend**: Next.js 16, React, Tailwind CSS, Lucide React
- **Backend**: FastAPI, Python 3.12
- **Worker**: Celery con rembg (birefnet-general) y CUDA
- **Cola**: Redis
- **Infraestructura**: Docker & Docker Compose

## Requisitos

- Docker y Docker Compose
- NVIDIA GPU con drivers y nvidia-container-toolkit instalado
- WSL2 (si estás en Windows)

## Instalación

1. Clonar el repositorio
2. Asegurarse de que nvidia-container-toolkit está instalado:
   ```bash
   # En Ubuntu/Debian
   distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
   curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
   curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | sudo tee /etc/apt/sources.list.d/nvidia-docker.list
   sudo apt-get update && sudo apt-get install -y nvidia-container-toolkit
   sudo systemctl restart docker
   ```

3. Construir y levantar los servicios:
   ```bash
   docker-compose up --build
   ```

4. Acceder a la aplicación:
   - Frontend: http://localhost:3001
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

## Estructura del Proyecto

```
/
├── docker-compose.yml
├── frontend/          # Next.js 16
├── backend/           # FastAPI + Celery
└── data/              # Volúmenes compartidos
    ├── uploads/       # Imágenes originales
    └── results/       # Imágenes procesadas
```

## Uso

1. Abre http://localhost:3001
2. Arrastra o selecciona una imagen (máx. 100MB)
3. Espera a que se procese (el worker usa GPU)
4. Visualiza el resultado con el slider de comparación
5. Descarga la imagen sin fondo

## Endpoints API

- `POST /upload` - Sube una imagen y crea una tarea
- `GET /status/{task_id}` - Consulta el estado de una tarea
- `GET /result/{filename}` - Obtiene la imagen procesada
- `GET /original/{filename}` - Obtiene la imagen original

## Notas

- El worker procesa una imagen a la vez (concurrency=1) para evitar OOM en la GPU
- Las imágenes se guardan en volúmenes Docker compartidos
- El modelo birefnet-general se descarga automáticamente la primera vez
