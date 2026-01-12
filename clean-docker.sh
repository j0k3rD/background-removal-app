#!/bin/bash
echo "Limpiando Docker para liberar espacio..."

echo ""
echo "1. Deteniendo containers..."
docker compose down

echo ""
echo "2. Eliminando imagenes dangling..."
docker image prune -f

echo ""
echo "3. Eliminando volumenes no usados..."
docker volume prune -f

echo ""
echo "4. Eliminando caches de build..."
docker builder prune -f

echo ""
echo "Espacio despues de limpieza:"
docker system df

echo ""
echo "Limpieza completada."
echo ""
echo "Para eliminar TODO (peligroso), ejecuta: docker system prune -a --volumes -f"
