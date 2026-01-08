#!/usr/bin/env python3
"""Test script para verificar ONNX Runtime GPU availability"""

import os
os.environ["CUDA_VISIBLE_DEVICES"] = "0"
os.environ["LD_LIBRARY_PATH"] = "/usr/local/cuda/lib64:" + os.environ.get("LD_LIBRARY_PATH", "")

print("="*70)
print("VERIFICANDO DISPONIBILIDAD DE GPU PARA ONNX RUNTIME")
print("="*70)
print(f"\nCUDA_VISIBLE_DEVICES: {os.environ.get('CUDA_VISIBLE_DEVICES', 'not set')}")
print(f"LD_LIBRARY_PATH: {os.environ.get('LD_LIBRARY_PATH', 'not set')}")

print("\n" + "="*70)
print("1. VERIFICANDO PYTORCH")
print("="*70)
try:
    import torch
    if torch.cuda.is_available():
        print(f"✓ PyTorch CUDA disponible")
        print(f"  Dispositivo: {torch.cuda.get_device_name(0)}")
        print(f"  Versión CUDA: {torch.version.cuda}")
        print(f"  Memoria: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.2f} GB")
        print(f"  Número de GPUs: {torch.cuda.device_count()}")
        
        # Test simple tensor en GPU
        print("\nProbando tensor en GPU...")
        x = torch.randn(1000, 1000).cuda()
        y = torch.randn(1000, 1000).cuda()
        z = torch.matmul(x, y)
        print(f"✓ Test de tensor en GPU exitoso (resultado shape: {z.shape})")
    else:
        print("✗ PyTorch CUDA NO disponible")
except ImportError:
    print("✗ PyTorch no instalado")
except Exception as e:
    print(f"✗ Error: {e}")

print("\n" + "="*70)
print("2. VERIFICANDO ONNX RUNTIME")
print("="*70)
try:
    import onnxruntime as ort
    available_providers = ort.get_available_providers()
    print(f"Providers disponibles: {available_providers}")
    
    print("\nProviders:")
    for i, provider in enumerate(available_providers, 1):
        print(f"  {i}. {provider}")
    
    if "CUDAExecutionProvider" in available_providers:
        print("\n✓ ONNX Runtime CUDAExecutionProvider disponible")
        
        # Test simple session
        print("\nProbando session con CUDAExecutionProvider...")
        session_options = ort.SessionOptions()
        session_options.log_severity_level = 0
        
        try:
            # Crear una session dummy con CUDA
            import numpy as np
            
            # Crear un modelo simple
            import onnx
            from onnx import helper, TensorProto
            
            # Crear modelo simple
            X = helper.make_tensor_value_info('X', TensorProto.FLOAT, [None, 3, 224, 224])
            Y = helper.make_tensor_value_info('Y', TensorProto.FLOAT, [None, 3, 224, 224])
            
            # Crear nodo identity
            node_def = helper.make_node(
                'Identity',
                inputs=['X'],
                outputs=['Y'],
            )
            
            # Crear grafo
            graph = helper.make_graph(
                [node_def],
                'test_model',
                [X],
                [Y],
            )
            
            # Crear modelo
            model = helper.make_model(graph, producer_name='test')
            
            # Intentar crear session con CUDA
            session = ort.InferenceSession(
                model.SerializeToString(),
                providers=['CUDAExecutionProvider', 'CPUExecutionProvider'],
                sess_options=session_options
            )
            
            print(f"✓ Session creada exitosamente con providers: {session.get_providers()}")
            print(f"  Provider activo: {session.get_providers()[0]}")
            
            # Test inference
            input_data = np.random.randn(1, 3, 224, 224).astype(np.float32)
            outputs = session.run(None, {'X': input_data})
            print(f"✓ Inference test exitoso (output shape: {outputs[0].shape})")
            
        except Exception as e:
            print(f"✗ Error creando session con CUDA: {e}")
            print("  Intentando con CPU...")
            session = ort.InferenceSession(
                model.SerializeToString(),
                providers=['CPUExecutionProvider'],
                sess_options=session_options
            )
            print(f"✓ Session creada con CPU (shape: {session.run(None, {'X': input_data})[0].shape})")
    else:
        print("✗ ONNX Runtime CUDAExecutionProvider NO disponible")
        print("  Solo disponible:", available_providers)
        
except ImportError:
    print("✗ ONNX Runtime no instalado")
except Exception as e:
    print(f"✗ Error: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "="*70)
print("3. VERIFICANDO REMBG")
print("="*70)
try:
    from rembg import new_session
    print("Cargando modelo rembg...")
    session = new_session("birefnet-general")
    print("✓ Modelo cargado exitosamente")
    print(f"  Session: {session}")
except Exception as e:
    print(f"✗ Error cargando modelo rembg: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "="*70)
print("RESUMEN")
print("="*70)
print("Si ves ✓ en todas las secciones, la GPU está configurada correctamente.")
print("Si ves ✗ en alguna sección, revisa el error y la configuración.")
print("="*70)