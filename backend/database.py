"""
CIVIC-NEXUS Database & In-Memory Store
Works natively with or without Pydantic.
"""
from datetime import datetime
from typing import Dict, List, Optional, Any

class IncidentStore:
    def __init__(self):
        self._incidents: List[Dict[str, Any]] = []

    def add(self, incident: Dict[str, Any]) -> Dict[str, Any]:
        self._incidents.append(incident)
        return incident

    def get_all(self) -> List[Dict[str, Any]]:
        return sorted(self._incidents, key=lambda x: x.get("severity_score", 0), reverse=True)

    def get_by_id(self, incident_id: str) -> Optional[Dict[str, Any]]:
        for inc in self._incidents:
            if inc["id"] == incident_id:
                return inc
        return None

    def update(self, incident_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        for inc in self._incidents:
            if inc["id"] == incident_id:
                inc.update(updates)
                return inc
        return None

    def count(self) -> int:
        return len(self._incidents)

    def clear(self):
        self._incidents.clear()

db = IncidentStore()
