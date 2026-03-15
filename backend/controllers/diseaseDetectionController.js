const DiseaseDetection = require('../models/DiseaseDetection');
const mongoose = require('mongoose');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Disease information database
const diseaseDatabase = {
    BB: {
        name: 'Brown Blight',
        fullName: 'Colletotrichum gloeosporioides',
        severity: 'High',
        symptoms: [
            'Brown/black lesions on leaves',
            'Stem cankers',
            'Severe defoliation'
        ],
        impact: '20-30% yield loss',
        immediateActions: [
            'Apply copper-based fungicide',
            'Remove infected leaves',
            'Improve air circulation'
        ],
        preventiveMeasures: [
            'Regular pruning',
            'Avoid overhead irrigation',
            'Apply preventive fungicide spray'
        ]
    },
    RR: {
        name: 'Red Rust',
        fullName: 'Cephaleuros parasiticus',
        severity: 'Medium',
        symptoms: [
            'Orange-red powdery spots',
            'Reduced photosynthesis',
            'Leaf discoloration'
        ],
        impact: '10-15% quality degradation',
        immediateActions: [
            'Apply copper oxychloride',
            'Prune affected branches',
            'Improve drainage'
        ],
        preventiveMeasures: [
            'Maintain proper spacing',
            'Regular monitoring',
            'Balanced fertilization'
        ]
    },
    RSM: {
        name: 'Red Spider Mite',
        fullName: 'Oligonychus coffeae',
        severity: 'High',
        symptoms: [
            'Leaf bronzing',
            'Webbing on undersides',
            'Stunted growth',
            'Premature leaf drop'
        ],
        impact: '15-25% yield loss',
        immediateActions: [
            'Apply acaricide spray',
            'Increase humidity',
            'Remove severely infested plants'
        ],
        preventiveMeasures: [
            'Regular water spraying',
            'Introduce natural predators',
            'Monitor during dry periods'
        ]
    },
    GL: {
        name: 'Healthy Leaf',
        fullName: 'No disease detected',
        severity: 'None',
        symptoms: [
            'Vibrant green color',
            'No discoloration',
            'No damage'
        ],
        impact: 'Optimal quality',
        immediateActions: [
            'Continue regular care',
            'Monitor for changes'
        ],
        preventiveMeasures: [
            'Maintain current practices',
            'Regular inspection',
            'Proper nutrition'
        ]
    }
};

// @desc    Create new disease detection record
// @route   POST /api/disease-detections
// @access  Private
exports.createDetection = async (req, res) => {
    try {
        const {
            diseaseType,
            confidence,
            imagePath,
            imageUploadMethod,
            location,
            notes,
            processingTime
        } = req.body;

        // Validate disease type
        if (!diseaseDatabase[diseaseType]) {
            return res.status(400).json({
                success: false,
                message: 'Invalid disease type'
            });
        }

        // Get disease information from database
        const diseaseInfo = diseaseDatabase[diseaseType];

        // Determine status based on disease type
        const status = diseaseType === 'GL' ? 'healthy' : 'pending';

        // Create detection record
        const detection = await DiseaseDetection.create({
            userId: req.user.userId,
            diseaseType,
            diseaseName: diseaseInfo.name,
            diseaseFullName: diseaseInfo.fullName,
            confidence,
            imagePath,
            imageUploadMethod: imageUploadMethod || 'upload',
            severity: diseaseInfo.severity,
            symptoms: diseaseInfo.symptoms,
            impact: diseaseInfo.impact,
            immediateActions: diseaseInfo.immediateActions,
            preventiveMeasures: diseaseInfo.preventiveMeasures,
            status,
            location,
            notes,
            analyzedBy: {
                name: req.user.name || 'Unknown',
                role: req.user.role || 'Unknown'
            },
            processingTime
        });

        res.status(201).json({
            success: true,
            message: 'Disease detection recorded successfully',
            data: detection
        });

    } catch (error) {
        console.error('Create detection error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error creating detection record',
            error: error.message
        });
    }
};

