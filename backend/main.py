import os
import json
import uuid
import base64
import logging
import urllib.parse
from datetime import datetime
from io import BytesIO
from contextlib import asynccontextmanager

import cv2
import numpy as np
import pandas as pd
from PIL import Image
import torch
import torch.nn as nn
import torchxrayvision as xrv
from torchcam.methods import SmoothGradCAMpp
from fastapi import FastAPI, File, UploadFile, HTTPException, Request, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import firebase_admin
from firebase_admin import credentials, initialize_app, firestore, storage, auth as firebase_auth
import google.oauth2.id_token
import google.auth.transport.requests
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("lungcare-backend")

# Global state for cached AI models and datasets
model_state = {}

# Target 14 LungCare Pathologies (fine-tuned NIH Chest X-ray dataset)
TARGET_DISEASE_LABELS = [
    "Atelectasis",
    "Consolidation",
    "Infiltration",
    "Pneumothorax",
    "Edema",
    "Emphysema",
    "Fibrosis",
    "Effusion",
    "Pneumonia",
    "Pleural_Thickening",
    "Cardiomegaly",
    "Nodule",
    "Mass",
    "Hernia"
]

# Mapping from LungCare label to TorchXRayVision pathology name
XRV_LABEL_MAPPING = {
    "Atelectasis": "Atelectasis",
    "Consolidation": "Consolidation",
    "Infiltration": "Infiltration",
    "Pneumothorax": "Pneumothorax",
    "Edema": "Edema",
    "Emphysema": "Emphysema",
    "Fibrosis": "Fibrosis",
    "Effusion": "Effusion",
    "Pneumonia": "Pneumonia",
    "Pleural_Thickening": "Pleural_Thickening",
    "Cardiomegaly": "Cardiomegaly",
    "Nodule": "Nodule",
    "Mass": "Mass",
    "Hernia": "Hernia",
    # Legacy alias support
    "Pulmonary Edema": "Edema",
    "Pleural Effusion": "Effusion",
    "Lung Mass": "Mass",
    "Lung Nodule": "Nodule",
    "Pulmonary Fibrosis": "Fibrosis"
}

# Calibrated Disease Operating Thresholds
# Selected on the validation set for the 14 fine-tuned NIH thoracic pathologies.
# Multi-label chest X-ray models trained with BCEWithLogitsLoss produce raw sigmoid probabilities
# reflecting low prior disease prevalence. These exploratory thresholds balance sensitivity and specificity.
DEFAULT_DISEASE_THRESHOLDS = {
    "Atelectasis": 0.1560,
    "Consolidation": 0.0712,
    "Infiltration": 0.1822,
    "Pneumothorax": 0.0938,
    "Edema": 0.0754,
    "Emphysema": 0.0554,
    "Fibrosis": 0.0486,
    "Effusion": 0.1799,
    "Pneumonia": 0.0465,
    "Pleural_Thickening": 0.1088,
    "Cardiomegaly": 0.1473,
    "Nodule": 0.0904,
    "Mass": 0.1792,
    "Hernia": 0.0222
}

def get_radiographic_findings(pred_scores: dict, is_pretrained: bool = True, thresholds: dict = None) -> list:
    """
    Derives radiographic findings by comparing each disease's predicted probability against its calibrated threshold.
    For original pretrained TorchXRayVision DenseNet121, output probabilities are calibrated by op_norm such that
    0.50 (50.0%) is the standard operating decision threshold.
    For candidate fine-tuned model, uses DEFAULT_DISEASE_THRESHOLDS.
    If no target disease exceeds its operating threshold, returns a clear, non-ruling-out screening statement
    that does not imply the scan is normal or disease-free.
    """
    if is_pretrained:
        detected = [
            f"{disease} (Confidence: {round(score * 100, 1)}%, Threshold: 50.0%)"
            for disease, score in pred_scores.items()
            if score >= 0.50
        ]
        if detected:
            return detected

        top_disease = max(pred_scores, key=pred_scores.get)
        top_score = pred_scores[top_disease]
        return [
            "No targeted radiographic abnormalities met the model screening thresholds.",
            f"Highest evaluated probability: {top_disease} ({round(top_score * 100, 1)}%, below screening threshold of 50.0%).",
            "Clinical notice: A negative AI screening result does not rule out thoracic pathology, subtle abnormalities, or diseases outside the target label set."
        ]
    else:
        th_map = thresholds or DEFAULT_DISEASE_THRESHOLDS
        detected = [
            f"{disease} (Confidence: {round(score * 100, 1)}%, Threshold: {round(th_map.get(disease, 0.5) * 100, 1)}%)"
            for disease, score in pred_scores.items()
            if score >= th_map.get(disease, 0.5)
        ]
        if detected:
            return detected

        top_disease = max(pred_scores, key=pred_scores.get)
        top_score = pred_scores[top_disease]
        top_th = th_map.get(top_disease, 0.5)
        return [
            "No targeted radiographic abnormalities met the model screening thresholds.",
            f"Highest evaluated probability: {top_disease} ({round(top_score * 100, 1)}%, below screening threshold of {round(top_th * 100, 1)}%).",
            "Clinical notice: A negative AI screening result does not rule out thoracic pathology, subtle abnormalities, or diseases outside the target label set."
        ]

