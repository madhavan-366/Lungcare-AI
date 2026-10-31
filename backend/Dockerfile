FROM python:3.11-slim

WORKDIR /app

# Ensure HOME is /app so ~ expands to /app for any runtime user
ENV HOME=/app \
    PORT=8080 \
    PYTHONUNBUFFERED=1

# Install minimal Linux system libraries required by OpenCV and PyTorch CPU multi-threading
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Step 1: Explicitly install CPU-only PyTorch and torchvision from PyTorch's dedicated CPU index.
# Using --index-url guarantees pip will NOT query PyPI or pull heavy CUDA 12.1 binaries (>2.5GB).
RUN pip install --no-cache-dir \
    torch==2.3.1 \
    torchvision==0.18.1 \
    --index-url https://download.pytorch.org/whl/cpu

# Step 2: Install remaining application requirements from standard PyPI.
# PyTorch and torchvision are already satisfied by Step 1 and will not be re-downloaded.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Step 3: Pre-cache the original pretrained TorchXRayVision DenseNet-121 model weights.
# With HOME=/app, weights are cached under /app/.torchxrayvision/models_data/
RUN python -c "import torchxrayvision as xrv; xrv.models.get_weights('densenet121-res224-all')" && \
    chmod -R a+rX /app/.torchxrayvision

# Copy backend application files
COPY . .

# Expose port (metadata)
EXPOSE 8080

# Bind to 0.0.0.0 and listen on dynamic $PORT supplied by the hosting provider
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}"]
