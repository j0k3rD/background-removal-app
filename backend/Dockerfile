FROM python:3.12-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir --prefer-binary numpy==2.1.1 && \
    pip install --no-cache-dir --prefer-binary scipy==1.14.1 && \
    pip install --no-cache-dir --prefer-binary pymatting==1.1.12 && \
    pip install --no-cache-dir --prefer-binary onnxruntime==1.19.2 && \
    pip install --no-cache-dir --prefer-binary -r requirements.txt --prefix=/install

FROM python:3.12-slim AS runner

WORKDIR /app
COPY --from=builder /install /usr/local
COPY src/ ./src/

EXPOSE 8000

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
