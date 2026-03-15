const express = require('express');
const router = express.Router();
const teaFlavorQualityController = require('../controllers/teaFlavorQualityController');
const { auth } = require('../middleware/auth');

// Get tea flavors list (public)
router.get('/flavors/list', teaFlavorQualityController.getTeaFlavorsList);

// Create quality calculation
router.post('/', auth, teaFlavorQualityController.createCalculation);

// ML-based quality prediction
router.post('/predict', auth, teaFlavorQualityController.predictQuality);

// Get all calculations for user
router.get('/', auth, teaFlavorQualityController.getAllCalculations);

// Get recent calculations
router.get('/recent/list', auth, teaFlavorQualityController.getRecentCalculations);

// Get statistics
router.get('/stats/overview', auth, teaFlavorQualityController.getStatistics);

// Get calculation by ID
router.get('/:id', auth, teaFlavorQualityController.getCalculationById);

// Update calculation
router.put('/:id', auth, teaFlavorQualityController.updateCalculation);

// Delete calculation
router.delete('/:id', auth, teaFlavorQualityController.deleteCalculation);

module.exports = router;
