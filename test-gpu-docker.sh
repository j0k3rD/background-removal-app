#!/bin/bash
echo "=============================================="
echo "Test 1: Docker con runtime nvidia"
echo "=============================================="
docker run --rm --runtime=nvidia --gpus all nvidia/cuda:12.1.0-base-ubuntu22.04 nvidia-smi

echo ""
echo "=============================================="
echo "Test 2: Docker con --gpus all (nuevo método)"
echo "=============================================="
docker run --rm --gpus all nvidia/cuda:12.1.0-base-ubuntu22.04 nvidia-smi

echo ""
echo "=============================================="
echo "Test 3: PyTorch con GPU"
echo "=============================================="
docker run --rm --gpus all pytorch/pytorch:2.4.0-cuda12.1-cudnn9-runtime python -c "import torch; print(f'CUDA disponible: {torch.cuda.is_available()}'); print(f'GPU: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else \"N/A\"}')"
