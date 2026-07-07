import api from './api';

export const settingsService = {
  async getSettings() {
    const response = await api.get('/api/settings');
    return response.data;
  },

  async updateSettings(data) {
    const response = await api.put('/api/settings', data);
    return response.data;
  },
};

export default settingsService;
