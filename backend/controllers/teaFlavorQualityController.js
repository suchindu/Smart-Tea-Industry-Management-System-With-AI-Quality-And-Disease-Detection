const TeaFlavorQualityCalculation = require('../models/TeaFlavorQualityCalculation');
const mongoose = require('mongoose');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Tea flavor standards and configurations
const TEA_FLAVORS = [
  {
    value: 'black_tea',
    label: 'Black Tea Powder',
    basePrice: 28000,
    standards: {
      particleSize: [80, 100],
      moisture: [3, 5],
      color: [50, 70],
      aroma: [7, 10],
      taste: [8, 10],
      solubility: [92, 98],
      caffeine: [3.5, 4.5],
      fineness: [85, 95]
    }
  },
  {
    value: 'green_tea',
    label: 'Green Tea Powder',
    basePrice: 32000,
    standards: {
      particleSize: [85, 105],
      moisture: [2, 4],
      color: [75, 95],
      aroma: [8, 10],
      taste: [7, 9],
      solubility: [94, 99],
      caffeine: [2.0, 3.5],
      fineness: [90, 99]
    }
  },
  {
    value: 'oolong',
    label: 'Oolong Tea Powder',
    basePrice: 35000,
    standards: {
      particleSize: [90, 110],
      moisture: [4, 6],
      color: [60, 80],
      aroma: [8, 10],
      taste: [8, 10],
      solubility: [90, 96],
      caffeine: [2.5, 3.5],
      fineness: [80, 92]
    }
  },
  {
    value: 'white_tea',
    label: 'White Tea Powder',
    basePrice: 40000,
    standards: {
      particleSize: [75, 95],
      moisture: [2, 4],
      color: [95, 100],
      aroma: [7, 9],
      taste: [6, 8],
      solubility: [96, 99],
      caffeine: [1.5, 2.5],
      fineness: [95, 99]
    }
  },
  {
    value: 'matcha',
    label: 'Matcha Tea Powder',
    basePrice: 50000,
    standards: {
      particleSize: [100, 120],
      moisture: [3, 5],
      color: [70, 90],
      aroma: [8, 10],
      taste: [8, 10],
      solubility: [99, 100],
      caffeine: [4.0, 5.0],
      fineness: [98, 100]
    }
  },
  {
    value: 'chai_spice',
    label: 'Chai Spice Tea Powder',
    basePrice: 26000,
    standards: {
      particleSize: [70, 90],
      moisture: [4, 6],
      color: [40, 60],
      aroma: [9, 10],
      taste: [9, 10],
      solubility: [88, 94],
      caffeine: [3.0, 4.0],
      fineness: [80, 90]
    }
  },
  {
    value: 'earl_grey',
    label: 'Earl Grey Tea Powder',
    basePrice: 33000,
    standards: {
      particleSize: [85, 105],
      moisture: [2, 4],
      color: [65, 85],
      aroma: [8, 10],
      taste: [7, 10],
      solubility: [95, 99],
      caffeine: [2.5, 4.0],
      fineness: [92, 100]
    }
  }
];

