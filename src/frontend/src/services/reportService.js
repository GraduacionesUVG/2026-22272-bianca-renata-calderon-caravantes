import api from './api';

const REPORT_TYPES = [
  { value: 'inappropriate_content', label: 'Contenido Inapropiado' },
  { value: 'harassment', label: 'Acoso' },
  { value: 'spam', label: 'Spam' },
  { value: 'misinformation', label: 'Desinformación' },
  { value: 'other', label: 'Otro' },
];

/**
 * Crear un reporte para una publicación
 * @param {string} postId - ID de la publicación
 * @param {string} reportType - Tipo de reporte
 * @param {string} description - Descripción del reporte
 * @returns {Promise<object>} - Respuesta del servidor
 */
export const createReport = async (postId, reportType, description) => {
  return api.post('/reports', {
    post_id: postId,
    report_type: reportType,
    description,
  });
};

export default {
  REPORT_TYPES,
  createReport,
};
