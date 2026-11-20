"""
CIVIC-NEXUS Spatial Deduplication & Priority Amplification Engine
Uses the Haversine Great-Circle metric to mathematically group
hyper-local reports, eliminate bureaucratic duplicate spam, and
dynamically amplify community priority scores.
"""
import math
from typing import List, Dict, Any, Optional, Tuple

def haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Computes exact geodesic distance between two coordinate pairs in meters.
    """
    R = 6371000.0  # Earth's mean radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2))
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

def find_spatial_cluster(
    latitude: float,
    longitude: float,
    category: str,
    existing_incidents: List[Dict[str, Any]],
    cluster_radius_meters: float = 40.0
) -> Optional[Tuple[Dict[str, Any], float]]:
    """
    Checks if a reported hazard is physically co-located with an existing open hazard
    within cluster_radius_meters. Returns the matching incident and distance if found.
    """
    for incident in existing_incidents:
        # Only cluster active/open incidents
        if incident.get("status") in ["RESOLVED_VERIFIED"]:
            continue
            
        # Match same category
        if incident.get("category") == category:
            dist = haversine_distance_meters(
                latitude, longitude,
                incident["latitude"], incident["longitude"]
            )
            if dist <= cluster_radius_meters:
                return incident, round(dist, 1)

    return None