def determine_severity_and_recommendation(pred_scores: dict, is_pretrained: bool = True, thresholds: dict = None) -> tuple:
    """
    Determines severity, clinical recommendation, top detected disease, and confidence based on calibrated thresholds.
    For original pretrained model:
      - Threshold is 0.50 (50.0%) as normalized by TorchXRayVision op_norm.
      - If exceeded: severity is 'severe' if top_score >= 0.70 else 'moderate'.
      - If none exceeded: severity is 'mild', honest non-ruling-out recommendation.
    For fine-tuned candidate model:
      - Uses DEFAULT_DISEASE_THRESHOLDS.
    Returns: (severity, recommendation, top_disease, top_score)
    """
    if is_pretrained:
        exceeded = {d: s for d, s in pred_scores.items() if s >= 0.50}
        top_disease = max(pred_scores, key=pred_scores.get)
        top_score = pred_scores[top_disease]

        if exceeded:
            top_detected = max(exceeded, key=exceeded.get)
            top_detected_score = exceeded[top_detected]
            severity = 'severe' if top_detected_score >= 0.70 else 'moderate'
            recommendation = (
                f"Radiographic screening indicated elevated probability for {top_detected} "
                f"({round(top_detected_score * 100, 1)}% vs 50.0% threshold). "
                f"Prompt clinical correlation and review by a pulmonologist or radiologist is recommended."
            )
            return severity, recommendation, top_detected, top_detected_score
        else:
            severity = 'mild'
            recommendation = (
                "No targeted radiographic abnormalities met diagnostic screening thresholds. "
                "However, this screening tool does not rule out underlying thoracic pathology, early disease, or non-targeted conditions. "
                "Routine clinical correlation and formal radiologist evaluation are recommended if symptoms persist."
            )
            return severity, recommendation, top_disease, top_score
    else:
        th_map = thresholds or DEFAULT_DISEASE_THRESHOLDS
        exceeded = {}
        for d, s in pred_scores.items():
            th = th_map.get(d, 0.5)
            if s >= th:
                exceeded[d] = (s, s / th)

        if exceeded:
            top_detected = max(exceeded.keys(), key=lambda k: exceeded[k][1])
            top_score, ratio = exceeded[top_detected]
            if top_score >= 0.5 or ratio >= 3.0 or len(exceeded) >= 3:
                severity = 'severe'
            else:
                severity = 'moderate'

            recommendation = (
                f"Screening indicated elevated probability for {top_detected} "
                f"({round(top_score * 100, 1)}% vs {round(th_map.get(top_detected, 0.5) * 100, 1)}% threshold). "
                f"Prompt clinical correlation and review by a pulmonologist or radiologist is recommended."
            )
            return severity, recommendation, top_detected, top_score
        else:
            top_disease = max(pred_scores, key=pred_scores.get)
            top_score = pred_scores[top_disease]
            severity = 'mild'
            recommendation = (
                "No targeted radiographic abnormalities met diagnostic screening thresholds. "
                "However, this screening tool does not rule out underlying thoracic pathology, early disease, or non-targeted conditions. "
                "Routine clinical correlation and formal radiologist evaluation are recommended if symptoms persist."
            )
            return severity, recommendation, top_disease, top_score

