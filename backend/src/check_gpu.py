#!/usr/bin/env python3
import sys

try:
    import torch
    if torch.cuda.is_available():
        print(f"✓ CUDA disponible")
        print(f"  Dispositivo: {torch.cuda.get_device_name(0)}")
        print(f"  Versión CUDA: {torch.version.cuda}")
        print(f"  Memoria: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.2f} GB")
    else:
        print("✗ CUDA no disponible - el procesamiento será más lento")
        sys.exit(1)
except ImportError:
    print("✗ PyTorch no instalado")
    sys.exit(1)
except Exception as e:
    print(f"✗ Error verificando GPU: {e}")
    sys.exit(1)
