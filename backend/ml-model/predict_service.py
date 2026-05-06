"""
Tea Leaf Disease Classification - Prediction Script for Node.js Backend
Called as subprocess from Node.js: python predict_service.py --image <path> --model <path>
Outputs JSON to stdout for Node.js to parse.

Architecture:
  Stage 1 — Pretrained ImageNet Gate: checks if image is a plant/leaf (no training needed)
  Stage 2 — Disease Classifier:       runs only if Stage 1 passes
"""

import os
import sys
import json
import math
import argparse

import torch
import torch.nn.functional as F
from torchvision import transforms, models
from PIL import Image
import torch.nn as nn


# ─────────────────────────────────────────────────────────────────────────────
# Disease classifier config
# ─────────────────────────────────────────────────────────────────────────────

CLASS_NAMES = ['Brown Blight', 'Healthy Green Leaf', 'Red spider Mite']

CLASS_TO_CODE = {
    'Brown Blight': 'BB',
    'Healthy Green Leaf': 'GL',
    'Red spider Mite': 'RSM'
}


# ─────────────────────────────────────────────────────────────────────────────
# ImageNet-1k plant/leaf/crop class IDs used by the Stage 1 gate
#
# Classes 340-365 — birds & some plants (ferns, fruits mixed in)
# Classes 949-995 — food, fruits, vegetables, mushrooms, crops, flowers
# These map to: bracken fern, banana, strawberry, orange, lemon, fig,
#   pineapple, jackfruit, custard apple, pomegranate, hay, broccoli,
#   cauliflower, zucchini, squash, cucumber, artichoke, bell pepper,
#   cardoon, mushrooms, rapeseed, daisy, orchid, corn, acorn, rose hip,
#   horse chestnut, fungi, ears of grain — all organic/plant-like.
# ─────────────────────────────────────────────────────────────────────────────

STRICT_PLANT_IDS = {
    # Ferns, fruits, leafy plants (340-365 range)
    340, 341, 345, 346, 347, 348, 352, 364, 365,
    # Fruits, vegetables, crops, mushrooms, flowers (949-995 range)
    949, 950, 951, 952, 953, 954, 955, 956, 957,
    958, 959, 960, 961, 962, 963, 964, 965, 966,
    967, 968, 969, 970, 971, 972, 973, 974, 975,
    976, 977, 978, 979, 980, 981, 982, 983, 984,
    985, 986, 987, 988, 989, 990, 991, 992, 993,
    994, 995,
}



# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def get_device():
    return torch.device('cuda' if torch.cuda.is_available() else 'cpu')


def get_transform():
    """Standard ImageNet normalisation transform"""
    return transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    ])


def get_confidence_label(confidence: float) -> str:
    if confidence >= 85:
        return 'high'
    elif confidence >= 65:
        return 'moderate'
    else:
        return 'low'


# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 — Pretrained ImageNet Gate
# ─────────────────────────────────────────────────────────────────────────────

def load_imagenet_gate(device):
    """
    Load a pretrained EfficientNet-B0 on ImageNet.
    This requires NO training — we just use torchvision's pretrained weights.
    The model is downloaded automatically (~20 MB) on first use and cached.
    """
    gate = models.efficientnet_b0(
        weights=models.EfficientNet_B0_Weights.IMAGENET1K_V1
    )
    gate = gate.to(device)
    gate.eval()
    return gate


