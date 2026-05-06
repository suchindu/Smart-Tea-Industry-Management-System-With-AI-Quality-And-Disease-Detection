import React, { useState, useRef, useEffect } from 'react';
import { Upload, Camera, X, AlertCircle, CheckCircle, Clock, ChevronDown, ArrowLeft, Download, Filter, Search, Calendar, Eye, FileText, Trash, Settings, Sliders } from 'lucide-react';
import jsPDF from 'jspdf';
import { useAuth } from '../contexts/AuthContext';
import * as diseaseAPI from '../api/diseaseDetection';

const TeaDiseaseDetection = () => {
  const { user } = useAuth();
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [currentView, setCurrentView] = useState('detection');
  const [selectedReport, setSelectedReport] = useState(null);
  const [filterDisease, setFilterDisease] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadMethod, setUploadMethod] = useState('upload');
  const [isSaving, setIsSaving] = useState(false);

  // Confidence threshold settings — persisted in localStorage
  const [confidenceThreshold, setConfidenceThreshold] = useState(() => {
    const saved = localStorage.getItem('diseaseDetection_confidenceThreshold');
    return saved ? parseInt(saved, 10) : 60;
  });
  const [showSettings, setShowSettings] = useState(false);
  const [bypassThreshold, setBypassThreshold] = useState(false);

  // Backend data
  const [allDetections, setAllDetections] = useState([]);
  const [statistics, setStatistics] = useState({
    totalScans: 0,
    diseasesFound: 0,
    healthyLeaves: 0,
    avgConfidence: 0
  });
  const [statsType, setStatsType] = useState('daily'); // 'daily' or 'overall'
  const [loading, setLoading] = useState(false);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const diseaseInfo = {
    BB: {
      name: 'Brown Blight',
      fullName: 'Colletotrichum gloeosporioides',
      color: 'bg-red-500',
      severity: 'High',
      symptoms: ['Brown/black lesions on leaves', 'Stem cankers', 'Severe defoliation'],
      impact: '20-30% yield loss',
      treatment: {
        immediate: ['Apply copper-based fungicide', 'Remove infected leaves', 'Improve air circulation'],
        preventive: ['Regular pruning', 'Avoid overhead irrigation', 'Apply preventive fungicide spray']
      }
    },
    RR: {
      name: 'Red Rust',
      fullName: 'Cephaleuros parasiticus',
      color: 'bg-orange-500',
      severity: 'Medium',
      symptoms: ['Orange-red powdery spots', 'Reduced photosynthesis', 'Leaf discoloration'],
      impact: '10-15% quality degradation',
      treatment: {
        immediate: ['Apply copper oxychloride', 'Prune affected branches', 'Improve drainage'],
        preventive: ['Maintain proper spacing', 'Regular monitoring', 'Balanced fertilization']
      }
    },
    RSM: {
      name: 'Red Spider Mite',
      fullName: 'Oligonychus coffeae',
      color: 'bg-amber-600',
      severity: 'High',
      symptoms: ['Leaf bronzing', 'Webbing on undersides', 'Stunted growth', 'Premature leaf drop'],
      impact: '15-25% yield loss',
      treatment: {
        immediate: ['Apply acaricide spray', 'Increase humidity', 'Remove severely infested plants'],
        preventive: ['Regular water spraying', 'Introduce natural predators', 'Monitor during dry periods']
      }
    },
    GL: {
      name: 'Healthy Leaf',
      fullName: 'No disease detected',
      color: 'bg-green-500',
      severity: 'None',
      symptoms: ['Vibrant green color', 'No discoloration', 'No damage'],
      impact: 'Optimal quality',
      treatment: {
        immediate: ['Continue regular care', 'Monitor for changes'],
        preventive: ['Maintain current practices', 'Regular inspection', 'Proper nutrition']
      }
    }
  };

  // Fetch detections from backend
  useEffect(() => {
    fetchDetections();
    fetchStatistics();
  }, []);

  const fetchDetections = async () => {
    try {
      setLoading(true);
      console.log('📋 Fetching disease detections...');
      const response = await diseaseAPI.getAllDetections({ limit: 50 });
      console.log('Detections response:', response);

      if (response.success) {
        // Transform backend data to match frontend format
        const transformedData = response.data.map(detection => ({
          id: detection._id,
          disease: detection.diseaseType,
          confidence: detection.confidence,
          date: new Date(detection.createdAt).toLocaleDateString(),
          time: new Date(detection.createdAt).toLocaleTimeString(),
          status: detection.status,
          analyzedBy: detection.analyzedBy.name,
          image: detection.imagePath || '/assets/leaf.webp'
        }));
        console.log(`✅ Loaded ${transformedData.length} detections`);
        setAllDetections(transformedData);
      }
    } catch (error) {
      console.error('❌ Error fetching detections:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      console.log('📊 Fetching disease detection statistics...');

      // Fetch both daily and overall statistics
      const [dailyResponse, overallResponse] = await Promise.all([
        diseaseAPI.getDailyStatistics(),
        diseaseAPI.getStatistics()
      ]);

      console.log('Daily stats response:', dailyResponse);
      console.log('Overall stats response:', overallResponse);

      // Use daily stats if available, otherwise use overall stats
      if (dailyResponse.success && dailyResponse.data.daily && dailyResponse.data.daily.totalScans > 0) {
        const daily = dailyResponse.data.daily;
        console.log('✅ Using daily statistics:', daily);
        setStatsType('daily');
        setStatistics({
          totalScans: daily.totalScans || 0,
          diseasesFound: daily.diseasesFound || 0,
          healthyLeaves: daily.healthyLeaves || 0,
          avgConfidence: daily.avgConfidence || 0
        });
      } else if (overallResponse.success && overallResponse.data) {
        // Fallback to overall statistics if no daily data
        const overall = overallResponse.data;
        console.log('✅ Using overall statistics:', overall);
        setStatsType('overall');
        setStatistics({
          totalScans: overall.total || 0,
          diseasesFound: overall.diseased || 0,
          healthyLeaves: overall.healthy || 0,
          avgConfidence: overall.byDisease?.reduce((sum, d) => sum + (d.avgConfidence || 0), 0) / (overall.byDisease?.length || 1) || 0
        });
      } else {
        console.log('ℹ️ No statistics data available');
        setStatsType('daily');
        setStatistics({
          totalScans: 0,
          diseasesFound: 0,
          healthyLeaves: 0,
          avgConfidence: 0
        });
      }
    } catch (error) {
      console.error('❌ Error fetching statistics:', error);
      // Set to 0 on error
      setStatsType('daily');
      setStatistics({
        totalScans: 0,
        diseasesFound: 0,
        healthyLeaves: 0,
        avgConfidence: 0
      });
    }
  };

  const handleDeleteDetection = async (detection) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete this detection record?\n\n` +
      `Report ID: ${detection.id}\n` +
      `Disease: ${diseaseInfo[detection.disease]?.name || detection.disease}\n` +
      `Date: ${detection.date} ${detection.time}\n\n` +
      `This action cannot be undone.`
    );

    if (!confirmDelete) return;

    try {
      console.log('🗑️ Deleting detection:', detection.id);
      const response = await diseaseAPI.deleteDetection(detection.id);

      if (response.success) {
        console.log('✅ Detection deleted successfully');
        // Refresh the detections list
        await fetchDetections();
        await fetchStatistics();
        // Show success message
        alert('Detection record deleted successfully!');
      }
    } catch (error) {
      console.error('❌ Error deleting detection:', error);
      alert(error.response?.data?.message || 'Failed to delete detection record. Please try again.');
    }
  };

  const handleFileSelect = (event, method = 'upload') => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file);
      setUploadMethod(method);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedImage) return;

    setIsAnalyzing(true);
    setAnalysisResult(null);
    const startTime = Date.now();

    try {
      // Call real AI model via backend (Stage 1 gate + Stage 2 disease classifier)
      const response = await diseaseAPI.analyzeImage(selectedImage);
      const processingTime = Date.now() - startTime;

      // Stage 1 gate rejected — not a tea leaf
      if (response.isTeaLeaf === false) {
        setAnalysisResult({
          isTeaLeaf: false,
          message: response.message,
          processingTime,
        });
        return;
      }

      if (response.success && response.data) {
        const aiResult = response.data;
        setAnalysisResult({
          ...aiResult,
          isTeaLeaf: true,
          disease: aiResult.diseaseType,
          timestamp: new Date().toISOString(),
          processingTime: aiResult.processingTime || processingTime,
          confidenceLabel: aiResult.confidenceLabel || 'moderate',
        });
      } else {
        throw new Error(response.message || 'Analysis failed');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Error analyzing image. Please try again.';
      alert(errorMsg);
    } finally {
      setIsAnalyzing(false);
    }
  };


  const saveDetectionToBackend = async () => {
    if (!analysisResult) return;

    setIsSaving(true);
    try {
      const detectionData = {
        diseaseType: analysisResult.diseaseType,
        confidence: analysisResult.confidence,
        imagePath: imagePreview, // In production, upload to cloud storage
        imageUploadMethod: uploadMethod,
        processingTime: analysisResult.processingTime
      };

      const response = await diseaseAPI.createDetection(detectionData);

      if (response.success) {
        alert('Detection saved successfully!');
        // Refresh detections list
        await fetchDetections();
        await fetchStatistics();
        clearImage();
      }
    } catch (error) {
      console.error('Error saving detection:', error);
      alert('Error saving detection. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleMarkAsTreated = async (detectionId) => {
    try {
      const response = await diseaseAPI.markAsTreated(detectionId);
      if (response.success) {
        alert('Detection marked as treated!');
        await fetchDetections();
      }
    } catch (error) {
      console.error('Error marking as treated:', error);
      alert('Error updating detection status.');
    }
  };

  const handleCreateTreatmentPlan = async (detectionId) => {
    const planDetails = prompt('Enter treatment plan details:');
    if (!planDetails) return;

    try {
      const response = await diseaseAPI.createTreatmentPlan(detectionId, planDetails);
      if (response.success) {
        alert('Treatment plan created successfully!');
        await fetchDetections();
      }
    } catch (error) {
      console.error('Error creating treatment plan:', error);
      alert('Error creating treatment plan.');
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setAnalysisResult(null);
    setBypassThreshold(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const updateThreshold = (value) => {
    const v = parseInt(value, 10);
    setConfidenceThreshold(v);
    localStorage.setItem('diseaseDetection_confidenceThreshold', v.toString());
  };

  const viewReportDetail = (detection) => {
    setSelectedReport(detection);
    setCurrentView('report-detail');
  };

  const generateSystemGuidePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    let yPos = 20;

    // Header
    doc.setFillColor(34, 197, 94);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont(undefined, 'bold');
    doc.text('Tea Disease Detection System', pageWidth / 2, 18, { align: 'center' });
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.text('AI-Powered Comprehensive Guide', pageWidth / 2, 28, { align: 'center' });
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, 34, { align: 'center' });

    yPos = 50;

    // Introduction
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('System Overview', 14, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    const introText = doc.splitTextToSize(
      'The Tea Disease Detection System is an advanced AI-powered solution designed to identify common ' +
      'tea plant diseases through automated image analysis. Using state-of-the-art computer vision and ' +
      'machine learning algorithms, the system provides rapid, accurate diagnosis of leaf conditions, ' +
      'enabling timely intervention and treatment to protect crop health and maximize yield.',
      pageWidth - 28
    );
    introText.forEach(line => {
      doc.text(line, 14, yPos);
      yPos += 5;
    });
    yPos += 8;

    // How It Works
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('How the Detection System Works', 14, yPos);
    yPos += 8;

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Step 1: Image Acquisition', 14, yPos);
    yPos += 6;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    const step1 = doc.splitTextToSize(
      'Users can capture or upload high-quality images of tea leaves through two methods:\n' +
      '• Direct Upload: Select existing images from device storage (PNG, JPG, JPEG formats)\n' +
      '• Camera Capture: Take real-time photos using device camera for immediate analysis\n\n' +
      'Image Quality Guidelines:\n' +
      '- Use natural daylight or bright, even lighting\n' +
      '- Capture close-up views of affected leaf areas\n' +
      '- Ensure leaves are in focus with minimal background\n' +
      '- Maximum file size: 10MB per image',
      pageWidth - 28
    );
    step1.forEach(line => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(line, 14, yPos);
      yPos += 5;
    });
    yPos += 5;

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Step 2: AI Image Analysis', 14, yPos);
    yPos += 6;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    const step2 = doc.splitTextToSize(
      'The system employs advanced deep learning neural networks trained on thousands of tea leaf images:\n' +
      '• Convolutional Neural Networks (CNN) analyze visual patterns, colors, and textures\n' +
      '• Multi-layer processing identifies disease-specific characteristics\n' +
      '• Pattern recognition algorithms compare against extensive disease database\n' +
      '• Real-time processing typically completes within 2-3 seconds\n\n' +
      'The AI model evaluates multiple factors including leaf discoloration, spot patterns, ' +
      'texture abnormalities, and damage severity to determine the most likely condition.',
      pageWidth - 28
    );
    step2.forEach(line => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(line, 14, yPos);
      yPos += 5;
    });
    yPos += 5;

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Step 3: Confidence Scoring', 14, yPos);
    yPos += 6;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    const step3 = doc.splitTextToSize(
      'Each detection includes a confidence score (0-100%) indicating the AI\'s certainty:\n' +
      '• 90-100%: Very High Confidence - Strong diagnostic certainty\n' +
      '• 80-89%: High Confidence - Reliable diagnosis, minimal uncertainty\n' +
      '• 70-79%: Moderate Confidence - Good indication, consider expert review\n' +
      '• Below 70%: Low Confidence - Requires manual verification\n\n' +
      'Confidence scores are based on feature clarity, pattern matches, and training data quality.',
      pageWidth - 28
    );
    step3.forEach(line => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(line, 14, yPos);
      yPos += 5;
    });
    yPos += 5;

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Step 4: Results & Recommendations', 14, yPos);
    yPos += 6;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    const step4 = doc.splitTextToSize(
      'The system provides comprehensive diagnostic information:\n' +
      '• Disease identification with scientific name\n' +
      '• Severity assessment (None, Low, Medium, High)\n' +
      '• Observable symptoms and characteristics\n' +
      '• Immediate treatment recommendations\n' +
      '• Preventive measures for future protection\n' +
      '• Expected yield impact and quality implications\n' +
      '• Downloadable detailed reports for record-keeping',
      pageWidth - 28
    );
    step4.forEach(line => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(line, 14, yPos);
      yPos += 5;
    });
    yPos += 10;

    // New Page for Disease Database
    doc.addPage();
    yPos = 20;

    doc.setFillColor(59, 130, 246);
    doc.rect(0, 0, pageWidth, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text('Disease Database', pageWidth / 2, 15, { align: 'center' });

    yPos = 35;
    doc.setTextColor(0, 0, 0);

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text('The system is trained to detect the following tea plant conditions:', 14, yPos);
    yPos += 10;

    // Disease Details
    const diseases = [
      {
        code: 'BB',
        name: 'Brown Blight',
        scientific: 'Colletotrichum gloeosporioides',
        severity: 'High',
        symptoms: [
          'Brown to black lesions on leaf surfaces',
          'Dark, sunken stem cankers',
          'Severe defoliation in advanced stages',
          'Wilting and die-back of shoots'
        ],
        impact: '20-30% yield loss if untreated',
        causes: 'Fungal pathogen thriving in warm, humid conditions',
        treatment: [
          'Apply copper-based fungicide immediately',
          'Remove and destroy infected plant material',
          'Improve air circulation through pruning',
          'Reduce leaf wetness duration',
          'Apply preventive fungicide during rainy periods'
        ]
      },
      {
        code: 'RR',
        name: 'Red Rust',
        scientific: 'Cephaleuros parasiticus',
        severity: 'Medium',
        symptoms: [
          'Orange-red powdery spots on leaf surface',
          'Reduced photosynthetic capacity',
          'General leaf discoloration',
          'Rough texture on affected areas'
        ],
        impact: '10-15% quality degradation',
        causes: 'Algal infection in high humidity environments',
        treatment: [
          'Apply copper oxychloride spray',
          'Prune affected branches to reduce spread',
          'Improve drainage and reduce moisture',
          'Maintain proper plant spacing',
          'Regular monitoring during humid seasons'
        ]
      },
      {
        code: 'RSM',
        name: 'Red Spider Mite',
        scientific: 'Oligonychus coffeae',
        severity: 'High',
        symptoms: [
          'Bronze or yellowish leaf discoloration',
          'Fine webbing on leaf undersides',
          'Stunted plant growth',
          'Premature leaf drop',
          'Reduced vigor and yield'
        ],
        impact: '15-25% yield loss',
        causes: 'Pest infestation, common in hot, dry conditions',
        treatment: [
          'Apply specific acaricide treatments',
          'Increase humidity through irrigation',
          'Remove severely infested plants',
          'Introduce natural predator mites',
          'Monitor closely during dry periods'
        ]
      },
      {
        code: 'GL',
        name: 'Healthy Leaf',
        scientific: 'No disease detected',
        severity: 'None',
        symptoms: [
          'Vibrant dark green coloration',
          'No visible damage or discoloration',
          'Smooth, intact leaf surface',
          'Normal growth patterns'
        ],
        impact: 'Optimal quality and yield potential',
        causes: 'Proper plant care and disease-free conditions',
        treatment: [
          'Continue current maintenance practices',
          'Regular monitoring for early disease detection',
          'Maintain balanced fertilization',
          'Ensure proper irrigation schedules',
          'Implement integrated pest management'
        ]
      }
    ];

    diseases.forEach((disease, index) => {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      // Disease Header Box
      const boxColor = disease.code === 'BB' ? [220, 38, 38] :
        disease.code === 'RR' ? [249, 115, 22] :
          disease.code === 'RSM' ? [217, 119, 6] : [34, 197, 94];

      doc.setFillColor(...boxColor, 0.1);
      doc.rect(14, yPos, pageWidth - 28, 15, 'F');

      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...boxColor);
      doc.text(`${disease.code}: ${disease.name}`, 18, yPos + 6);

      doc.setFontSize(9);
      doc.setFont(undefined, 'italic');
      doc.setTextColor(100, 100, 100);
      doc.text(disease.scientific, 18, yPos + 11);

      yPos += 20;
      doc.setTextColor(0, 0, 0);

      // Details
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.text(`Severity: ${disease.severity}`, 18, yPos);
      doc.text(`Impact: ${disease.impact}`, 110, yPos);
      yPos += 6;

      doc.setFont(undefined, 'normal');
      doc.text(`Cause: ${disease.causes}`, 18, yPos);
      yPos += 8;

      // Symptoms
      doc.setFont(undefined, 'bold');
      doc.text('Symptoms:', 18, yPos);
      yPos += 5;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(8);
      disease.symptoms.forEach(symptom => {
        if (yPos > 280) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(`• ${symptom}`, 20, yPos);
        yPos += 4;
      });
      yPos += 3;

      // Treatment
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.text('Treatment & Management:', 18, yPos);
      yPos += 5;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(8);
      disease.treatment.forEach(action => {
        if (yPos > 280) {
          doc.addPage();
          yPos = 20;
        }
        const lines = doc.splitTextToSize(`• ${action}`, pageWidth - 40);
        lines.forEach(line => {
          doc.text(line, 20, yPos);
          yPos += 4;
        });
      });
      yPos += 8;
    });

    // New Page for Best Practices
    doc.addPage();
    yPos = 20;

    doc.setFillColor(168, 85, 247);
    doc.rect(0, 0, pageWidth, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text('Best Practices & Tips', pageWidth / 2, 15, { align: 'center' });

    yPos = 35;
    doc.setTextColor(0, 0, 0);

    // Photography Tips
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Photography Guidelines for Accurate Detection', 14, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    const photoTips = [
      'Lighting: Use natural daylight; avoid harsh shadows or direct sunlight',
      'Focus: Ensure affected areas are sharp and clearly visible',
      'Distance: Capture close-ups showing disease symptoms in detail',
      'Angle: Photograph leaves flat, avoid extreme angles',
      'Background: Use plain backgrounds when possible to reduce noise',
      'Multiple shots: Take several images from different angles',
      'Timing: Photograph during mid-morning for optimal natural light',
      'Cleanliness: Wipe dust or debris from leaves before photographing'
    ];

    photoTips.forEach(tip => {
      doc.text(`• ${tip}`, 18, yPos);
      yPos += 6;
    });
    yPos += 8;

    // When to Use
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('When to Use the Detection System', 14, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    const whenUse = [
      'Regular Monitoring: Weekly leaf inspections for early disease detection',
      'Symptom Appearance: Immediately when abnormal leaf patterns observed',
      'Post-Treatment: Verify treatment effectiveness after intervention',
      'Quality Assurance: Random sampling during harvest periods',
      'Training: Educational purposes for field staff and workers',
      'Documentation: Record-keeping for disease history and patterns',
      'Second Opinion: Confirm visual diagnoses with AI analysis'
    ];

    whenUse.forEach(item => {
      const lines = doc.splitTextToSize(`• ${item}`, pageWidth - 32);
      lines.forEach(line => {
        doc.text(line, 18, yPos);
        yPos += 5;
      });
    });
    yPos += 8;

    // Limitations
    doc.setFillColor(255, 243, 205);
    doc.rect(14, yPos, pageWidth - 28, 45, 'F');
    doc.setFillColor(251, 146, 60);
    doc.rect(14, yPos, 4, 45, 'F');

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('System Limitations & Considerations', 22, yPos + 8);
    yPos += 14;

    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    const limitations = [
      'Image Quality: Poor quality images may reduce detection accuracy',
      'Multiple Diseases: System detects primary condition; secondary infections may be present',
      'Early Stages: Very early disease stages may show low confidence scores',
      'Rare Diseases: Uncommon conditions not in training database may be misidentified',
      'Expert Consultation: Always consider consulting plant pathologists for critical decisions',
      'Environmental Factors: Nutrient deficiencies may mimic disease symptoms'
    ];

    limitations.forEach(item => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      const lines = doc.splitTextToSize(`• ${item}`, pageWidth - 50);
      lines.forEach(line => {
        doc.text(line, 22, yPos);
        yPos += 4;
      });
    });

    yPos += 8;

    // System Benefits
    doc.setFillColor(220, 252, 231);
    doc.rect(14, yPos, pageWidth - 28, 40, 'F');
    doc.setFillColor(34, 197, 94);
    doc.rect(14, yPos, 4, 40, 'F');

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Key System Benefits', 22, yPos + 8);
    yPos += 14;

    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    const benefits = [
      '✓ Rapid diagnosis within seconds, enabling quick response',
      '✓ Consistent, objective analysis eliminating human bias',
      '✓ 24/7 availability for on-demand disease screening',
      '✓ Comprehensive treatment recommendations for each condition',
      '✓ Historical record-keeping for trend analysis',
      '✓ Cost-effective compared to laboratory testing'
    ];

    benefits.forEach(benefit => {
      doc.text(benefit, 22, yPos);
      yPos += 5;
    });

    // Footer on all pages
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });
      doc.text('Tea Disease Detection System - AI-Powered Plant Health Analysis', pageWidth / 2, doc.internal.pageSize.height - 6, { align: 'center' });
    }

    doc.save(`Tea_Disease_Detection_System_Guide_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const downloadReport = (detection) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const diseaseData = diseaseInfo[detection.disease];
    let yPos = 20;

    // Header Section
    doc.setFillColor(34, 197, 94);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont(undefined, 'bold');
    doc.text('Tea Disease Detection Report', pageWidth / 2, 15, { align: 'center' });
    doc.setFontSize(14);
    doc.text(`Report #${detection.id}`, pageWidth / 2, 25, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text('Comprehensive Analysis Report', pageWidth / 2, 32, { align: 'center' });

    yPos = 50;

    // Detection Information Box
    doc.setTextColor(0, 0, 0);
    doc.setFillColor(248, 250, 252);
    doc.rect(14, yPos, pageWidth - 28, 35, 'F');
    doc.setFillColor(34, 197, 94);
    doc.rect(14, yPos, 4, 35, 'F');

    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text('Detection Date:', 22, yPos + 8);
    doc.setFont(undefined, 'normal');
    doc.text(`${detection.date} at ${detection.time}`, 22, yPos + 14);

    doc.setFont(undefined, 'bold');
    doc.text('Report Generated:', 22, yPos + 22);
    doc.setFont(undefined, 'normal');
    doc.text(`${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 22, yPos + 28);

    doc.setFont(undefined, 'bold');
    doc.text('Analyzed By:', pageWidth / 2 + 10, yPos + 8);
    doc.setFont(undefined, 'normal');
    doc.text(detection.analyzedBy, pageWidth / 2 + 10, yPos + 14);

    doc.setFont(undefined, 'bold');
    doc.text('Status:', pageWidth / 2 + 10, yPos + 22);
    doc.setFont(undefined, 'normal');
    const statusText = detection.status.charAt(0).toUpperCase() + detection.status.slice(1);
    doc.text(statusText, pageWidth / 2 + 10, yPos + 28);

    yPos += 45;

    // Disease Identification Section
    const diseaseColor = detection.disease === 'BB' ? [220, 38, 38] :
      detection.disease === 'RR' ? [249, 115, 22] :
        detection.disease === 'RSM' ? [217, 119, 6] : [34, 197, 94];

    doc.setFillColor(...diseaseColor, 20);
    doc.rect(14, yPos, pageWidth - 28, 45, 'F');
    doc.setFillColor(...diseaseColor);
    doc.rect(14, yPos, pageWidth - 28, 8, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Disease Identification', pageWidth / 2, yPos + 5.5, { align: 'center' });

    yPos += 15;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text(diseaseData.name, 18, yPos);

    doc.setFontSize(10);
    doc.setFont(undefined, 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text(diseaseData.fullName, 18, yPos + 6);

    yPos += 14;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text('Confidence Level:', 18, yPos);
    doc.setTextColor(...diseaseColor);
    doc.setFontSize(20);
    doc.text(`${detection.confidence}%`, 60, yPos);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text('Severity:', pageWidth / 2 + 10, yPos);
    doc.setTextColor(...diseaseColor);
    doc.text(diseaseData.severity, pageWidth / 2 + 35, yPos);

    yPos += 10;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text('Expected Impact:', 18, yPos);
    doc.setFont(undefined, 'normal');
    doc.text(diseaseData.impact, 55, yPos);

    yPos += 15;

    // Symptoms Section
    doc.setFillColor(254, 243, 199);
    doc.rect(14, yPos, pageWidth - 28, 5, 'F');
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(146, 64, 14);
    doc.text('Observed Symptoms', 18, yPos + 3.5);

    yPos += 10;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    diseaseData.symptoms.forEach((symptom, index) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      doc.setTextColor(251, 146, 60);
      doc.text('⚠', 18, yPos);
      doc.setTextColor(0, 0, 0);
      const lines = doc.splitTextToSize(symptom, pageWidth - 40);
      lines.forEach(line => {
        doc.text(line, 25, yPos);
        yPos += 5;
      });
    });

    yPos += 5;

    // Immediate Treatment Section
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFillColor(254, 226, 226);
    doc.rect(14, yPos, pageWidth - 28, 5, 'F');
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(153, 27, 27);
    doc.text('Immediate Treatment Recommendations', 18, yPos + 3.5);

    yPos += 10;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    diseaseData.treatment.immediate.forEach((action, index) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      doc.setTextColor(220, 38, 38);
      doc.text('●', 18, yPos);
      doc.setTextColor(0, 0, 0);
      const lines = doc.splitTextToSize(action, pageWidth - 40);
      lines.forEach(line => {
        doc.text(line, 25, yPos);
        yPos += 5;
      });
    });

    yPos += 5;

    // Preventive Measures Section
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFillColor(220, 252, 231);
    doc.rect(14, yPos, pageWidth - 28, 5, 'F');
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(22, 101, 52);
    doc.text('Preventive Measures', 18, yPos + 3.5);

    yPos += 10;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    diseaseData.treatment.preventive.forEach((action, index) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      doc.setTextColor(34, 197, 94);
      doc.text('✓', 18, yPos);
      doc.setTextColor(0, 0, 0);
      const lines = doc.splitTextToSize(action, pageWidth - 40);
      lines.forEach(line => {
        doc.text(line, 25, yPos);
        yPos += 5;
      });
    });

    yPos += 10;

    // Recommendations Box
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFillColor(240, 249, 255);
    doc.rect(14, yPos, pageWidth - 28, 30, 'F');
    doc.setFillColor(59, 130, 246);
    doc.rect(14, yPos, 4, 30, 'F');

    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text('Expert Recommendations:', 22, yPos + 8);
    yPos += 14;

    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    const recommendation = detection.disease === 'GL'
      ? 'Continue current maintenance practices and monitor regularly for any changes in leaf health.'
      : detection.disease === 'BB'
        ? 'Immediate fungicide application required. Remove infected material and improve air circulation.'
        : detection.disease === 'RR'
          ? 'Apply copper-based treatment and improve drainage. Monitor during high humidity periods.'
          : 'Implement acaricide treatment immediately. Increase humidity and consider biological control.';

    const recLines = doc.splitTextToSize(recommendation, pageWidth - 50);
    recLines.forEach(line => {
      doc.text(line, 22, yPos);
      yPos += 5;
    });

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, doc.internal.pageSize.height - 15, { align: 'center' });
      doc.setFont(undefined, 'bold');
      doc.text('Tea Disease Detection System', pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });
      doc.setFont(undefined, 'normal');
      doc.text('Advanced AI-Powered Plant Disease Analysis', pageWidth / 2, doc.internal.pageSize.height - 6, { align: 'center' });
    }

    doc.save(`Tea_Disease_Report_${detection.id}_${detection.date}.pdf`);
  };

  const filteredDetections = allDetections.filter(detection => {
    const matchesFilter = filterDisease === 'all' || detection.disease === filterDisease;
    const matchesSearch = detection.id.toString().includes(searchTerm) ||
      diseaseInfo[detection.disease].name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      detection.analyzedBy.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const currentDisease = analysisResult ? diseaseInfo[analysisResult.disease] : null;
  const selectedDiseaseInfo = selectedReport ? diseaseInfo[selectedReport.disease] : null;

  if (currentView === 'history') {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <button
              onClick={() => setCurrentView('detection')}
              className="flex items-center gap-2 text-[#165E52] hover:text-[#0f4d42] mb-4 font-medium transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Detection
            </button>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Detection History</h1>
            <p className="text-gray-600">View and manage all disease detection records</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by ID, disease, or analyzer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#165E52] focus:border-transparent"
                />
              </div>

              <div className="relative">
                <Filter className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <select
                  value={filterDisease}
                  onChange={(e) => setFilterDisease(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#165E52] focus:border-transparent appearance-none"
                >
                  <option value="all">All Diseases</option>
                  <option value="BB">Brown Blight</option>
                  <option value="RR">Red Rust</option>
                  <option value="RSM">Red Spider Mite</option>
                  <option value="GL">Healthy Leaf</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-gray-400" />
                <span className="text-sm text-gray-600">Showing {filteredDetections.length} results</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Report ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Disease Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Confidence
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredDetections.map((detection) => (
                    <tr key={detection.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{detection.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`w-4 h-4 ${diseaseInfo[detection.disease].color} rounded-full mr-3`}></div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {diseaseInfo[detection.disease].name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {detection.disease}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="text-sm font-medium text-gray-900">
                            {detection.confidence}%
                          </div>
                          <div className={`ml-2 w-16 bg-gray-200 rounded-full h-2`}>
                            <div
                              className={`h-2 rounded-full ${detection.confidence >= 90 ? 'bg-green-500' :
                                detection.confidence >= 80 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                              style={{ width: `${detection.confidence}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                          <div>
                            <div>{detection.date}</div>
                            <div className="text-xs text-gray-500">{detection.time}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => viewReportDetail(detection)}
                            className="text-[#165E52] hover:text-[#0f4d42] p-1 hover:bg-[#165E52] hover:bg-opacity-10 rounded transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => downloadReport(detection)}
                            className="text-blue-600 hover:text-blue-900 p-1 hover:bg-blue-50 rounded transition-colors"
                            title="Download PDF"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteDetection(detection)}
                            className="text-red-600 hover:text-red-900 p-1 hover:bg-red-50 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {filteredDetections.length === 0 && (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No detection records found</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (currentView === 'report-detail' && selectedReport) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-5xl mx-auto">
          <div className="mb-6">
            <button
              onClick={() => setCurrentView('history')}
              className="flex items-center gap-2 text-[#165E52] hover:text-[#0f4d42] mb-4 font-medium transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to History
            </button>
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Detection Report #{selectedReport.id}</h1>
                <p className="text-gray-600">{selectedReport.date} at {selectedReport.time}</p>
              </div>
              <button
                onClick={() => downloadReport(selectedReport)}
                className="flex items-center gap-2 px-4 py-2 bg-[#165E52] text-white rounded-lg hover:bg-[#0f4d42] transition-colors shadow-sm"
              >
                <Download className="w-5 h-5" />
                Download PDF
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Analyzed Image</h2>
                <img src={selectedReport.image} alt="Tea leaf" className="w-full h-96 object-cover rounded-lg" />
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Disease Information</h2>
                <div className={`${selectedDiseaseInfo.color} bg-opacity-10 border-2 ${selectedDiseaseInfo.color.replace('bg-', 'border-')} rounded-lg p-6 mb-6`}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">{selectedDiseaseInfo.name}</h3>
                      <p className="text-gray-600 italic">{selectedDiseaseInfo.fullName}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-gray-900">{selectedReport.confidence}%</div>
                      <p className="text-sm text-gray-600">Confidence</p>
                    </div>
                  </div>
                  <div className={`inline-block px-4 py-2 rounded-full text-sm font-semibold ${selectedDiseaseInfo.color} text-white`}>
                    Severity: {selectedDiseaseInfo.severity}
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Symptoms</h3>
                  <ul className="space-y-2">
                    {selectedDiseaseInfo.symptoms.map((symptom, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{symptom}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-4">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h3 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5" />
                      Immediate Actions
                    </h3>
                    <ul className="space-y-1">
                      {selectedDiseaseInfo.treatment.immediate.map((action, index) => (
                        <li key={index} className="text-red-800 text-sm ml-7">• {action}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h3 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      Preventive Measures
                    </h3>
                    <ul className="space-y-1">
                      {selectedDiseaseInfo.treatment.preventive.map((action, index) => (
                        <li key={index} className="text-green-800 text-sm ml-7">• {action}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="flex gap-4 mt-6">
                  <button
                    onClick={() => handleMarkAsTreated(selectedReport.id)}
                    className="flex-1 py-3 bg-[#165E52] text-white rounded-lg hover:bg-[#0f4d42] transition-colors font-semibold shadow-md"
                  >
                    Mark as Treated
                  </button>
                  <button
                    onClick={() => handleCreateTreatmentPlan(selectedReport.id)}
                    className="flex-1 py-3 bg-[#01251F] text-white rounded-lg hover:bg-[#014c3b] transition-colors font-semibold shadow-md"
                  >
                    Create Treatment Plan
                  </button>
                  <button
                    onClick={clearImage}
                    className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold shadow-sm"
                  >
                    New Scan
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Detection Details</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Report ID</p>
                    <p className="font-semibold text-gray-900">#{selectedReport.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Date & Time</p>
                    <p className="font-semibold text-gray-900">{selectedReport.date}</p>
                    <p className="font-semibold text-gray-900">{selectedReport.time}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Analyzed By</p>
                    <p className="font-semibold text-gray-900">{selectedReport.analyzedBy}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium mt-1 ${selectedReport.status === 'treated' ? 'bg-green-100 text-green-700' :
                      selectedReport.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                      {selectedReport.status}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Impact</p>
                    <p className="font-semibold text-gray-900">{selectedDiseaseInfo.impact}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Actions</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => handleCreateTreatmentPlan(selectedReport.id)}
                    className="w-full py-2 bg-[#165E52] text-white rounded-lg hover:bg-[#0f4d42] transition-colors text-sm font-medium">
                    Create Treatment Plan
                  </button>
                  <button
                    onClick={() => {
                      const reportText = `Report #${selectedReport.id}\nDisease: ${selectedDiseaseInfo.name}\nConfidence: ${selectedReport.confidence}%\nImpact: ${selectedDiseaseInfo.impact}\nStatus: ${selectedReport.status}`;
                      if (navigator.share) {
                        navigator.share({ title: 'Detection Report', text: reportText });
                      } else {
                        navigator.clipboard.writeText(reportText);
                        alert('Report copied to clipboard!');
                      }
                    }}
                    className="w-full py-2 bg-[#01251F] text-white rounded-lg hover:bg-[#014c3b] transition-colors text-sm font-medium">
                    Share Report
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="w-full py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 border border-gray-300 transition-colors text-sm font-medium">
                    Print Report
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Tea Disease Detection</h1>
              <p className="text-gray-600">Upload leaf images or capture photos to detect common tea diseases using AI-powered analysis</p>
            </div>
            <button
              onClick={generateSystemGuidePDF}
              className="flex items-center gap-2 px-4 py-2 bg-[#165E52] text-white rounded-lg hover:bg-[#0f4d42] transition-all shadow-md hover:shadow-lg"
            >
              <FileText className="w-5 h-5" />
              <span className="font-semibold">Download System Guide</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Image Upload</h2>

              {!imagePreview ? (
                <div className="space-y-4">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-green-500 cursor-pointer transition-colors"
                  >
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-2">Click to upload or drag and drop</p>
                    <p className="text-sm text-gray-500">PNG, JPG, JPEG up to 10MB</p>
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#165E52] text-white rounded-lg hover:bg-[#0f4d42] transition-colors shadow-sm"
                    >
                      <Upload className="w-5 h-5" />
                      Choose File
                    </button>
                    <button
                      onClick={() => cameraInputRef.current?.click()}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#01251F] text-white rounded-lg hover:bg-[#014c3b] transition-colors shadow-sm"
                    >
                      <Camera className="w-5 h-5" />
                      Take Photo
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Selected leaf"
                      className="w-full h-96 object-cover rounded-lg"
                    />
                    <button
                      onClick={clearImage}
                      className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {!analysisResult && (
                    <button
                      onClick={handleAnalyze}
                      disabled={isAnalyzing}
                      className="w-full py-3 bg-[#165E52] text-white rounded-lg hover:bg-[#0f4d42] disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold shadow-md"
                    >
                      {isAnalyzing ? (
                        <span className="flex items-center justify-center gap-2">
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Analyzing...
                        </span>
                      ) : (
                        'Analyze Image'
                      )}
                    </button>
                  )}
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => handleFileSelect(e, 'upload')}
                className="hidden"
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => handleFileSelect(e, 'camera')}
                className="hidden"
              />
            </div>

            {/* ── Stage 1 Gate Rejection Banner ───────────────────────── */}
            {analysisResult && analysisResult.isTeaLeaf === false && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-start gap-4 p-5 bg-orange-50 border-2 border-orange-300 rounded-xl">
                  <div className="flex-shrink-0 w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                    <AlertCircle className="w-7 h-7 text-orange-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-orange-800 mb-1">Not a Tea Leaf Image</h3>
                    <p className="text-orange-700 text-sm leading-relaxed">{analysisResult.message}</p>
                    <ul className="mt-3 space-y-1 text-sm text-orange-600">
                      <li>• Upload a close-up photo of a tea leaf</li>
                      <li>• Ensure good lighting and focus</li>
                      <li>• Avoid photos of people, animals, or unrelated objects</li>
                    </ul>
                    <button
                      onClick={clearImage}
                      className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 transition-colors"
                    >
                      Try Another Image
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Low Confidence Warning Banner ─────────────────────── */}
            {analysisResult && analysisResult.isTeaLeaf === true && analysisResult.confidence < confidenceThreshold && !bypassThreshold && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-start gap-4 p-5 bg-amber-50 border-2 border-amber-300 rounded-xl">
                  <div className="flex-shrink-0 w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                    <AlertCircle className="w-7 h-7 text-amber-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-amber-800 mb-1">Low Confidence Result</h3>
                    <p className="text-amber-700 text-sm leading-relaxed">
                      The AI model returned <span className="font-bold">{analysisResult.confidence?.toFixed(1)}%</span> confidence,
                      which is below your threshold of <span className="font-bold">{confidenceThreshold}%</span>.
                    </p>
                    <p className="text-amber-600 text-sm mt-2 leading-relaxed">
                      This result may be unreliable. The uploaded image may not be a clear tea leaf photo.
                    </p>
                    <ul className="mt-3 space-y-1 text-sm text-amber-600">
                      <li>• Try uploading a clearer, close-up leaf image</li>
                      <li>• Ensure good lighting and focus</li>
                      <li>• Adjust threshold in Detection Settings if needed</li>
                    </ul>
                    <div className="flex gap-3 mt-4">
                      <button
                        onClick={() => setBypassThreshold(true)}
                        className="px-4 py-2 bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-sm font-semibold hover:bg-amber-200 transition-colors"
                      >
                        View Result Anyway
                      </button>
                      <button
                        onClick={clearImage}
                        className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-semibold hover:bg-amber-600 transition-colors"
                      >
                        Try Another Image
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {analysisResult && currentDisease && (analysisResult.confidence >= confidenceThreshold || bypassThreshold) && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Analysis Results</h2>

                <div className={`${currentDisease.color} bg-opacity-10 border-2 ${currentDisease.color.replace('bg-', 'border-')} rounded-lg p-6 mb-6`}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">{currentDisease.name}</h3>
                      <p className="text-gray-600 italic">{currentDisease.fullName}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-gray-900">{analysisResult.confidence}%</div>
                      <p className="text-sm text-gray-600">Confidence</p>
                      <span className={`mt-1 inline-block px-2 py-0.5 rounded-full text-xs font-bold ${
                        analysisResult.confidenceLabel === 'high' ? 'bg-green-100 text-green-700' :
                        analysisResult.confidenceLabel === 'moderate' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {analysisResult.confidenceLabel === 'high' ? '✓ High' :
                         analysisResult.confidenceLabel === 'moderate' ? '⚠ Moderate' : '⚠ Low'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-4">
                    <Clock className="w-5 h-5 text-gray-600" />
                    <div>
                      <p className="text-sm text-gray-600">Detected</p>
                      <p className="font-semibold">{new Date(analysisResult.timestamp).toLocaleTimeString()}</p>
                    </div>
                  </div>

                  <div className={`inline-block px-4 py-2 rounded-full text-sm font-semibold ${currentDisease.color} text-white`}>
                    Severity: {currentDisease.severity}
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Symptoms</h3>
                  <ul className="space-y-2">
                    {currentDisease.symptoms.map((symptom, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{symptom}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-4">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h3 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5" />
                      Immediate Actions
                    </h3>
                    <ul className="space-y-1">
                      {currentDisease.treatment.immediate.map((action, index) => (
                        <li key={index} className="text-red-800 text-sm ml-7">• {action}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h3 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      Preventive Measures
                    </h3>
                    <ul className="space-y-1">
                      {currentDisease.treatment.preventive.map((action, index) => (
                        <li key={index} className="text-green-800 text-sm ml-7">• {action}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Bypass warning badge */}
                {bypassThreshold && analysisResult.confidence < confidenceThreshold && (
                  <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg mt-2 mb-4">
                    <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    <p className="text-xs text-amber-700">
                      This result is below your confidence threshold ({confidenceThreshold}%). Saving is disabled.
                    </p>
                  </div>
                )}

                <div className="flex gap-4 mt-6">
                  {/* Only show Save/Download when confidence meets threshold */}
                  {analysisResult.confidence >= confidenceThreshold && (
                    <>
                      <button
                        onClick={saveDetectionToBackend}
                        disabled={isSaving}
                        className="flex-1 py-3 bg-[#165E52] text-white rounded-lg hover:bg-[#0f4d42] disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold shadow-md"
                      >
                        {isSaving ? 'Saving...' : 'Save Detection'}
                      </button>
                      <button
                        onClick={() => downloadReport({ ...analysisResult, id: 'new', analyzedBy: user?.name || 'Current User', date: new Date().toLocaleDateString(), time: new Date().toLocaleTimeString(), status: 'pending' })}
                        className="flex-1 py-3 bg-[#01251F] text-white rounded-lg hover:bg-[#014c3b] transition-colors font-semibold shadow-md"
                      >
                        Download Report
                      </button>
                    </>
                  )}
                  <button
                    onClick={clearImage}
                    className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold shadow-sm"
                  >
                    New Scan
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {/* ── Detection Settings Panel ────────────────────────── */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-gray-500" />
                  <h3 className="font-semibold text-gray-900">Detection Settings</h3>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showSettings ? 'rotate-180' : ''}`} />
              </button>

              {showSettings && (
                <div className="px-4 pb-5 border-t border-gray-100 pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Sliders className="w-4 h-4 text-[#165E52]" />
                    <label className="text-sm font-medium text-gray-700">Minimum Confidence Threshold</label>
                  </div>

                  <div className="relative mb-2">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={confidenceThreshold}
                      onChange={(e) => updateThreshold(e.target.value)}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#165E52]"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>0%</span>
                      <span>50%</span>
                      <span>100%</span>
                    </div>
                  </div>

                  <div className="text-center mb-4">
                    <span className="inline-block px-3 py-1 bg-[#165E52] text-white rounded-full text-sm font-bold">
                      {confidenceThreshold}%
                    </span>
                  </div>

                  <div className="flex gap-2 mb-4">
                    {[
                      { label: 'Low', value: 40, desc: 'Accept most results' },
                      { label: 'Medium', value: 60, desc: 'Balanced' },
                      { label: 'High', value: 80, desc: 'Strict filtering' },
                    ].map((preset) => (
                      <button
                        key={preset.value}
                        onClick={() => updateThreshold(preset.value)}
                        className={`flex-1 py-2 px-2 rounded-lg text-xs font-semibold transition-colors border ${
                          confidenceThreshold === preset.value
                            ? 'bg-[#165E52] text-white border-[#165E52]'
                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  <p className="text-xs text-gray-500 leading-relaxed">
                    Results below this threshold will be flagged as unreliable and blocked from saving.
                    Lower values accept more results; higher values are stricter.
                  </p>
                </div>
              )}
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Detection Statistics</h3>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {statsType === 'daily' ? "Today's Data" : 'All Time'}
                </span>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">{statsType === 'daily' ? "Today's Scans" : 'Total Scans'}</span>
                  <span className="font-bold text-gray-900">{statistics.totalScans || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Diseases Found</span>
                  <span className="font-bold text-red-600">{statistics.diseasesFound || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Healthy Leaves</span>
                  <span className="font-bold text-green-600">{statistics.healthyLeaves || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Avg Confidence</span>
                  <span className="font-bold text-gray-900">{statistics.avgConfidence ? statistics.avgConfidence.toFixed(1) : '0.0'}%</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Disease Reference</h3>
              <div className="space-y-3">
                {Object.entries(diseaseInfo).map(([code, disease]) => (
                  <div key={code} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className={`w-3 h-3 ${disease.color} rounded-full mt-1.5 flex-shrink-0`}></div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm">{disease.name}</p>
                      <p className="text-xs text-gray-600 truncate">{disease.fullName}</p>
                    </div>
                    <span className="text-xs text-gray-500 whitespace-nowrap">{code}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Recent Detections</h3>
                <button
                  onClick={() => setCurrentView('history')}
                  className="text-[#165E52] hover:text-[#0f4d42] text-sm font-medium flex items-center gap-1 transition-colors"
                >
                  View All
                  <ChevronDown className="w-4 h-4 -rotate-90" />
                </button>
              </div>
              <div className="space-y-3">
                {allDetections.slice(0, 4).map((detection) => (
                  <div
                    key={detection.id}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() => viewReportDetail(detection)}
                  >
                    <div className={`w-10 h-10 ${diseaseInfo[detection.disease].color} rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                      {detection.disease}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm">{diseaseInfo[detection.disease].name}</p>
                      <p className="text-xs text-gray-600">Report #{detection.id}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-gray-900">{detection.confidence}%</p>
                      <p className="text-xs text-gray-500">{detection.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeaDiseaseDetection;