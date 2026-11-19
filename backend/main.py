
from __future__ import annotations

import json
import uuid
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# --------------------------------------------------
# CONFIGURATION
# --------------------------------------------------

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("sentinel")

BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR / "uploads"
ARTIFACT_DIR = BASE_DIR / "artifacts"

MODEL_PATH = ARTIFACT_DIR / "model.joblib"
FEATURES_PATH = ARTIFACT_DIR / "feature_columns.json"

THRESHOLD = 0.05
MAX_UPLOAD_BYTES = 50 * 1024 * 1024
MAX_PREVIEW_ROWS = 8

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# --------------------------------------------------
# FASTAPI APP
# --------------------------------------------------

app = FastAPI(
    title="Sentinel Cyber API",
    description="AI/ML Network Intrusion Detection API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

datasets: dict[str, dict[str, Any]] = {}
history: list[dict[str, Any]] = []
latest_analytics: dict[str, Any] = {}

# --------------------------------------------------
# REQUEST MODEL
# --------------------------------------------------

class PredictRequest(BaseModel):
    dataset_id: str


# --------------------------------------------------
# MODEL LOADING
# --------------------------------------------------

def load_model():
    logger.info("Checking trained model artifacts...")
    logger.info("Model path: %s", MODEL_PATH)
    logger.info("Features path: %s", FEATURES_PATH)

    if not MODEL_PATH.exists():
        logger.error("Model file not found: %s", MODEL_PATH)
        return None, None

    if not FEATURES_PATH.exists():
        logger.error("Feature file not found: %s", FEATURES_PATH)
        return None, None

    try:
        logger.info("Loading Random Forest model...")

        model = joblib.load(MODEL_PATH)

        logger.info("Loading feature columns...")

        columns = json.loads(
            FEATURES_PATH.read_text(encoding="utf-8")
        )

        if not isinstance(columns, list):
            raise ValueError("Feature columns must be a JSON list.")

        if len(columns) != 74:
            raise ValueError(
                f"Expected 74 features, found {len(columns)}."
            )

        if hasattr(model, "n_features_in_"):
            model_features = model.n_features_in_

            logger.info("Model feature count: %s", model_features)

            if model_features != len(columns):
                raise ValueError(
                    f"Model expects {model_features} features, "
                    f"but feature list contains {len(columns)}."
                )

        if not hasattr(model, "predict_proba"):
            raise ValueError(
                "Model does not support predict_proba()."
            )

        logger.info("Model classes: %s", model.classes_)
        logger.info("SUCCESS: Random Forest loaded!")

        return model, columns

    except Exception as exc:
        logger.exception(
            "MODEL LOADING FAILED: %s: %s",
            type(exc).__name__,
            exc,
        )
        return None, None


# --------------------------------------------------
# HELPERS
# --------------------------------------------------

def safe_float(value: Any, default: float = 0.0) -> float:
    try:
        result = float(value)
        return result if np.isfinite(result) else default
    except (TypeError, ValueError):
        return default


def first_matching(
    row: pd.Series,
    candidates: list[str],
    fallback: str
) -> str:

    lowered = {
        str(k).strip().lower(): k for k in row.index
    }

    for candidate in candidates:
        key = lowered.get(candidate.lower())

        if key is not None and pd.notna(row[key]):
            return str(row[key])

    return fallback


# --------------------------------------------------
# ROOT
# --------------------------------------------------

@app.get("/")
def root():
    return {
        "name": "Sentinel Cyber API",
        "docs": "/docs",
        "health": "/api/health",
    }


# --------------------------------------------------
# HEALTH CHECK
# --------------------------------------------------

@app.get("/api/health")
def health():

    model, columns = load_model()
    ready = model is not None and columns is not None

    return {
        "status": "online",
        "model": {
            "status": "online" if ready else "offline",
            "label": "Random Forest",
            "detail": "Inference ready" if ready else "Model loading failed - check backend terminal",
        },
        "dataset": {
            "status": "ready",
            "label": "Dataset Processor",
            "detail": "CSV ingestion operational",
        },
        "model_ready": ready,
        "feature_count": len(columns) if ready else 0,
        "threshold": THRESHOLD,
        "last_analysis": history[0]["date"] if history else None,
    }


# --------------------------------------------------
# CSV UPLOAD
# --------------------------------------------------

@app.post("/api/upload")
async def upload_dataset(file: UploadFile = File(...)):

    filename = file.filename or "uploaded.csv"

    if Path(filename).suffix.lower() != ".csv":
        raise HTTPException(
            status_code=400,
            detail="Only CSV files are supported."
        )

    content = await file.read(MAX_UPLOAD_BYTES + 1)

    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail="File exceeds the 50MB upload limit."
        )

    if not content:
        raise HTTPException(
            status_code=400,
            detail="Uploaded CSV is empty."
        )

    dataset_id = "DS-" + uuid.uuid4().hex[:10].upper()

    saved_path = UPLOAD_DIR / f"{dataset_id}.csv"
    saved_path.write_bytes(content)

    try:
        frame = pd.read_csv(
            saved_path,
            nrows=MAX_PREVIEW_ROWS + 1
        )

        if frame.empty:
            raise ValueError("CSV contains no data rows.")

        full_frame = pd.read_csv(saved_path)

    except Exception as exc:
        saved_path.unlink(missing_ok=True)

        raise HTTPException(
            status_code=400,
            detail=f"Could not read CSV: {exc}"
        ) from exc

    datasets[dataset_id] = {
        "path": saved_path,
        "filename": Path(filename).name,
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
        "rows": int(len(full_frame)),
        "columns": list(full_frame.columns),
    }

    return {
        "datasetId": dataset_id,
        "dataset_id": dataset_id,
        "filename": Path(filename).name,
        "size": len(content),
        "status": "uploaded",
        "rows": int(len(full_frame)),
        "columns": list(full_frame.columns),
        "preview": frame.head(MAX_PREVIEW_ROWS).replace(
            {np.nan: None}
        ).to_dict(orient="records"),
    }