// Calculate quality score and grade
const calculateQuality = (formData) => {
  const flavor = TEA_FLAVORS.find(t => t.value === formData.teaFlavor);
  if (!flavor) throw new Error('Invalid tea flavor');

  const standards = flavor.standards;
  let qualityScore = 0;
  let maxScore = 0;
  const parameterResults = [];

  // Check each parameter
  const parameters = [
    { name: 'Particle Size', value: parseFloat(formData.particleSize), range: standards.particleSize, unit: 'mesh', weight: 12 },
    { name: 'Moisture Content', value: parseFloat(formData.moistureContent), range: standards.moisture, unit: '%', weight: 15 },
    { name: 'Color Value', value: parseFloat(formData.colorValue), range: standards.color, unit: 'L*', weight: 10 },
    { name: 'Aroma Power', value: parseFloat(formData.aromaPower), range: standards.aroma, unit: '/10', weight: 15 },
    { name: 'Taste Strength', value: parseFloat(formData.tasteStrength), range: standards.taste, unit: '/10', weight: 15 },
    { name: 'Solubility', value: parseFloat(formData.solubility), range: standards.solubility, unit: '%', weight: 13 },
    { name: 'Caffeine Content', value: parseFloat(formData.caffeineContent), range: standards.caffeine, unit: '%', weight: 10 },
    { name: 'Powder Fineness', value: parseFloat(formData.powderFineness), range: standards.fineness, unit: '%', weight: 10 }
  ];

  parameters.forEach(param => {
    maxScore += param.weight;
    const isInRange = param.value >= param.range[0] && param.value <= param.range[1];

    if (isInRange) {
      qualityScore += param.weight;
      parameterResults.push({
        name: param.name,
        value: param.value,
        unit: param.unit,
        range: param.range,
        status: 'pass',
        score: param.weight
      });
    } else {
      const deviation = Math.min(
        Math.abs(param.value - param.range[0]),
        Math.abs(param.value - param.range[1])
      );
      const rangeSize = param.range[1] - param.range[0];
      const partialScore = Math.max(0, param.weight * (1 - (deviation / rangeSize)));

      qualityScore += partialScore;
      parameterResults.push({
        name: param.name,
        value: param.value,
        unit: param.unit,
        range: param.range,
        status: 'fail',
        score: partialScore
      });
    }
  });

  const qualityPercentage = (qualityScore / maxScore) * 100;

  // Determine grade and price multiplier
  let grade, gradeLabel, priceMultiplier, qualityStatus;

  if (qualityPercentage >= 95) {
    grade = 'A+';
    gradeLabel = 'Premium Grade';
    priceMultiplier = 1.35;
    qualityStatus = 'Exceptional Quality';
  } else if (qualityPercentage >= 90) {
    grade = 'A';
    gradeLabel = 'Superior Grade';
    priceMultiplier = 1.25;
    qualityStatus = 'Excellent Quality';
  } else if (qualityPercentage >= 85) {
    grade = 'A-';
    gradeLabel = 'High Grade';
    priceMultiplier = 1.15;
    qualityStatus = 'Very Good Quality';
  } else if (qualityPercentage >= 80) {
    grade = 'B+';
    gradeLabel = 'Good Grade';
    priceMultiplier = 1.05;
    qualityStatus = 'Good Quality';
  } else if (qualityPercentage >= 75) {
    grade = 'B';
    gradeLabel = 'Standard Grade';
    priceMultiplier = 1.0;
    qualityStatus = 'Standard Quality';
  } else if (qualityPercentage >= 70) {
    grade = 'B-';
    gradeLabel = 'Commercial Grade';
    priceMultiplier = 0.9;
    qualityStatus = 'Acceptable Quality';
  } else if (qualityPercentage >= 60) {
    grade = 'C';
    gradeLabel = 'Low Grade';
    priceMultiplier = 0.75;
    qualityStatus = 'Below Standard';
  } else {
    grade = 'D';
    gradeLabel = 'Reject Grade';
    priceMultiplier = 0.5;
    qualityStatus = 'Poor Quality - Not Recommended';
  }

  // Calculate pricing
  const batchWeight = parseFloat(formData.batchWeight) || 0;
  const basePrice = flavor.basePrice;
  const adjustedPricePerKg = basePrice * priceMultiplier;
  const totalBatchValue = adjustedPricePerKg * batchWeight;
  const marketAvgPrice = basePrice;
  const priceDifference = adjustedPricePerKg - marketAvgPrice;
  const pricePercentDiff = ((priceDifference / marketAvgPrice) * 100).toFixed(1);

  return {
    qualityScore: qualityPercentage,
    grade,
    gradeLabel,
    qualityStatus,
    priceMultiplier,
    parameterResults,
    pricing: {
      basePrice,
      adjustedPricePerKg,
      totalBatchValue,
      marketAvgPrice,
      priceDifference,
      pricePercentDiff
    }
  };
};

