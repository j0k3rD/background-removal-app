#!/bin/bash
set -e

echo "Verificando GPU..."
python src/check_gpu.py

echo "Iniciando Celery worker..."
exec celery -A src.celery_app worker --loglevel=info --concurrency=1