# Initialize Firebase Environment
load_dotenv()
firebase_project_id = (os.getenv("FIREBASE_PROJECT_ID") or "lungcare-ai-34de7").strip()
storage_bucket_name = (os.getenv("FIREBASE_STORAGE_BUCKET") or f"{firebase_project_id}.firebasestorage.app").strip()
service_account_json_raw = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
service_account_path = (os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH") or "./serviceAccountKey.json").strip()

# Resolve relative service account path safely if needed
if service_account_path and not os.path.isabs(service_account_path):
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    candidate_path = os.path.join(backend_dir, service_account_path)
    if os.path.exists(candidate_path):
        service_account_path = candidate_path
    elif os.path.exists(os.path.abspath(service_account_path)):
        service_account_path = os.path.abspath(service_account_path)

sa_data = None
has_matching_service_account = False
cred = None

# 1. Attempt to load service account credentials from FIREBASE_SERVICE_ACCOUNT_JSON (for Render deployment)
if service_account_json_raw and service_account_json_raw.strip():
    try:
        parsed_data = json.loads(service_account_json_raw.strip())
        if isinstance(parsed_data, dict):
            sa_project_id = parsed_data.get("project_id")
            if sa_project_id == firebase_project_id:
                sa_data = parsed_data
                has_matching_service_account = True
                logger.info("Verified service account from FIREBASE_SERVICE_ACCOUNT_JSON for project: %s", firebase_project_id)
            else:
                logger.warning(
                    "Service account in FIREBASE_SERVICE_ACCOUNT_JSON belongs to project '%s', "
                    "which does NOT match target project '%s'. Ignoring mismatched credentials.",
                    sa_project_id, firebase_project_id
                )
        else:
            logger.error("FIREBASE_SERVICE_ACCOUNT_JSON does not contain a valid JSON object.")
    except json.JSONDecodeError as json_err:
        logger.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON: Invalid JSON format (%s).", str(json_err))
    except Exception as sa_err:
        logger.error("Error reading credentials from FIREBASE_SERVICE_ACCOUNT_JSON: %s", str(sa_err))

# 2. Fallback to local service account file for local development
if not sa_data and service_account_path and os.path.exists(service_account_path):
    try:
        with open(service_account_path, "r", encoding="utf-8") as sa_file:
            parsed_data = json.load(sa_file)
        if isinstance(parsed_data, dict):
            sa_project_id = parsed_data.get("project_id")
            if sa_project_id == firebase_project_id:
                sa_data = parsed_data
                has_matching_service_account = True
                logger.info("Using verified local service account file for project: %s", firebase_project_id)
            else:
                logger.warning(
                    "Service account file at '%s' belongs to project '%s', "
                    "which does NOT match target project '%s'. Ignoring mismatched service account.",
                    service_account_path, sa_project_id, firebase_project_id
                )
        else:
            logger.error("Local service account file at '%s' does not contain a valid JSON object.", service_account_path)
    except json.JSONDecodeError as json_err:
        logger.error("Failed to parse local service account file at '%s': Invalid JSON format (%s).", service_account_path, str(json_err))
    except Exception as sa_err:
        logger.warning("Error inspecting service account file at '%s': %s", service_account_path, str(sa_err))

# 3. Create Firebase Certificate credentials if matching service account data was found
if sa_data:
    try:
        cred = credentials.Certificate(sa_data)
    except Exception as cred_err:
        logger.error("Failed to create credentials from service account data: %s", str(cred_err))
        cred = None
        has_matching_service_account = False

# 4. Initialize Firebase Admin SDK (single initialization check)
try:
    if not firebase_admin._apps:
        app_options = {
            'projectId': firebase_project_id,
            'storageBucket': storage_bucket_name
        }
        if cred is not None:
            initialize_app(cred, app_options)
            logger.info("Firebase Admin initialized successfully with verified service account for project: %s", firebase_project_id)
        else:
            logger.info("Initializing Firebase Admin with project ID: %s (without service account certificate)", firebase_project_id)
            initialize_app(options=app_options)
    else:
        logger.info("Firebase app already initialized.")
except ValueError as e:
    logger.info("Firebase app already initialized: %s", str(e))
except Exception as e:
    logger.error("Failed to initialize Firebase app: %s", str(e))

# Setup Firestore and Storage clients safely
try:
    db = firestore.client()
except Exception as e:
    logger.warning("Firestore client initialization notice: %s", str(e))
    db = None

try:
    bucket = storage.bucket(storage_bucket_name)
except Exception as e:
    logger.warning("Storage bucket initialization notice: %s", str(e))
    bucket = None

# Reusable Google Auth Transport for ID token verification
auth_request_transport = google.auth.transport.requests.Request()

# Model Checkpoint Configuration
CANDIDATE_MODEL_REL_PATH = os.path.join("models", "lungcare_densenet121_nih_candidate.pth")
DEFAULT_MODEL_REL_PATH = CANDIDATE_MODEL_REL_PATH  # Preserved candidate path for reference / backup

def resolve_model_path(checkpoint_path: str = None) -> str:
    """
    Resolves the model checkpoint path relative to the backend directory.
    Supports environment variable MODEL_PATH or fallback to CANDIDATE_MODEL_REL_PATH.
    Never uses machine-specific hardcoded paths.
    """
    target = (checkpoint_path or os.getenv("MODEL_PATH", CANDIDATE_MODEL_REL_PATH)).strip()
    if os.path.isabs(target):
        return target

    backend_dir = os.path.dirname(os.path.abspath(__file__))
    candidate = os.path.join(backend_dir, target)
    if os.path.exists(candidate):
        return candidate

    if os.path.exists(target):
        return os.path.abspath(target)

    return candidate

# Load TorchXRayVision DenseNet121 model
def load_model(model_identifier: str = None):
    """
    Loads the active TorchXRayVision DenseNet-121 model.
    By default, restores and loads the ORIGINAL PRETRAINED TorchXRayVision DenseNet121 model
    ('densenet121-res224-all') with native op_threshs calibrated operating points,
    restoring original application behavior and expected confidence levels (~74%).

    If explicitly configured (via model_identifier='candidate', MODEL_VARIANT='candidate',
    or an explicit checkpoint path pointing to a .pth file), it loads the fine-tuned candidate
    checkpoint safely with strict=True parameter checking and op_threshs metadata separation.
    The fine-tuned candidate checkpoint file is preserved on disk as a backup.
    """
    explicit_target = (model_identifier or os.getenv("MODEL_PATH", "")).strip()
    variant_setting = os.getenv("MODEL_VARIANT", "").strip().lower()

    # Determine whether the candidate checkpoint was explicitly requested
    load_candidate = (
        variant_setting in ["candidate", "fine_tuned", "finetuned"]
        or explicit_target.lower() in ["candidate", "fine_tuned", "finetuned"]
        or (explicit_target and explicit_target.lower().endswith(".pth") and explicit_target.lower() not in ["pretrained", "densenet121-res224-all"])
    )

    if not load_candidate:
        logger.info("Restoring and loading ORIGINAL PRETRAINED TorchXRayVision DenseNet-121 model ('densenet121-res224-all')...")
        model = xrv.models.DenseNet(weights="densenet121-res224-all")
        model.pathologies = list(xrv.datasets.default_pathologies)
        model.upsample = nn.Upsample(size=(224, 224), mode='bilinear', align_corners=False)
        model._is_original_pretrained = True
        model._model_variant = "original_pretrained"
        model._checkpoint_name = "densenet121-res224-all"
        model.eval()
        logger.info(
            "Original pretrained TorchXRayVision DenseNet121 loaded successfully. "
            "Pathologies: %d, op_threshs active: %s, variant: %s",
            len(model.pathologies),
            hasattr(model, "op_threshs") and model.op_threshs is not None,
            model._model_variant
        )
        return model

    # If explicitly requested, load the fine-tuned candidate checkpoint
    resolved_path = resolve_model_path(explicit_target if explicit_target.endswith(".pth") else None)
    logger.info("Explicit configuration detected: Loading fine-tuned candidate TorchXRayVision DenseNet121 from: %s", resolved_path)

    try:
        model = xrv.models.DenseNet(weights=None)
        model.pathologies = list(xrv.datasets.default_pathologies)
        model.upsample = nn.Upsample(size=(224, 224), mode='bilinear', align_corners=False)

        if not os.path.exists(resolved_path):
            raise FileNotFoundError(
                f"Candidate model checkpoint file not found at '{resolved_path}'. "
                f"Please ensure '{CANDIDATE_MODEL_REL_PATH}' exists relative to the backend directory."
            )

        logger.info("Loading candidate model checkpoint from: %s", resolved_path)
        try:
            raw_checkpoint = torch.load(resolved_path, map_location="cpu", weights_only=True)
            logger.info("Candidate checkpoint loaded securely with weights_only=True")
        except Exception as load_err:
            logger.warning(
                "Loading candidate checkpoint with weights_only=True failed (%s). Falling back to weights_only=False for trusted user checkpoint.",
                load_err
            )
            raw_checkpoint = torch.load(resolved_path, map_location="cpu", weights_only=False)

        if isinstance(raw_checkpoint, dict):
            if "state_dict" in raw_checkpoint:
                state_dict = raw_checkpoint["state_dict"]
            elif "model_state_dict" in raw_checkpoint:
                state_dict = raw_checkpoint["model_state_dict"]
            elif "model" in raw_checkpoint and isinstance(raw_checkpoint["model"], dict):
                state_dict = raw_checkpoint["model"]
            else:
                state_dict = raw_checkpoint
        elif hasattr(raw_checkpoint, "state_dict"):
            state_dict = raw_checkpoint.state_dict()
        else:
            raise TypeError(f"Unrecognized checkpoint format: {type(raw_checkpoint)}")

        has_module_prefix = any(isinstance(k, str) and k.startswith("module.") for k in state_dict.keys())
        if has_module_prefix:
            logger.info("Inspection confirmed 'module.' prefix present in state dict; normalizing keys.")

        cleaned_state_dict = {}
        for k, v in state_dict.items():
            clean_k = k[7:] if (has_module_prefix and isinstance(k, str) and k.startswith("module.")) else k
            if clean_k == "op_threshs":
                logger.info("Found known non-parameter metadata key 'op_threshs'; removing before model loading.")
                continue
            cleaned_state_dict[clean_k] = v

        load_res = model.load_state_dict(cleaned_state_dict, strict=True)
        if load_res.missing_keys or load_res.unexpected_keys:
            raise RuntimeError(
                f"Checkpoint loading incompatibility: missing_keys={load_res.missing_keys}, "
                f"unexpected_keys={load_res.unexpected_keys}"
            )
        model._is_original_pretrained = False
        model._model_variant = "fine_tuned_candidate"
        model._checkpoint_name = os.path.basename(resolved_path)
        model.eval()

        logger.info(
            "Fine-tuned candidate TorchXRayVision DenseNet121 loaded successfully from '%s'. Pathologies: %d.",
            resolved_path, len(model.pathologies)
        )
        return model
    except Exception as e:
        logger.error("CRITICAL: Failed to load candidate TorchXRayVision model: %s", str(e), exc_info=True)
        raise RuntimeError(f"TorchXRayVision candidate model initialization failed: {str(e)}") from e

# Load symptom-disease mapping CSV
def load_symptom_csv(csv_path):
    try:
        logger.info("Loading symptom-disease CSV from %s", csv_path)
        if not os.path.exists(csv_path):
            raise FileNotFoundError(f"CSV file not found at {csv_path}")
        df = pd.read_csv(csv_path)
        if 'Disease' not in df.columns or 'Symptom' not in df.columns or 'Weight (%)' not in df.columns:
            raise ValueError("CSV file missing required columns: Disease, Symptom, Weight (%)")
        df['Weight'] = df['Weight (%)'].astype(float) / 100
        logger.info("CSV loaded successfully")
        return df
    except Exception as e:
        logger.error("Failed to load CSV: %s", str(e))
        raise RuntimeError(f"Symptom CSV loading failed: {str(e)}")

# Lifespan event handler for startup/shutdown
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("FastAPI startup: Initializing TorchXRayVision AI model and symptom dataset...")
    try:
        model_state["model"] = load_model()
    except Exception as e:
        logger.error("CRITICAL: Startup model initialization failed: %s", str(e))
        raise e

    try:
        csv_path = "lung_disease_symptoms.csv"
        if not os.path.exists(csv_path):
            csv_path = os.path.join(os.path.dirname(__file__), "lung_disease_symptoms.csv")
        if os.path.exists(csv_path):
            model_state["symptom_df"] = load_symptom_csv(csv_path)
        else:
            logger.warning("Symptom CSV not found at %s", csv_path)
    except Exception as e:
        logger.error("Error loading symptom CSV during startup: %s", str(e))

    logger.info("FastAPI startup completed successfully. Target project: %s", firebase_project_id)
    yield
    logger.info("FastAPI shutdown: Cleaning up resources...")
    model_state.clear()

app = FastAPI(lifespan=lifespan)

# CORS middleware for frontend
default_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000"
]
raw_cors = os.getenv("CORS_ORIGINS", "")
if raw_cors.strip():
    custom_origins = [orig.strip() for orig in raw_cors.split(",") if orig.strip()]
    allowed_origins = list(dict.fromkeys(default_origins + custom_origins))
