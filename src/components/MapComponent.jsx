import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon in Leaflet with React
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const FitBounds = ({ deals }) => {
    const map = useMap();

    useEffect(() => {
        if (deals && deals.length > 0) {
            const points = deals
                .filter(d => d.latitude && d.longitude)
                .map(d => [d.latitude, d.longitude]);

            if (points.length > 0) {
                const bounds = L.latLngBounds(points);
                map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
            }
        }
    }, [deals, map]);

    return null;
};

export const MapComponent = ({ deals, onMarkerClick }) => {
    const validDeals = deals.filter(d => d.latitude && d.longitude);

    return (
        <div className="w-full h-[400px] rounded-xl overflow-hidden border border-white/10 shadow-2xl relative z-0">
            <MapContainer
                center={[48.8566, 2.3522]}
                zoom={12}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={true}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {validDeals.map(deal => (
                    <Marker
                        key={deal.id}
                        position={[deal.latitude, deal.longitude]}
                        eventHandlers={{
                            click: () => onMarkerClick && onMarkerClick(deal)
                        }}
                    >
                        <Popup>
                            <div className="p-1">
                                <h4 className="font-bold text-sm">{deal.title}</h4>
                                <p className="text-xs">{deal.price}</p>
                                <p className="text-xs text-green-600 font-bold">{deal.yield}</p>
                            </div>
                        </Popup>
                    </Marker>
                ))}
                <FitBounds deals={deals} />
            </MapContainer>
        </div>
    );
};

export default MapComponent;