# --------------------------------------------------
# PREDICTION
# --------------------------------------------------

@app.post("/api/predict")
def predict(request: PredictRequest):

    dataset = datasets.get(request.dataset_id)

    if not dataset:
        raise HTTPException(
            status_code=404,
            detail="Dataset ID not found. Upload the CSV again."
        )

    model, feature_columns = load_model()

    if model is None:
        raise HTTPException(
            status_code=503,
            detail="Trained ML model is not available. Check backend logs."
        )

    try:
        frame = pd.read_csv(dataset["path"])

        missing = [
            col for col in feature_columns
            if col not in frame.columns
        ]

        if missing:
            raise HTTPException(
                status_code=422,
                detail={
                    "message": "CSV is missing model features.",
                    "missing_columns": missing,
                },
            )

        X = frame[feature_columns].copy()

        for column in X.columns:
            X[column] = pd.to_numeric(
                X[column], errors="coerce"
            )

        X = X.replace(
            [np.inf, -np.inf], np.nan
        )

        probabilities = model.predict_proba(X)

        classes = list(model.classes_)

        if 1 not in classes:
            raise ValueError(
                f"Attack class 1 not found. Model classes: {classes}"
            )

        attack_index = classes.index(1)

        attack_probabilities = probabilities[:, attack_index]

        predictions_binary = (
            attack_probabilities >= THRESHOLD
        ).astype(int)

        predictions = []

        for index, (_, row) in enumerate(frame.iterrows()):

            is_attack = bool(predictions_binary[index])

            attack_probability = safe_float(
                attack_probabilities[index]
            )

            confidence = (
                attack_probability
                if is_attack
                else 1.0 - attack_probability
            )

            classification = (
                "ATTACK" if is_attack else "BENIGN"
            )

            protocol = first_matching(
                row, ["Protocol"], "Unknown"
            )

            src_ip = first_matching(
                row,
                ["Source IP", "Src IP", "src_ip", "SourceIP"],
                "N/A",
            )

            dst_ip = first_matching(
                row,
                [
                    "Destination IP",
                    "Dst IP",
                    "dst_ip",
                    "DestinationIP",
                ],
                "N/A",
            )

            severity = (
                "Critical" if is_attack and confidence >= 0.90
                else "High" if is_attack and confidence >= 0.75
                else "Medium" if is_attack
                else "Normal"
            )

            predictions.append({
                "id": index + 1,
                "srcIp": src_ip,
                "dstIp": dst_ip,
                "protocol": protocol,
                "classification": classification,
                "confidence": round(confidence, 4),
                "attackProbability": round(
                    attack_probability, 4
                ),
                "severity": severity,
            })

        total = len(predictions)
        malicious = int(predictions_binary.sum())
        normal = total - malicious

        result = {
            "predictions": predictions,
            "stats": {
                "total": total,
                "normal": normal,
                "malicious": malicious,
                "avgConfidence": round(
                    float(np.mean([
                        p["confidence"] for p in predictions
                    ])) if predictions else 0.0,
                    4,
                ),
            },
        }

        record = {
            "id": "ANA-" + uuid.uuid4().hex[:8].upper(),
            "filename": dataset["filename"],
            "date": datetime.now(timezone.utc).isoformat(),
            "records": total,
            "malicious": malicious,
            "status": "Completed",
        }

        history.insert(0, record)

        latest_analytics.clear()
        latest_analytics.update(
            build_analytics(predictions)
        )

        return result

    except HTTPException:
        raise

    except Exception as exc:
        logger.exception("Prediction failed")

        raise HTTPException(
            status_code=500,
            detail=f"Prediction failed: {exc}"
        ) from exc


# --------------------------------------------------
# ANALYTICS
# --------------------------------------------------

def build_analytics(
    predictions: list[dict[str, Any]]
) -> dict[str, Any]:

    total = len(predictions)

    normal = sum(
        p["classification"] == "BENIGN"
        for p in predictions
    )

    malicious = total - normal

    protocols: dict[str, int] = {}
    attacks: dict[str, int] = {}

    for item in predictions:

        protocol = item["protocol"]

        protocols[protocol] = (
            protocols.get(protocol, 0) + 1
        )

        if item["classification"] == "ATTACK":
            attacks["ATTACK"] = (
                attacks.get("ATTACK", 0) + 1
            )

    return {
        "totalConnections": total,
        "maliciousDetected": malicious,
        "normalConnections": normal,
        "detectionRate": round(
            (malicious / total) * 100, 2
        ) if total else 0,
        "protocolDistribution": protocols,
        "attackDistribution": attacks,
    }


# --------------------------------------------------
# HISTORY
# --------------------------------------------------

@app.get("/api/history")
def get_history():
    return history


# --------------------------------------------------
# ANALYTICS ENDPOINT
# --------------------------------------------------

@app.get("/api/analytics")
def get_analytics():

    return latest_analytics or {
        "totalConnections": 0,
        "maliciousDetected": 0,
        "normalConnections": 0,
        "detectionRate": 0,
        "protocolDistribution": {},
        "attackDistribution": {},
    }
