import axios from 'axios';

const API_BASE_URL = '/api/tea-flavor-quality';

// Create quality calculation
export async function createCalculation(data) {
  try {
    const response = await axios.post(`${API_BASE_URL}`, data);
    return response.data;
  } catch (error) {
    throw error;
  }
}

// Get all calculations for user
export async function getAllCalculations(params = {}) {
  try {
    const response = await axios.get(`${API_BASE_URL}`, { params });
    return response.data;
  } catch (error) {
    throw error;
  }
}

// Get calculation by ID
export async function getCalculationById(id) {
  try {
    const response = await axios.get(`${API_BASE_URL}/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
}

// Update calculation (notes and status)
export async function updateCalculation(id, data) {
  try {
    const response = await axios.put(`${API_BASE_URL}/${id}`, data);
    return response.data;
  } catch (error) {
    throw error;
  }
}

// Delete calculation
export async function deleteCalculation(id) {
  try {
    const response = await axios.delete(`${API_BASE_URL}/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
}

// Get statistics
export async function getStatistics(days = 30) {
  try {
    const response = await axios.get(`${API_BASE_URL}/stats/overview`, {
      params: { days }
    });
    return response.data;
  } catch (error) {
    throw error;
  }
}

// Get recent calculations
export async function getRecentCalculations(limit = 5) {
  try {
    const response = await axios.get(`${API_BASE_URL}/recent/list`, {
      params: { limit }
    });
    return response.data;
  } catch (error) {
    throw error;
  }
}

// ML-based quality prediction
export async function predictTeaQuality(data) {
  try {
    const response = await axios.post(`${API_BASE_URL}/predict`, data);
    return response.data;
  } catch (error) {
    throw error;
  }
}

// Get tea flavors list
export async function getTeaFlavorsList() {
  try {
    const response = await axios.get(`${API_BASE_URL}/flavors/list`);
    return response.data;
  } catch (error) {
    throw error;
  }
}

export default {
  createCalculation,
  getAllCalculations,
  getCalculationById,
  updateCalculation,
  deleteCalculation,
  getStatistics,
  getRecentCalculations,
  getTeaFlavorsList,
  predictTeaQuality
};
