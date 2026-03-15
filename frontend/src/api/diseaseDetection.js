import api from './axios';

/**
 * Disease Detection API Client
 * Handles all API calls related to tea disease detection
 */

/**
 * Create a new disease detection record
 * @param {Object} detectionData - Detection data
 * @param {string} detectionData.diseaseType - Disease code (BB, RR, RSM, GL)
 * @param {number} detectionData.confidence - Confidence score (0-100)
 * @param {string} detectionData.imagePath - Image path or URL
 * @param {string} detectionData.imageUploadMethod - 'upload' or 'camera'
 * @param {Object} detectionData.location - Optional location data
 * @param {string} detectionData.notes - Optional notes
 * @param {number} detectionData.processingTime - Optional processing time in ms
 */
export const createDetection = async (detectionData) => {
    try {
        const response = await api.post('/disease-detections', detectionData);
        return response.data;
    } catch (error) {
        console.error('Create detection error:', error);
        throw error;
    }
};

/**
 * Get all disease detections with optional filters
 * @param {Object} params - Query parameters
 * @param {string} params.diseaseType - Filter by disease type (BB, RR, RSM, GL, all)
 * @param {string} params.status - Filter by status (pending, treated, healthy, monitoring, all)
 * @param {string} params.startDate - Filter by start date
 * @param {string} params.endDate - Filter by end date
 * @param {number} params.limit - Results per page
 * @param {number} params.page - Page number
 */
export const getAllDetections = async (params = {}) => {
    try {
        const response = await api.get('/disease-detections', { params });
        return response.data;
    } catch (error) {
        console.error('Get all detections error:', error);
        throw error;
    }
};

/**
 * Get a single detection by ID
 * @param {string} id - Detection ID
 */
export const getDetectionById = async (id) => {
    try {
        const response = await api.get(`/disease-detections/${id}`);
        return response.data;
    } catch (error) {
        console.error('Get detection by ID error:', error);
        throw error;
    }
};

/**
 * Update a disease detection record
 * @param {string} id - Detection ID
 * @param {Object} updateData - Data to update
 * @param {string} updateData.status - Status (pending, treated, healthy, monitoring)
 * @param {string} updateData.notes - Notes
 * @param {Object} updateData.treatmentPlan - Treatment plan data
 */
export const updateDetection = async (id, updateData) => {
    try {
        const response = await api.put(`/disease-detections/${id}`, updateData);
        return response.data;
    } catch (error) {
        console.error('Update detection error:', error);
        throw error;
    }
};

/**
 * Delete a disease detection record
 * @param {string} id - Detection ID
 */
export const deleteDetection = async (id) => {
    try {
        const response = await api.delete(`/disease-detections/${id}`);
        return response.data;
    } catch (error) {
        console.error('Delete detection error:', error);
        throw error;
    }
};

/**
 * Get detection statistics
 * @param {Object} params - Query parameters
 * @param {string} params.startDate - Start date for statistics
 * @param {string} params.endDate - End date for statistics
 * @param {string} params.userId - User ID to filter statistics
 */
export const getStatistics = async (params = {}) => {
    try {
        const response = await api.get('/disease-detections/statistics/summary', { params });
        return response.data;
    } catch (error) {
        console.error('Get statistics error:', error);
        throw error;
    }
};

/**
 * Mark a detection as treated
 * @param {string} id - Detection ID
 */
export const markAsTreated = async (id) => {
    try {
        const response = await api.patch(`/disease-detections/${id}/treat`);
        return response.data;
    } catch (error) {
        console.error('Mark as treated error:', error);
        throw error;
    }
};

/**
 * Create a treatment plan for a detection
 * @param {string} id - Detection ID
 * @param {string} planDetails - Treatment plan details
 */
export const createTreatmentPlan = async (id, planDetails) => {
    try {
        const response = await api.post(`/disease-detections/${id}/treatment-plan`, { 
            planDetails 
        });
        return response.data;
    } catch (error) {
        console.error('Create treatment plan error:', error);
        throw error;
    }
};

/**
 * Get recent detections for sidebar/dashboard widgets
 * @param {number} limit - Number of recent detections to retrieve
 */
export const getRecentDetections = async (limit = 10) => {
    try {
        const response = await api.get('/disease-detections/recent/list', { 
            params: { limit } 
        });
        return response.data;
    } catch (error) {
        console.error('Get recent detections error:', error);
        throw error;
    }
};

/**
 * Get daily statistics (today's scans)
 */
export const getDailyStatistics = async () => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const response = await api.get('/disease-detections/statistics/summary', {
            params: {
                startDate: today.toISOString()
            }
        });
        return response.data;
    } catch (error) {
        console.error('Get daily statistics error:', error);
        throw error;
    }
};

/**
 * Analyze image using AI model via backend
 * Sends image to Python PyTorch model for real disease classification
 * @param {File} imageFile - Image file to analyze
 */
export const analyzeImage = async (imageFile) => {
    try {
        const formData = new FormData();
        formData.append('image', imageFile);

        const response = await api.post('/disease-detections/analyze', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            timeout: 60000, // 60 second timeout for model inference
        });

        return response.data;
    } catch (error) {
        console.error('AI analysis error:', error);
        throw error;
    }
};

export default {
    createDetection,
    getAllDetections,
    getDetectionById,
    updateDetection,
    deleteDetection,
    getStatistics,
    markAsTreated,
    createTreatmentPlan,
    getRecentDetections,
    getDailyStatistics,
    analyzeImage
};
