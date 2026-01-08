# Image Processor

Aplicación full-stack para procesar imágenes usando IA. Funcionalidades: eliminar fondo y vectorizar a SVG.

## Stack Tecnológico

- **Frontend**: Next.js 16, React, Tailwind CSS, shadcn/ui
- **Backend**: FastAPI, Python 3.12
- **Worker**: Celery con rembg (birefnet-general) y CUDA 12.1
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

4. Construir y levantar los servicios:
    ```bash
    docker-compose up --build
    ```

5. Acceder a la aplicación:
    - Frontend: http://localhost:3001
    - Backend API: http://localhost:8000
    - API Docs: http://localhost:8000/docs

6. Para ver si el worker está usando la GPU:
    ```bash
    # En otra terminal
    docker-compose logs -f worker
    watch nvidia-smi
    ```
    Cuando proceses una imagen, deberías ver la memoria de GPU aumentar.

## Estructura del Proyecto

```
/
├── docker-compose.yml
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
- Aceleración por GPU NVIDIA CUDA 12.1 con ONNX Runtime 1.19.2

## Troubleshooting

### Worker muere con SIGKILL

Si el worker muere con `Worker exited prematurely: signal 9 (SIGKILL)`, es porque está usando demasiada memoria. Esto ocurre cuando ONNX Runtime fallback a CPU.

**Solución:**
- Verifica que ONNX Runtime está usando CUDA (ver logs abajo)
- Si no puede usar CUDA, el modelo usará CPU y consumirá mucha memoria
- Reduce el tamaño de las imágenes de entrada

### GPU no detectada

Si ves errores como:
- `Failed to load library libonnxruntime_providers_cuda.so`
- `libcudnn_adv.so.9: cannot open shared object file`
- `libnvinfer.so.10: cannot open shared object file`

Ejecuta:
```bash
docker-compose run --rm -e TEST_GPU=true worker
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
- La memoria de GPU aumentando (de 2MB a varios GB)
- El uso de GPU en la columna "GPU-Util" > 0%

Si NO ves aumento en la memoria de GPU (sigue en 2MB), el worker está usando CPU.

### Logs del Worker

Los logs del worker incluyen información detallada:

**Al cargar el modelo:**
```
============================================================
GPU DETECTADA - PYTORCH
============================================================
  ✓ Dispositivo: NVIDIA GeForce RTX 3060
  ✓ Versión CUDA: 12.1
  ✓ Memoria: 11.76 GB
  ✓ Número de GPUs: 1
============================================================
ONNX RUNTIME PROVIDERS
============================================================
  1. TensorrtExecutionProvider
  2. CUDAExecutionProvider
  3. CPUExecutionProvider
  ✓ ONNX Runtime usará GPU (CUDA)
============================================================
Modelo cargado exitosamente
  Session providers: ['TensorrtExecutionProvider', 'CUDAExecutionProvider', 'CPUExecutionProvider']
```

**Al procesar una imagen:**
```
============================================================
INICIANDO PROCESAMIENTO DE IMAGEN
============================================================
Input: /data/uploads/xxx.jpg
Output: /data/results/xxx.png
Leyendo imagen...
Procesando con rembg...
Guardando resultado...
✓ Imagen procesada exitosamente
============================================================
```

### Advertencias de ONNX Runtime

Puedes ver advertencias como:
```
Failed to load library libonnxruntime_providers_tensorrt.so with error: libnvinfer.so.10: cannot open shared object file
Falling back to ['CUDAExecutionProvider', 'CPUExecutionProvider']
```

**Esto es NORMAL**. ONNX Runtime intenta usar TensorRT primero (más rápido), pero si no está disponible, hace fallback a CUDA (que es lo que queremos usar). Mientras veas `CUDAExecutionProvider` en la lista de providers disponibles, está usando la GPU.

### Aumentar memoria disponible

Si el worker sigue muriendo con SIGKILL:

1. Verifica la memoria disponible del sistema:
   ```bash
   free -h
   ```

2. Aumenta el límite de memoria de Docker Desktop o en Dokploy

3. Reduce el tamaño de las imágenes de entrada antes de procesarlas

## Optimización de Espacio

### Limpiar imágenes y contenedores antiguos

Para liberar espacio en disco después de rebuilds:

```bash
./cleanup-docker.sh
```

Este script:
- Elimina contenedores stopped
- Elimina imágenes dangling y no usadas
- Limpia el build cache de Docker
- Limpia volúmenes no usados

### Manualmente

```bash
# Ver uso de espacio actual
docker system df

# Limpiar todo lo no usado
docker system prune -a --volumes -f

# Solo limpiar imágenes
docker image prune -a -f

# Solo limpiar build cache
docker builder prune -af
```

### Tamaño esperado de imágenes

- **Frontend**: ~200-300MB
- **Backend**: ~500MB-1GB
- **Worker**: ~8-12GB (PyTorch con CUDA es grande por diseño)
- **Redis**: ~40MB

Si el worker es >15GB, algo salió mal en el build. Haz un cleanup y rebuild.

## Notas

- El worker procesa una imagen a la vez (concurrency=1) para evitar OOM en la GPU
- Las imágenes se guardan en volúmenes Docker compartidos
- El modelo birefnet-general se descarga automáticamente la primera vez (~973MB)
- ONNX Runtime 1.19.2 usa CUDA 12.1 directamente (sin TensorRT)
- Los logs del worker son muy detallados para facilitar debugging
- La imagen del worker es grande (~10GB) porque incluye PyTorch, CUDA y cuDNN
