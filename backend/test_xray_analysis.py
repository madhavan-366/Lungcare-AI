import os
import sys
import unittest
from io import BytesIO
import numpy as np
from PIL import Image
import torch
from fastapi import HTTPException
from fastapi.testclient import TestClient

# Ensure backend directory is in path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from main import (
    app,
    load_model,
    resolve_model_path,
    CANDIDATE_MODEL_REL_PATH,
    transform_image,
    predict_diseases,
    generate_gradcam_overlay,
    get_current_user_uid,
    TARGET_DISEASE_LABELS,
    XRV_LABEL_MAPPING,
    DEFAULT_DISEASE_THRESHOLDS,
    get_radiographic_findings,
    determine_severity_and_recommendation,
    firebase_project_id,
    has_matching_service_account,
    service_account_path,
    db
)


class TestXrayAnalysis(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        print("\n=== Initializing Restored Original Pretrained TorchXRayVision DenseNet-121 Model for Testing ===")
        # Default load_model() now restores the original pretrained TorchXRayVision DenseNet121 model
        cls.model = load_model()
        cls.model.eval()

        # Create a valid synthetic chest X-ray image in memory
        cls.img_pil = Image.fromarray(np.random.randint(40, 220, (224, 224), dtype=np.uint8), mode="L")
        buf = BytesIO()
        cls.img_pil.save(buf, format="PNG")
        cls.valid_png_bytes = buf.getvalue()

    def test_01_restored_pretrained_model_attributes_and_op_threshs(self):
        """Verify restored original model attributes: densenet121-res224-all with active op_threshs."""
        print("\n--- Test 1: Restored Original Pretrained Model & op_threshs Check ---")
        self.assertTrue(hasattr(self.model, "op_threshs"), "Model must have op_threshs attribute")
        self.assertIsNotNone(self.model.op_threshs, "Restored original model must have op_threshs registered")
        self.assertEqual(len(self.model.op_threshs), 18, "op_threshs must have 18 values for all pathologies")
        self.assertTrue(getattr(self.model, "_is_original_pretrained", False))
        self.assertEqual(getattr(self.model, "_checkpoint_name", ""), "densenet121-res224-all")

        # Forward pass runs through op_norm, producing calibrated probabilities where 0.50 is the decision threshold
        dummy_tensor = torch.zeros((1, 1, 224, 224), dtype=torch.float32)
        with torch.no_grad():
            raw_forward_output = self.model(dummy_tensor)

        forward_min = raw_forward_output.min().item()
        forward_max = raw_forward_output.max().item()
        print(f"Restored model forward() min output: {forward_min:.4f}, max output: {forward_max:.4f}")

        # predict_diseases: handles already-normalized probability output without double-sigmoid
        pred_scores, output = predict_diseases(self.model, dummy_tensor)
        scores = list(pred_scores.values())
        print(f"predict_diseases() score range: min={min(scores):.4f}, max={max(scores):.4f}")

        self.assertGreaterEqual(min(scores), 0.0, "Probability scores must be >= 0.0")
        self.assertLessEqual(max(scores), 1.0, "Probability scores must be <= 1.0")

        # Verify output values correspond to model.forward() without redundant sigmoid
        expected_probs = raw_forward_output.cpu().numpy()[0]
        for k in TARGET_DISEASE_LABELS:
            xrv_idx = self.model.pathologies.index(XRV_LABEL_MAPPING[k])
            expected_score = float(expected_probs[xrv_idx])
            self.assertAlmostEqual(
                pred_scores[k],
                expected_score,
                places=5,
                msg=f"Score for {k} must match model forward normalized output"
            )

    def test_02_disease_label_mapping(self):
        """Verify label mapping alignment between TorchXRayVision and LungCare labels, and confirm first 14 NIH classes."""
        print("\n--- Test 2: Disease Label Mapping Alignment ---")
        print(f"Model pathologies count: {len(self.model.pathologies)}")
        print(f"Model pathologies: {self.model.pathologies}")

        self.assertEqual(len(TARGET_DISEASE_LABELS), 14, "Target disease list must contain 14 pathologies")

        expected_14_labels = [
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
        self.assertEqual(TARGET_DISEASE_LABELS, expected_14_labels, "TARGET_DISEASE_LABELS must match expected 14 NIH classes exactly in order")
        self.assertEqual(list(self.model.pathologies[:14]), expected_14_labels, "First 14 model pathologies must match the 14 classes exactly in order")

        # Verify each target label correctly maps to an existing pathology in model.pathologies
        for idx, label in enumerate(TARGET_DISEASE_LABELS):
            xrv_name = XRV_LABEL_MAPPING.get(label)
            self.assertIsNotNone(xrv_name, f"Label '{label}' must exist in XRV_LABEL_MAPPING")
            self.assertIn(xrv_name, self.model.pathologies, f"Target pathology '{xrv_name}' must exist in model.pathologies")
            model_idx = self.model.pathologies.index(xrv_name)
            self.assertEqual(model_idx, idx, f"Target pathology '{xrv_name}' position {model_idx} must match TARGET_DISEASE_LABELS position {idx}")
            self.assertLess(model_idx, 14, f"Target pathology '{xrv_name}' (index {model_idx}) must be within the 14 NIH classes")
            print(f"  Mapped '{label}' -> XRV '{xrv_name}' at index {model_idx}")

        # Verify the 4 remaining classes are retained in architecture but not exposed in TARGET_DISEASE_LABELS
        remaining_classes = self.model.pathologies[14:]
        self.assertEqual(len(remaining_classes), 4)
        print(f"  Remaining 4 non-targeted architecture classes: {remaining_classes}")

        # Test predict_diseases output contains all 14 target disease labels
        dummy_tensor = torch.zeros((1, 1, 224, 224), dtype=torch.float32)
        pred_scores, _ = predict_diseases(self.model, dummy_tensor)
        self.assertEqual(set(pred_scores.keys()), set(TARGET_DISEASE_LABELS))
        self.assertEqual(len(pred_scores), 14)

    def test_03_findings_and_symptoms_separation(self):
        """Verify that findings are radiographic findings, patient symptoms are separate, and negative scans do not rule out disease."""
        print("\n--- Test 3: Radiographic Findings vs Clinical Symptoms Separation & Non-Ruling-Out Negative Finding ---")
        dummy_scores_positive = {
            "Atelectasis": 0.52,
            "Consolidation": 0.45,
            "Infiltration": 0.48,
            "Pneumothorax": 0.35,
            "Edema": 0.30,
            "Emphysema": 0.25,
            "Fibrosis": 0.20,
            "Effusion": 0.74,
            "Pneumonia": 0.72,
            "Pleural_Thickening": 0.40,
            "Cardiomegaly": 0.42,
            "Nodule": 0.20,
            "Mass": 0.18,
            "Hernia": 0.10
        }
        radiographic_findings = get_radiographic_findings(dummy_scores_positive, is_pretrained=True)

        # Radiographic findings should mention detected pathologies exceeding the 50% threshold
        found_pneumonia = any("Pneumonia" in f for f in radiographic_findings)
        found_effusion = any("Effusion" in f for f in radiographic_findings)
        self.assertTrue(found_pneumonia, "Pneumonia (0.72 >= 0.50) should be detected in radiographic findings")
        self.assertTrue(found_effusion, "Effusion (0.74 >= 0.50) should be detected in radiographic findings")

        # Radiographic findings MUST NOT contain clinical symptoms like fever, cough, or fatigue
        symptoms_blacklist = ["fever", "cough", "fatigue", "weight loss", "breathlessness"]
        for finding in radiographic_findings:
            for symptom in symptoms_blacklist:
                self.assertNotIn(symptom, finding.lower(), f"Radiographic findings must not include patient symptom '{symptom}'")

        # Test negative scan (all below 50% threshold)
        dummy_scores_negative = {k: 0.25 for k in dummy_scores_positive}
        neg_findings = get_radiographic_findings(dummy_scores_negative, is_pretrained=True)
        self.assertGreaterEqual(len(neg_findings), 1)

        self.assertFalse(any("no disease" in f.lower() for f in neg_findings), "Must not display 'No disease detected'")
        self.assertTrue(any("does not rule out" in f.lower() for f in neg_findings), "Must explicitly state negative screening does not rule out pathology")

    def test_04_recommendations_and_severity_logic(self):
        """Verify severity calculations and recommendations based on restored threshold logic."""
        print("\n--- Test 4: Recommendation and Severity Logic with Restored Pretrained Thresholds ---")
        # Case A: Severe scan (top_score >= 0.70, e.g. 74% confidence)
        dummy_severe = {k: 0.30 for k in TARGET_DISEASE_LABELS}
        dummy_severe["Effusion"] = 0.74
        sev_a, rec_a, top_d_a, score_a = determine_severity_and_recommendation(dummy_severe, is_pretrained=True)
        self.assertEqual(sev_a, "severe")
        self.assertEqual(top_d_a, "Effusion")
        self.assertEqual(score_a, 0.74)
        self.assertIn("Effusion", rec_a)
        self.assertIn("74.0%", rec_a)

        # Case B: Moderate scan (disease exceeds 0.50 threshold, but < 0.70)
        dummy_mod = {k: 0.30 for k in TARGET_DISEASE_LABELS}
        dummy_mod["Pneumothorax"] = 0.58
        sev_b, rec_b, top_d_b, score_b = determine_severity_and_recommendation(dummy_mod, is_pretrained=True)
        self.assertEqual(sev_b, "moderate")
        self.assertEqual(top_d_b, "Pneumothorax")
        self.assertEqual(score_b, 0.58)
        self.assertIn("Pneumothorax", rec_b)

        # Case C: Sub-threshold scan (scores below 0.50)
        dummy_sub = {k: 0.35 for k in TARGET_DISEASE_LABELS}
        dummy_sub["Atelectasis"] = 0.42
        sev_c, rec_c, top_d_c, score_c = determine_severity_and_recommendation(dummy_sub, is_pretrained=True)
        self.assertEqual(sev_c, "mild")
        self.assertEqual(top_d_c, "Atelectasis")
        self.assertEqual(score_c, 0.42)
        self.assertIn("does not rule out", rec_c.lower())
        self.assertNotIn("no disease", rec_c.lower())

    def test_05_image_preprocessing_and_error_handling(self):
        """Verify valid image preprocessing and invalid image error handling."""
        print("\n--- Test 5: Image Preprocessing and Error Handling ---")
        tensor, pil_img = transform_image(BytesIO(self.valid_png_bytes))
        self.assertEqual(tensor.shape, (1, 1, 224, 224), "Preprocessed tensor shape must be (1, 1, 224, 224)")
        self.assertEqual(pil_img.size, (224, 224))

        # Invalid image bytes
        with self.assertRaises(HTTPException) as ctx:
            transform_image(BytesIO(b"this is not a valid image file content"))
        self.assertEqual(ctx.exception.status_code, 400, "Corrupted image bytes should raise HTTP 400")

    def test_06_auth_error_handling(self):
        """Verify authentication error handling for missing/invalid auth headers."""
        print("\n--- Test 6: Authentication Error Handling ---")
        with self.assertRaises(HTTPException) as ctx1:
            get_current_user_uid(authorization=None)
        self.assertEqual(ctx1.exception.status_code, 401)
        self.assertIn("Missing Authorization header", ctx1.exception.detail)

        with self.assertRaises(HTTPException) as ctx2:
            get_current_user_uid(authorization="Basic dXNlcjpwYXNz")
        self.assertEqual(ctx2.exception.status_code, 401)
        self.assertIn("Expected 'Bearer <token>'", ctx2.exception.detail)

        with self.assertRaises(HTTPException) as ctx3:
            get_current_user_uid(authorization="Bearer not_a_real_token")
        self.assertEqual(ctx3.exception.status_code, 401)
        self.assertIn("Invalid Firebase ID token", ctx3.exception.detail)

    def test_07_gradcam_overlay_generation(self):
        """Verify Grad-CAM activation heatmap overlay generation on restored pretrained model."""
        print("\n--- Test 7: Grad-CAM Overlay Generation ---")
        tensor, pil_img = transform_image(BytesIO(self.valid_png_bytes))
        overlay_b64 = generate_gradcam_overlay(self.model, tensor, pil_img, "Effusion")
        self.assertTrue(overlay_b64.startswith("data:image/png;base64,"), "Grad-CAM output should be a data URL")
        self.assertGreater(len(overlay_b64), 100, "Grad-CAM data URL should contain image payload")

    def test_08_firebase_configuration_audit(self):
        """Audit Firebase configuration without exposing any secret keys."""
        print("\n--- Test 8: Firebase Configuration Audit ---")
        print(f"  Target Firebase Project ID: {firebase_project_id}")
        print(f"  Service Account Path: {service_account_path}")
        print(f"  Has Matching Service Account: {has_matching_service_account}")
        self.assertEqual(firebase_project_id, "lungcare-ai-34de7", "Backend project ID must be lungcare-ai-34de7")

    def test_09_candidate_checkpoint_preserved_and_loadable(self):
        """Verify fine-tuned candidate checkpoint file is preserved on disk and safely loadable when requested."""
        print("\n--- Test 9: Candidate Checkpoint Preservation & Safe Loading ---")
        resolved = resolve_model_path(CANDIDATE_MODEL_REL_PATH)
        print(f"  Candidate checkpoint path: {resolved}")
        self.assertTrue(os.path.exists(resolved), f"Preserved checkpoint must exist at {resolved}")

        # Load candidate explicitly to verify the loading fix handles op_threshs cleanly
        candidate_model = load_model("candidate")
        self.assertIsNotNone(candidate_model)
        self.assertEqual(candidate_model.classifier.weight.shape, torch.Size([18, 1024]))
        self.assertEqual(candidate_model.classifier.bias.shape, torch.Size([18]))
        self.assertEqual(candidate_model.features.conv0.weight.shape, torch.Size([64, 1, 7, 7]))
        self.assertEqual(len(candidate_model.pathologies), 18)
        self.assertFalse(candidate_model._is_original_pretrained)
        print("  Preserved fine-tuned checkpoint verified: architecture and weights load cleanly without op_threshs error.")

    def test_10_restored_model_overall_confidence_behavior(self):
        """Verify restored model overall confidence on a sample chest radiograph."""
        print("\n--- Test 10: Restored Model Overall Confidence Behavior ---")
        # Generate a synthetic chest radiograph with realistic lung field distribution
        img = np.full((224, 224), 140.0, dtype=np.float32)
        # Add bilateral lung field attenuation variation
        img[40:180, 30:100] = 70.0
        img[40:180, 124:194] = 70.0
        # Normalization matching TorchXRayVision: (x / 255) * 2048 - 1024
        img_norm = (img / 255.0) * 2048.0 - 1024.0
        tensor = torch.from_numpy(img_norm).unsqueeze(0).unsqueeze(0).float()

        pred_scores, _ = predict_diseases(self.model, tensor)
        sev, rec, top_disease, top_score = determine_severity_and_recommendation(pred_scores, is_pretrained=True)
        confidence = round(top_score * 100, 2)
        print(f"  Sample Scan Results -> Top Disease: {top_disease}, Confidence: {confidence}%, Severity: {sev}")
        print(f"  Disease Scores: {', '.join(f'{k}: {round(v*100, 1)}%' for k, v in pred_scores.items())}")

        # The confidence should be in the expected range of the original pretrained model (~65% - 80%)
        self.assertGreaterEqual(confidence, 50.0, "Sample scan confidence with op_norm should exceed 50%")
        self.assertLessEqual(confidence, 100.0, "Confidence must be <= 100%")

    def test_11_end_to_end_analyze_xray_endpoint(self):
        """Verify real FastAPI /analyze-xray endpoint end-to-end with TestClient using restored pretrained model."""
        print("\n--- Test 11: End-to-End API Inference & Frontend Contract Verification ---")
        client = TestClient(app)

        # 1. Verify health check reflects restored original model
        health_resp = client.get("/health")
        self.assertEqual(health_resp.status_code, 200)
        health_data = health_resp.json()
        self.assertEqual(health_data["status"], "healthy")
        self.assertEqual(health_data["model_variant"], "original_pretrained")
        self.assertEqual(health_data["model_checkpoint"], "densenet121-res224-all")
        print("  Health check verified: status=healthy, variant=original_pretrained, checkpoint=densenet121-res224-all")

        # 2. Verify unauthenticated call to /analyze-xray returns 401
        unauth_resp = client.post(
            "/analyze-xray",
            files={"file": ("xray.png", self.valid_png_bytes, "image/png")}
        )
        self.assertEqual(unauth_resp.status_code, 401)
        self.assertIn("Missing Authorization header", unauth_resp.json()["detail"])
        print("  Auth protection verified: 401 on missing header")

        # 3. Verify authenticated call with dependency override
        app.dependency_overrides[get_current_user_uid] = lambda: "test-auth-uid-123"
        try:
            resp = client.post(
                "/analyze-xray",
                files={"file": ("test_chest_xray.png", self.valid_png_bytes, "image/png")}
            )
            self.assertEqual(resp.status_code, 200, f"Expected 200 OK, got {resp.status_code}: {resp.text}")
            data = resp.json()

            # Verify all expected frontend DiagnosticResult fields
            required_keys = [
                "xray_id", "confidence", "findings", "associated_symptoms",
                "recommendation", "severity", "disease_probabilities",
                "gradcam_image", "created_at"
            ]
            for key in required_keys:
                self.assertIn(key, data, f"Response must include field '{key}'")

            # Check confidence and severity
            self.assertIsInstance(data["confidence"], (int, float))
            self.assertGreaterEqual(data["confidence"], 0.0)
            self.assertLessEqual(data["confidence"], 100.0)
            self.assertIn(data["severity"], ["mild", "moderate", "severe"])
            print(f"  Returned Confidence: {data['confidence']}%, Severity: {data['severity']}")

            # Check findings
            self.assertIsInstance(data["findings"], list)
            self.assertGreaterEqual(len(data["findings"]), 1)

            # Check disease_probabilities
            probs = data["disease_probabilities"]
            self.assertEqual(len(probs), 14, "Must return exactly 14 disease probabilities")
            self.assertEqual(list(probs.keys()), TARGET_DISEASE_LABELS, "Keys must match TARGET_DISEASE_LABELS in order")
            for disease, prob in probs.items():
                self.assertTrue(np.isfinite(prob), f"Probability for {disease} must be finite")
                self.assertGreaterEqual(prob, 0.0, f"Probability for {disease} must be >= 0.0%")
                self.assertLessEqual(prob, 100.0, f"Probability for {disease} must be <= 100.0%")

            # Check Grad-CAM overlay data URL
            gradcam = data["gradcam_image"]
            self.assertTrue(gradcam.startswith("data:image/png;base64,"), "Grad-CAM must be data URL")
            self.assertGreater(len(gradcam), 200, "Grad-CAM data URL must contain image payload")
            print("  End-to-end /analyze-xray test passed with full contract conformity.")
        finally:
            app.dependency_overrides.clear()


if __name__ == "__main__":
    unittest.main()
