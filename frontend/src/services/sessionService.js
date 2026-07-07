import api from './api';

export const sessionService = {
  async getSessionState() {
    const response = await api.get('/api/session/state');
    return response.data;
  },

  async next() {
    const response = await api.post('/api/session/next');
    return response.data;
  },

  async previous() {
    const response = await api.post('/api/session/previous');
    return response.data;
  },
};

export default sessionService;
