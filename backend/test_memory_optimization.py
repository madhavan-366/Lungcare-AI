import os
import sys
import gc
from io import BytesIO
import numpy as np
from PIL import Image
import torch
import unittest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from main import (
    app,
    load_model,
    transform_image,
    predict_diseases,
    generate_gradcam_overlay,
    get_current_user_uid,
    model_state,
    TARGET_DISEASE_LABELS
)

class TestMemoryOptimization(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Create a valid synthetic chest radiograph
        cls.img_pil = Image.fromarray(np.random.randint(50, 200, (512, 512), dtype=np.uint8), mode="L")
        buf = BytesIO()
        cls.img_pil.save(buf, format="PNG")
        cls.test_png_bytes = buf.getvalue()

    def test_single_model_instance(self):
        """Verify model is a single instance in model_state and not re-instantiated."""
        m1 = load_model()
        model_state["model"] = m1
        self.assertTrue(getattr(m1, "_is_original_pretrained", False))
        self.assertEqual(getattr(m1, "_checkpoint_name", ""), "densenet121-res224-all")

    def test_transform_image_immediate_downscaling(self):
        """Verify transform_image immediately downscales input to 224x224 and returns expected shapes."""
        # Provide a large 512x512 image
        tensor, pil_img = transform_image(BytesIO(self.test_png_bytes))
        self.assertEqual(tensor.shape, (1, 1, 224, 224))
        self.assertEqual(pil_img.size, (224, 224))

    def test_predict_diseases_inference_mode(self):
        """Verify predict_diseases operates under inference mode without building autograd graph."""
        model = load_model()
        tensor, _ = transform_image(BytesIO(self.test_png_bytes))
        scores, output = predict_diseases(model, tensor)
        self.assertEqual(len(scores), 14)
        self.assertEqual(list(scores.keys()), TARGET_DISEASE_LABELS)
        self.assertFalse(output.requires_grad, "Output tensor in inference mode should not require grad")

    def test_gradcam_cleanup_and_stability(self):
        """Verify generate_gradcam_overlay runs with 1-sample SmoothGradCAMpp and cleans up hooks and grad buffers."""
        model = load_model()
        tensor, pil_img = transform_image(BytesIO(self.test_png_bytes))
        overlay = generate_gradcam_overlay(model, tensor, pil_img, "Effusion")
        self.assertTrue(overlay.startswith("data:image/png;base64,"))
        self.assertGreater(len(overlay), 200)

        # Verify model parameters have no lingering gradients
        for param in model.parameters():
            self.assertIsNone(param.grad, "Parameter gradients should be cleared to None after Grad-CAM")

    def test_repeated_e2e_analyze_xray(self):
        """Verify multiple sequential analysis requests execute cleanly without memory leaks or errors."""
        client = TestClient(app)
        app.dependency_overrides[get_current_user_uid] = lambda: "test-memory-uid"
        try:
            for i in range(3):
                resp = client.post(
                    "/analyze-xray",
                    files={"file": (f"test_xray_{i}.png", self.test_png_bytes, "image/png")}
                )
                self.assertEqual(resp.status_code, 200)
                data = resp.json()
                self.assertEqual(len(data["disease_probabilities"]), 14)
                self.assertTrue(data["gradcam_image"].startswith("data:image/png;base64,"))
        finally:
            app.dependency_overrides.clear()

if __name__ == "__main__":
    unittest.main()
