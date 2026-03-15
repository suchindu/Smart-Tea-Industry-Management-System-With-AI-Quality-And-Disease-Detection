"""
Tea Leaf Quality Prediction - Prediction Service for Node.js Backend
Called as subprocess from Node.js:
  python quality_predict_service.py --tea_flavor "Black Tea Powder" --base_price 25500
    --moisture 3.5 --quality_score 95 --caffeine 3.2 --fineness 95 --batch_weight 100

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


def predict(tea_flavor, base_price, moisture, quality_score, caffeine, fineness, batch_weight):
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
    # ['Tea Flavor', 'Base Price (Rs)', 'Moisture (%)', 'Quality Score', 'Caffeine (%)', 'Fineness (%)', 'Batch Weight (kg)']
    features = np.array([[tea_flavor_encoded, base_price, moisture, quality_score, caffeine, fineness, batch_weight]])

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
            'base_price': base_price,
            'moisture': moisture,
            'quality_score': quality_score,
            'caffeine': caffeine,
            'fineness': fineness,
            'batch_weight': batch_weight
        }
    }

    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Tea leaf quality prediction')
    parser.add_argument('--tea_flavor', type=str, required=True, help='Tea flavor name')
    parser.add_argument('--base_price', type=float, required=True, help='Base price in Rs')
    parser.add_argument('--moisture', type=float, required=True, help='Moisture percentage')
    parser.add_argument('--quality_score', type=float, required=True, help='Quality score (88-100)')
    parser.add_argument('--caffeine', type=float, required=True, help='Caffeine percentage')
    parser.add_argument('--fineness', type=float, required=True, help='Fineness percentage')
    parser.add_argument('--batch_weight', type=float, required=True, help='Batch weight in kg')
    args = parser.parse_args()

    try:
        result = predict(
            tea_flavor=args.tea_flavor,
            base_price=args.base_price,
            moisture=args.moisture,
            quality_score=args.quality_score,
            caffeine=args.caffeine,
            fineness=args.fineness,
            batch_weight=args.batch_weight
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
