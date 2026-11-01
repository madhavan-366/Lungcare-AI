---
title: LungCare AI Backend
emoji: 🫁
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
---

# LungCare AI Backend

FastAPI backend for LungCare AI powered by the original pretrained TorchXRayVision DenseNet-121 model.

## Features
- **CheXNet Pretrained Architecture**: Original TorchXRayVision `densenet121-res224-all` model evaluating 14 targeted NIH thoracic conditions.
- **Optimized Memory Footprint**: Single initialization, single-pass SmoothGradCAM++, `torch.inference_mode()` prediction, concurrency request serialization, and automatic memory cleanup.
- **Firebase Authentication & Database**: Firebase ID token verification, Firestore diagnosis persistence, and Firebase Storage integration.
- **Port**: Listens on port 7860 for Hugging Face Spaces.