// Create quality calculation
exports.createCalculation = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      teaFlavor,
      particleSize,
      moistureContent,
      colorValue,
      aromaPower,
      tasteStrength,
      solubility,
      caffeineContent,
      powderFineness,
      batchWeight,
      notes
    } = req.body;

    // Validate required fields
    if (!teaFlavor || !batchWeight) {
      return res.status(400).json({
        success: false,
        message: 'Tea flavor and batch weight are required'
      });
    }

    // Calculate quality
    const calculation = calculateQuality({
      teaFlavor,
      particleSize,
      moistureContent,
      colorValue,
      aromaPower,
      tasteStrength,
      solubility,
      caffeineContent,
      powderFineness,
      batchWeight
    });

    const flavor = TEA_FLAVORS.find(t => t.value === teaFlavor);

    const record = new TeaFlavorQualityCalculation({
      userId,
      teaFlavor: {
        value: teaFlavor,
        label: flavor.label,
        basePrice: flavor.basePrice
      },
      qualityParameters: {
        particleSize,
        moistureContent,
        colorValue,
        aromaPower,
        tasteStrength,
        solubility,
        caffeineContent,
        powderFineness
      },
      batchWeight,
      qualityScore: calculation.qualityScore,
      grade: calculation.grade,
      gradeLabel: calculation.gradeLabel,
      qualityStatus: calculation.qualityStatus,
      priceMultiplier: calculation.priceMultiplier,
      pricing: calculation.pricing,
      parameterResults: calculation.parameterResults,
      notes: notes || '',
      status: 'Completed'
    });

    const savedRecord = await record.save();

    res.status(201).json({
      success: true,
      message: 'Quality calculation created successfully',
      data: savedRecord
    });
  } catch (error) {
    console.error('Error creating calculation:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating calculation',
      error: error.message
    });
  }
};

// Get all calculations for user
exports.getAllCalculations = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 10, grade = null, status = null } = req.query;

    const filter = { userId };
    if (grade) filter.grade = grade;
    if (status) filter.status = status;

    const skip = (page - 1) * limit;

    const calculations = await TeaFlavorQualityCalculation.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await TeaFlavorQualityCalculation.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: calculations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching calculations:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching calculations',
      error: error.message
    });
  }
};

// Get calculation by ID
exports.getCalculationById = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid calculation ID'
      });
    }

    const calculation = await TeaFlavorQualityCalculation.findById(id);

    if (!calculation) {
      return res.status(404).json({
        success: false,
        message: 'Calculation not found'
      });
    }

    res.status(200).json({
      success: true,
      data: calculation
    });
  } catch (error) {
    console.error('Error fetching calculation:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching calculation',
      error: error.message
    });
  }
};

// Update calculation
exports.updateCalculation = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes, status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid calculation ID'
      });
    }

    const updateData = {};
    if (notes !== undefined) updateData.notes = notes;
    if (status !== undefined) updateData.status = status;

    const calculation = await TeaFlavorQualityCalculation.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!calculation) {
      return res.status(404).json({
        success: false,
        message: 'Calculation not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Calculation updated successfully',
      data: calculation
    });
  } catch (error) {
    console.error('Error updating calculation:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating calculation',
      error: error.message
    });
  }
};

// Delete calculation
exports.deleteCalculation = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid calculation ID'
      });
    }

    const calculation = await TeaFlavorQualityCalculation.findByIdAndDelete(id);

    if (!calculation) {
      return res.status(404).json({
        success: false,
        message: 'Calculation not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Calculation deleted successfully',
      data: calculation
    });
  } catch (error) {
    console.error('Error deleting calculation:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting calculation',
      error: error.message
    });
  }
};

// Get statistics
exports.getStatistics = async (req, res) => {
  try {
    const userId = req.user._id;
    const { days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const statistics = await TeaFlavorQualityCalculation.getStatistics(userId, startDate, new Date());
    const dailyStats = await TeaFlavorQualityCalculation.getDailyStatistics(userId);
    const gradeDistribution = await TeaFlavorQualityCalculation.getGradeDistribution(userId, parseInt(days));

    res.status(200).json({
      success: true,
      data: {
        statistics,
        dailyStats: dailyStats[0] || {},
        gradeDistribution,
        period: { days: parseInt(days), startDate, endDate: new Date() }
      }
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message
    });
  }
};

// Get recent calculations
exports.getRecentCalculations = async (req, res) => {
  try {
    const userId = req.user._id;
    const { limit = 5 } = req.query;

    const calculations = await TeaFlavorQualityCalculation.find({ userId })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      data: calculations
    });
  } catch (error) {
    console.error('Error fetching recent calculations:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching recent calculations',
      error: error.message
    });
  }
};

// Get tea flavors list
exports.getTeaFlavorsList = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      data: TEA_FLAVORS
    });
  } catch (error) {
    console.error('Error fetching tea flavors:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching tea flavors',
      error: error.message
    });
  }
};

