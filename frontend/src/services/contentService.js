import api from './api';

export const contentService = {
  async getSlides(appId) {
    const response = await api.get(`/api/apps/${appId}/contents`);
    return response.data;
  },

  async createSlide(appId, data) {
    const response = await api.post(`/api/apps/${appId}/contents`, data);
    return response.data;
  },

  async updateSlide(contentId, data) {
    const response = await api.put(`/api/contents/${contentId}`, data);
    return response.data;
  },

  async deleteSlide(contentId) {
    const response = await api.delete(`/api/contents/${contentId}`);
    return response.data;
  },

  async reorderSlides(appId, orderedIds) {
    const response = await api.patch(`/api/apps/${appId}/contents/reorder`, {
      ordered_ids: orderedIds,
    });
    return response.data;
  },

  async importPdf(appId, formData) {
    const response = await api.post(`/api/apps/${appId}/contents/import_pdf`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

export default contentService;
