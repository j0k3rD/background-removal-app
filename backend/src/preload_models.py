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

if __name__ == "__main__":
    success = preload_models()
    if not success:
        exit(1)
