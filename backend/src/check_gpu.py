#!/usr/bin/env python3
import sys
import os

print("Verificando disponibilidad de GPU...")

# Verificar variables de entorno NVIDIA
nvidia_visible = os.environ.get("NVIDIA_VISIBLE_DEVICES", "none")
print(f"NVIDIA_VISIBLE_DEVICES: {nvidia_visible}")

try:
    import torch
    if torch.cuda.is_available():
        print(f"✓ CUDA disponible en PyTorch")
        print(f"  Dispositivo: {torch.cuda.get_device_name(0)}")
        print(f"  Versión CUDA: {torch.version.cuda}")
        print(f"  Memoria: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.2f} GB")
    else:
        print("⚠ CUDA no disponible en PyTorch - el procesamiento será más lento")
except ImportError:
    print("⚠ PyTorch no instalado")
except Exception as e:
    print(f"⚠ Error verificando PyTorch CUDA: {e}")

try:
    import onnxruntime as ort
    providers = ort.get_available_providers()
    if "CUDAExecutionProvider" in providers:
        print(f"✓ ONNX Runtime con CUDA disponible")
        print(f"  Proveedores disponibles: {providers}")
    else:
        print(f"⚠ ONNX Runtime sin CUDA - usando CPU")
        print(f"  Proveedores disponibles: {providers}")
except ImportError:
    print("⚠ onnxruntime no instalado")
except Exception as e:
    print(f"⚠ Error verificando ONNX Runtime: {e}")

print("Continuando con el inicio del worker...")
