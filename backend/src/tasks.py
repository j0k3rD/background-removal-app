import os
import logging
from celery import Task
from rembg import remove, new_session
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