else:
    allowed_origins = default_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"^https:\/\/.*\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
@app.get("/health")
def health_check():
    model = model_state.get("model")
    is_pretrained = getattr(model, "_is_original_pretrained", True) if model else True
    checkpoint_name = getattr(model, "_checkpoint_name", "densenet121-res224-all") if model else "densenet121-res224-all"
    variant = getattr(model, "_model_variant", "original_pretrained") if model else "original_pretrained"

    return {
        "status": "healthy",
        "model_loaded": "model" in model_state,
        "model_variant": variant,
        "model_checkpoint": checkpoint_name,
        "active_model": f"TorchXRayVision DenseNet121 ({checkpoint_name})",
        "firebase_project_id": firebase_project_id,
        "service": "LungCare AI Backend"
    }

# Custom exception handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )

@app.exception_handler(Exception)
async def custom_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred while processing the request."},
    )

# Preprocess image for TorchXRayVision
def transform_image(image_bytes):
    try:
        logger.info("Preprocessing image for TorchXRayVision")
        image_pil_rgb = Image.open(image_bytes).convert("RGB")
        image_gray = image_pil_rgb.convert("L").resize((224, 224))

        img_np = np.array(image_gray, dtype=np.float32)
        # Normalization matching training: pixel_value / 255.0 * 2048.0 - 1024.0
        img_norm = (img_np / 255.0) * 2048.0 - 1024.0

        input_tensor = torch.from_numpy(img_norm).unsqueeze(0).unsqueeze(0).float()
        return input_tensor, image_pil_rgb
    except Exception as e:
        logger.error("Failed to preprocess image: %s", str(e))
        raise HTTPException(status_code=400, detail=f"Image preprocessing failed: {str(e)}")