// ML-based quality prediction using XGBoost models
// @desc    Predict tea leaf quality using AI model (Python subprocess)
// @route   POST /api/tea-flavor-quality/predict
// @access  Private
exports.predictQuality = async (req, res) => {
  try {
    const {
      teaFlavor,
      basePrice,
      moisture,
      qualityScore,
      caffeine,
      fineness,
      batchWeight
    } = req.body;

    // Validate required fields
    if (!teaFlavor || basePrice === undefined || moisture === undefined ||
        qualityScore === undefined || caffeine === undefined ||
        fineness === undefined || batchWeight === undefined) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required: teaFlavor, basePrice, moisture, qualityScore, caffeine, fineness, batchWeight'
      });
    }

    const startTime = Date.now();

    // Paths to predict script and model directory
    const predictScript = path.join(__dirname, '..', 'ml-model', 'quality_predict_service.py');
    const modelDir = path.join(__dirname, '..', 'ml-model', 'quality_models');

    console.log('🍃 Running Tea Quality AI prediction...');
    console.log('   Script:', predictScript);
    console.log('   Models:', modelDir);

    // Check if model files exist
    if (!fs.existsSync(path.join(modelDir, 'quality_classifier.json'))) {
      return res.status(500).json({
        success: false,
        message: 'Quality ML model not found. Please run train_quality_model.py first.'
      });
    }

    // Determine Python executable path dynamically
    let pythonExecutable = process.env.PYTHON_PATH || 'python';

    // Try to automatically find the local virtual environment
    if (!process.env.PYTHON_PATH) {
      const mlModelVenvWin = path.join(__dirname, '..', 'ml-model', '.venv', 'Scripts', 'python.exe');
      const mlModelVenvUnix = path.join(__dirname, '..', 'ml-model', '.venv', 'bin', 'python');
      const rootVenvWin = path.resolve(__dirname, '..', '..', '..', '.venv', 'Scripts', 'python.exe');
      const rootVenvUnix = path.resolve(__dirname, '..', '..', '..', '.venv', 'bin', 'python');

      if (fs.existsSync(mlModelVenvWin)) {
        pythonExecutable = mlModelVenvWin;
      } else if (fs.existsSync(mlModelVenvUnix)) {
        pythonExecutable = mlModelVenvUnix;
      } else if (fs.existsSync(rootVenvWin)) {
        pythonExecutable = rootVenvWin;
      } else if (fs.existsSync(rootVenvUnix)) {
        pythonExecutable = rootVenvUnix;
      }
    }

    console.log('   Python:', pythonExecutable);

    // Map tea flavor value to label name
    const flavorMap = {
      'black_tea': 'Black Tea Powder',
      'green_tea': 'Green Tea Powder',
      'oolong_tea': 'Oolong Tea Powder',
      'white_tea': 'White Tea Powder',
      'matcha': 'Matcha Powder',
      'chai_spice': 'Chai Spice Tea Powder',
      'earl_grey': 'Earl Grey Tea Powder'
    };
    const teaFlavorLabel = flavorMap[teaFlavor] || teaFlavor;

    const result = await new Promise((resolve, reject) => {
      const python = spawn(pythonExecutable, [
        predictScript,
        '--tea_flavor', teaFlavorLabel,
        '--base_price', String(basePrice),
        '--moisture', String(moisture),
        '--quality_score', String(qualityScore),
        '--caffeine', String(caffeine),
        '--fineness', String(fineness),
        '--batch_weight', String(batchWeight)
      ]);

      let stdout = '';
      let stderr = '';

      python.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      python.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      python.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Python process exited with code ${code}. Stderr: ${stderr}`));
          return;
        }

        try {
          const lines = stdout.trim().split('\n');
          const jsonLine = lines[lines.length - 1];
          const parsed = JSON.parse(jsonLine);
          resolve(parsed);
        } catch (e) {
          reject(new Error(`Failed to parse model output: ${stdout}. Error: ${e.message}`));
        }
      });

      python.on('error', (err) => {
        reject(new Error(`Failed to start Python process: ${err.message}. Make sure Python is installed.`));
      });
    });

    const processingTime = Date.now() - startTime;

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: `AI prediction failed: ${result.error}`
      });
    }

    console.log(`✅ Quality prediction complete in ${processingTime}ms: ${result.quality} (${result.percentage}%)`);

    res.status(200).json({
      success: true,
      data: {
        quality: result.quality,
        percentage: result.percentage,
        qualityProbabilities: result.quality_probabilities,
        processingTime
      }
    });

  } catch (error) {
    console.error('Quality prediction error:', error);
    res.status(500).json({
      success: false,
      message: `Quality prediction failed: ${error.message}`
    });
  }
};

module.exports = exports;
