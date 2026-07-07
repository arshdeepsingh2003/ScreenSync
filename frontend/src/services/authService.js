import api from './api';

export const authService = {
  async login(username, password) {
    const response = await api.post('/api/auth/login', { username, password });
    return response.data;
  },
};

export default authService;
