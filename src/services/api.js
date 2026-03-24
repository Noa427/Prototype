const API_BASE_URL = 'http://localhost:8000';

export const apiRequest = async (endpoint, options = {}) => {
    const user = JSON.parse(localStorage.getItem('aevum_user'));
    const token = user?.access_token;

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (response.status === 401) {
        localStorage.removeItem('aevum_user');
        window.location.href = '/login';
        return null;
    }

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Une erreur est survenue');
    }

    return response.json();
};

export const login = async (username, password) => {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);

    const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Identifiants incorrects');
    }

    return response.json();
};