// @desc    Get all disease detections (with filters)
// @route   GET /api/disease-detections
// @access  Private
exports.getAllDetections = async (req, res) => {
    try {
        const {
            diseaseType,
            status,
            startDate,
            endDate,
            limit = 50,
            page = 1
        } = req.query;

        // Build query
        const query = {};

        // Filter by user if not admin/owner
        if (req.user.role !== 'owner' && req.user.role !== 'admin') {
            query.userId = req.user.userId;
        }

        // Apply filters
        if (diseaseType && diseaseType !== 'all') {
            query.diseaseType = diseaseType;
        }

        if (status && status !== 'all') {
            query.status = status;
        }

        // Date range filter
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }

        // Execute query with pagination
        const skip = (page - 1) * limit;
        const detections = await DiseaseDetection.find(query)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip(skip)
            .populate('userId', 'name email role');

        // Get total count
        const total = await DiseaseDetection.countDocuments(query);

        res.status(200).json({
            success: true,
            count: detections.length,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit),
            data: detections
        });

    } catch (error) {
        console.error('Get detections error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching detections',
            error: error.message
        });
    }
};

// @desc    Get single disease detection by ID
// @route   GET /api/disease-detections/:id
// @access  Private
exports.getDetectionById = async (req, res) => {
    try {
        const { id } = req.params;

        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid detection ID'
            });
        }

        const detection = await DiseaseDetection.findById(id)
            .populate('userId', 'name email role');

        if (!detection) {
            return res.status(404).json({
                success: false,
                message: 'Detection not found'
            });
        }

        // Check authorization
        if (req.user.role !== 'owner' && 
            req.user.role !== 'admin' && 
            detection.userId._id.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to access this detection'
            });
        }

        res.status(200).json({
            success: true,
            data: detection
        });

    } catch (error) {
        console.error('Get detection by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching detection',
            error: error.message
        });
    }
};

// @desc    Update disease detection (status, notes, treatment)
// @route   PUT /api/disease-detections/:id
// @access  Private
exports.updateDetection = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, notes, treatmentPlan } = req.body;

        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid detection ID'
            });
        }

        const detection = await DiseaseDetection.findById(id);

        if (!detection) {
            return res.status(404).json({
                success: false,
                message: 'Detection not found'
            });
        }

        // Check authorization
        if (req.user.role !== 'owner' && 
            req.user.role !== 'admin' && 
            detection.userId.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this detection'
            });
        }

        // Update fields
        if (status) detection.status = status;
        if (notes !== undefined) detection.notes = notes;

        // Handle treatment plan
        if (treatmentPlan) {
            detection.treatmentPlan = {
                ...detection.treatmentPlan,
                ...treatmentPlan
            };
        }

        await detection.save();

        res.status(200).json({
            success: true,
            message: 'Detection updated successfully',
            data: detection
        });

    } catch (error) {
        console.error('Update detection error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error updating detection',
            error: error.message
        });
    }
};

// @desc    Delete disease detection
// @route   DELETE /api/disease-detections/:id
// @access  Private
exports.deleteDetection = async (req, res) => {
    try {
        const { id } = req.params;

        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid detection ID'
            });
        }

        const detection = await DiseaseDetection.findById(id);

        if (!detection) {
            return res.status(404).json({
                success: false,
                message: 'Detection not found'
            });
        }

        // Check authorization (only owner/admin or creator can delete)
        if (req.user.role !== 'owner' && 
            req.user.role !== 'admin' && 
            detection.userId.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this detection'
            });
        }

        await detection.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Detection deleted successfully'
        });

    } catch (error) {
        console.error('Delete detection error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error deleting detection',
            error: error.message
        });
    }
};

