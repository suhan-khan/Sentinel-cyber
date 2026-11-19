# Sentinel Cyber Backend

FastAPI backend for the Sentinel Cyber frontend.

## 1. Create environment (Windows PowerShell)

```powershell
cd backend
py -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

## 2. Start API

```powershell
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Open `http://127.0.0.1:8000/docs` to inspect and test the API. The frontend's default API URL is `http://localhost:8000`.

## 3. Connect a trained model

Put these files in `artifacts/`:

- `model.joblib`: a fitted scikit-learn estimator or (preferably) a fitted preprocessing + model Pipeline.
- `feature_columns.json`: JSON array of the exact ordered feature names used for model input.

Example `feature_columns.json`:

```json
["Flow Duration", "Total Fwd Packets", "Total Backward Packets"]
```

Use your actual feature names; the example is illustrative only. The uploaded CSV must contain every feature listed in this file. Keep the target/label column out of the feature list.

The API returns HTTP 503 for `/api/predict` until real model artifacts are installed. This prevents the dashboard from presenting demo or fabricated values as real ML predictions.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | API, dataset processor, and model readiness |
| POST | `/api/upload` | Validate and store a CSV upload |
| POST | `/api/predict` | Run the fitted model on an uploaded dataset |
| GET | `/api/history` | List completed analyses |
| GET | `/api/analytics` | Return metrics from the latest inference |

## Important

- Uploads and history are held locally/in memory for this prototype. Restarting the API clears dataset IDs and history.
- This is a local student-project prototype, not a production security monitoring service.
- Before public deployment, restrict CORS, add authentication, persistent storage, request limits, and appropriate security controls.
