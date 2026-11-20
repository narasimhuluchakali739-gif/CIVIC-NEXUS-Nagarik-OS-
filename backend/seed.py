"""
CIVIC-NEXUS Incident Seeder
Populates the database with realistic civic incidents across major metropolitan coordinates
(Bangalore / Koramangala / Indiranagar / MG Road) for instant live demo presentation.
"""
from datetime import datetime, timedelta
from database import db

SAMPLE_INCIDENTS = [
    {
        "id": "CIVIC-101",
        "created_at": (datetime.utcnow() - timedelta(hours=3)).isoformat(),
        "latitude": 12.9352,
        "longitude": 77.6245,
        "category": "Road Hazard (Pothole/Cracks)",
        "severity_score": 9,
        "hazard_level": "CRITICAL",
        "sla_hours": 24,
        "responsible_department": "BBMP Road Infrastructure & Engineering Wing (South)",
        "legal_bylaw_reference": "Section 284, Karnataka Municipal Corporations Act 1976",
        "escalation_notice": "CRITICAL HAZARD: 22cm deep cavernous road breach on Koramangala 80ft Road. Multiple two-wheeler tumbles recorded. SLA: 24h.",
        "status": "DISPATCHED_TO_WARD",
        "upvote_count": 7,
        "voice_transcript": "Bhaiyya yahan bohot bada gaddha hai, do log gir chuke hain kal raat se.",
        "resolution_audit": None
    },
    {
        "id": "CIVIC-102",
        "created_at": (datetime.utcnow() - timedelta(hours=8)).isoformat(),
        "latitude": 12.9716,
        "longitude": 77.6412,
        "category": "Water Supply/Sewage Leak",
        "severity_score": 8,
        "hazard_level": "HIGH",
        "sla_hours": 24,
        "responsible_department": "Bangalore Water Supply & Sewerage Board (BWSSB Zone 3)",
        "legal_bylaw_reference": "Section 243, Duty to Prevent Potable Water Contamination",
        "escalation_notice": "High-pressure freshwater pipeline fracture discharging onto Indiranagar 100ft Road. Severe localized waterlogging.",
        "status": "IN_PROGRESS",
        "upvote_count": 4,
        "voice_transcript": "Water pipe burst since morning, flooding the entire street corner.",
        "resolution_audit": None
    },
    {
        "id": "CIVIC-103",
        "created_at": (datetime.utcnow() - timedelta(hours=14)).isoformat(),
        "latitude": 12.9783,
        "longitude": 77.5912,
        "category": "Electrical/Streetlight Hazard",
        "severity_score": 10,
        "hazard_level": "CRITICAL",
        "sla_hours": 12,
        "responsible_department": "BESCOM Urban Utility Maintenance Directorate",
        "legal_bylaw_reference": "Section 138, Indian Electricity Act 2003",
        "escalation_notice": "Snapped 440V overhead distribution wire hanging 4 feet above pedestrian sidewalk near Cubbon Park metro gate.",
        "status": "DISPATCHED_TO_WARD",
        "upvote_count": 12,
        "voice_transcript": "Electric wire is hanging loose! Anyone touching this will get electrocuted!",
        "resolution_audit": None
    },
    {
        "id": "CIVIC-104",
        "created_at": (datetime.utcnow() - timedelta(days=1)).isoformat(),
        "latitude": 12.9298,
        "longitude": 77.5834,
        "category": "Sanitation/Garbage Dump",
        "severity_score": 6,
        "hazard_level": "MEDIUM",
        "sla_hours": 48,
        "responsible_department": "BBMP Solid Waste Management (Jayanagar Ward)",
        "legal_bylaw_reference": "Rule 15, Solid Waste Management Rules 2016",
        "escalation_notice": "Unsegregated municipal solid waste accumulation blocking pedestrian footpath for 72 hours.",
        "status": "DISPATCHED_TO_WARD",
        "upvote_count": 3,
        "voice_transcript": "Garbage has not been collected for three days, stray dogs tearing it apart.",
        "resolution_audit": None
    },
    {
        "id": "CIVIC-105",
        "created_at": (datetime.utcnow() - timedelta(days=2)).isoformat(),
        "latitude": 12.9754,
        "longitude": 77.6052,
        "category": "Road Hazard (Pothole/Cracks)",
        "severity_score": 8,
        "hazard_level": "HIGH",
        "sla_hours": 24,
        "responsible_department": "BBMP Central Engineering Wing",
        "legal_bylaw_reference": "Section 284, Karnataka Municipal Corporations Act 1976",
        "escalation_notice": "Sub-surface trench depression after telecom fiber laying on Residency Road.",
        "status": "RESOLVED_VERIFIED",
        "upvote_count": 9,
        "voice_transcript": "Fixed and tarred properly yesterday morning.",
        "resolution_audit": {
            "is_repaired": True,
            "confidence_percentage": 97,
            "verdict": "VERIFIED_SATISFACTORY",
            "audit_reasoning": "Bituminous asphalt patch inspected via satellite & vision diffing. Leveling matches surrounding road surface.",
            "remediation_status": "CLOSED"
        }
    }
]

def seed_database():
    db.clear()
    for item in SAMPLE_INCIDENTS:
        db.add(item.copy())
    return len(SAMPLE_INCIDENTS)

if __name__ == "__main__":
    count = seed_database()
    print(f"Successfully seeded {count} sample civic incidents.")
