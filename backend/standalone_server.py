"""
CIVIC-NEXUS Zero-Dependency Standalone Server
Uses 100% built-in Python standard libraries (http.server).
No pip, no external installations, and immune to Windows Application Control blocks.
"""
import os
import sys
import json
import base64
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from datetime import datetime

# Local Agent modules
from database import db
from seed import seed_database
from vision_agent import analyze_image_with_vision
from spatial_engine import find_spatial_cluster
from bureaucracy_agent import generate_statutory_docket
from por_auditor import audit_proof_of_resolution

# Pre-seed database on start
seed_database()

STATIC_FILE = os.path.join(os.path.dirname(__file__), "static", "index.html")

class CivicNexusHandler(BaseHTTPRequestHandler):
    def _send_json(self, data, status=200):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        # 1. Root: Serve Single-Page App UI
        if path in ["/", "/index.html"]:
            if os.path.exists(STATIC_FILE):
                with open(STATIC_FILE, "rb") as f:
                    content = f.read()
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(content)))
                self.end_headers()
                self.wfile.write(content)
            else:
                self._send_json({"error": "UI index.html not found"}, 404)
            return

        # 2. API Health Check
        if path == "/api/v1/health":
            self._send_json({"status": "ONLINE", "system": "CIVIC-NEXUS Zero-Dependency Engine", "active_incidents": db.count()})
            return

        # 3. API Stats
        if path == "/api/v1/stats":
            incidents = db.get_all()
            critical = sum(1 for i in incidents if i.get("severity_score", 0) >= 8)
            resolved = sum(1 for i in incidents if i.get("status") == "RESOLVED_VERIFIED")
            fraud_blocked = sum(1 for i in incidents if i.get("status") == "CONTRACTOR_FRAUD_FLAGGED")
            clusters = sum(max(0, i.get("upvote_count", 1) - 1) for i in incidents)
            self._send_json({
                "total_incidents": len(incidents),
                "critical_hazards": critical,
                "resolved_verified": resolved,
                "duplicate_reports_clustered": clusters,
                "contractor_fraud_prevented": fraud_blocked
            })
            return

        # 4. API List Incidents
        if path == "/api/v1/incidents":
            qs = parse_qs(parsed.query)
            category = qs.get("category", [None])[0]
            incidents = db.get_all()
            if category and category != "ALL":
                incidents = [i for i in incidents if i.get("category") == category]
            self._send_json(incidents)
            return

        self._send_json({"error": "Not Found"}, 404)

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path
        content_length = int(self.headers.get("Content-Length", 0))
        raw_body = self.rfile.read(content_length) if content_length > 0 else b""

        # 1. API Seed Trigger
        if path == "/api/v1/seed":
            count = seed_database()
            self._send_json({"status": "SUCCESS", "seeded_incidents": count})
            return

        # 2. API Hazard Report Ingestion
        if path == "/api/v1/report":
            # Extract basic text fields or multipart boundaries
            body_str = raw_body.decode("utf-8", errors="ignore")
            lat = 12.9352
            lng = 77.6245
            statement = "Reported hazard"

            for line in body_str.split("\n"):
                if "name=\"latitude\"" in line:
                    idx = body_str.find(line)
                    parts = body_str[idx:].split("\r\n\r\n")
                    if len(parts) > 1:
                        val = parts[1].split("\r\n")[0].strip()
                        try: lat = float(val)
                        except: pass
                elif "name=\"longitude\"" in line:
                    idx = body_str.find(line)
                    parts = body_str[idx:].split("\r\n\r\n")
                    if len(parts) > 1:
                        val = parts[1].split("\r\n")[0].strip()
                        try: lng = float(val)
                        except: pass
                elif "name=\"voice_transcript\"" in line:
                    idx = body_str.find(line)
                    parts = body_str[idx:].split("\r\n\r\n")
                    if len(parts) > 1:
                        statement = parts[1].split("\r\n")[0].strip()

            analysis = analyze_image_with_vision(raw_body, "image/jpeg", statement)
            category = analysis["category"]
            severity = analysis["severity_score"]

            # Spatial Deduplication
            existing_cluster = find_spatial_cluster(lat, lng, category, db.get_all(), cluster_radius_meters=40.0)
            if existing_cluster:
                matched_inc, dist = existing_cluster
                matched_inc["upvote_count"] += 1
                matched_inc["severity_score"] = min(10, matched_inc["severity_score"] + 1)
                db.update(matched_inc["id"], matched_inc)
                self._send_json({
                    "status": "CLUSTERED_PRIORITY_AMPLIFIED",
                    "message": f"Co-located hazard detected {dist}m away. Merged report & elevated priority.",
                    "incident_id": matched_inc["id"],
                    "total_reporters": matched_inc["upvote_count"],
                    "amplified_severity": matched_inc["severity_score"]
                })
                return

            incident_id = f"CIVIC-{db.count() + 101}"
            docket = generate_statutory_docket(
                incident_id=incident_id,
                category=category,
                severity=severity,
                ward_name=f"Ward {int(lat*10)%200 + 1}",
                department=analysis["responsible_department"],
                bylaw=analysis["legal_bylaw_reference"],
                latitude=lat,
                longitude=lng,
                sla_hours=analysis["estimated_repair_time_sla_hours"]
            )

            new_incident = {
                "id": incident_id,
                "created_at": docket["sla_deadline"],
                "latitude": lat,
                "longitude": lng,
                "category": category,
                "severity_score": severity,
                "hazard_level": analysis["hazard_level"],
                "sla_hours": analysis["estimated_repair_time_sla_hours"],
                "responsible_department": analysis["responsible_department"],
                "legal_bylaw_reference": analysis["legal_bylaw_reference"],
                "escalation_notice": docket["formal_notice_text"],
                "status": "DISPATCHED_TO_WARD",
                "upvote_count": 1,
                "voice_transcript": statement,
                "resolution_audit": None
            }
            db.add(new_incident)
            self._send_json({"status": "DISPATCHED_NEW_INCIDENT", "incident": new_incident})
            return

        # 3. API Proof-of-Resolution Audit
        if path.startswith("/api/v1/verify-resolution/"):
            incident_id = path.split("/verify-resolution/")[-1].split("?")[0]
            target = db.get_by_id(incident_id)
            if not target:
                self._send_json({"error": "Docket not found"}, 404)
                return

            simulate_fraud = "simulate_fraud=true" in self.path.lower()
            audit_result = audit_proof_of_resolution(
                after_image_bytes=raw_body,
                category=target["category"],
                original_description=target["escalation_notice"],
                is_simulated_fraud=simulate_fraud
            )

            if audit_result.get("verdict") == "VERIFIED_SATISFACTORY":
                target["status"] = "RESOLVED_VERIFIED"
            else:
                target["status"] = "CONTRACTOR_FRAUD_FLAGGED"
                target["severity_score"] = 10

            target["resolution_audit"] = audit_result
            db.update(incident_id, target)
            self._send_json({
                "status": "AUDIT_COMPLETED",
                "verdict": audit_result["verdict"],
                "audit_report": audit_result,
                "incident": target
            })
            return

        self._send_json({"error": "Not Found"}, 404)

def run_server(port=8000):
    server_address = ("0.0.0.0", port)
    httpd = HTTPServer(server_address, CivicNexusHandler)
    print("=" * 60)
    print("  CIVIC-NEXUS ZERO-DEPENDENCY SERVER IS LIVE!")
    print(f"  URL: http://localhost:{port}")
    print("  (Zero pip needed, immune to Windows Application Control)")
    print("=" * 60)
    print("Press CTRL+C to stop.")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...")
        httpd.server_close()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    if len(sys.argv) > 1:
        try: port = int(sys.argv[1])
        except: pass
    run_server(port)
