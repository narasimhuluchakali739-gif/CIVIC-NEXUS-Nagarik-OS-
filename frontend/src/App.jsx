import { useEffect, useMemo, useRef, useState } from 'react'
import { BadgeCheck, CircleHelp, LocateFixed, MapPin, Mic, Navigation, Plus, Radio, ScanLine, ShieldCheck, Siren, Upload, Waves, X } from 'lucide-react'
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const initialCenter = [12.9716, 77.5946]
const filters = ['All', 'Critical Hazards', 'Roads', 'Water/Drainage', 'Sanitation']

function severityColor(n, status) { return ['resolved', 'resolved_verified'].includes(status?.toLowerCase()) ? '#34d399' : n >= 8 ? '#fb5265' : n >= 5 ? '#f6b94b' : '#4ea1ff' }
function pinIcon(item) {
  const color = severityColor(item.severity, item.status)
  return L.divIcon({ className: 'map-pin-wrap', html: `<span class="map-pin" style="--pin:${color}"><i></i></span>`, iconSize: [28, 34], iconAnchor: [14, 30] })
}
function FitMap({ incidents }) {
  const map = useMap()
  useEffect(() => { if (incidents.length) map.fitBounds(incidents.map(i => [i.latitude, i.longitude]), { padding: [55, 55], maxZoom: 15 }) }, [incidents, map])
  return null
}

