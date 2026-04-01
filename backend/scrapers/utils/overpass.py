import overpy
import logging

logger = logging.getLogger(__name__)
api = overpy.Overpass()


def get_nearby_amenities(lat: float, lon: float, radius: int = 500):
    """Interroge Overpass pour trouver métros et écoles dans un rayon donné (défaut 500 m).

    Ne doit être appelée qu'une seule fois par annonce et uniquement si lat/lon sont non nulles.
    """
    query = f"""
    [out:json];
    (
      node["railway"="station"](around:{radius},{lat},{lon});
      node["amenity"="school"](around:{radius},{lat},{lon});
    );
    out body;
    """
    try:
        result = api.query(query)
        metros = []
        schools = []
        for node in result.nodes:
            if node.tags.get("railway") == "station":
                metros.append({
                    "name": node.tags.get("name", "Inconnu"),
                    "lat": float(node.lat),
                    "lon": float(node.lon)
                })
            elif node.tags.get("amenity") == "school":
                schools.append({
                    "name": node.tags.get("name", "Inconnu"),
                    "lat": float(node.lat),
                    "lon": float(node.lon)
                })
        return {"metros": metros, "schools": schools}
    except Exception as e:
        logger.error(f"Erreur Overpass : {e}")
        return {"metros": [], "schools": []}
