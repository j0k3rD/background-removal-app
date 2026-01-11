import os
import uuid
from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from celery.result import AsyncResult
from pydantic import BaseModel
from .config import settings
from .celery_app import celery_app
from .tasks import process_image, vectorize_image, enhance_image

app = FastAPI(title="Background Removal API")


class UploadRequest(BaseModel):
    task_type: str
    scale: int = 4
    enhance_before: bool = False

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    os.makedirs(settings.RESULT_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


@app.get("/")
async def root():
    return {"message": "Background Removal API"}


@app.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    task_type: str = Form("remove_background"),
    scale: int = Form(4),
    enhance_before: bool = Form(False)
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    if task_type not in ["remove_background", "vectorize", "enhance", "vectorize_enhance"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid task_type. Use 'remove_background', 'vectorize', 'enhance', or 'vectorize_enhance'"
        )

    if scale not in [2, 4, 8]:
        raise HTTPException(
            status_code=400,
            detail="Invalid scale. Must be 2, 4, or 8"
        )

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    file_content = await file.read()
    file_size = len(file_content)

    if file_size > settings.MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size: {settings.MAX_FILE_SIZE / (1024 * 1024)}MB"
        )

    filename = f"{uuid.uuid4()}{ext}"

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    os.makedirs(settings.RESULT_DIR, exist_ok=True)

    input_path = os.path.join(settings.UPLOAD_DIR, filename)

    with open(input_path, "wb") as f:
        f.write(file_content)

    if task_type == "remove_background":
        output_filename = f"{uuid.uuid4()}.png"
        output_path = os.path.join(settings.RESULT_DIR, output_filename)
        task = process_image.delay(input_path, output_path)
    elif task_type == "vectorize":
        output_filename = f"{uuid.uuid4()}.svg"
        output_path = os.path.join(settings.RESULT_DIR, output_filename)
        task = vectorize_image.delay(input_path, output_path, enhance_before=False, enhance_scale=scale)
    elif task_type == "enhance":
        output_filename = f"{uuid.uuid4()}.png"
        output_path = os.path.join(settings.RESULT_DIR, output_filename)
        task = enhance_image.delay(input_path, output_path, scale=scale)
    elif task_type == "vectorize_enhance":
        output_filename = f"{uuid.uuid4()}.svg"
        output_path = os.path.join(settings.RESULT_DIR, output_filename)
        task = vectorize_image.delay(input_path, output_path, enhance_before=True, enhance_scale=scale)

    return {
        "task_id": task.id,
        "filename": filename,
        "output_filename": output_filename,
        "task_type": task_type,
    }


@app.get("/status/{task_id}")
async def get_status(task_id: str):
    task_result = AsyncResult(task_id, app=celery_app)
    
    if task_result.state == "PENDING":
        response = {
            "status": "PENDING",
            "result": None,
        }
    elif task_result.state == "PROCESSING":
        response = {
            "status": "PROCESSING",
            "result": task_result.info.get("progress", 0) if task_result.info else 0,
        }
    elif task_result.state == "SUCCESS":
        response = {
            "status": "SUCCESS",
            "result": task_result.result.get("filename") if task_result.result else None,
        }
    else:
        response = {
            "status": "FAILURE",
            "result": str(task_result.info) if task_result.info else None,
        }
    
    return response


@app.get("/result/{filename}")
async def get_result(filename: str):
    file_path = os.path.join(settings.RESULT_DIR, filename)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")

    media_type = "image/svg+xml" if filename.endswith(".svg") else "image/png"

    return FileResponse(
        file_path,
        media_type=media_type,
        filename=filename,
    )


@app.get("/original/{filename}")
async def get_original(filename: str):
    file_path = os.path.join(settings.UPLOAD_DIR, filename)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(
        file_path,
        media_type="image/jpeg" if filename.lower().endswith((".jpg", ".jpeg")) else "image/png",
        filename=filename,
    )
