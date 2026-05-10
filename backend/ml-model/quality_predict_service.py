"""
Tea Leaf Quality Prediction - Prediction Service for Node.js Backend
=====================================================================
Called as subprocess from Node.js with the 8 raw quality parameters:

  python quality_predict_service.py
    --tea_flavor "Black Tea Powder"
    --particle_size 95
    --moisture 3.5
    --color_value 80
    --aroma_power 8.5
    --taste_strength 8.0
    --solubility 97
    --caffeine 3.2
    --fineness 95

Outputs JSON to stdout for Node.js to parse.
"""

import os
import sys
import json
import argparse
import pickle
import numpy as np
from xgboost import XGBClassifier, XGBRegressor


def load_models():
    """Load trained models and preprocessors"""
    model_dir = os.path.join(os.path.dirname(__file__), 'quality_models')

    # Load classifier
    clf = XGBClassifier()
    clf.load_model(os.path.join(model_dir, 'quality_classifier.json'))

    # Load regressor
    reg = XGBRegressor()
    reg.load_model(os.path.join(model_dir, 'quality_regressor.json'))

    # Load encoders and scaler
    with open(os.path.join(model_dir, 'tea_flavor_encoder.pkl'), 'rb') as f:
        tea_flavor_encoder = pickle.load(f)

    with open(os.path.join(model_dir, 'quality_encoder.pkl'), 'rb') as f:
        quality_encoder = pickle.load(f)

    with open(os.path.join(model_dir, 'feature_scaler.pkl'), 'rb') as f:
        scaler = pickle.load(f)

    return clf, reg, tea_flavor_encoder, quality_encoder, scaler


def predict(tea_flavor, particle_size, moisture, color_value, aroma_power,
            taste_strength, solubility, caffeine, fineness):
    """Run prediction and return result dict"""
    clf, reg, tea_flavor_encoder, quality_encoder, scaler = load_models()

    # Validate tea flavor
    valid_flavors = tea_flavor_encoder.classes_.tolist()
    if tea_flavor not in valid_flavors:
        return {
            'success': False,
            'error': f'Invalid tea flavor: {tea_flavor}. Valid options: {valid_flavors}'
        }

    # Encode tea flavor
    tea_flavor_encoded = tea_flavor_encoder.transform([tea_flavor])[0]

    # Create feature array in same order as training:
    # ['Tea Flavor', 'Particle Size', 'Moisture (%)', 'Color Value',
    #  'Aroma Power', 'Taste Strength', 'Solubility (%)', 'Caffeine (%)', 'Fineness (%)']
    features = np.array([[
        tea_flavor_encoded, particle_size, moisture, color_value,
        aroma_power, taste_strength, solubility, caffeine, fineness
    ]])

    # Scale features
    features_scaled = scaler.transform(features)

    # Predict quality class
    cls_pred = clf.predict(features_scaled)[0]
    cls_proba = clf.predict_proba(features_scaled)[0]
    quality_class = quality_encoder.inverse_transform([cls_pred])[0]

    # Get class probabilities
    quality_probabilities = {}
    for i, cls_name in enumerate(quality_encoder.classes_):
        quality_probabilities[cls_name] = round(float(cls_proba[i]) * 100, 2)

    # Predict percentage
    pct_pred = reg.predict(features_scaled)[0]
    percentage = round(float(pct_pred), 1)

    # Clamp percentage to valid range
    percentage = max(0, min(100, percentage))

    result = {
        'success': True,
        'quality': quality_class,
        'percentage': percentage,
        'quality_probabilities': quality_probabilities,
        'input_summary': {
            'tea_flavor': tea_flavor,
            'particle_size': particle_size,
            'moisture': moisture,
            'color_value': color_value,
            'aroma_power': aroma_power,
            'taste_strength': taste_strength,
            'solubility': solubility,
            'caffeine': caffeine,
            'fineness': fineness
        }
    }

    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Tea leaf quality prediction')
    parser.add_argument('--tea_flavor', type=str, required=True, help='Tea flavor name')
    parser.add_argument('--particle_size', type=float, required=True, help='Particle size (mesh)')
    parser.add_argument('--moisture', type=float, required=True, help='Moisture percentage')
    parser.add_argument('--color_value', type=float, required=True, help='Color value (L*)')
    parser.add_argument('--aroma_power', type=float, required=True, help='Aroma power (0-10)')
    parser.add_argument('--taste_strength', type=float, required=True, help='Taste strength (0-10)')
    parser.add_argument('--solubility', type=float, required=True, help='Solubility percentage')
    parser.add_argument('--caffeine', type=float, required=True, help='Caffeine percentage')
    parser.add_argument('--fineness', type=float, required=True, help='Fineness percentage')
    args = parser.parse_args()

    try:
        result = predict(
            tea_flavor=args.tea_flavor,
            particle_size=args.particle_size,
            moisture=args.moisture,
            color_value=args.color_value,
            aroma_power=args.aroma_power,
            taste_strength=args.taste_strength,
            solubility=args.solubility,
            caffeine=args.caffeine,
            fineness=args.fineness
        )
        # Output ONLY JSON to stdout (Node.js will parse this)
        print(json.dumps(result))
    except Exception as e:
        error_result = {
            'success': False,
            'error': str(e)
        }
        print(json.dumps(error_result))
        sys.exit(1)
