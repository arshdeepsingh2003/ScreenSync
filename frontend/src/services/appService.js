import api from './api';

export const appService = {
  async getApps() {
    const response = await api.get('/api/apps');
    return response.data;
  },

  async createApp(data) {
    const response = await api.post('/api/apps', data);
    return response.data;
  },

  async updateApp(appId, data) {
    const response = await api.put(`/api/apps/${appId}`, data);
    return response.data;
  },

  async deleteApp(appId) {
    const response = await api.delete(`/api/apps/${appId}`);
    return response.data;
  },

  async activateApp(appId) {
    const response = await api.post(`/api/apps/${appId}/activate`);
    return response.data;
  },
};

export default appService;
