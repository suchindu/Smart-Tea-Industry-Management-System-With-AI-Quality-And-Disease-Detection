const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const {
    createDetection,
    getAllDetections,
    getDetectionById,
    updateDetection,
    deleteDetection,
    getStatistics,
    markAsTreated,
    createTreatmentPlan,
    getRecentDetections,
    analyzeImage
} = require('../controllers/diseaseDetectionController');
const { auth } = require('../middleware/auth');

// Configure multer for temporary image uploads
const uploadDir = path.join(__dirname, '..', 'temp-uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
    dest: uploadDir,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'));
        }
    }
});

// All routes are protected (require authentication)
router.use(auth);

// POST /api/disease-detections/analyze - Analyze image using AI model
router.post('/analyze', upload.single('image'), analyzeImage);

// GET /api/disease-detections/statistics/summary - Get statistics
router.get('/statistics/summary', getStatistics);

// GET /api/disease-detections/recent/list - Get recent detections
router.get('/recent/list', getRecentDetections);

// GET /api/disease-detections - Get all detections (with filters)
// POST /api/disease-detections - Create new detection
router.route('/')
    .get(getAllDetections)
    .post(createDetection);

// GET /api/disease-detections/:id - Get single detection
// PUT /api/disease-detections/:id - Update detection
// DELETE /api/disease-detections/:id - Delete detection
router.route('/:id')
    .get(getDetectionById)
    .put(updateDetection)
    .delete(deleteDetection);

// PATCH /api/disease-detections/:id/treat - Mark as treated
router.patch('/:id/treat', markAsTreated);

// POST /api/disease-detections/:id/treatment-plan - Create treatment plan
router.post('/:id/treatment-plan', createTreatmentPlan);

module.exports = router;
