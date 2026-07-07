import api from './api';

export const uploadService = {
  async uploadFile(file, bucket) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bucket', bucket);

    const response = await api.post('/api/uploads', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

export default uploadService;
