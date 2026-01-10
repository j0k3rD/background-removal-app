# AGENTS.md

This file contains build, lint, test commands and code style guidelines for the background-removal-app project.

## Build Commands

### Docker (Full Stack)
```bash
# Build and run all services
docker compose up --build

# Rebuild specific service
docker compose build worker
docker compose build backend
docker compose build frontend

# View logs
docker compose logs -f worker
docker compose logs -f backend
docker compose logs -f frontend

# Run all services in detached mode
docker compose up -d

# Stop all services
docker compose down

# Clean up Docker resources
docker system prune -a --volumes -f
```

### Backend (Python/FastAPI)
```bash
# Run backend locally (requires Python 3.12)
cd backend
pip install -r requirements.txt
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000

# Test GPU availability (inside Docker)
docker compose run --rm -e TEST_GPU=true worker
```

### Frontend (Next.js/TypeScript)
```bash
# Development server
cd frontend
npm run dev

# Production build
npm run build

# Start production server
npm run start

# Lint
npm run lint
```

## Running Tests

### Python Tests
Currently there are no automated test suites. Use manual testing:

```bash
# Test GPU availability (comprehensive)
python backend/test_gpu.py

# Quick GPU check
python backend/check_gpu.py
```

### TypeScript/React Tests
No test framework configured yet. Manual testing via browser at http://localhost:3001

## Code Style Guidelines

### Python (Backend)

#### Imports
- Standard library imports first, then third-party, then local modules
- Group imports with blank lines between groups
- Use absolute imports: `from .celery_app import celery_app`

#### Formatting
- Use type hints on all function parameters and return values
- Follow PEP 8 naming: `snake_case` for functions/variables, `PascalCase` for classes
- Constants: `ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}`
- Use f-strings for string formatting

#### Types
- Use `typing` module for complex types when needed
- Return explicit types: `def process_image(...) -> dict:`
- Use Pydantic models for API request/response validation

#### Error Handling
- Use try/except blocks around file operations and external API calls
- Log errors with exc_info=True: `logger.error(f"Error: {e}", exc_info=True)`
- Raise HTTPException for FastAPI endpoints with meaningful messages
- Re-raise exceptions in Celery tasks after logging

#### Logging
- Create module-level logger: `logger = logging.getLogger(__name__)`
- Use logger methods: `logger.info()`, `logger.warning()`, `logger.error()`
- Log important events: task start/finish, file operations, errors

#### Docstrings
- Not extensively used currently, but add when creating new public functions
- Keep it brief: `"""Check GPU availability and providers"""`

### TypeScript/React (Frontend)

#### Imports
- React hooks first, then third-party imports, then local components
- Use path aliases: `@/components/ui/button`, `@/lib/utils`

#### Formatting
- Use 'use client' directive for components using hooks
- CamelCase for variables/functions, PascalCase for components
- Descriptive names: `handleUpload`, `activeTab`, `ImageProcess`

#### Types
- Define interfaces for complex objects: `interface UploadResponse {...}`
- Use type aliases for union types: `type TaskType = 'remove_background' | 'vectorize'`
- Enable strict mode in tsconfig.json
- Use explicit type annotations for API responses

#### React Patterns
- Use hooks: `useState`, `useEffect`, `useCallback`, `useRef`
- Memoize callbacks with `useCallback` when passed to child components
- Clean up intervals/sockets in useEffect cleanup functions
- Conditional rendering with ternary operators

#### Error Handling
- Try/catch around async operations with fetch()
- Log errors with console.error
- Display user-friendly error messages in UI
- Set error state and show error components

#### Components
- Use shadcn/ui components as building blocks
- Keep components focused on single responsibility
- Use composition pattern: `<Card><CardContent>...</CardContent></Card>`
- Tailwind classes for styling (dark mode supported)

## Architecture Notes

### Backend
- FastAPI for REST API (port 8000)
- Celery for async background tasks (worker with GPU support)
- Redis as broker and result backend
- File storage in shared Docker volumes: `/data/uploads`, `/data/results`
- Pydantic Settings for environment configuration

### Frontend
- Next.js 16 with App Router
- Client-side polling for task status (every 2 seconds)
- React Dropzone for file uploads
- Max 10 images, 100MB per file
- shadcn/ui + Tailwind CSS for styling

### Worker
- Celery worker processes images with rembg (background removal)
- vtracer for image-to-SVG vectorization
- GPU acceleration via ONNX Runtime with CUDA 12.1
- Concurrency=1 to prevent GPU OOM
- Alpha matting enabled for fine edge detection

## Common Issues

- Worker dies with SIGKILL: Check GPU availability, reduce image size
- scipy installation errors: scipy installed from conda first, then pip
- ModuleNotFoundError: Ensure Docker image was rebuilt after requirements.txt changes
- Frontend build fails: Check Next.js 16 dependencies are installed

## Version Notes

- Python: 3.12 (backend)
- Node.js: via frontend package.json
- PyTorch: 2.4.0 with CUDA 12.1
- ONNX Runtime: 1.19.2 (GPU version)
- scipy: 1.14.0 (from conda-forge)
- Next.js: 16.0.0
- React: 18.3.1
