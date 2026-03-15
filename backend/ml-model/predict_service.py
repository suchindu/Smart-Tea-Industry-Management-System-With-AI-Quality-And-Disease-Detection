"""
Tea Leaf Disease Classification - Prediction Script for Node.js Backend
Called as subprocess from Node.js: python predict_service.py --image <path> --model <path>
Outputs JSON to stdout for Node.js to parse.
"""

import os
import sys
import json
import argparse
from pathlib import Path

import torch
import torch.nn.functional as F
from torchvision import transforms, models
from PIL import Image
import torch.nn as nn


# Class names (must match training order)
CLASS_NAMES = ['Brown Blight', 'Healthy Green Leaf', 'Red spider Mite']

# Map to frontend disease codes
CLASS_TO_CODE = {
    'Brown Blight': 'BB',
    'Healthy Green Leaf': 'GL',
    'Red spider Mite': 'RSM'
}


def get_device():
    """Get the best available device"""
    return torch.device('cuda' if torch.cuda.is_available() else 'cpu')


def create_model(num_classes=3):
    """Create EfficientNet-B0 model with custom classifier"""
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


def get_transform():
    """Get inference transform"""
    return transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    ])


def predict(image_path, model_path):
    """Run prediction and return JSON result"""
    device = get_device()

    # Load model
    model = create_model(num_classes=3)
    checkpoint = torch.load(model_path, map_location=device, weights_only=False)
    model.load_state_dict(checkpoint['model_state_dict'])
    model = model.to(device)
    model.eval()

    # Load and preprocess image
    transform = get_transform()
    image = Image.open(image_path).convert('RGB')
    image_tensor = transform(image).unsqueeze(0).to(device)

    # Predict
    with torch.no_grad():
        outputs = model(image_tensor)
        probabilities = F.softmax(outputs, dim=1)
        confidence, predicted = torch.max(probabilities, 1)

    predicted_class = CLASS_NAMES[predicted.item()]
    confidence_score = confidence.item() * 100

    # Get all class probabilities
    all_probs = {
        CLASS_NAMES[i]: round(probabilities[0][i].item() * 100, 2)
        for i in range(len(CLASS_NAMES))
    }

    # Map to frontend disease code
    disease_code = CLASS_TO_CODE[predicted_class]

    result = {
        'success': True,
        'diseaseType': disease_code,
        'diseaseName': predicted_class,
        'confidence': round(confidence_score, 2),
        'probabilities': all_probs
    }

    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Tea leaf disease prediction')
    parser.add_argument('--image', type=str, required=True, help='Path to input image')
    parser.add_argument('--model', type=str, required=True, help='Path to model checkpoint')
    args = parser.parse_args()

    try:
        result = predict(args.image, args.model)
        # Output ONLY JSON to stdout (Node.js will parse this)
        print(json.dumps(result))
    except Exception as e:
        error_result = {
            'success': False,
            'error': str(e)
        }
        print(json.dumps(error_result))
        sys.exit(1)
