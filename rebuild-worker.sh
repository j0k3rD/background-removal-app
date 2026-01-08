#!/bin/bash

echo "=============================================="
echo "REBUILD WORKER"
echo "=============================================="

echo ""
echo "1. Deteniendo worker..."
docker-compose stop worker

echo ""
echo "2. Eliminando imagen vieja del worker..."
docker rmi $(docker images -q removeapp-app-n5npif-worker) 2>/dev/null || echo "Imagen no encontrada"

echo ""
echo "3. Buildando worker..."
docker-compose build worker

echo ""
echo "4. Iniciando worker..."
docker-compose up -d worker

echo ""
echo "=============================================="
echo "REBUILD COMPLETADO"
echo "=============================================="
echo ""
echo "Para ver logs:"
echo "  docker-compose logs -f worker"
echo ""
echo "Para ver uso de GPU:"
echo "  watch nvidia-smi"