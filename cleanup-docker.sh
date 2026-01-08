#!/bin/bash

echo "=============================================="
echo "LIMPIANDO ESPACIO DE DOCKER"
echo "=============================================="

echo ""
echo "1. Eliminando contenedores stopped..."
docker container prune -f

echo ""
echo "2. Eliminando imágenes dangling..."
docker image prune -f

echo ""
echo "3. Eliminando imágenes no usadas..."
docker image prune -a -f

echo ""
echo "4. Limpiando build cache..."
docker builder prune -af

echo ""
echo "5. Limpiando volúmenes no usados..."
docker volume prune -f

echo ""
echo "6. Mostrando uso de espacio actual..."
docker system df

echo ""
echo "=============================================="
echo "LIMPIEZA COMPLETADA"
echo "=============================================="