# Predict thoracic diseases using TorchXRayVision
def predict_diseases(model, input_tensor):
    try:
        logger.info("Predicting thoracic pathologies with TorchXRayVision DenseNet121")
        device = next(model.parameters()).device
        input_tensor = input_tensor.to(device)
        with torch.no_grad():
            output = model(input_tensor)
            # TorchXRayVision DenseNet.forward() applies sigmoid and op_norm when
            # op_threshs is configured (default for densenet121-res224-all), or applies
            # sigmoid if model.apply_sigmoid is True. In both cases, output is already in
            # calibrated probability space [0, 1]. Applying sigmoid again results in a
            # double-sigmoid bug that artificially compresses all scores into [0.5, 0.73].
            already_prob = (
                getattr(model, "apply_sigmoid", False)
                or (hasattr(model, "op_threshs") and model.op_threshs is not None)
            )
            if already_prob:
                all_probs = output.cpu().numpy()[0]
            else:
                all_probs = torch.sigmoid(output).cpu().numpy()[0]

        pred_scores = {}
        for lc_label in TARGET_DISEASE_LABELS:
            xrv_label = XRV_LABEL_MAPPING.get(lc_label, lc_label)
            if xrv_label and xrv_label in model.pathologies:
                idx = model.pathologies.index(xrv_label)
                pred_scores[lc_label] = float(all_probs[idx])
            else:
                logger.warning(
                    "Pathology '%s' (mapped to '%s') is not supported by model pathologies. Skipping.",
                    lc_label, xrv_label
                )

        return pred_scores, output
    except Exception as e:
        logger.error("Failed to predict diseases: %s", str(e))
        raise HTTPException(status_code=500, detail=f"Disease prediction failed: {str(e)}")

