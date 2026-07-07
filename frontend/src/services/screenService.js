import api from './api';

export const screenService = {
  async getScreens() {
    const response = await api.get('/api/screens');
    return response.data;
  },

  async createScreen(data) {
    const response = await api.post('/api/screens', data);
    return response.data;
  },

  async updateScreen(screenId, data) {
    const response = await api.put(`/api/screens/${screenId}`, data);
    return response.data;
  },

  async deleteScreen(screenId) {
    const response = await api.delete(`/api/screens/${screenId}`);
    return response.data;
  },
};

export default screenService;