// @desc    Get detection statistics
// @route   GET /api/disease-detections/statistics/summary
// @access  Private
exports.getStatistics = async (req, res) => {
    try {
        const { startDate, endDate, userId } = req.query;

        // Build match query
        const match = {};

        // Filter by user if provided or if not admin/owner
        if (userId) {
            if (!mongoose.Types.ObjectId.isValid(userId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid user ID'
                });
            }
            match.userId = new mongoose.Types.ObjectId(userId);
        } else if (req.user.role !== 'owner' && req.user.role !== 'admin') {
            match.userId = new mongoose.Types.ObjectId(req.user.userId);
        }

        // Date range filter
        if (startDate || endDate) {
            match.createdAt = {};
            if (startDate) match.createdAt.$gte = new Date(startDate);
            if (endDate) match.createdAt.$lte = new Date(endDate);
        }

        // Get statistics by disease type
        const diseaseStats = await DiseaseDetection.aggregate([
            { $match: match },
            {
                $group: {
                    _id: '$diseaseType',
                    count: { $sum: 1 },
                    avgConfidence: { $avg: '$confidence' },
                    diseaseName: { $first: '$diseaseName' }
                }
            },
            { $sort: { count: -1 } }
        ]);

        // Get daily statistics (today)
        const dailyStats = await DiseaseDetection.getDailyStatistics();

        // Get total counts
        const totalDetections = await DiseaseDetection.countDocuments(match);
        const healthyCount = await DiseaseDetection.countDocuments({
            ...match,
            diseaseType: 'GL'
        });
        const diseaseCount = totalDetections - healthyCount;

        // Get status breakdown
        const statusStats = await DiseaseDetection.aggregate([
            { $match: match },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        res.status(200).json({
            success: true,
            data: {
                total: totalDetections,
                healthy: healthyCount,
                diseased: diseaseCount,
                byDisease: diseaseStats,
                byStatus: statusStats,
                daily: dailyStats
            }
        });

    } catch (error) {
        console.error('Get statistics error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching statistics',
            error: error.message
        });
    }
};

// @desc    Mark detection as treated
// @route   PATCH /api/disease-detections/:id/treat
// @access  Private
exports.markAsTreated = async (req, res) => {
    try {
        const { id } = req.params;

        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid detection ID'
            });
        }

        const detection = await DiseaseDetection.findById(id);

        if (!detection) {
            return res.status(404).json({
                success: false,
                message: 'Detection not found'
            });
        }

        await detection.markAsTreated();

        res.status(200).json({
            success: true,
            message: 'Detection marked as treated',
            data: detection
        });

    } catch (error) {
        console.error('Mark as treated error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error updating detection',
            error: error.message
        });
    }
};

// @desc    Create treatment plan for detection
// @route   POST /api/disease-detections/:id/treatment-plan
// @access  Private
exports.createTreatmentPlan = async (req, res) => {
    try {
        const { id } = req.params;
        const { planDetails } = req.body;

        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid detection ID'
            });
        }

        if (!planDetails) {
            return res.status(400).json({
                success: false,
                message: 'Treatment plan details are required'
            });
        }

        const detection = await DiseaseDetection.findById(id);

        if (!detection) {
            return res.status(404).json({
                success: false,
                message: 'Detection not found'
            });
        }

        await detection.createTreatmentPlan(planDetails);

        res.status(200).json({
            success: true,
            message: 'Treatment plan created successfully',
            data: detection
        });

    } catch (error) {
        console.error('Create treatment plan error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error creating treatment plan',
            error: error.message
        });
    }
};

// @desc    Get recent detections (for sidebar widget)
// @route   GET /api/disease-detections/recent/list
// @access  Private
exports.getRecentDetections = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;

        const query = {};
        
        // Filter by user if not admin/owner
        if (req.user.role !== 'owner' && req.user.role !== 'admin') {
            query.userId = req.user.userId;
        }

        const detections = await DiseaseDetection.find(query)
            .sort({ createdAt: -1 })
            .limit(limit)
            .select('diseaseType diseaseName confidence createdAt status');

        res.status(200).json({
            success: true,
            count: detections.length,
            data: detections
        });

    } catch (error) {
        console.error('Get recent detections error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching recent detections',
            error: error.message
        });
    }
};

