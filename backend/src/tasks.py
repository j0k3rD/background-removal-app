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
upsampler = None


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


def get_realesrgan_upsampler():
    global upsampler
    if upsampler is None:
        model_name = settings.REALESRGAN_MODEL
        logger.info(f"Cargando modelo Real-ESRGAN {model_name}...")

        try:
            from basicsr.archs.rrdbnet_arch import RRDBNet
            from realesrgan import RealESRGANer

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
            logger.info(f"Modelo Real-ESRGAN {model_name} cargado exitosamente")
        except Exception as e:
            logger.error(f"Error cargando modelo Real-ESRGAN: {e}")
            raise

    return upsampler


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
def vectorize_image(self: Task, input_path: str, output_path: str, enhance_before: bool = False, enhance_scale: int = 4) -> dict:
    try:
        self.update_state(state="PROCESSING", meta={"progress": 0})

        if not os.path.exists(input_path):
            raise FileNotFoundError(f"Input file not found: {input_path}")

        processed_input_path = input_path
        temp_path = None

        if enhance_before:
            logger.info(f"Enhancing imagen antes de vectorizar (scale: {enhance_scale}x)...")

            import cv2
            import numpy as np

            upsampler = get_realesrgan_upsampler()

            img = cv2.imread(input_path, cv2.IMREAD_UNCHANGED)
            if img is None:
                raise ValueError(f"Error leyendo imagen: {input_path}")

            if len(img.shape) == 2:
                img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
            elif img.shape[2] == 4:
                img = cv2.cvtColor(img, cv2.COLOR_BGRA2BGR)

            self.update_state(state="PROCESSING", meta={"progress": 15})

            _, _, output_img = upsampler.enhance(img, outscale=enhance_scale // 4 if enhance_scale > 4 else 1)

            temp_path = input_path.replace(os.path.splitext(input_path)[1], f"_enhanced{os.path.splitext(input_path)[1]}")
            cv2.imwrite(temp_path, output_img)

            processed_input_path = temp_path
            self.update_state(state="PROCESSING", meta={"progress": 50})

        logger.info(f"Vectorizando imagen: {processed_input_path} -> {output_path}")

        self.update_state(state="PROCESSING", meta={"progress": 60})

        vtracer.convert_image_to_svg_py(
            processed_input_path,
            output_path,
            colormode="color",
            hierarchical="stacked",
            mode="spline",
            filter_speckle=1,
            color_precision=10,
            layer_difference=4,
            corner_threshold=30,
            length_threshold=3,
            max_iterations=20,
            splice_threshold=25,
            path_precision=12
        )

        self.update_state(state="PROCESSING", meta={"progress": 100})

        logger.info(f"Image vectorized successfully: {output_path}")

        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)

        return {
            "status": "SUCCESS",
            "output_path": output_path,
            "filename": os.path.basename(output_path),
        }
    except Exception as e:
        logger.error(f"Error vectorizando imagen: {str(e)}", exc_info=True)
        raise


@celery_app.task(bind=True, name="enhance_image")
def enhance_image(self: Task, input_path: str, output_path: str, scale: int = 4) -> dict:
    try:
        logger.info("="*60)
        logger.info("INICIANDO ENHANCEMENT DE IMAGEN")
        logger.info("="*60)
        logger.info(f"Input: {input_path}")
        logger.info(f"Output: {output_path}")
        logger.info(f"Scale: {scale}x")

        self.update_state(state="PROCESSING", meta={"progress": 0})

        if not os.path.exists(input_path):
            raise FileNotFoundError(f"Input file not found: {input_path}")

        if scale not in [2, 4, 8]:
            raise ValueError(f"Invalid scale: {scale}. Must be 2, 4, or 8")

        import cv2
        import numpy as np

        logger.info("Leyendo imagen...")
        img = cv2.imread(input_path, cv2.IMREAD_UNCHANGED)

        if img is None:
            raise ValueError(f"Error leyendo imagen: {input_path}")

        self.update_state(state="PROCESSING", meta={"progress": 10})

        if len(img.shape) == 2:
            img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
            logger.info("Imagen escala de grises convertida a BGR")
        elif img.shape[2] == 4:
            img = cv2.cvtColor(img, cv2.COLOR_BGRA2BGR)
            logger.info("Imagen BGRA convertida a BGR")

        self.update_state(state="PROCESSING", meta={"progress": 20})

        logger.info("Cargando modelo Real-ESRGAN...")
        upsampler = get_realesrgan_upsampler()

        logger.info(f"Aplicando super resolución ({scale}x)...")
        start_time = time.time()

        if upsampler.scale != scale:
            logger.warning(f"Modelo escala {upsampler.scale}x, solicitado {scale}x. Usando modelo disponible.")

        _, _, output_img = upsampler.enhance(img, outscale=scale // 4 if scale > 4 else 1)

        process_time = time.time() - start_time
        logger.info(f"Tiempo de enhancement: {process_time:.2f}s")

        self.update_state(state="PROCESSING", meta={"progress": 90})

        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        logger.info("Guardando resultado...")
        cv2.imwrite(output_path, output_img)

        self.update_state(state="PROCESSING", meta={"progress": 100})

        logger.info("✓ Imagen enhanced exitosamente")
        logger.info("="*60)

        return {
            "status": "SUCCESS",
            "output_path": output_path,
            "filename": os.path.basename(output_path),
        }
    except Exception as e:
        logger.error(f"✗ Error en enhancement: {str(e)}", exc_info=True)
        raise