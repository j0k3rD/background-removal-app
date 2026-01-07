# Image Processor

Aplicación full-stack para procesar imágenes usando IA. Funcionalidades: eliminar fondo y vectorizar a SVG.

## Stack Tecnológico

- **Frontend**: Next.js 16, React, Tailwind CSS, shadcn/ui
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
├── frontend/          # Next.js 16 + shadcn/ui
├── backend/           # FastAPI + Celery
└── data/              # Volúmenes compartidos
    ├── uploads/       # Imágenes originales
    └── results/       # Imágenes procesadas
```

## Uso

1. Abre http://localhost:3001
2. Selecciona la funcionalidad: "Remove Background" o "Vectorize"
3. Arrastra o selecciona imágenes (hasta 10 a la vez, máx. 100MB cada una)
4. Espera a que se procesen (el worker usa GPU)
5. Visualiza los resultados con el slider de comparación o vista SVG
6. Descarga las imágenes procesadas

## Endpoints API

- `POST /upload` - Sube una imagen y crea una tarea
- `GET /status/{task_id}` - Consulta el estado de una tarea
- `GET /result/{filename}` - Obtiene la imagen procesada
- `GET /original/{filename}` - Obtiene la imagen original

## Características

- Procesamiento por lotes de hasta 10 imágenes
- Modo dark/light
- Comparación interactiva de antes/después
- Vectorización a SVG de alta calidad
- Interfaz minimalista y responsive
- Aceleración por GPU NVIDIA

## Notas

- El worker procesa una imagen a la vez (concurrency=1) para evitar OOM en la GPU
- Las imágenes se guardan en volúmenes Docker compartidos
- El modelo birefnet-general se descarga automáticamente la primera vez
