"""
Surplus Food Prediction Microservice
Uses scikit-learn (Linear Regression + Random Forest) trained on food_surplus_dataset.csv
Exposes a REST API on port 8000
"""

from flask import Flask, request, jsonify
import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score, mean_absolute_error
import os

app = Flask(__name__)

# ── Load & train on startup ────────────────────────────────────────────────────

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_PATH = os.path.join(BASE_DIR, 'food_surplus_dataset.csv')

df = pd.read_csv(DATASET_PATH)

# Encode food_type as numeric
le = LabelEncoder()
df['food_type_enc'] = le.fit_transform(df['food_type'])

FEATURES = ['food_type_enc', 'quantity_prepared', 'expected_guests', 'hours_until_expiry', 'day_of_week']
TARGET = 'surplus'

X = df[FEATURES]
y = df[TARGET]

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Train both models — pick the better one
lr_model = LinearRegression()
lr_model.fit(X_train, y_train)
lr_r2 = r2_score(y_test, lr_model.predict(X_test))
lr_mae = mean_absolute_error(y_test, lr_model.predict(X_test))

rf_model = RandomForestRegressor(n_estimators=100, random_state=42)
rf_model.fit(X_train, y_train)
rf_r2 = r2_score(y_test, rf_model.predict(X_test))
rf_mae = mean_absolute_error(y_test, rf_model.predict(X_test))

# Use the model with higher R²
if rf_r2 >= lr_r2:
    best_model = rf_model
    best_model_name = 'Random Forest'
    best_r2 = rf_r2
    best_mae = rf_mae
else:
    best_model = lr_model
    best_model_name = 'Linear Regression'
    best_r2 = lr_r2
    best_mae = lr_mae

print(f"Linear Regression  → R²: {lr_r2:.4f}, MAE: {lr_mae:.2f} kg")
print(f"Random Forest      → R²: {rf_r2:.4f}, MAE: {rf_mae:.2f} kg")
print(f"Selected model: {best_model_name} (R²={best_r2:.4f})")

known_food_types = list(le.classes_)

# ── Prediction endpoint ────────────────────────────────────────────────────────

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.get_json()
        food_type    = str(data.get('foodType', '')).lower().strip()
        quantity     = float(data.get('quantity', 0))
        guests       = int(data.get('expectedGuests', 0))
        hours_expiry = float(data.get('hoursUntilExpiry', 8))
        day_of_week  = int(data.get('dayOfWeek', 0))

        if quantity <= 0 or guests <= 0:
            return jsonify({'error': 'quantity and expectedGuests must be positive'}), 400

        # Handle unknown food types — fall back to closest known type
        if food_type not in known_food_types:
            food_type = 'rice'  # default fallback

        food_type_enc = le.transform([food_type])[0]

        features = np.array([[food_type_enc, quantity, guests, hours_expiry, day_of_week]])
        predicted_surplus = float(best_model.predict(features)[0])

        # Also get Linear Regression prediction for comparison
        lr_surplus = float(lr_model.predict(features)[0])
        rf_surplus = float(rf_model.predict(features)[0])

        predicted_consumption = max(0.0, quantity - predicted_surplus)
        surplus_percent = (predicted_surplus / quantity) * 100 if quantity > 0 else 0

        # Urgency
        if hours_expiry <= 2:
            urgency = 'high'
        elif hours_expiry <= 6:
            urgency = 'medium'
        else:
            urgency = 'low'

        # Status
        if predicted_surplus > 0.5:
            status = 'surplus'
        elif predicted_surplus < -0.5:
            status = 'shortage'
        else:
            status = 'exact'

        # Recommendation
        if status == 'surplus':
            if urgency == 'high':
                recommendation = 'Food expires soon — donate immediately to nearby NGOs.'
            elif urgency == 'medium':
                recommendation = 'Consider donating within the next few hours.'
            else:
                recommendation = 'You have time — you can donate or sell at a discount.'
        elif status == 'shortage':
            recommendation = f'Prepare ~{abs(round(predicted_surplus, 1))} kg more to avoid running short.'
        else:
            recommendation = 'Perfect balance — just enough food for your guests.'

        return jsonify({
            'predictedSurplus':     round(predicted_surplus, 2),
            'predictedConsumption': round(predicted_consumption, 2),
            'surplusPercent':       round(surplus_percent, 1),
            'status':               status,
            'urgency':              urgency,
            'recommendation':       recommendation,
            'modelUsed':            best_model_name,
            'r2Score':              round(best_r2, 4),
            'maeScore':             round(best_mae, 2),
            'linearRegressionPrediction': round(lr_surplus, 2),
            'randomForestPrediction':     round(rf_surplus, 2),
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok',
        'model': best_model_name,
        'r2': round(best_r2, 4),
        'mae': round(best_mae, 2),
        'knownFoodTypes': known_food_types,
    })


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=False)