// @desc    Analyze image using AI model (Python subprocess)
// @route   POST /api/disease-detections/analyze
// @access  Private
exports.analyzeImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No image file uploaded'
            });
        }

        const startTime = Date.now();

        // Paths to predict script and model
        const predictScript = path.join(__dirname, '..', 'ml-model', 'predict_service.py');
        const modelPath = path.join(__dirname, '..', 'ml-model', 'best_model.pth');
        const imagePath = req.file.path;

        console.log('🔬 Running AI analysis...');
        console.log('   Script:', predictScript);
        console.log('   Model:', modelPath);
        console.log('   Image:', imagePath);

        // Check if model file exists
        if (!fs.existsSync(modelPath)) {
            // Clean up uploaded file
            fs.unlinkSync(imagePath);
            return res.status(500).json({
                success: false,
                message: `Model file not found at: ${modelPath}. Please ensure best_model.pth is in the models directory.`
            });
        }

        // Determine Python executable path dynamically
        let pythonExecutable = process.env.PYTHON_PATH || 'python';
        
        // Try to automatically find the local virtual environment if no custom path is set
        if (!process.env.PYTHON_PATH) {
            // Check Windows path
            const venvWinPath = path.resolve(__dirname, '..', '..', '..', '.venv', 'Scripts', 'python.exe');
            // Check Linux/Mac path
            const venvUnixPath = path.resolve(__dirname, '..', '..', '..', '.venv', 'bin', 'python');
            
            if (fs.existsSync(venvWinPath)) {
                pythonExecutable = venvWinPath;
            } else if (fs.existsSync(venvUnixPath)) {
                pythonExecutable = venvUnixPath;
            }
        }
        
        console.log('   Python:', pythonExecutable);

        const result = await new Promise((resolve, reject) => {
            const python = spawn(pythonExecutable, [
                predictScript,
                '--image', imagePath,
                '--model', modelPath
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
                // Clean up uploaded temp file
                try {
                    if (fs.existsSync(imagePath)) {
                        fs.unlinkSync(imagePath);
                    }
                } catch (e) {
                    console.warn('Could not clean up temp file:', e.message);
                }

                if (code !== 0) {
                    reject(new Error(`Python process exited with code ${code}. Stderr: ${stderr}`));
                    return;
                }

                try {
                    // Parse the last line of stdout as JSON (ignore any other output)
                    const lines = stdout.trim().split('\n');
                    const jsonLine = lines[lines.length - 1];
                    const parsed = JSON.parse(jsonLine);
                    resolve(parsed);
                } catch (e) {
                    reject(new Error(`Failed to parse model output: ${stdout}. Error: ${e.message}`));
                }
            });

            python.on('error', (err) => {
                // Clean up uploaded temp file
                try {
                    if (fs.existsSync(imagePath)) {
                        fs.unlinkSync(imagePath);
                    }
                } catch (e) {
                    console.warn('Could not clean up temp file:', e.message);
                }
                reject(new Error(`Failed to start Python process: ${err.message}. Make sure Python is installed and accessible.`));
            });
        });

        const processingTime = Date.now() - startTime;

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: `AI analysis failed: ${result.error}`
            });
        }

        console.log(`✅ AI analysis complete in ${processingTime}ms: ${result.diseaseName} (${result.confidence}%)`);

        res.status(200).json({
            success: true,
            data: {
                diseaseType: result.diseaseType,
                diseaseName: result.diseaseName,
                confidence: result.confidence,
                probabilities: result.probabilities,
                processingTime
            }
        });

    } catch (error) {
        console.error('AI analysis error:', error);
        res.status(500).json({
            success: false,
            message: `AI analysis failed: ${error.message}`
        });
    }
};

module.exports = exports;
