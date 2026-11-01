FROM python:3.11-slim

# Install minimal Linux system libraries required by OpenCV and PyTorch CPU multi-threading
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Step 1: Explicitly install CPU-only PyTorch and torchvision from PyTorch's dedicated CPU index.
# Using --index-url guarantees pip will NOT query PyPI or pull heavy CUDA binaries (>2.5GB).
RUN pip install --no-cache-dir \
    torch==2.3.1 \
    torchvision==0.18.1 \
    --index-url https://download.pytorch.org/whl/cpu

# Step 2: Install remaining application requirements from standard PyPI.
WORKDIR /tmp
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && rm requirements.txt

# Step 3: Set up non-root user (UID 1000) for Hugging Face Spaces compatibility
RUN useradd -m -u 1000 user && \
    mkdir -p /home/user/app /home/user/.cache /home/user/.torchxrayvision/models_data && \
    chown -R user:user /home/user

# Configure environment for user 1000 and PyTorch memory efficiency
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    PORT=7860 \
    PYTHONUNBUFFERED=1 \
    TORCH_HOME=/home/user/.cache/torch \
    TORCH_NUM_THREADS=1 \
    OMP_NUM_THREADS=1 \
    MKL_NUM_THREADS=1

WORKDIR /home/user/app

# Step 4: Pre-cache the ORIGINAL pretrained TorchXRayVision DenseNet-121 model weights.
# Pre-downloaded as user 1000 so weights reside in /home/user/.torchxrayvision/models_data/
RUN python -c "import torchxrayvision as xrv; xrv.models.get_weights('densenet121-res224-all')" && \
    chmod -R a+rX /home/user/.torchxrayvision

# Step 5: Copy backend application files with non-root ownership (custom checkpoints excluded via .dockerignore)
COPY --chown=user:user . /home/user/app

# Expose default Hugging Face Spaces port
EXPOSE 7860

# Bind to 0.0.0.0 and listen on dynamic $PORT (defaults to 7860 for Hugging Face Spaces)
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-7860}"]