def is_plant_leaf(image_tensor, gate_model, device, top_k=10):
    """
    Stage 1 gate — returns (is_leaf: bool, gate_info: dict)

    Design philosophy: DEFAULT = ACCEPT.
    Only reject when multiple strong signals indicate "this is clearly NOT
    a close-up leaf photo".  This avoids false-rejecting diseased leaves
    whose unusual textures/colors confuse ImageNet.

    Reject signals (need 2+ to reject):
      R1  HIGH EDGE DENSITY  — buildings, fences, vehicles have many sharp
          geometric edges.  A close-up leaf has smooth organic texture.
          Very high edge density (>5%) triggers an instant solo-reject.
      R2  NO ORGANIC COLOUR  — the image contains no green or brown-green
          pixels at all (typical for cars, electronics, indoor objects).
      R3  IMAGENET NON-PLANT  — ImageNet is fairly confident (>40%) about
          a non-plant class AND there is negligible plant probability mass
          in the full 1000-class distribution.

    Why this works for each scenario:
      House with ivy:   R1=YES (fence/building edges),  R2=no,  R3=maybe  → ≥2 → REJECT
      Diseased leaf:    R1=no  (smooth texture),         R2=no,  R3=maybe  → ≤1 → ACCEPT
      Person / car:     R1=maybe, R2=YES (no green), R3=YES              → ≥2 → REJECT
    """
    with torch.no_grad():
        logits = gate_model(image_tensor.to(device))
        probs  = F.softmax(logits, dim=1)[0]

    topk_vals, topk_ids = torch.topk(probs, top_k)
    topk_ids_list = topk_ids.cpu().tolist()
    top1_class = topk_ids_list[0]
    top1_conf  = topk_vals[0].item()

    # ── Un-normalise image for pixel-level analysis ──────────────────────────
    MEAN    = torch.tensor([0.485, 0.456, 0.406]).view(3, 1, 1)
    STD     = torch.tensor([0.229, 0.224, 0.225]).view(3, 1, 1)
    img_raw = image_tensor[0].cpu() * STD + MEAN          # (3, H, W), 0-1

    # ── R1: Structural edge density ──────────────────────────────────────────
    # Convert to greyscale and compute gradient magnitude.
    # Buildings/fences/vehicles: many strong straight edges → high ratio
    # Close-up leaf: smooth organic surface → low ratio
    gray   = img_raw.mean(dim=0)                           # (H, W)
    grad_x = torch.abs(gray[:, 1:] - gray[:, :-1])        # horizontal gradients
    grad_y = torch.abs(gray[1:, :] - gray[:-1, :])        # vertical gradients

    # Fraction of pixel-pairs with a strong brightness jump (edge).
    # Threshold 0.10 catches building corners, fence bars, window frames
    # but ignores subtle leaf-vein or disease-spot transitions.
    edge_ratio = (
        (grad_x > 0.10).float().mean().item() +
        (grad_y > 0.10).float().mean().item()
    ) / 2.0

    high_edges    = edge_ratio > 0.045        # moderate → 1 reject vote
    extreme_edges = edge_ratio > 0.065        # very high → solo-reject

    # ── R2: No organic (leaf-like) colouring at all ──────────────────────────
    # Green pixels: G channel dominant and above floor brightness.
    green_mask = (
        (img_raw[1] > img_raw[0]) &
        (img_raw[1] > img_raw[2]) &
        (img_raw[1] > 0.15)
    )
    green_ratio = green_mask.float().mean().item()

    # Brown / yellow-green pixels (common in diseased leaves):
    # R > G but G still above B, and G has real brightness.
    brown_mask = (
        (img_raw[0] > img_raw[1]) &
        (img_raw[1] > img_raw[2]) &
        (img_raw[1] > 0.12)
    )
    brown_ratio = brown_mask.float().mean().item()

    organic_ratio = green_ratio + brown_ratio
    no_organic    = organic_ratio < 0.08      # less than 8 % → not a leaf

    # ── R3: ImageNet strongly predicts non-plant ─────────────────────────────
    plant_in_top10 = len(set(topk_ids_list) & STRICT_PLANT_IDS) > 0
    plant_mass     = sum(probs[i].item() for i in STRICT_PLANT_IDS if i < 1000)

    # Only count as a reject signal when the model is reasonably sure AND
    # there is almost no plant probability anywhere in the distribution.
    strong_nonplant = (
        (not plant_in_top10) and
        (plant_mass < 0.05) and
        (top1_conf > 0.40)
    )

    # ── Decision ─────────────────────────────────────────────────────────────
    # Extreme edges alone → instant reject (clearly a complex scene)
    if extreme_edges:
        is_leaf       = False
        reject_reason = f'extreme edge density ({edge_ratio:.4f}) — complex scene'
    else:
        reject_votes  = sum([high_edges, no_organic, strong_nonplant])
        is_leaf       = reject_votes < 2
        reject_reason = (
            None if is_leaf
            else f'{reject_votes} reject signals fired: '
                 f'edges={high_edges}, no_organic={no_organic}, nonplant={strong_nonplant}'
        )

    gate_info = {
        'edge_ratio':           round(edge_ratio, 5),
        'extreme_edges':        extreme_edges,
        'high_edges':           high_edges,
        'organic_ratio':        round(organic_ratio, 4),
        'green_ratio':          round(green_ratio, 4),
        'brown_ratio':          round(brown_ratio, 4),
        'no_organic':           no_organic,
        'top1_imagenet_class':  top1_class,
        'top1_imagenet_prob':   round(top1_conf * 100, 2),
        'plant_in_top10':       plant_in_top10,
        'plant_mass_pct':       round(plant_mass * 100, 2),
        'strong_nonplant':      strong_nonplant,
        'reject_reason':        reject_reason,
    }

    return is_leaf, gate_info




# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 — Disease Classifier
# ─────────────────────────────────────────────────────────────────────────────

def create_disease_model(num_classes=3):
    """Create EfficientNet-B0 with custom disease classifier head"""
    model = models.efficientnet_b0(weights=None)
    num_features = model.classifier[1].in_features
    model.classifier = nn.Sequential(
        nn.Dropout(p=0.3, inplace=True),
        nn.Linear(num_features, 512),
        nn.ReLU(inplace=True),
        nn.Dropout(p=0.2),
        nn.Linear(512, num_classes)
    )
    return model


def classify_disease(image_tensor, model_path, device):
    """Run the tea disease classifier and return probabilities"""
    model = create_disease_model(num_classes=3)
    checkpoint = torch.load(model_path, map_location=device, weights_only=False)
    model.load_state_dict(checkpoint['model_state_dict'])
    model = model.to(device)
    model.eval()

    with torch.no_grad():
        outputs      = model(image_tensor)
        probabilities = F.softmax(outputs, dim=1)
        confidence, predicted = torch.max(probabilities, 1)

    predicted_class  = CLASS_NAMES[predicted.item()]
    confidence_score = confidence.item() * 100

    all_probs = {
        CLASS_NAMES[i]: round(probabilities[0][i].item() * 100, 2)
        for i in range(len(CLASS_NAMES))
    }

    return predicted_class, confidence_score, all_probs


# ─────────────────────────────────────────────────────────────────────────────
# Main predict() — Stage 1 → Stage 2 pipeline
# ─────────────────────────────────────────────────────────────────────────────

def predict(image_path, model_path):
    """
    Full two-stage prediction pipeline.
    Returns a JSON-serialisable dict.
    """
    device    = get_device()
    transform = get_transform()

    # Load & preprocess image (shared by both stages)
    image        = Image.open(image_path).convert('RGB')
    image_tensor = transform(image).unsqueeze(0)               # (1, 3, 224, 224)

    # ── Stage 1: Gate ────────────────────────────────────────────────────────
    gate_model            = load_imagenet_gate(device)
    is_plant, gate_info   = is_plant_leaf(image_tensor, gate_model, device)

    if not is_plant:
        return {
            'success':   True,
            'isTeaLeaf': False,
            'message':   (
                'This image does not appear to be a tea leaf. '
                'Please upload a clear, close-up photo of a tea leaf for accurate disease detection.'
            ),
            'gateInfo':  gate_info,
        }

    # ── Stage 2: Disease classification ──────────────────────────────────────
    predicted_class, confidence_score, all_probs = classify_disease(
        image_tensor, model_path, device
    )

    disease_code       = CLASS_TO_CODE[predicted_class]
    confidence_label   = get_confidence_label(confidence_score)

    return {
        'success':         True,
        'isTeaLeaf':       True,
        'diseaseType':     disease_code,
        'diseaseName':     predicted_class,
        'confidence':      round(confidence_score, 2),
        'confidenceLabel': confidence_label,   # 'high' | 'moderate' | 'low'
        'probabilities':   all_probs,
        'gateInfo':        gate_info,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Tea leaf disease prediction')
    parser.add_argument('--image', type=str, required=True,  help='Path to input image')
    parser.add_argument('--model', type=str, required=True,  help='Path to model checkpoint')
    args = parser.parse_args()

    try:
        result = predict(args.image, args.model)
        print(json.dumps(result))
    except Exception as e:
        error_result = {
            'success': False,
            'error':   str(e)
        }
        print(json.dumps(error_result))
        sys.exit(1)
