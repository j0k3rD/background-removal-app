#!/usr/bin/env python3
"""Pre-load rembg models to avoid download delays during processing."""
import logging
from rembg import new_session
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from config import settings

logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)

def preload_models():
    """Pre-load rembg model to cache it locally."""
    logger.info("="*60)
    logger.info("PRE-CARGANDO MODELOS DE REMBG")
    logger.info("="*60)

    try:
        import onnxruntime as ort

        available_providers = ort.get_available_providers()
        logger.info(f"Providers disponibles: {available_providers}")

        if "CUDAExecutionProvider" in available_providers:
            providers = ["CUDAExecutionProvider", "CPUExecutionProvider"]
            logger.info("Usando CUDA (GPU)")
        else:
            providers = ["CPUExecutionProvider"]
            logger.info("Usando CPU")

        model_name = settings.REMBG_MODEL
        logger.info(f"Cargando modelo {model_name}...")
        session = new_session(model_name, providers=providers)
        logger.info("Modelo cargado exitosamente")
        logger.info(f"Session providers: {session.providers}")
        logger.info("="*60)

        return True
    except Exception as e:
        logger.error(f"Error pre-cargando modelo: {e}")
        return False

def preload_realesrgan_models():
    """Pre-load Real-ESRGAN model to cache it locally."""
    logger.info("="*60)
    logger.info("PRE-CARGANDO MODELOS DE REAL-ESRGAN")
    logger.info("="*60)

    try:
        from basicsr.archs.rrdbnet_arch import RRDBNet
        from realesrgan import RealESRGANer
        import cv2

        model_name = settings.REALESRGAN_MODEL
        logger.info(f"Cargando modelo {model_name}...")

        if "x2" in model_name:
            scale = 2
        elif "x4" in model_name:
            scale = 4
        elif "x8" in model_name:
            scale = 8
        else:
            scale = 4

        model = RRDBNet(num_in_ch=3, num_out_ch=3, num_feat=64, num_block=23, num_grow_ch=32, scale=scale)

        upsampler = RealESRGANer(
            scale=scale,
            model_path=None,
            model=model,
            tile=0,
            tile_pad=10,
            pre_pad=0,
            half=True
        )
        logger.info("Modelo Real-ESRGAN cargado exitosamente")
        logger.info("="*60)

        return True
    except Exception as e:
        logger.error(f"Error pre-cargando modelo Real-ESRGAN: {e}")
        return False

if __name__ == "__main__":
    success1 = preload_models()
    success2 = preload_realesrgan_models()
    if not success1 or not success2:
        exit(1)