# Generate Grad-CAM Overlay
def generate_gradcam_overlay(model, input_tensor, image_pil, target_disease):
    try:
        xrv_target = XRV_LABEL_MAPPING.get(target_disease, target_disease)
        if xrv_target not in model.pathologies:
            logger.warning("Target disease %s not in model pathologies; skipping Grad-CAM", target_disease)
            return ""

        target_class_idx = model.pathologies.index(xrv_target)
        logger.info("Generating Grad-CAM overlay for %s (XRV index %s)", target_disease, target_class_idx)

        device = next(model.parameters()).device
        input_tensor = input_tensor.to(device)

        cam_extractor = SmoothGradCAMpp(model, target_layer='features', input_shape=(1, 224, 224))
        try:
            output = model(input_tensor)
            cams = cam_extractor(class_idx=int(target_class_idx), scores=output)
            if not cams or len(cams) == 0:
                logger.warning("Grad-CAM produced no activation maps")
                return ""
            cam = cams[0].squeeze().cpu().numpy()
        finally:
            cam_extractor.remove_hooks()

        cam = cv2.resize(cam, (224, 224))

        if cam.max() > cam.min():
            cam = (cam - cam.min()) / (cam.max() - cam.min())
        else:
            cam = np.zeros_like(cam)

        heatmap = np.uint8(255 * cam)
        heatmap_color = cv2.applyColorMap(heatmap, cv2.COLORMAP_JET)
        image_rgb = image_pil.convert('RGB').resize((224, 224))
        image_bgr = cv2.cvtColor(np.array(image_rgb), cv2.COLOR_RGB2BGR)
        overlay = cv2.addWeighted(image_bgr, 0.6, heatmap_color, 0.4, 0)

        _, buffer = cv2.imencode('.png', overlay)
        gradcam_base64 = base64.b64encode(buffer).decode('utf-8')
        logger.info("Grad-CAM overlay generated successfully")
        return f"data:image/png;base64,{gradcam_base64}"
    except Exception as e:
        logger.warning("Grad-CAM overlay generation encountered an issue: %s", str(e))
        return ""

# Match symptoms to most likely diseases
def predict_disease_from_symptoms(symptoms, df):
    try:
        logger.info("Predicting disease from symptoms: %s", symptoms)
        scores = {}
        for disease in df['Disease'].unique():
            disease_data = df[df['Disease'] == disease]
            weights = disease_data[disease_data['Symptom'].str.lower().isin([s.lower() for s in symptoms])]['Weight']
            total_score = float(sum(weights.to_list())) if not weights.empty else 0.0
            scores[disease] = total_score
        logger.info("Disease scores: %s", scores)
        return dict(sorted(scores.items(), key=lambda x: x[1], reverse=True))
    except Exception as e:
        logger.error("Failed to predict disease from symptoms: %s", str(e))
        raise HTTPException(status_code=500, detail=f"Symptom prediction failed: {str(e)}")

