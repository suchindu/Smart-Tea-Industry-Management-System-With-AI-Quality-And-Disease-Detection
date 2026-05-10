"""
Tea Quality Dataset Generator
=============================
Generates a synthetic dataset with all 8 quality parameters for 7 tea flavors.
Uses the weighted scoring system to calculate quality scores and assign grade labels.

Grade Labels (8 classes):
  Premium  (>=95%)  -> 1.35x multiplier
  Superior (>=90%)  -> 1.25x
  High     (>=85%)  -> 1.15x
  Good     (>=80%)  -> 1.05x
  Standard (>=75%)  -> 1.00x
  Commercial(>=70%) -> 0.90x
  Low      (>=60%)  -> 0.75x
  Reject   (<60%)   -> 0.50x

Usage:
  python generate_dataset.py
"""

import os
import random
import numpy as np
import pandas as pd

# ── Tea flavor definitions with quality standards ──────────────────────────
TEA_FLAVORS = [
    {
        'label': 'Black Tea Powder',
        'basePrice': 25500,
        'standards': {
            'particleSize': [80, 100],
            'moisture': [2, 4],
            'color': [70, 90],
            'aroma': [7, 10],
            'taste': [7, 10],
            'solubility': [95, 100],
            'caffeine': [2.5, 4.5],
            'fineness': [90, 100]
        }
    },
    {
        'label': 'Green Tea Powder',
        'basePrice': 36000,
        'standards': {
            'particleSize': [100, 120],
            'moisture': [2, 3.5],
            'color': [45, 65],
            'aroma': [8, 10],
            'taste': [7, 10],
            'solubility': [97, 100],
            'caffeine': [2.0, 3.5],
            'fineness': [95, 100]
        }
    },
    {
        'label': 'Oolong Tea Powder',
        'basePrice': 42000,
        'standards': {
            'particleSize': [85, 110],
            'moisture': [2, 4],
            'color': [55, 75],
            'aroma': [7, 10],
            'taste': [7, 10],
            'solubility': [94, 99],
            'caffeine': [2.5, 4.0],
            'fineness': [92, 100]
        }
    },
    {
        'label': 'White Tea Powder',
        'basePrice': 54000,
        'standards': {
            'particleSize': [90, 115],
            'moisture': [2, 3],
            'color': [80, 95],
            'aroma': [8, 10],
            'taste': [8, 10],
            'solubility': [96, 100],
            'caffeine': [1.5, 3.0],
            'fineness': [94, 100]
        }
    },
    {
        'label': 'Matcha Powder',
        'basePrice': 105000,
        'standards': {
            'particleSize': [200, 300],
            'moisture': [2, 3],
            'color': [35, 50],
            'aroma': [9, 10],
            'taste': [8, 10],
            'solubility': [98, 100],
            'caffeine': [2.8, 3.5],
            'fineness': [98, 100]
        }
    },
    {
        'label': 'Chai Spice Tea Powder',
        'basePrice': 28500,
        'standards': {
            'particleSize': [70, 95],
            'moisture': [3, 5],
            'color': [60, 80],
            'aroma': [8, 10],
            'taste': [7, 10],
            'solubility': [92, 98],
            'caffeine': [2.0, 3.5],
            'fineness': [88, 98]
        }
    },
    {
        'label': 'Earl Grey Tea Powder',
        'basePrice': 33000,
        'standards': {
            'particleSize': [85, 105],
            'moisture': [2, 4],
            'color': [65, 85],
            'aroma': [8, 10],
            'taste': [7, 10],
            'solubility': [95, 99],
            'caffeine': [2.5, 4.0],
            'fineness': [92, 100]
        }
    }
]

# ── Quality parameter weights (total = 100) ────────────────────────────────
PARAM_WEIGHTS = {
    'particleSize': 12,
    'moisture': 15,
    'color': 10,
    'aroma': 15,
    'taste': 15,
    'solubility': 13,
    'caffeine': 10,
    'fineness': 10
}

# ── Grade thresholds ───────────────────────────────────────────────────────
GRADE_THRESHOLDS = [
    (95, 'Premium'),
    (90, 'Superior'),
    (85, 'High'),
    (80, 'Good'),
    (75, 'Standard'),
    (70, 'Commercial'),
    (60, 'Low'),
    (0, 'Reject')
]


