#!/bin/bash
set -e

echo "=============================================="
echo "Verificando disponibilidad de GPU..."
echo "=============================================="
python src/check_gpu.py || true

if [ "$TEST_GPU" = "true" ]; then
    echo ""
    echo "=============================================="
    echo "Ejecutando test completo de GPU..."
    echo "=============================================="
    python test_gpu.py || true
    exit 0
fi

echo ""
echo "=============================================="
echo "Iniciando Celery worker..."
echo "=============================================="
echo "CUDA_VISIBLE_DEVICES: $CUDA_VISIBLE_DEVICES"
echo "NVIDIA_VISIBLE_DEVICES: $NVIDIA_VISIBLE_DEVICES"
echo "LD_LIBRARY_PATH: $LD_LIBRARY_PATH"
echo "=============================================="
echo ""

exec celery -A src.celery_app worker --loglevel=info --concurrency=1
