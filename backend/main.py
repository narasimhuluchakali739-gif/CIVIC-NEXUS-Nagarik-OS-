"""
CIVIC-NEXUS: Core Application Gateway & Agent Orchestrator
Integrates Multimodal Vision Triage, Spatial Deduplication,
Bureaucracy Legal Dispatch, and Proof-of-Resolution Anti-Corruption Audits.
"""
import os
import base64
from typing import Optional, List
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

from database import db, Incident
from vision_agent import analyze_image_with_vision
from spatial_engine import find_spatial_cluster
from bureaucracy_agent import generate_statutory_docket
from por_auditor import audit_proof_of_resolution
from seed import seed_database

app = FastAPI(
    title="CIVIC-NEXUS Agent Engine",
    description="Autonomous Civic Grievance Triage, Spatial Clustering & Proof-of-Resolution Engine",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Seed database on startup so demo data is available immediately
@app.on_event("startup")
async def startup_event():
    seed_database()
    print("[CIVIC-NEXUS] Database initialized with realistic metro hazard seed data.")

# Static files for frontend UI
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
os.makedirs(STATIC_DIR, exist_ok=True)

@app.get("/api/v1/health")
async def health_check():
    return {
        "status": "ONLINE",
        "system": "CIVIC-NEXUS OS",
        "active_incidents": db.count()
    }

@app.get("/api/v1/incidents")
async def list_incidents(category: Optional[str] = None):
    all_incidents = db.get_all()
    if category and category != "ALL":
        all_incidents = [i for i in all_incidents if i.get("category") == category]
    return all_incidents

@app.get("/api/v1/stats")
async def get_system_stats():
    incidents = db.get_all()
    critical = sum(1 for i in incidents if i.get("severity_score", 0) >= 8)
    resolved = sum(1 for i in incidents if i.get("status") == "RESOLVED_VERIFIED")
    fraud_blocked = sum(1 for i in incidents if i.get("status") == "CONTRACTOR_FRAUD_FLAGGED")
    clusters = sum(max(0, i.get("upvote_count", 1) - 1) for i in incidents)
    
    return {
        "total_incidents": len(incidents),
        "critical_hazards": critical,
        "resolved_verified": resolved,
        "duplicate_reports_clustered": clusters,
        "contractor_fraud_prevented": fraud_blocked
    }

@app.post("/api/v1/report")
async def report_civic_hazard(
    latitude: float = Form(...),
    longitude: float = Form(...),
    voice_transcript: Optional[str] = Form(None),
    image: UploadFile = File(...)
):
    """
    Core Ingestion Pipeline:
    1. Vision Forensic Audit
    2. Spatial Clustering Deduplication
    3. Statutory Legal Notice Dispatch
    """
    try:
        image_bytes = await image.read()
        mime_type = image.content_type or "image/jpeg"
        
        # 1. Vision Forensic Triage Agent
        analysis = analyze_image_with_vision(image_bytes, mime_type, voice_transcript)
        
        if not analysis.get("is_valid_civic_issue", False):
            return JSONResponse(
                status_code=400,
                content={
                    "status": "REJECTED_NON_CIVIC",
                    "reason": analysis.get("rejection_reason", "Uploaded media does not contain a recognizable public hazard.")
                }
            )

        category = analysis["category"]
        severity = analysis["severity_score"]

        # 2. Spatial Deduplication Agent (40-meter radius)
        existing_cluster = find_spatial_cluster(latitude, longitude, category, db.get_all(), cluster_radius_meters=40.0)
        
        if existing_cluster:
            matched_inc, dist = existing_cluster
            # Amplify priority and upvote count
            new_upvotes = matched_inc["upvote_count"] + 1
            new_severity = min(10, matched_inc["severity_score"] + 1)
            
            db.update(matched_inc["id"], {
                "upvote_count": new_upvotes,
                "severity_score": new_severity
            })
            
            return {
                "status": "CLUSTERED_PRIORITY_AMPLIFIED",
                "message": f"Co-located hazard detected {dist}m away. Merged report & elevated priority to {new_severity}/10.",
                "incident_id": matched_inc["id"],
                "total_reporters": new_upvotes,
                "amplified_severity": new_severity
            }

        # 3. Bureaucracy Agent: Generate Legal Notice Docket
        incident_id = f"CIVIC-{db.count() + 101}"
        docket = generate_statutory_docket(
            incident_id=incident_id,
            category=category,
            severity=severity,
            ward_name=f"Ward {int(latitude*10)%200 + 1}",
            department=analysis["responsible_department"],
            bylaw=analysis["legal_bylaw_reference"],
            latitude=latitude,
            longitude=longitude,
            sla_hours=analysis["estimated_repair_time_sla_hours"]
        )

        # Store image preview as base64 data uri for the frontend
        img_b64 = f"data:{mime_type};base64,{base64.b64encode(image_bytes).decode('utf-8')}" if len(image_bytes) < 3000000 else None

        new_incident = {
            "id": incident_id,
            "created_at": docket["sla_deadline"],
            "latitude": latitude,
            "longitude": longitude,
            "category": category,
            "severity_score": severity,
            "hazard_level": analysis["hazard_level"],
            "sla_hours": analysis["estimated_repair_time_sla_hours"],
            "responsible_department": analysis["responsible_department"],
            "legal_bylaw_reference": analysis["legal_bylaw_reference"],
            "escalation_notice": docket["formal_notice_text"],
            "status": "DISPATCHED_TO_WARD",
            "upvote_count": 1,
            "image_base64": img_b64,
            "voice_transcript": voice_transcript,
            "resolution_audit": None
        }

        db.add(new_incident)

        return {
            "status": "DISPATCHED_NEW_INCIDENT",
            "incident": new_incident
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent Execution Failure: {str(e)}")

@app.post("/api/v1/verify-resolution/{incident_id}")
async def verify_resolution(
    incident_id: str,
    simulate_fraud: bool = Query(False),
    after_image: UploadFile = File(...)
):
    """
    Proof-of-Resolution Anti-Corruption Auditor:
    Verifies if contractor's repair claim is genuine or fraudulent.
    """
    target = db.get_by_id(incident_id)
    if not target:
        raise HTTPException(status_code=404, detail="Incident Docket ID not found.")

    after_bytes = await after_image.read()
    audit_result = audit_proof_of_resolution(
        after_image_bytes=after_bytes,
        category=target["category"],
        original_description=target["escalation_notice"],
        is_simulated_fraud=simulate_fraud
    )

    if audit_result.get("verdict") == "VERIFIED_SATISFACTORY":
        target["status"] = "RESOLVED_VERIFIED"
    else:
        target["status"] = "CONTRACTOR_FRAUD_FLAGGED"
        target["severity_score"] = 10  # Maximum alert for corruption

    target["resolution_audit"] = audit_result
    db.update(incident_id, target)

    return {
        "status": "AUDIT_COMPLETED",
        "verdict": audit_result["verdict"],
        "audit_report": audit_result,
        "incident": target
    }

@app.post("/api/v1/seed")
async def trigger_seed():
    count = seed_database()
    return {"status": "SUCCESS", "seeded_incidents": count}

# Serve the Single-Page Command Center
@app.get("/")
async def serve_root():
    index_file = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"message": "CIVIC-NEXUS API is live. Static UI will load once placed."}

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
