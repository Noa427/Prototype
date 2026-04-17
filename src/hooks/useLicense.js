import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const LICENSE_KEY = import.meta.env.VITE_LICENSE_KEY || null;
const HEARTBEAT_INTERVAL = 5 * 60 * 1000; // 5 min

export function useLicense() {
    const [status, setStatus] = useState(LICENSE_KEY ? 'checking' : 'no_key');
    const [agencyName, setAgencyName] = useState(null);
    const [error, setError] = useState(null);

    const beat = useCallback(async () => {
        if (!LICENSE_KEY) return;
        try {
            const { data } = await api.post('/api/license/heartbeat', { license_key: LICENSE_KEY });
            setStatus(data.status);
            setAgencyName(data.agency_name);
            setError(null);
        } catch (e) {
            // Ne pas bloquer sur erreur réseau passagère
            setError(e?.response?.data?.detail || 'Erreur heartbeat');
        }
    }, []);

    useEffect(() => {
        beat();
        const id = setInterval(beat, HEARTBEAT_INTERVAL);
        return () => clearInterval(id);
    }, [beat]);

    return { status, agencyName, error, isBlocked: status === 'suspended' || status === 'revoked' };
}
