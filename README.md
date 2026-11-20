# 🏛️ CIVIC-NEXUS (Nagarik-OS)
### *Autonomous Multimodal Civic Triage, Spatial Clustering & Proof-of-Resolution Engine*
**Built for the IDEA//FORGE Online Hackathon (Track 1: Civic Pulse & Digital Governance)**

---

## ⚡ Quick Start (Run in 10 Seconds)

### Option A: Windows Batch (Double-Click)
Double click `run.bat` in this folder.

### Option B: Terminal / PowerShell
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
Open **`http://localhost:8000`** in your browser.

---

## 🔑 Configure Real Gemini 2.0 Flash Vision (Optional)
The system has a built-in intelligent forensic fallback so it runs immediately out-of-the-box even without an API key!
To enable live Google Gemini 2.0 Flash Vision:
1. Open `backend/.env` (or copy from `.env.example`).
2. Set your key: `GEMINI_API_KEY=your_actual_gemini_api_key`.

---

## 🌟 Key Features that Win Judging

1. **Zero-Form Ingestion:** Citizens snap a photo and dictate a voice note in Hindi/English. The Gemini Vision agent automatically extracts the hazard, verifies photo authenticity, and assigns a severity rating (1-10).
2. **Spatial Haversine Deduplication:** 15 citizens reporting the same pothole within 40m are automatically clustered into a single ticket, stopping duplicate spam and elevating community priority.
3. **Statutory Bureaucratic Dispatch:** Automatically generates a formal legal notice addressed to the specific ward executive engineer, citing relevant clauses of the Indian Municipal Corporation Act with an SLA countdown.
4. **AI Proof-of-Resolution (Anti-Corruption Lab):** When a contractor marks a ticket "Fixed", our AI analyzes the "AFTER" photo against the original hazard. If it's a fake/stock photo, it stamps **CONTRACTOR FRAUD FLAGGED** and alerts vigilance.

---

## 📁 Project Architecture
```text
civic-nexus/
├── backend/
│   ├── main.py              # FastAPI app & routing gateway
│   ├── vision_agent.py      # Gemini 2.0 Flash multimodal inspection agent
│   ├── spatial_engine.py    # Haversine distance clustering (40m radius)
│   ├── bureaucracy_agent.py # Legal notice generator & ward jurisdiction router
│   ├── por_auditor.py       # Proof-of-Resolution Before-vs-After auditor
│   ├── database.py          # Storage for incidents & audit reports
│   ├── seed.py              # Metro seed incidents generator
│   ├── requirements.txt     # Python dependencies
│   ├── .env.example         # Environment template
│   └── static/
│       └── index.html       # Full dark-mode Command Center & Citizen PWA UI
├── PITCH_SCRIPT.md          # 2-minute word-for-word demo script & Q&A
├── run.bat                  # One-click Windows launcher
└── run.ps1                  # PowerShell launcher
```