function App() {
  const [tab, setTab] = useState('report')
  const [incidents, setIncidents] = useState([])
  const [filter, setFilter] = useState('All')
  const [selected, setSelected] = useState(null)
  const [image, setImage] = useState(null)
  const [preview, setPreview] = useState('')
  const [coords, setCoords] = useState(null)
  const [transcript, setTranscript] = useState('')
  const [listening, setListening] = useState(false)
  const [language, setLanguage] = useState('en-IN')
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState('')
  const [result, setResult] = useState(null)
  const [apiState, setApiState] = useState('connecting')
  const [now, setNow] = useState(Date.now())
  const [auditIncidentId, setAuditIncidentId] = useState('')
  const [afterImage, setAfterImage] = useState(null)
  const [afterPreview, setAfterPreview] = useState('')
  const [auditing, setAuditing] = useState(false)
  const [auditResult, setAuditResult] = useState(null)
  const [auditMessage, setAuditMessage] = useState('')
  const auditFileRef = useRef(null)
  const recognitionRef = useRef(null)
  const fileRef = useRef(null)

  const loadIncidents = async () => {
    try {
      const [health, response] = await Promise.all([fetch(`${API}/api/v1/health`), fetch(`${API}/api/v1/incidents`)] )
      if (!health.ok || !response.ok) throw new Error('API unavailable')
      setIncidents(await response.json()); setApiState('live')
    } catch { setApiState('offline') }
  }
  useEffect(() => { loadIncidents(); const timer = window.setInterval(loadIncidents, 12000); return () => window.clearInterval(timer) }, [])
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer) }, [])
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])
  useEffect(() => () => { if (afterPreview) URL.revokeObjectURL(afterPreview) }, [afterPreview])

  const filtered = useMemo(() => incidents.filter(i => {
    if (filter === 'Critical Hazards') return i.severity >= 8 && i.status?.toLowerCase() !== 'resolved'
    if (filter === 'Roads') return /road|pothole|street/i.test(i.category)
    if (filter === 'Water/Drainage') return /water|drain|sewer|flood/i.test(i.category)
    if (filter === 'Sanitation') return /garbage|waste|sanitation|litter/i.test(i.category)
    return true
  }), [incidents, filter])
  const criticalCount = incidents.filter(i => i.severity >= 8 && i.status?.toLowerCase() !== 'resolved').length
  const resolvedCount = incidents.filter(i => i.status?.toLowerCase() === 'resolved').length
  const slaCountdown = incident => {
    const deadline = new Date(new Date(incident.timestamp).getTime() + incident.sla_hours * 3600000).getTime()
    const remaining = Math.max(0, deadline - now)
    const hours = Math.floor(remaining / 3600000)
    const minutes = Math.floor((remaining % 3600000) / 60000)
    const seconds = Math.floor((remaining % 60000) / 1000)
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }
  const wardName = incident => incident.responsible_dept.split(' - ').slice(1).join(' - ') || 'Ward routing pending'
  const auditIncident = incidents.find(i => i.id === auditIncidentId) || null
  const auditCandidates = incidents.filter(i => i.status?.toLowerCase() !== 'resolved_verified')

  const chooseImage = file => {
    if (!file) return
    if (!file.type.startsWith('image/')) { setNotice('Choose an image file to start an inspection.'); return }
    if (file.size > 10 * 1024 * 1024) { setNotice('Image must be smaller than 10 MB.'); return }
    setImage(file); setPreview(URL.createObjectURL(file)); setResult(null); setNotice('')
  }
  const detectGPS = () => {
    if (!navigator.geolocation) { setNotice('Location is not available in this browser.'); return }
    setNotice('Requesting your location…')
    navigator.geolocation.getCurrentPosition(({ coords: c }) => { setCoords({ lat: c.latitude, lng: c.longitude }); setNotice('Location locked and ready.') }, e => setNotice(e.code === 1 ? 'Location permission was denied. You can still choose to report after enabling it.' : 'Could not determine your location. Please try again.'), { enableHighAccuracy: true, timeout: 12000 })
  }
  const toggleVoice = () => {
    const Speech = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!Speech) { setNotice('Speech recognition is unavailable. Type your grievance in the note field.'); return }
    if (listening) { recognitionRef.current?.stop(); setListening(false); return }
    const recognition = new Speech(); recognition.lang = language; recognition.interimResults = true; recognition.continuous = true
    recognition.onresult = event => setTranscript(Array.from(event.results).map(r => r[0].transcript).join(' '))
    recognition.onerror = () => { setListening(false); setNotice('Voice capture stopped. You can edit the transcript below.') }
    recognition.onend = () => setListening(false)
    recognitionRef.current = recognition; setListening(true); setNotice(`Listening in ${language === 'hi-IN' ? 'Hindi' : 'English'}…`); recognition.start()
  }
  const submit = async e => {
    e.preventDefault(); setNotice('')
    if (!image) { setNotice('Add a photo of the hazard to continue.'); return }
    if (!coords) { setNotice('Detect your GPS location before submitting.'); return }
    const form = new FormData(); form.append('image', image); form.append('lat', String(coords.lat)); form.append('lng', String(coords.lng)); if (transcript.trim()) form.append('voice_transcript', transcript.trim())
    setSubmitting(true); setResult(null)
    try {
      const response = await fetch(`${API}/api/v1/report`, { method: 'POST', body: form })
      const body = await response.json()
      if (!response.ok) throw new Error(body.detail?.reason || body.detail || 'Inspection could not be completed.')
      setResult(body); setNotice(body.status === 'CLUSTERED' ? 'Added your support to an existing neighborhood report.' : 'Report submitted and routed for municipal triage.')
      loadIncidents()
    } catch (err) { setNotice(typeof err.message === 'string' ? err.message : 'Could not reach the civic reporting service.') }
    finally { setSubmitting(false) }
  }
  const chooseAfterImage = file => {
    if (!file) return
    if (!file.type.startsWith('image/')) { setAuditMessage('Choose an image file for contractor proof.'); return }
    if (file.size > 10 * 1024 * 1024) { setAuditMessage('Proof image must be smaller than 10 MB.'); return }
    setAfterImage(file); setAfterPreview(URL.createObjectURL(file)); setAuditResult(null); setAuditMessage('')
  }
  const runAudit = async () => {
    if (!auditIncident) { setAuditMessage('Select an incident with an original citizen photo.'); return }
    if (!afterImage) { setAuditMessage('Upload the contractor after photo first.'); return }
    const form = new FormData(); form.append('after_image', afterImage)
    setAuditing(true); setAuditResult(null); setAuditMessage('Comparing landmarks, scene consistency and repair quality…')
    try {
      const response = await fetch(`${API}/api/v1/verify-resolution/${encodeURIComponent(auditIncident.id)}`, { method: 'POST', body: form })
      const body = await response.json()
      if (!response.ok) throw new Error(typeof body.detail === 'string' ? body.detail : 'Forensic audit could not be completed.')
      setAuditResult(body); setAuditMessage('Audit complete. Incident status and command map have been updated.'); await loadIncidents()
    } catch (err) { setAuditMessage(err.message || 'Could not reach the forensic audit service.') }
    finally { setAuditing(false) }
  }

  return <div className="app-shell">
    <header className="topbar">
      <a className="brand" href="#home" aria-label="CIVIC-NEXUS home"><span className="brand-mark"><Navigation size={18} /></span><span><b>CIVIC<span>-</span>NEXUS</b><small>URBAN RESPONSE NETWORK</small></span></a>
      <div className="topbar-right"><span className={`connection ${apiState}`}><i />{apiState === 'live' ? 'SYSTEM LIVE' : apiState === 'offline' ? 'API OFFLINE' : 'CONNECTING'}</span><span className="top-divider"/><button className="icon-button help-button" aria-label="Help"><CircleHelp size={18}/></button><div className="avatar">CN</div></div>
    </header>
    <main id="home">
      <section className="hero-row"><div><div className="eyebrow"><span className="eyebrow-line"/>CITY OPERATIONS <span className="eyebrow-dot">/</span> BENGALURU PILOT</div><h1>Every report moves<br/><span>the city forward.</span></h1><p className="hero-copy">One clear signal can change a whole neighborhood.<br className="desktop-break"/> Report a hazard or coordinate the response.</p></div>
        <div className="stats-strip"><div className="stat"><span>ACTIVE REPORTS</span><strong>{String(incidents.length - resolvedCount).padStart(2,'0')}</strong></div><div className="stat"><span>CRITICAL</span><strong className="text-red">{String(criticalCount).padStart(2,'0')}<i className="pulse-dot"/></strong></div><div className="stat"><span>RESOLVED</span><strong className="text-green">{String(resolvedCount).padStart(2,'0')}</strong></div></div>
      </section>
      <nav className="tabbar" aria-label="Main sections"><button onClick={() => setTab('report')} className={tab === 'report' ? 'active' : ''}><span className="tab-number">01</span> CITIZEN INSTANT REPORT</button><button onClick={() => setTab('command')} className={tab === 'command' ? 'active' : ''}><span className="tab-number">02</span> CITY HEATMAP &amp; LIVE TRIAGE <span className="live-tag"><Radio size={11}/> LIVE</span></button><button onClick={() => setTab('audit')} className={tab === 'audit' ? 'active' : ''}><span className="tab-number">03</span> ANTI-CORRUPTION AUDIT LAB</button></nav>
      {tab === 'report' ? <section className="report-layout">
        <div className="report-intro"><div className="section-kicker">01 <span> / CITIZEN PORTAL</span></div><h2>See something<br/>that needs fixing?</h2><p>Help your city respond faster. Add a photo, pin the location, and we’ll route it to the right team.</p><div className="privacy-note"><ShieldCheck size={16}/><span>Location is only used to route your report.</span></div><div className="steps"><div className="step active"><i>1</i><span>CAPTURE</span></div><span className="step-line"/><div className="step"><i>2</i><span>PINPOINT</span></div><span className="step-line"/><div className="step"><i>3</i><span>SUBMIT</span></div></div></div>
        <form className="report-card" onSubmit={submit}>
          <div className="card-heading"><div><span className="micro-label">NEW INCIDENT</span><h3>Citizen report</h3></div><span className="secure-chip"><ShieldCheck size={13}/> SECURE</span></div>
          <div className={`upload-zone ${preview ? 'has-image' : ''}`} onClick={() => !preview && fileRef.current?.click()} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); chooseImage(e.dataTransfer.files[0]) }}>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={e => chooseImage(e.target.files[0])}/>
            {preview ? <><img src={preview} alt="Selected civic hazard"/><div className="image-overlay"><span><ShieldCheck size={14}/> PHOTO READY FOR INSPECTION</span><button type="button" onClick={e => { e.stopPropagation(); setImage(null); setPreview(''); setResult(null) }} aria-label="Remove photo"><X size={15}/></button></div></> : <><div className="upload-icon"><Upload size={19}/></div><b>Drop a photo of the issue</b><span>or tap to open your camera</span><small>JPG, PNG · MAX 10 MB</small></>}
          </div>
          <div className="action-row"><button type="button" className={`secondary-action ${coords ? 'is-ready' : ''}`} onClick={detectGPS}><LocateFixed size={16}/><span>{coords ? 'LOCATION LOCKED' : 'DETECT MY GPS'}</span>{coords && <i className="ready-dot"/>}</button><button type="button" className={`secondary-action voice-action ${listening ? 'recording' : ''}`} onClick={toggleVoice}><Mic size={16}/><span>{listening ? 'LISTENING…' : 'VOICE GRIEVANCE'}</span><select aria-label="Voice language" value={language} onClick={e => e.stopPropagation()} onChange={e => setLanguage(e.target.value)}><option value="en-IN">EN</option><option value="hi-IN">HI</option></select></button></div>
          {(transcript || listening) && <label className="transcript-box"><span>VOICE TRANSCRIPT <span>{language === 'hi-IN' ? 'HINDI' : 'ENGLISH'}</span></span><textarea rows="2" value={transcript} onChange={e => setTranscript(e.target.value)} placeholder="Speak your grievance or edit the transcript…"/></label>}
          <div className="inspection-card"><div className="inspection-head"><div className="inspection-icon"><Siren size={15}/></div><div><b>AI INSPECTION</b><small>{result ? 'INSPECTION COMPLETE' : image ? 'READY WHEN YOU SUBMIT' : 'AWAITING PHOTO'}</small></div><span className={`inspection-status ${result ? 'done' : ''}`}><i/>{result ? 'ASSESSED' : 'STANDBY'}</span></div>
            {result?.incident ? <div className="inspection-result"><div className="result-main"><div><span className="micro-label">DETECTED CATEGORY</span><strong>{result.incident.category}</strong></div><div className="severity-block"><span className="micro-label">SEVERITY</span><b className={result.incident.severity >= 8 ? 'text-red' : ''}>{result.incident.severity}<small>/10</small></b></div></div><div className="gauge"><i style={{ width: `${result.incident.severity * 10}%`, background: severityColor(result.incident.severity) }}/></div><div className="result-meta"><span><Waves size={13}/> SLA {result.incident.sla_hours}H <b className="countdown">{slaCountdown(result.incident)}</b></span><span className="ward-badge"><MapPin size={13}/> {wardName(result.incident)}</span></div></div> : <div className="inspection-empty"><div className="empty-gauge"><span>—<small>/10</small></span></div><div><b>Waiting for visual evidence</b><small>Category, severity and response window appear after submission.</small></div></div>}
          </div>
          {notice && <div className={`notice ${notice.includes('could not') || notice.includes('denied') || notice.includes('exceeds') || notice.includes('Choose') ? 'error' : ''}`} role="status">{notice}</div>}
          <button type="submit" className="submit-button" disabled={submitting}>{submitting ? <><span className="spinner"/> INSPECTING IMAGE…</> : <>{result ? 'SUBMIT ANOTHER REPORT' : 'SUBMIT FOR INSPECTION'} <span>→</span></>}</button>
          <p className="fineprint">By submitting, you confirm this report reflects a real civic issue.</p>
        </form>
        <aside className="side-note"><span className="side-line"/><span>BUILT FOR<br/>BETTER STREETS.</span><small>Small actions.<br/>Measurable change.</small></aside>
      </section> : tab === 'command' ? <section className="command-layout">
        <div className="command-head"><div><div className="section-kicker">02 <span> / MUNICIPAL COMMAND</span></div><h2>City heatmap <span>&amp; live triage</span></h2><p>Monitor citizen reports and prioritize the response across the city.</p></div><button className="refresh-button" onClick={loadIncidents}><Radio size={15}/> LIVE FEED <span className="refresh-divider"/>{new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</button></div>
        <div className="map-toolbar"><div className="filter-list">{filters.map(f => <button key={f} className={filter === f ? 'selected' : ''} onClick={() => setFilter(f)}>{f === 'Critical Hazards' && <i className="filter-red-dot"/>}{f}</button>)}</div><div className="map-legend"><span><i className="legend-red"/> CRITICAL</span><span><i className="legend-amber"/> ELEVATED</span><span><i className="legend-green"/> RESOLVED</span></div></div>
        <div className="map-frame"><MapContainer center={initialCenter} zoom={12} scrollWheelZoom className="leaflet-map"><TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"/><FitMap incidents={filtered}/>{filtered.map(i => <Marker key={i.id} position={[i.latitude, i.longitude]} icon={pinIcon(i)} eventHandlers={{ click: () => setSelected(i) }}/>)}</MapContainer>
          <div className="map-overlay-top"><span><span className="small-live-dot"/> LIVE CITY GRID</span><span>{filtered.length} REPORT{filtered.length === 1 ? '' : 'S'} IN VIEW</span></div>
          <div className="map-overlay-bottom"><div><span>ACTIVE AREA</span><b>Bengaluru, Karnataka</b></div><button onClick={() => { setFilter('All'); if (filtered.length) setSelected(null) }}><LocateFixed size={14}/> RESET VIEW</button></div>
          {filtered.length === 0 && <div className="map-empty"><MapPin size={20}/><b>No reports in this filter</b><span>New incidents appear here after citizen submission.</span></div>}
        </div>
        <div className="triage-footer"><span><i className="pulse-dot"/> REFRESHES EVERY 12 SECONDS</span><span>SELECT A PIN TO REVIEW INCIDENT DETAILS</span><span>DATA VIA CIVIC-NEXUS API</span></div>
      </section> : <section className="audit-layout">
        <div className="command-head audit-heading"><div><div className="section-kicker">03 <span> / PROOF-OF-RESOLUTION</span></div><h2>Anti-corruption <span>audit lab</span></h2><p>Compare the original hazard with contractor proof. AI checks scene continuity and visible repair quality.</p></div><span className="audit-protocol"><ShieldCheck size={15}/> FORENSIC REVIEW PROTOCOL</span></div>
        <div className="audit-controls"><label><span className="micro-label">INCIDENT TO VERIFY</span><select value={auditIncidentId} onChange={e => { setAuditIncidentId(e.target.value); setAuditResult(null); setAuditMessage('') }}><option value="">Select an incident…</option>{auditCandidates.map(i => <option key={i.id} value={i.id}>{i.category} · SEV {i.severity} · {i.id.slice(0, 8)}</option>)}</select></label><div className="audit-hint"><ScanLine size={15}/> Verify location continuity and workmanship before resolution.</div></div>
        <div className="audit-comparison">
          <div className="evidence-panel"><div className="evidence-head"><span className="evidence-index">A</span><div><b>BEFORE</b><small>ORIGINAL CITIZEN EVIDENCE</small></div><span className="evidence-lock"><ShieldCheck size={12}/> IMMUTABLE</span></div><div className="evidence-photo">{auditIncident?.image_base64 ? <img src={`data:image/jpeg;base64,${auditIncident.image_base64}`} alt="Original hazard report"/> : <div className="evidence-empty"><MapPin size={20}/><b>{auditIncident ? 'No original photo on record' : 'Select an incident to load its original photo'}</b></div>}</div><div className="evidence-caption">{auditIncident ? <><span>{auditIncident.category}</span><small>{auditIncident.latitude.toFixed(5)}, {auditIncident.longitude.toFixed(5)}</small></> : <><span>AWAITING INCIDENT</span><small>Original evidence appears here</small></>}</div></div>
          <div className="audit-connector"><span>VS</span><i/></div>
          <div className="evidence-panel after-panel"><div className="evidence-head"><span className="evidence-index after-index">B</span><div><b>AFTER</b><small>CONTRACTOR REPAIR PROOF</small></div><span className="evidence-lock pending-lock"><Upload size={12}/> SUBMITTED</span></div><div className={`evidence-photo after-photo ${auditing ? 'scanning' : ''}`} onClick={() => !afterPreview && auditFileRef.current?.click()} onDragOver={e => e.preventDefault()} onDrop={e => {e.preventDefault(); chooseAfterImage(e.dataTransfer.files[0])}}><input ref={auditFileRef} type="file" accept="image/*" capture="environment" hidden onChange={e => chooseAfterImage(e.target.files[0])}/>{afterPreview ? <img src={afterPreview} alt="Contractor repair proof"/> : <div className="evidence-empty"><Upload size={20}/><b>Drop or select the repair photo</b><small>JPG, PNG · MAX 10 MB</small></div>}{auditing && <div className="scan-beam"><i/></div>}{afterPreview && !auditing && <button type="button" className="replace-proof" onClick={e => {e.stopPropagation(); setAfterImage(null); setAfterPreview(''); setAuditResult(null)}}><X size={13}/> REPLACE PHOTO</button>}</div><div className="evidence-caption"><span>{afterImage ? afterImage.name : 'CONTRACTOR EVIDENCE REQUIRED'}</span><small>{afterImage ? `${(afterImage.size / 1024 / 1024).toFixed(2)} MB · READY TO SCAN` : 'Upload a clear after photo'}</small></div></div>
        </div>
        <div className="audit-action-row"><div className="audit-assurance"><ShieldCheck size={15}/><span>Audit verdicts are stored with the incident record for review.</span></div><button className="run-audit-button" onClick={runAudit} disabled={auditing}>{auditing ? <><span className="spinner"/> RUNNING FORENSIC SCAN…</> : <><ScanLine size={16}/> RUN FORENSIC AUDIT <span>→</span></>}</button></div>
        {(auditMessage || auditResult) && <div className={`audit-outcome ${auditResult ? auditResult.verdict === 'VERIFIED_SATISFACTORY' ? 'verified' : 'rejected' : ''}`} role="status">{auditResult ? <><div className={`verdict-stamp ${auditResult.verdict === 'VERIFIED_SATISFACTORY' ? 'stamp-green' : 'stamp-red'}`}><BadgeCheck size={22}/><span>{auditResult.verdict.replaceAll('_', ' ')}</span></div><div className="verdict-copy"><b>{auditResult.verdict === 'VERIFIED_SATISFACTORY' ? 'REPAIR VERIFIED' : auditResult.verdict === 'FRAUD_FLAGGED' ? 'FRAUD ALERT - SEVERITY 10' : 'REPAIR CLAIM REJECTED'}</b><p>{auditResult.forensic_notes}</p><small>AI CONFIDENCE: {auditResult.confidence}% · INCIDENT STATUS: {auditResult.status}</small></div></> : <span>{auditMessage}</span>}</div>}
      </section>}
      <footer className="footer"><span>© 2026 CIVIC-NEXUS <i/> BUILT FOR THE PUBLIC GOOD</span><span>FIELD OPERATIONS <b>●</b> {apiState === 'live' ? 'CONNECTED' : apiState === 'offline' ? 'DISCONNECTED' : 'CONNECTING'}</span></footer>
    </main>
    {selected && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setSelected(null) }}><article className="incident-modal"><header><div><span className="micro-label">INCIDENT REFERENCE</span><h3>{selected.id}</h3></div><button className="icon-button" onClick={() => setSelected(null)} aria-label="Close incident"><X size={18}/></button></header><div className="modal-image">{selected.image_base64 ? <img src={`data:image/jpeg;base64,${selected.image_base64}`} alt="Citizen submitted issue"/> : <div><MapPin size={20}/> PHOTO NOT ATTACHED</div>}<span className="severity-pill" style={{'--pin': severityColor(selected.severity, selected.status)}}>{selected.status?.toUpperCase()} · SEV {selected.severity}/10</span></div><div className="modal-grid"><div><span className="micro-label">CATEGORY</span><b>{selected.category}</b></div><div><span className="micro-label">CITIZEN SUPPORT</span><b>{selected.upvote_count + 1} reports</b></div><div><span className="micro-label">RESPONSIBLE WARD</span><b>{selected.responsible_dept}</b></div><div><span className="micro-label">RESPONSE SLA</span><b>{selected.sla_hours} hours</b></div></div><div className="legal-notice"><span><ShieldCheck size={14}/> DRAFTED LEGAL NOTICE</span><p>{selected.escalation_notice || selected.legal_bylaw}</p></div><div className="modal-coords"><MapPin size={14}/> {selected.latitude.toFixed(5)}, {selected.longitude.toFixed(5)}<time>{new Date(selected.timestamp).toLocaleString('en-IN')}</time></div></article></div>}
  </div>
}

export default App