# Resilient Firebase ID Token Verification Dependency
def get_current_user_uid(authorization: str = Header(None)) -> str:
    if not authorization:
        logger.warning("Authentication failed: Missing Authorization header")
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        logger.warning("Authentication failed: Invalid Authorization header format")
        raise HTTPException(status_code=401, detail="Invalid Authorization header format. Expected 'Bearer <token>'")

    id_token = parts[1]

    # Attempt 1: Verify using Firebase Admin SDK if fully initialized with matching cert
    if has_matching_service_account:
        try:
            decoded_token = firebase_auth.verify_id_token(id_token)
            uid = decoded_token.get("uid") or decoded_token.get("sub")
            if uid:
                return uid
        except firebase_auth.ExpiredIdTokenError:
            logger.warning("Authentication failed: Firebase ID token has expired")
            raise HTTPException(status_code=401, detail="Firebase ID token has expired. Please sign in again.")
        except firebase_auth.RevokedIdTokenError:
            logger.warning("Authentication failed: Firebase ID token has been revoked")
            raise HTTPException(status_code=401, detail="Firebase ID token has been revoked.")
        except Exception as e:
            logger.warning("Firebase Admin verify_id_token returned: %s", str(e))

    # Attempt 2: Verify cryptographically against target project using official Google Auth
    try:
        decoded = google.oauth2.id_token.verify_firebase_token(
            id_token,
            request=auth_request_transport,
            audience=firebase_project_id
        )
        uid = decoded.get("uid") or decoded.get("sub")
        if not uid:
            logger.warning("Authentication failed: UID missing from verified token payload")
            raise HTTPException(status_code=401, detail="Invalid token payload: UID missing")
        return uid
    except ValueError as e:
        err_msg = str(e)
        logger.warning("Authentication failed: Invalid Firebase ID token for project '%s': %s", firebase_project_id, err_msg)
        if "expired" in err_msg.lower():
            raise HTTPException(status_code=401, detail="Firebase ID token has expired. Please sign in again.")
        raise HTTPException(status_code=401, detail="Invalid Firebase ID token.")
    except Exception as e:
        logger.warning("Authentication failed: Unexpected token verification error: %s", str(e))
        raise HTTPException(status_code=401, detail="Authentication failed. Could not verify Firebase ID token.")

