import os
import logging
import time
from celery import Task
from rembg import remove, new_session
import vtracer
from .celery_app import celery_app
from .config import settings

logger = logging.getLogger(__name__)

session = None


def check_gpu_availability():
    try:
        import torch
        if torch.cuda.is_available():
            logger.info("="*60)
            logger.info("GPU DETECTADA - PYTORCH")
            logger.info("="*60)
            logger.info(f"  ✓ Dispositivo: {torch.cuda.get_device_name(0)}")
            logger.info(f"  ✓ Versión CUDA: {torch.version.cuda}")
            logger.info(f"  ✓ Memoria: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.2f} GB")
            logger.info(f"  ✓ Número de GPUs: {torch.cuda.device_count()}")
        else:
            logger.warning("⚠ CUDA NO DISPONIBLE en PyTorch - Procesamiento será en CPU")
    except ImportError:
        logger.error("⚠ PyTorch no está instalado")
    except Exception as e:
        logger.error(f"⚠ Error verificando PyTorch CUDA: {e}")

    try:
        import onnxruntime as ort
        available_providers = ort.get_available_providers()
        logger.info("="*60)
        logger.info("ONNX RUNTIME PROVIDERS")
        logger.info("="*60)
        for i, provider in enumerate(available_providers, 1):
            status = "✓" if provider in available_providers else "✗"
            logger.info(f"  {status} {provider}")
        
        if "CUDAExecutionProvider" in available_providers:
            logger.info("  ✓ ONNX Runtime usará GPU (CUDA)")
        else:
            logger.warning("  ⚠ ONNX Runtime usará CPU (CUDA no disponible)")
    except ImportError:
        logger.error("⚠ ONNX Runtime no está instalado")
    except Exception as e:
        logger.error(f"⚠ Error verificando ONNX Runtime: {e}")
    
    logger.info("="*60)


def get_session():
    global session
    if session is None:
        check_gpu_availability()
        model_name = settings.REMBG_MODEL
        logger.info(f"Cargando modelo {model_name}...")

        try:
            import onnxruntime as ort

            providers = ["CUDAExecutionProvider", "CPUExecutionProvider"]
            session = new_session(model_name, providers=providers)
            logger.info("Modelo cargado exitosamente con GPU")
            logger.info(f"  Session providers: {session.providers}")
        except Exception as e:
            logger.error(f"Error cargando modelo con GPU: {e}")
            logger.error("Intentando fallback a CPU...")
            session = new_session(model_name)
            logger.info("Modelo cargado en CPU (fallback)")

    return session


@celery_app.task(bind=True, name="process_image")
def process_image(self: Task, input_path: str, output_path: str) -> dict:
    try:
        logger.info("="*60)
        logger.info("INICIANDO PROCESAMIENTO DE IMAGEN")
        logger.info("="*60)
        logger.info(f"Input: {input_path}")
        logger.info(f"Output: {output_path}")
        
        self.update_state(state="PROCESSING", meta={"progress": 0})
        
        if not os.path.exists(input_path):
            raise FileNotFoundError(f"Input file not found: {input_path}")

        logger.info("Leyendo imagen...")
        with open(input_path, "rb") as input_file:
            input_data = input_file.read()

        self.update_state(state="PROCESSING", meta={"progress": 50})

        logger.info("Procesando con rembg (alpha matting para bordes finos)...")
        session = get_session()

        start_time = time.time()
        output_data = remove(
            input_data,
            session=session,
            alpha_matting=True,
            alpha_matting_foreground_threshold=240,
            alpha_matting_background_threshold=10,
            alpha_matting_erode_size=10
        )
        process_time = time.time() - start_time
        logger.info(f"Tiempo de procesamiento: {process_time:.2f}s")

        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        logger.info("Guardando resultado...")
        with open(output_path, "wb") as output_file:
            output_file.write(output_data)
        
        self.update_state(state="PROCESSING", meta={"progress": 100})
        
        logger.info("✓ Imagen procesada exitosamente")
        logger.info("="*60)
        
        return {
            "status": "SUCCESS",
            "output_path": output_path,
            "filename": os.path.basename(output_path),
        }
    except Exception as e:
        logger.error(f"✗ Error procesando imagen: {str(e)}", exc_info=True)
        raise


@celery_app.task(bind=True, name="vectorize_image")
def vectorize_image(self: Task, input_path: str, output_path: str) -> dict:
    try:
        self.update_state(state="PROCESSING", meta={"progress": 0})

        if not os.path.exists(input_path):
            raise FileNotFoundError(f"Input file not found: {input_path}")

        logger.info(f"Vectorizando imagen: {input_path} -> {output_path}")

        self.update_state(state="PROCESSING", meta={"progress": 30})

        vtracer.convert_image_to_svg_py(
            input_path,
            output_path,
            colormode="color",
            hierarchical="stacked",
            mode="spline",
            filter_speckle=2,
            color_precision=8,
            layer_difference=8,
            corner_threshold=45,
            length_threshold=4,
            max_iterations=15,
            splice_threshold=30,
            path_precision=10
        )

        self.update_state(state="PROCESSING", meta={"progress": 100})

        logger.info(f"Image vectorized successfully: {output_path}")

        return {
            "status": "SUCCESS",
            "output_path": output_path,
            "filename": os.path.basename(output_path),
        }
    except Exception as e:
        logger.error(f"Error vectorizando imagen: {str(e)}", exc_info=True)
        raise