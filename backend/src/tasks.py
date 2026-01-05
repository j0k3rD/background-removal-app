import os
import logging
from celery import Task
from rembg import remove, new_session
import vtracer
from .celery_app import celery_app
from .config import settings

logger = logging.getLogger(__name__)

session = None


def get_session():
    global session
    if session is None:
        session = new_session("birefnet-general")
    return session


@celery_app.task(bind=True, name="process_image")
def process_image(self: Task, input_path: str, output_path: str) -> dict:
    try:
        self.update_state(state="PROCESSING", meta={"progress": 0})
        
        if not os.path.exists(input_path):
            raise FileNotFoundError(f"Input file not found: {input_path}")

        logger.info(f"Processing image: {input_path} -> {output_path}")
        
        with open(input_path, "rb") as input_file:
            input_data = input_file.read()
        
        self.update_state(state="PROCESSING", meta={"progress": 50})
        
        session = get_session()
        output_data = remove(input_data, session=session)
        
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        with open(output_path, "wb") as output_file:
            output_file.write(output_data)
        
        self.update_state(state="PROCESSING", meta={"progress": 100})
        
        logger.info(f"Image processed successfully: {output_path}")
        
        return {
            "status": "SUCCESS",
            "output_path": output_path,
            "filename": os.path.basename(output_path),
        }
    except Exception as e:
        logger.error(f"Error processing image: {str(e)}", exc_info=True)
        raise


@celery_app.task(bind=True, name="vectorize_image")
def vectorize_image(self: Task, input_path: str, output_path: str) -> dict:
    try:
        self.update_state(state="PROCESSING", meta={"progress": 0})

        if not os.path.exists(input_path):
            raise FileNotFoundError(f"Input file not found: {input_path}")

        logger.info(f"Vectorizing image: {input_path} -> {output_path}")

        self.update_state(state="PROCESSING", meta={"progress": 30})

        vtracer.convert_image_to_svg_py(
            input_path,
            output_path,
            colormode="color",
            hierarchical="stacked",
            mode="spline",
            filter_speckle=4,
            color_precision=6,
            layer_difference=16,
            corner_threshold=60,
            length_threshold=10,
            max_iterations=10,
            splice_threshold=45,
            path_precision=8
        )

        self.update_state(state="PROCESSING", meta={"progress": 100})

        logger.info(f"Image vectorized successfully: {output_path}")

        return {
            "status": "SUCCESS",
            "output_path": output_path,
            "filename": os.path.basename(output_path),
        }
    except Exception as e:
        logger.error(f"Error vectorizing image: {str(e)}", exc_info=True)
        raise
