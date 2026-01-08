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

3. Verificar que Docker puede acceder a la GPU:
    ```bash
    docker run --rm --gpus all nvidia/cuda:12.1-base-ubuntu22.04 nvidia-smi
    ```

4. (Opcional) Probar la GPU con el worker antes de iniciar:
    ```bash
    ./test-worker-gpu.sh
    ```
    Busca `✓` en los logs para confirmar que PyTorch y ONNX Runtime están usando la GPU.

5. Construir y levantar los servicios:
    ```bash
    docker-compose up --build
    ```

6. Acceder a la aplicación:
    - Frontend: http://localhost:3001
    - Backend API: http://localhost:8000
    - API Docs: http://localhost:8000/docs

7. Para ver si el worker está usando la GPU:
    ```bash
    # En otra terminal
    watch nvidia-smi
    ```
    Cuando proceses una imagen, deberías ver la memoria de GPU aumentar.

## Estructura del Proyecto

```
/
├── docker-compose.yml
├── test-worker-gpu.sh  # Script para probar GPU en worker
├── frontend/          # Next.js 16 + shadcn/ui
├── backend/           # FastAPI + Celery
│   ├── test_gpu.py    # Script completo de test de GPU
│   └── check_gpu.py   # Script simple de verificación
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
- Aceleración por GPU NVIDIA con logging detallado

## Troubleshooting

### GPU no detectada

Si ves errores como:
- `Failed to load library libonnxruntime_providers_cuda.so`
- `libnvinfer.so.10: cannot open shared object file`
- `libnvinfer.so.9: cannot open shared object file`

Ejecuta:
```bash
./test-worker-gpu.sh
```

El script mostrará:
- ✓ si PyTorch está usando CUDA
- ✓ si ONNX Runtime está usando CUDAExecutionProvider
- Detalles de los providers disponibles

### Verificar uso de GPU

Cuando proceses una imagen, ejecuta en otra terminal:
```bash
watch nvidia-smi
```

Deberías ver:
- El proceso `celery` o `python` usando la GPU
- La memoria de GPU aumentando
- El uso de GPU en la columna "GPU-Util"

Si NO ves aumento en la memoria de GPU, el worker está usando CPU.

### Logs del Worker

Los logs del worker incluyen información detallada:
```
[timestamp] [INFO] ============================================================
[timestamp] [INFO] GPU DETECTADA - PYTORCH
[timestamp] [INFO]   ✓ Dispositivo: NVIDIA GeForce RTX 3080
[timestamp] [INFO]   ✓ Versión CUDA: 12.1
[timestamp] [INFO] ============================================================
[timestamp] [INFO] ONNX RUNTIME PROVIDERS
[timestamp] [INFO] ============================================================
[timestamp] [INFO]   ✓ CUDAExecutionProvider
[timestamp] [INFO] ============================================================
```

Busca `✓` para confirmar que la GPU está configurada correctamente.

## Notas

- El worker procesa una imagen a la vez (concurrency=1) para evitar OOM en la GPU
- Las imágenes se guardan en volúmenes Docker compartidos
- El modelo birefnet-general se descarga automáticamente la primera vez
- ONNX Runtime intentará usar CUDA primero, fallback a CPU si no está disponible