def calculate_quality_score(params, standards):
    """Calculate quality score using the weighted scoring system."""
    total_score = 0
    max_score = 0

    for param_key, weight in PARAM_WEIGHTS.items():
        value = params[param_key]
        range_min, range_max = standards[param_key]
        max_score += weight

        if range_min <= value <= range_max:
            total_score += weight
        else:
            deviation = min(abs(value - range_min), abs(value - range_max))
            range_size = range_max - range_min
            partial = max(0, weight * (1 - (deviation / range_size)))
            total_score += partial

    return (total_score / max_score) * 100


def get_grade_label(score):
    """Map a quality score percentage to a grade label."""
    for threshold, label in GRADE_THRESHOLDS:
        if score >= threshold:
            return label
    return 'Reject'


def generate_sample(flavor, num_in_range, deviation_scale=0.5):
    """
    Generate one data sample.
    `num_in_range` controls how many of the 8 parameters fall within range.
    `deviation_scale` controls how far out-of-range params deviate (as a fraction of range size).
    """
    standards = flavor['standards']
    param_keys = list(standards.keys())
    random.shuffle(param_keys)

    in_range_keys = set(param_keys[:num_in_range])
    params = {}

    for key in param_keys:
        range_min, range_max = standards[key]
        range_size = range_max - range_min

        if key in in_range_keys:
            params[key] = round(random.uniform(range_min, range_max), 2)
        else:
            dev = range_size * deviation_scale * random.uniform(0.3, 1.5)
            if random.random() > 0.5:
                params[key] = round(range_max + dev, 2)
            else:
                params[key] = round(max(0, range_min - dev), 2)

    return params


def generate_dataset(num_samples=5000):
    """Generate the full dataset with balanced grade distribution."""
    data = []
    random.seed(42)
    np.random.seed(42)

    # Define generation strategies to cover all grade levels
    # (num_in_range, deviation_scale, proportion)
    strategies = [
        (8, 0.0, 0.12),   # All in range → Premium / Superior
        (7, 0.3, 0.12),   # 7 in range, small deviation → Superior / High
        (7, 0.7, 0.10),   # 7 in range, bigger deviation → High / Good
        (6, 0.4, 0.12),   # 6 in range → Good / Standard
        (6, 0.8, 0.10),   # 6 in range, big deviation → Standard / Commercial
        (5, 0.5, 0.12),   # 5 in range → Commercial / Low
        (4, 0.6, 0.10),   # 4 in range → Low
        (3, 0.7, 0.08),   # 3 in range → Low / Reject
        (2, 0.8, 0.07),   # 2 in range → Reject
        (1, 1.0, 0.04),   # 1 in range → Reject
        (0, 1.0, 0.03),   # 0 in range → Reject
    ]

    for i in range(num_samples):
        flavor = random.choice(TEA_FLAVORS)

        # Pick a strategy based on weighted proportions
        r = random.random()
        cumulative = 0
        chosen_nir, chosen_dev = 8, 0.0
        for nir, dev, prop in strategies:
            cumulative += prop
            if r < cumulative:
                chosen_nir = nir
                chosen_dev = dev
                break

        params = generate_sample(flavor, chosen_nir, chosen_dev)
        quality_score = calculate_quality_score(params, flavor['standards'])
        grade_label = get_grade_label(quality_score)
        batch_weight = round(random.uniform(10, 500), 1)

        row = {
            'Tea Flavor': flavor['label'],
            'Base Price (Rs)': flavor['basePrice'],
            'Particle Size': params['particleSize'],
            'Moisture (%)': params['moisture'],
            'Color Value': params['color'],
            'Aroma Power': params['aroma'],
            'Taste Strength': params['taste'],
            'Solubility (%)': params['solubility'],
            'Caffeine (%)': params['caffeine'],
            'Fineness (%)': params['fineness'],
            'Batch Weight (kg)': batch_weight,
            'Quality Score': round(quality_score, 2),
            'Grade Label': grade_label
        }
        data.append(row)

    return pd.DataFrame(data)


if __name__ == '__main__':
    print("=" * 60)
    print("  Tea Quality Dataset Generator")
    print("=" * 60)

    df = generate_dataset(5000)

    output_path = os.path.join(os.path.dirname(__file__), '..', '..', 'Tea_Quality_Dataset_V2.xlsx')
    output_path = os.path.abspath(output_path)
    df.to_excel(output_path, index=False)

    print(f"\n[OK] Dataset saved to: {output_path}")
    print(f"     Shape: {df.shape}")
    print(f"\n--- Grade Label Distribution ---")
    print(df['Grade Label'].value_counts().sort_index().to_string())
    print(f"\n--- Tea Flavor Distribution ---")
    print(df['Tea Flavor'].value_counts().to_string())
    print(f"\n--- Quality Score Stats ---")
    print(df['Quality Score'].describe().to_string())
    print()
