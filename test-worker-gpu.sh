#!/bin/bash

echo "Construyendo imagen de worker..."
docker-compose build worker

echo ""
echo "Ejecutando test de GPU en container..."
docker-compose run --rm -e TEST_GPU=true worker

echo ""
echo "=============================================="
echo "Revisa los logs arriba. Busca:"
echo "  ✓ en PyTorch y ONNX Runtime"
echo "  ✓ Test de tensor en GPU exitoso"
echo "  ✓ Session creada exitosamente con CUDAExecutionProvider"
echo "=============================================="