@app.post("/analyze-xray")
async def analyze_xray(
    file: UploadFile = File(...),
    user_id: str = None,
    authenticated_uid: str = Depends(get_current_user_uid)
):
    symptom_map = {
        'Atelectasis': ['breathlessness', 'cough'],
        'Consolidation': ['cough', 'fever', 'chest pain', 'shortness of breath'],
        'Infiltration': ['breathlessness', 'wheezing'],
        'Pneumothorax': ['chest pain', 'shortness of breath', 'rapid breathing'],
        'Edema': ['shortness of breath', 'frothy cough', 'fatigue'],
        'Emphysema': ['shortness of breath', 'chronic cough', 'fatigue'],
        'Fibrosis': ['breathlessness', 'fatigue'],
        'Effusion': ['chest pain', 'breathing difficulty', 'dry cough'],
        'Pneumonia': ['fever', 'cough with mucus', 'chest pain', 'shortness of breath'],
        'Pleural_Thickening': ['chest pain', 'shortness of breath', 'cough'],
        'Cardiomegaly': ['shortness of breath', 'fatigue', 'swelling'],
        'Nodule': ['cough', 'chest pain'],
        'Mass': ['chest pain', 'cough', 'weight loss'],
        'Hernia': ['chest pain', 'heartburn', 'shortness of breath'],
        'Pulmonary Edema': ['shortness of breath', 'frothy cough', 'fatigue'],
        'Pleural Effusion': ['chest pain', 'breathing difficulty', 'dry cough'],
        'Lung Mass': ['chest pain', 'cough', 'weight loss'],
        'Lung Nodule': ['cough', 'chest pain'],
        'Pulmonary Fibrosis': ['breathlessness', 'fatigue']
    }
    csv_path = "lung_disease_symptoms.csv"

    # Always use verified authenticated UID as the authoritative user identity
    user_id = authenticated_uid

    try:
        logger.info("Received X-ray analysis request: authenticated_uid=%s, filename=%s", user_id, file.filename)
        if file.content_type not in ['image/png', 'image/jpeg', 'image/jpg']:
            logger.error("Invalid file type: %s", file.content_type)
            raise HTTPException(status_code=422, detail="File must be PNG or JPEG")

        contents = await file.read()
        if len(contents) > 10 * 1024 * 1024:
            logger.error("File content size too large: %s bytes", len(contents))
            raise HTTPException(status_code=422, detail="File size must be under 10MB")

        # Upload file to Firebase Storage if bucket is configured
        image_url = ""
        if bucket is not None:
            try:
                logger.info("Uploading file to Firebase Storage")
                safe_filename = f"{int(datetime.utcnow().timestamp())}_{file.filename}"
                blob = bucket.blob(f"xrays/{user_id}/{safe_filename}")
                download_token = str(uuid.uuid4())
                blob.metadata = {"firebaseStorageDownloadTokens": download_token}
                blob.upload_from_string(contents, content_type=file.content_type)

                bucket_name = bucket.name or storage_bucket_name
                encoded_path = urllib.parse.quote(blob.name, safe='')
                image_url = f"https://firebasestorage.googleapis.com/v0/b/{bucket_name}/o/{encoded_path}?alt=media&token={download_token}"
                logger.info("File uploaded to %s", image_url)
            except Exception as e:
                logger.warning("Firebase Storage upload notice: %s; using data URL fallback", str(e))
                b64_img = base64.b64encode(contents).decode('utf-8')
                image_url = f"data:{file.content_type};base64,{b64_img}"
        else:
            b64_img = base64.b64encode(contents).decode('utf-8')
            image_url = f"data:{file.content_type};base64,{b64_img}"

        # Retrieve cached model or load as fallback
        model = model_state.get("model")
        if model is None:
            logger.info("Model not in memory cache, loading...")
            model = load_model()
            model_state["model"] = model

        is_pretrained = getattr(model, "_is_original_pretrained", True)

        input_tensor, image_pil = transform_image(BytesIO(contents))
        pred_scores, model_output = predict_diseases(model, input_tensor)

        radiographic_findings = get_radiographic_findings(pred_scores, is_pretrained=is_pretrained)
        severity, recommendation, top_disease, top_score = determine_severity_and_recommendation(pred_scores, is_pretrained=is_pretrained)

        # Correlated clinical symptoms for clinical context (for diseases exceeding operating thresholds)
        detected_symptoms = []
        for disease, score in pred_scores.items():
            th = 0.50 if is_pretrained else DEFAULT_DISEASE_THRESHOLDS.get(disease, 0.5)
            if score >= th and disease in symptom_map:
                detected_symptoms += symptom_map[disease]
        detected_symptoms = sorted(list(set(detected_symptoms)))
        logger.info("Associated clinical symptoms for reference: %s", detected_symptoms)

        # Retrieve cached symptom DataFrame or load from CSV
        df = model_state.get("symptom_df")
        if df is None:
            if not os.path.exists(csv_path):
                csv_path = os.path.join(os.path.dirname(__file__), "lung_disease_symptoms.csv")
            df = load_symptom_csv(csv_path)
            model_state["symptom_df"] = df

        final_prediction = predict_disease_from_symptoms(detected_symptoms, df) if detected_symptoms else {}
        logger.info("Symptom correlation prediction: %s", final_prediction)

        # Generate Grad-CAM overlay for top detected pathology
        logger.info("Top disease: %s, score: %s, severity: %s", top_disease, top_score, severity)
        gradcam_image = generate_gradcam_overlay(model, input_tensor, image_pil, top_disease)

        # Persist to Firestore if available
        doc_id = str(uuid.uuid4())
        if db is not None:
            try:
                diagnosis_ref = db.collection("xray_diagnoses").document()
                diagnosis_data = {
                    "user_id": user_id,
                    "image_url": image_url,
                    "confidence": round(top_score * 100, 2),
                    "findings": radiographic_findings,
                    "associated_symptoms": detected_symptoms,
                    "recommendation": recommendation,
                    "severity": severity,
                    "disease_probabilities": {k: round(float(v) * 100, 2) for k, v in pred_scores.items()},
                    "symptom_predictions": final_prediction,
                    "gradcam_image": gradcam_image,
                    "created_at": firestore.SERVER_TIMESTAMP
                }
                diagnosis_ref.set(diagnosis_data)
                doc_id = diagnosis_ref.id
                logger.info("Stored X-ray diagnosis %s in Firestore for user %s", doc_id, user_id)
            except Exception as e:
                logger.warning("Firestore storage notice: %s", str(e))

        response_data = {
            "xray_id": doc_id,
            "image_url": image_url,
            "confidence": round(top_score * 100, 2),
            "findings": radiographic_findings,
            "associated_symptoms": detected_symptoms,
            "recommendation": recommendation,
            "severity": severity,
            "disease_probabilities": {k: round(float(v) * 100, 2) for k, v in pred_scores.items()},
            "symptom_predictions": final_prediction,
            "gradcam_image": gradcam_image,
            "created_at": datetime.utcnow().isoformat()
        }
        return response_data
    except HTTPException as e:
        logger.error("HTTPException in analyze-xray: %s", str(e.detail))
        raise e
    except Exception as e:
        logger.error("X-ray analysis failed for user_id=%s: %s", user_id, str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=f"X-ray analysis failed: {str(e)}")
