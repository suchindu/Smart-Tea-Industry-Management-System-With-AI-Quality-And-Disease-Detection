import React, { useState } from 'react';
import { Coffee, DollarSign, Award, TrendingUp, Leaf, CheckCircle2, XCircle, FileDown, Beaker, Cpu, BarChart3, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import { predictTeaQuality } from '../api/teaFlavorQuality';

const TeaQuality = () => {
  const [formData, setFormData] = useState({
    teaFlavor: '',
    particleSize: '',
    moistureContent: '',
    colorValue: '',
    aromaPower: '',
    tasteStrength: '',
    solubility: '',
    caffeineContent: '',
    powderFineness: '',
    batchWeight: ''
  });

  const [results, setResults] = useState(null);

  // Tab state
  const [activeTab, setActiveTab] = useState('calculator');

  // ML Quality Check state
  const [mlFormData, setMlFormData] = useState({
    teaFlavor: '',
    basePrice: '',
    moisture: '',
    qualityScore: '',
    caffeine: '',
    fineness: '',
    batchWeight: ''
  });
  const [mlResults, setMlResults] = useState(null);
  const [mlLoading, setMlLoading] = useState(false);
  const [mlError, setMlError] = useState(null);

  const teaFlavors = [
    { 
      value: 'black_tea', 
      label: 'Black Tea Powder',
      basePrice: 25500,
      standards: {
        particleSize: [80, 100], // mesh
        moisture: [2, 4], // %
        color: [70, 90], // L* value
        aroma: [7, 10], // score
        taste: [7, 10], // score
        solubility: [95, 100], // %
        caffeine: [2.5, 4.5], // %
        fineness: [90, 100] // %
      }
    },
    { 
      value: 'green_tea', 
      label: 'Green Tea Powder',
      basePrice: 36000,
      standards: {
        particleSize: [100, 120],
        moisture: [2, 3.5],
        color: [45, 65],
        aroma: [8, 10],
        taste: [7, 10],
        solubility: [97, 100],
        caffeine: [2.0, 3.5],
        fineness: [95, 100]
      }
    },
    { 
      value: 'oolong_tea', 
      label: 'Oolong Tea Powder',
      basePrice: 42000,
      standards: {
        particleSize: [85, 110],
        moisture: [2, 4],
        color: [55, 75],
        aroma: [7, 10],
        taste: [7, 10],
        solubility: [94, 99],
        caffeine: [2.5, 4.0],
        fineness: [92, 100]
      }
    },
    { 
      value: 'white_tea', 
      label: 'White Tea Powder',
      basePrice: 54000,
      standards: {
        particleSize: [90, 115],
        moisture: [2, 3],
        color: [80, 95],
        aroma: [8, 10],
        taste: [8, 10],
        solubility: [96, 100],
        caffeine: [1.5, 3.0],
        fineness: [94, 100]
      }
    },
    { 
      value: 'matcha', 
      label: 'Matcha Powder',
      basePrice: 105000,
      standards: {
        particleSize: [200, 300],
        moisture: [2, 3],
        color: [35, 50],
        aroma: [9, 10],
        taste: [8, 10],
        solubility: [98, 100],
        caffeine: [2.8, 3.5],
        fineness: [98, 100]
      }
    },
    { 
      value: 'chai_spice', 
      label: 'Chai Spice Tea Powder',
      basePrice: 28500,
      standards: {
        particleSize: [70, 95],
        moisture: [3, 5],
        color: [60, 80],
        aroma: [8, 10],
        taste: [7, 10],
        solubility: [92, 98],
        caffeine: [2.0, 3.5],
        fineness: [88, 98]
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

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const calculateQualityAndPrice = () => {
    const flavor = teaFlavors.find(t => t.value === formData.teaFlavor);
    if (!flavor) return;

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
        // Partial score for near-miss
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
      priceMultiplier = 0.90;
      qualityStatus = 'Acceptable Quality';
    } else if (qualityPercentage >= 60) {
      grade = 'C';
      gradeLabel = 'Low Grade';
      priceMultiplier = 0.75;
      qualityStatus = 'Below Standard';
    } else {
      grade = 'D';
      gradeLabel = 'Reject Grade';
      priceMultiplier = 0.50;
      qualityStatus = 'Poor Quality - Not Recommended';
    }

    // Calculate pricing
    const batchWeight = parseFloat(formData.batchWeight) || 0;
    const basePrice = flavor.basePrice;
    const adjustedPricePerKg = basePrice * priceMultiplier;
    const totalBatchValue = adjustedPricePerKg * batchWeight;
    
    // Market comparison
    const marketAvgPrice = basePrice;
    const priceDifference = adjustedPricePerKg - marketAvgPrice;
    const pricePercentDiff = ((priceDifference / marketAvgPrice) * 100).toFixed(1);

    setResults({
      flavorName: flavor.label,
      qualityScore: qualityPercentage,
      grade,
      gradeLabel,
      qualityStatus,
      priceMultiplier,
      basePrice,
      adjustedPricePerKg,
      totalBatchValue,
      batchWeight,
      marketAvgPrice,
      priceDifference,
      pricePercentDiff,
      parameterResults
    });
  };

  const clearForm = () => {
    setFormData({
      teaFlavor: '',
      particleSize: '',
      moistureContent: '',
      colorValue: '',
      aromaPower: '',
      tasteStrength: '',
      solubility: '',
      caffeineContent: '',
      powderFineness: '',
      batchWeight: ''
    });
    setResults(null);
  };

  // ML Form handlers
  const handleMlInputChange = (e) => {
    const { name, value } = e.target;
    const updated = { ...mlFormData, [name]: value };
    
    // Auto-fill base price when tea flavor is selected
    if (name === 'teaFlavor') {
      const flavor = teaFlavors.find(t => t.value === value);
      if (flavor) {
        updated.basePrice = flavor.basePrice.toString();
      }
    }
    setMlFormData(updated);
  };

  const handleMlPredict = async () => {
    setMlError(null);
    setMlLoading(true);
    try {
      const response = await predictTeaQuality({
        teaFlavor: mlFormData.teaFlavor,
        basePrice: parseFloat(mlFormData.basePrice),
        moisture: parseFloat(mlFormData.moisture),
        qualityScore: parseFloat(mlFormData.qualityScore),
        caffeine: parseFloat(mlFormData.caffeine),
        fineness: parseFloat(mlFormData.fineness),
        batchWeight: parseFloat(mlFormData.batchWeight)
      });
      if (response.success) {
        setMlResults(response.data);
      } else {
        setMlError(response.message || 'Prediction failed');
      }
    } catch (err) {
      setMlError(err.response?.data?.message || err.message || 'Prediction failed');
    } finally {
      setMlLoading(false);
    }
  };

  const clearMlForm = () => {
    setMlFormData({
      teaFlavor: '',
      basePrice: '',
      moisture: '',
      qualityScore: '',
      caffeine: '',
      fineness: '',
      batchWeight: ''
    });
    setMlResults(null);
    setMlError(null);
  };

  const getQualityColor = (quality) => {
    switch(quality?.toLowerCase()) {
      case 'premium': return { bg: 'from-emerald-500 to-green-600', text: 'text-emerald-600', light: 'bg-emerald-50' };
      case 'high': return { bg: 'from-blue-500 to-indigo-600', text: 'text-blue-600', light: 'bg-blue-50' };
      case 'poor': return { bg: 'from-orange-500 to-red-500', text: 'text-orange-600', light: 'bg-orange-50' };
      default: return { bg: 'from-gray-500 to-gray-600', text: 'text-gray-600', light: 'bg-gray-50' };
    }
  };

  const getGradeColor = (grade) => {
    if (grade.startsWith('A')) return 'from-green-500 to-emerald-600';
    if (grade.startsWith('B')) return 'from-blue-500 to-indigo-600';
    if (grade === 'C') return 'from-yellow-500 to-orange-500';
    return 'from-gray-500 to-gray-600';
  };

  const getStatusIcon = (status) => {
    return status === 'pass' 
      ? <CheckCircle2 className="w-5 h-5 text-green-500" />
      : <XCircle className="w-5 h-5 text-orange-500" />;
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    let yPos = 20;

    // Header
    doc.setFillColor(34, 197, 94);
    doc.rect(0, 0, pageWidth, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont(undefined, 'bold');
    doc.text('Tea Quality Assessment Report', pageWidth / 2, 15, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, pageWidth / 2, 25, { align: 'center' });

    yPos = 45;

    // Introduction Section
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('Overview', 14, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    const introText = doc.splitTextToSize(
      'This comprehensive tea quality assessment system provides an objective, scientific methodology ' +
      'for evaluating tea powder quality and determining fair market pricing. The system analyzes ' +
      'multiple quality parameters using industry-standard measurements and sensory evaluation ' +
      'techniques to generate accurate quality grades and price recommendations.',
      pageWidth - 28
    );
    introText.forEach(line => {
      doc.text(line, 14, yPos);
      yPos += 5;
    });
    yPos += 5;

    // Calculation Methodology Section
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('Tea Quality Calculation Methodology', 14, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    const methodText = doc.splitTextToSize(
      'The quality assessment evaluates tea powder based on 8 critical parameters, each weighted ' +
      'according to its significance in determining final product quality. These parameters cover ' +
      'physical characteristics, chemical composition, and sensory attributes that directly impact ' +
      'consumer satisfaction and market value.',
      pageWidth - 28
    );
    methodText.forEach(line => {
      doc.text(line, 14, yPos);
      yPos += 5;
    });
    yPos += 8;

    // Parameters Table
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Quality Parameters & Weights:', 14, yPos);
    yPos += 7;

    const parametersDetailed = [
      { param: 'Particle Size (12%)', desc: 'Measures mesh size consistency for uniform extraction' },
      { param: 'Moisture Content (15%)', desc: 'Critical for shelf life and prevents microbial growth' },
      { param: 'Color Value (10%)', desc: 'L* scale measurement indicates processing quality' },
      { param: 'Aroma Power (15%)', desc: 'Sensory evaluation of fragrance intensity (0-10 scale)' },
      { param: 'Taste Strength (15%)', desc: 'Sensory evaluation of flavor profile (0-10 scale)' },
      { param: 'Solubility (13%)', desc: 'Dissolution rate affects beverage clarity and quality' },
      { param: 'Caffeine Content (10%)', desc: 'Chemical analysis of caffeine percentage' },
      { param: 'Powder Fineness (10%)', desc: 'Particle size distribution affects mouthfeel' }
    ];

    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    parametersDetailed.forEach(item => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFont(undefined, 'bold');
      doc.text(`• ${item.param}`, 18, yPos);
      doc.setFont(undefined, 'normal');
      yPos += 4;
      doc.text(`  ${item.desc}`, 20, yPos);
      yPos += 6;
    });

    yPos += 3;

    // Scoring System
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Scoring System:', 14, yPos);
    yPos += 7;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    const scoringDesc = doc.splitTextToSize(
      'Each parameter is evaluated against scientifically established standard ranges specific to ' +
      'the tea variety. The scoring algorithm rewards optimal values while providing partial credit ' +
      'for near-optimal measurements, ensuring fair and accurate quality assessment.',
      pageWidth - 28
    );
    scoringDesc.forEach(line => {
      doc.text(line, 14, yPos);
      yPos += 5;
    });
    yPos += 3;

    doc.setFontSize(9);
    doc.text('• Full Score: Parameter within acceptable range receives full weight (100%)', 18, yPos);
    yPos += 5;
    doc.text('• Partial Score: Values outside range receive reduced score based on deviation', 18, yPos);
    yPos += 5;
    doc.text('  Formula: Score = Weight × (1 - deviation / range_size)', 20, yPos);
    yPos += 5;
    doc.text('• Final Score: Quality Score = (Total Parameter Score / Maximum Score) × 100', 18, yPos);
    yPos += 10;

    // Grading Scale
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Grading Scale & Price Multipliers:', 14, yPos);
    yPos += 7;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    const gradingDesc = doc.splitTextToSize(
      'Quality grades directly correlate with market value. Higher grades command premium prices ' +
      'due to superior characteristics, while lower grades reflect reduced quality and market appeal. ' +
      'Price multipliers are applied to base prices to determine fair market value.',
      pageWidth - 28
    );
    gradingDesc.forEach(line => {
      doc.text(line, 14, yPos);
      yPos += 5;
    });
    yPos += 5;

    const grades = [
      { range: '≥95%', grade: 'A+', label: 'Premium Grade', mult: '1.35×', status: 'Exceptional Quality', desc: 'Export quality, specialty markets' },
      { range: '≥90%', grade: 'A', label: 'Superior Grade', mult: '1.25×', status: 'Excellent Quality', desc: 'High-end retail, premium brands' },
      { range: '≥85%', grade: 'A-', label: 'High Grade', mult: '1.15×', status: 'Very Good Quality', desc: 'Quality retail markets' },
      { range: '≥80%', grade: 'B+', label: 'Good Grade', mult: '1.05×', status: 'Good Quality', desc: 'Standard retail, food service' },
      { range: '≥75%', grade: 'B', label: 'Standard Grade', mult: '1.0×', status: 'Standard Quality', desc: 'Commercial applications' },
      { range: '≥70%', grade: 'B-', label: 'Commercial', mult: '0.90×', status: 'Acceptable Quality', desc: 'Bulk commercial use' },
      { range: '≥60%', grade: 'C', label: 'Low Grade', mult: '0.75×', status: 'Below Standard', desc: 'Industrial/processing only' },
      { range: '<60%', grade: 'D', label: 'Reject Grade', mult: '0.50×', status: 'Poor Quality', desc: 'Not recommended for sale' }
    ];

    doc.setFontSize(8);
    doc.setFont(undefined, 'bold');
    doc.text('Score', 18, yPos);
    doc.text('Grade', 35, yPos);
    doc.text('Classification', 55, yPos);
    doc.text('Multiplier', 95, yPos);
    doc.text('Market Application', 120, yPos);
    yPos += 4;

    doc.setFont(undefined, 'normal');
    grades.forEach(g => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(g.range, 18, yPos);
      doc.text(g.grade, 35, yPos);
      doc.text(g.label, 55, yPos);
      doc.text(g.mult, 95, yPos);
      doc.text(g.desc, 120, yPos);
      yPos += 4;
    });

    yPos += 8;

    // Price Calculation Formula
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Price Calculation Methodology:', 14, yPos);
    yPos += 7;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    const priceDesc = doc.splitTextToSize(
      'Pricing is determined by applying quality-based multipliers to established base prices. ' +
      'This ensures fair compensation for superior quality while maintaining competitive market pricing. ' +
      'The system considers both per-kilogram pricing and total batch valuations.',
      pageWidth - 28
    );
    priceDesc.forEach(line => {
      doc.text(line, 14, yPos);
      yPos += 5;
    });
    yPos += 5;

    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.text('Formula:', 18, yPos);
    yPos += 5;
    doc.setFont(undefined, 'normal');
    doc.text('1. Adjusted Price per Kg = Base Price × Quality Grade Multiplier', 18, yPos);
    yPos += 5;
    doc.text('2. Total Batch Value = Adjusted Price per Kg × Batch Weight (kg)', 18, yPos);
    yPos += 5;
    doc.text('3. Market Comparison = (Adjusted Price - Base Price) / Base Price × 100%', 18, yPos);
    yPos += 10;

    doc.setFont(undefined, 'bold');
    doc.text('Example Calculation:', 18, yPos);
    yPos += 5;
    doc.setFont(undefined, 'normal');
    doc.text('If Base Price = Rs 25,500/kg, Quality Score = 92% (Grade A, Multiplier 1.25)', 18, yPos);
    yPos += 5;
    doc.text('Then: Adjusted Price = Rs 25,500 × 1.25 = Rs 31,875/kg', 18, yPos);
    yPos += 5;
    doc.text('For 100 kg batch: Total Value = Rs 31,875 × 100 = Rs 3,187,500', 18, yPos);
    yPos += 10;

    // Quality Standards Note
    doc.setFillColor(255, 243, 205);
    doc.rect(14, yPos, pageWidth - 28, 25, 'F');
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text('Quality Standards Note:', 18, yPos + 6);
    yPos += 11;
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    const noteText = doc.splitTextToSize(
      'Each tea variety has specific standard ranges for all parameters based on international quality ' +
      'benchmarks and industry best practices. These standards ensure consistent, objective evaluation ' +
      'across different tea types and production batches.',
      pageWidth - 40
    );
    noteText.forEach(line => {
      doc.text(line, 18, yPos);
      yPos += 4;
    });

    // Results Section (if available)
    if (results) {
      // New Page for Results
      doc.addPage();
      yPos = 20;

      doc.setFillColor(59, 130, 246);
      doc.rect(0, 0, pageWidth, 25, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont(undefined, 'bold');
      doc.text('Assessment Results', pageWidth / 2, 15, { align: 'center' });

      yPos = 35;
      doc.setTextColor(0, 0, 0);

      // Tea Type & Grade
      doc.setFillColor(240, 240, 240);
      doc.rect(14, yPos, pageWidth - 28, 35, 'F');
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text(`Tea Variety: ${results.flavorName}`, pageWidth / 2, yPos + 10, { align: 'center' });
      
      doc.setFontSize(20);
      doc.setTextColor(34, 197, 94);
      doc.text(`Grade: ${results.grade} - ${results.gradeLabel}`, pageWidth / 2, yPos + 20, { align: 'center' });
      
      doc.setFontSize(11);
      doc.setTextColor(100, 100, 100);
      doc.text(`${results.qualityStatus}`, pageWidth / 2, yPos + 28, { align: 'center' });
      
      yPos += 43;
      doc.setTextColor(0, 0, 0);

      // Quality Score Summary Box
      doc.setFillColor(240, 253, 244);
      doc.rect(14, yPos, pageWidth - 28, 20, 'F');
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text(`Overall Quality Score: ${results.qualityScore.toFixed(2)}%`, pageWidth / 2, yPos + 8, { align: 'center' });
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(`Assessment Status: ${results.qualityStatus}`, pageWidth / 2, yPos + 15, { align: 'center' });
      yPos += 28;

      // Price Information
      doc.setFillColor(245, 245, 245);
      doc.rect(14, yPos, pageWidth - 28, 50, 'F');
      doc.setFontSize(13);
      doc.setFont(undefined, 'bold');
      doc.text('Price Analysis & Valuation', 18, yPos + 8);
      yPos += 15;

      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(`Base Price (Standard Market Rate):`, 18, yPos);
      doc.setFont(undefined, 'bold');
      doc.text(`Rs ${results.basePrice.toLocaleString()}/kg`, 140, yPos);
      yPos += 7;

      doc.setFont(undefined, 'normal');
      doc.text(`Quality Grade Multiplier:`, 18, yPos);
      doc.setFont(undefined, 'bold');
      doc.text(`×${results.priceMultiplier.toFixed(2)}`, 140, yPos);
      yPos += 7;

      doc.setFont(undefined, 'normal');
      doc.text(`Quality-Adjusted Price:`, 18, yPos);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(34, 197, 94);
      doc.text(`Rs ${results.adjustedPricePerKg.toFixed(0).toLocaleString()}/kg`, 140, yPos);
      doc.setTextColor(0, 0, 0);
      yPos += 7;

      doc.setFont(undefined, 'normal');
      doc.text(`Batch Weight:`, 18, yPos);
      doc.setFont(undefined, 'bold');
      doc.text(`${results.batchWeight} kg`, 140, yPos);
      yPos += 10;

      doc.setFillColor(59, 130, 246);
      doc.rect(18, yPos, pageWidth - 40, 12, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont(undefined, 'bold');
      doc.setFontSize(11);
      doc.text(`Total Batch Value: Rs ${results.totalBatchValue.toFixed(0).toLocaleString()}`, pageWidth / 2, yPos + 8, { align: 'center' });
      
      yPos += 20;
      doc.setTextColor(0, 0, 0);

      // Market Comparison
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(`Market Position:`, 18, yPos);
      const compColor = results.priceDifference >= 0 ? [34, 197, 94] : [251, 146, 60];
      doc.setTextColor(...compColor);
      doc.setFont(undefined, 'bold');
      doc.text(`${results.priceDifference >= 0 ? '+' : ''}${results.pricePercentDiff}% vs Base Price`, 140, yPos);
      doc.setTextColor(0, 0, 0);
      yPos += 12;

      // Parameter Results
      doc.setFontSize(13);
      doc.setFont(undefined, 'bold');
      doc.text('Detailed Parameter Assessment', 14, yPos);
      yPos += 7;

      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      doc.text('Each parameter evaluated against industry standards for optimal quality:', 14, yPos);
      yPos += 8;

      doc.setFontSize(8);
      doc.setFont(undefined, 'bold');
      doc.text('Parameter', 18, yPos);
      doc.text('Measured', 75, yPos);
      doc.text('Standard Range', 105, yPos);
      doc.text('Status', 145, yPos);
      doc.text('Score', 170, yPos);
      yPos += 5;
      
      results.parameterResults.forEach((param, index) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
          doc.setFontSize(8);
          doc.setFont(undefined, 'bold');
          doc.text('Parameter', 18, yPos);
          doc.text('Measured', 75, yPos);
          doc.text('Standard Range', 105, yPos);
          doc.text('Status', 145, yPos);
          doc.text('Score', 170, yPos);
          yPos += 5;
        }
        
        const status = param.status === 'pass' ? '✓ PASS' : '✗ FAIL';
        const color = param.status === 'pass' ? [34, 197, 94] : [251, 146, 60];
        const bgColor = param.status === 'pass' ? [240, 253, 244] : [255, 247, 237];
        
        // Alternating row background
        if (index % 2 === 0) {
          doc.setFillColor(250, 250, 250);
          doc.rect(18, yPos - 3, pageWidth - 36, 6, 'F');
        }
        
        doc.setFont(undefined, 'normal');
        doc.setTextColor(0, 0, 0);
        doc.text(param.name, 18, yPos);
        doc.setFont(undefined, 'bold');
        doc.text(`${param.value}${param.unit}`, 75, yPos);
        doc.setFont(undefined, 'normal');
        doc.text(`${param.range[0]}-${param.range[1]}${param.unit}`, 105, yPos);
        doc.setTextColor(...color);
        doc.setFont(undefined, 'bold');
        doc.text(status, 145, yPos);
        doc.setTextColor(0, 0, 0);
        doc.text(param.score.toFixed(1), 170, yPos);
        yPos += 6;
      });

      yPos += 8;

      // Recommendation
      doc.setFillColor(240, 253, 244);
      const recBoxHeight = 45;
      doc.rect(14, yPos, pageWidth - 28, recBoxHeight, 'F');
      doc.setFillColor(34, 197, 94);
      doc.rect(14, yPos, 4, recBoxHeight, 'F');
      
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Market Recommendation & Strategy:', 22, yPos + 8);
      yPos += 15;

      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      const recommendation = results.grade.startsWith('A') 
        ? 'This premium quality tea powder demonstrates exceptional characteristics suitable for high-end\n' +
          'retail markets, specialty tea brands, and export opportunities. The superior quality justifies\n' +
          'premium pricing and positions the product for maximum profit margins in competitive markets.'
        : results.grade.startsWith('B')
        ? 'This good quality tea powder meets commercial standards and is suitable for standard retail\n' +
          'markets and food service applications. The product demonstrates reliable quality characteristics\n' +
          'that support competitive pricing in mainstream markets with stable demand.'
        : 'This lower grade powder is suitable primarily for industrial applications, bulk commercial use,\n' +
          'or processing operations. Quality improvements are recommended to achieve better market\n' +
          'positioning and enhanced pricing potential in retail segments.';
      
      const recLines = doc.splitTextToSize(recommendation, pageWidth - 46);
      recLines.forEach(line => {
        doc.text(line, 22, yPos);
        yPos += 5;
      });

      yPos += 8;

      // Quality Improvement Suggestions (if not premium grade)
      if (!results.grade.startsWith('A+') && yPos < 250) {
        doc.setFillColor(255, 247, 237);
        doc.rect(14, yPos, pageWidth - 28, 30, 'F');
        doc.setFillColor(251, 146, 60);
        doc.rect(14, yPos, 4, 30, 'F');
        
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text('Quality Improvement Opportunities:', 22, yPos + 8);
        yPos += 14;

        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');
        const failedParams = results.parameterResults.filter(p => p.status === 'fail');
        if (failedParams.length > 0) {
          doc.text(`Focus areas for quality enhancement (${failedParams.length} parameter${failedParams.length > 1 ? 's' : ''} below standard):`, 22, yPos);
          yPos += 5;
          failedParams.slice(0, 3).forEach(p => {
            doc.text(`• ${p.name}: Improve from ${p.value}${p.unit} to ${p.range[0]}-${p.range[1]}${p.unit} range`, 24, yPos);
            yPos += 4;
          });
        } else {
          doc.text('All parameters meet standards. Minor optimization of borderline values can achieve higher grades.', 22, yPos);
        }
      }
    }

    // Footer on all pages
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });
      doc.text('Tea Factory Quality Management System', pageWidth / 2, doc.internal.pageSize.height - 6, { align: 'center' });
    }

    // Save PDF
    const fileName = results 
      ? `Tea_Quality_Report_${results.flavorName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
      : `Tea_Quality_Calculation_Method_${new Date().toISOString().split('T')[0]}.pdf`;
    
    doc.save(fileName);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-3 rounded-lg">
                <Coffee className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Tea Flavor Quality & Price Calculator</h1>
                <p className="text-gray-600 mt-1">Comprehensive quality assessment and price evaluation for tea powder</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <button
                onClick={generatePDF}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg"
              >
                <FileDown className="w-5 h-5" />
                <span className="font-semibold">Export PDF</span>
              </button>
              <div className="text-right">
                <p className="text-sm text-gray-500">Assessment Date</p>
                <p className="text-lg font-semibold text-gray-700">{new Date().toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm p-2 mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('calculator')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                activeTab === 'calculator'
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Beaker className="w-5 h-5" />
              Tea Flavor Quality & Price
            </button>
            <button
              onClick={() => setActiveTab('mlQuality')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                activeTab === 'mlQuality'
                  ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Cpu className="w-5 h-5" />
              AI Tea Leaf Quality Check
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'calculator' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Form */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-green-200">
              <Leaf className="w-6 h-6 text-green-600" />
              <h2 className="text-2xl font-bold text-gray-800">Quality Parameters Input</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tea Flavor Type *
                </label>
                <select
                  name="teaFlavor"
                  value={formData.teaFlavor}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                >
                  <option value="">Select Tea Flavor</option>
                  {teaFlavors.map(flavor => (
                    <option key={flavor.value} value={flavor.value}>
                      {flavor.label} - Base: Rs {flavor.basePrice.toLocaleString()}/kg
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Particle Size (mesh) *
                  </label>
                  <input
                    type="number"
                    name="particleSize"
                    value={formData.particleSize}
                    onChange={handleInputChange}
                    placeholder="e.g., 100"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Moisture Content (%) *
                  </label>
                  <input
                    type="number"
                    name="moistureContent"
                    value={formData.moistureContent}
                    onChange={handleInputChange}
                    placeholder="e.g., 3.0"
                    step="0.1"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Color Value (L*) *
                  </label>
                  <input
                    type="number"
                    name="colorValue"
                    value={formData.colorValue}
                    onChange={handleInputChange}
                    placeholder="e.g., 75"
                    step="0.1"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Aroma Power (0-10) *
                  </label>
                  <input
                    type="number"
                    name="aromaPower"
                    value={formData.aromaPower}
                    onChange={handleInputChange}
                    placeholder="e.g., 8"
                    min="0"
                    max="10"
                    step="0.1"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Taste Strength (0-10) *
                  </label>
                  <input
                    type="number"
                    name="tasteStrength"
                    value={formData.tasteStrength}
                    onChange={handleInputChange}
                    placeholder="e.g., 8"
                    min="0"
                    max="10"
                    step="0.1"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Solubility (%) *
                  </label>
                  <input
                    type="number"
                    name="solubility"
                    value={formData.solubility}
                    onChange={handleInputChange}
                    placeholder="e.g., 97"
                    step="0.1"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Caffeine Content (%) *
                  </label>
                  <input
                    type="number"
                    name="caffeineContent"
                    value={formData.caffeineContent}
                    onChange={handleInputChange}
                    placeholder="e.g., 3.2"
                    step="0.1"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Powder Fineness (%) *
                  </label>
                  <input
                    type="number"
                    name="powderFineness"
                    value={formData.powderFineness}
                    onChange={handleInputChange}
                    placeholder="e.g., 95"
                    step="0.1"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Batch Weight (kg) *
                </label>
                <input
                  type="number"
                  name="batchWeight"
                  value={formData.batchWeight}
                  onChange={handleInputChange}
                  placeholder="e.g., 100"
                  step="0.1"
                  className="w-full px-4 py-3 border-2 border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
                <p className="text-xs text-gray-600 mt-2">Enter total batch weight for price calculation</p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={calculateQualityAndPrice}
                  disabled={!formData.teaFlavor || !formData.particleSize || !formData.batchWeight}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 rounded-lg font-semibold hover:from-green-600 hover:to-emerald-700 transition-all shadow-md hover:shadow-lg disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed"
                >
                  Calculate Quality & Price
                </button>
                <button
                  onClick={clearForm}
                  className="px-6 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-all"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          {/* Results Panel */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-green-200">
              <Award className="w-6 h-6 text-green-600" />
              <h2 className="text-2xl font-bold text-gray-800">Quality & Price Results</h2>
            </div>

            {!results ? (
              <div className="flex flex-col items-center justify-center h-96 text-gray-400">
                <Coffee className="w-24 h-24 mb-4 opacity-30" />
                <p className="text-lg text-center">Enter tea powder parameters to calculate<br />quality grade and pricing</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Grade Card */}
                <div className={`bg-gradient-to-r ${getGradeColor(results.grade)} rounded-xl p-6 text-white shadow-lg`}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm opacity-90">Tea Flavor</p>
                      <p className="text-2xl font-bold">{results.flavorName}</p>
                    </div>
                    <div className="bg-white bg-opacity-20 backdrop-blur-sm w-24 h-24 rounded-full flex items-center justify-center border-4 border-white">
                      <span className="text-4xl font-bold">{results.grade}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold">{results.gradeLabel}</span>
                      <span className="text-2xl font-bold">{results.qualityScore.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-white bg-opacity-30 rounded-full h-3">
                      <div
                        className="bg-white h-3 rounded-full transition-all duration-500"
                        style={{ width: `${results.qualityScore}%` }}
                      ></div>
                    </div>
                    <p className="text-sm opacity-90 mt-3">{results.qualityStatus}</p>
                  </div>
                </div>

                {/* Price Information */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border-2 border-green-200">
                  <div className="flex items-center gap-2 mb-4">
                    <DollarSign className="w-6 h-6 text-green-600" />
                    <h3 className="text-xl font-bold text-gray-800">Price Analysis</h3>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <p className="text-xs text-gray-600 mb-1">Base Price</p>
                      <p className="text-2xl font-bold text-gray-800">Rs {results.basePrice.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">per kg</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <p className="text-xs text-gray-600 mb-1">Quality Adjusted</p>
                      <p className="text-2xl font-bold text-green-600">Rs {results.adjustedPricePerKg.toFixed(0).toLocaleString()}</p>
                      <p className="text-xs text-gray-500">per kg</p>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-lg shadow-sm mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-700">Price Multiplier</span>
                      <span className="text-lg font-bold text-green-600">×{results.priceMultiplier.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-700">vs Market Average</span>
                      <span className={`text-lg font-bold ${results.priceDifference >= 0 ? 'text-green-600' : 'text-orange-600'}`}>
                        {results.priceDifference >= 0 ? '+' : ''}{results.pricePercentDiff}%
                      </span>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-5 rounded-lg text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm opacity-90">Total Batch Value</p>
                        <p className="text-xs opacity-75 mt-1">{results.batchWeight} kg batch</p>
                      </div>
                      <p className="text-3xl font-bold">Rs {results.totalBatchValue.toFixed(0).toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* Parameter Details */}
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    Parameter Assessment
                  </h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                    {results.parameterResults.map((param, index) => (
                      <div key={index} className="bg-gray-50 p-3 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(param.status)}
                            <span className="font-semibold text-gray-800 text-sm">{param.name}</span>
                          </div>
                          <span className={`font-bold ${param.status === 'pass' ? 'text-green-600' : 'text-orange-600'}`}>
                            {param.value}{param.unit}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-600">
                            Standard: {param.range[0]}-{param.range[1]}{param.unit}
                          </span>
                          <span className="text-gray-500">
                            Score: {param.score.toFixed(1)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommendation */}
                <div className={`p-4 rounded-lg border-l-4 ${
                  results.grade.startsWith('A') 
                    ? 'bg-green-50 border-green-500' 
                    : results.grade.startsWith('B')
                    ? 'bg-blue-50 border-blue-500'
                    : 'bg-yellow-50 border-yellow-500'
                }`}>
                  <h4 className="font-bold text-gray-800 mb-2">Market Recommendation</h4>
                  <p className="text-sm text-gray-700">
                    {results.grade.startsWith('A') 
                      ? 'Premium quality tea powder suitable for high-end retail markets and specialty tea brands. Excellent profit margins expected.'
                      : results.grade.startsWith('B')
                      ? 'Good quality tea powder suitable for commercial retail and food service applications. Standard market pricing recommended.'
                      : 'Lower grade powder suitable for industrial applications or bulk commercial use. Consider quality improvements for better pricing.'
                    }
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
        ) : (
        /* ==================== ML Quality Check Tab ==================== */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ML Input Form */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-purple-200">
              <Cpu className="w-6 h-6 text-purple-600" />
              <div>
                <h2 className="text-2xl font-bold text-gray-800">AI Quality Prediction</h2>
                <p className="text-sm text-gray-500 mt-1">ML-powered tea leaf quality assessment</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tea Flavor Type *
                </label>
                <select
                  name="teaFlavor"
                  value={mlFormData.teaFlavor}
                  onChange={handleMlInputChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                >
                  <option value="">Select Tea Flavor</option>
                  {teaFlavors.map(flavor => (
                    <option key={flavor.value} value={flavor.value}>
                      {flavor.label} - Base: Rs {flavor.basePrice.toLocaleString()}/kg
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Base Price (Rs) *
                  </label>
                  <input
                    type="number"
                    name="basePrice"
                    value={mlFormData.basePrice}
                    onChange={handleMlInputChange}
                    placeholder="e.g. 25500"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Moisture (%) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    name="moisture"
                    value={mlFormData.moisture}
                    onChange={handleMlInputChange}
                    placeholder="e.g. 4.5"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Quality Score (88-100) *
                  </label>
                  <input
                    type="number"
                    name="qualityScore"
                    value={mlFormData.qualityScore}
                    onChange={handleMlInputChange}
                    placeholder="e.g. 95"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Caffeine (%) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    name="caffeine"
                    value={mlFormData.caffeine}
                    onChange={handleMlInputChange}
                    placeholder="e.g. 3.5"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Fineness (%) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    name="fineness"
                    value={mlFormData.fineness}
                    onChange={handleMlInputChange}
                    placeholder="e.g. 95"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Batch Weight (kg) *
                  </label>
                  <input
                    type="number"
                    name="batchWeight"
                    value={mlFormData.batchWeight}
                    onChange={handleMlInputChange}
                    placeholder="e.g. 100"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleMlPredict}
                  disabled={mlLoading || !mlFormData.teaFlavor || !mlFormData.moisture || !mlFormData.qualityScore || !mlFormData.caffeine || !mlFormData.fineness || !mlFormData.batchWeight}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                >
                  {mlLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Predicting...
                    </>
                  ) : (
                    <>
                      <Cpu className="w-5 h-5" />
                      Predict Quality
                    </>
                  )}
                </button>
                <button
                  onClick={clearMlForm}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all font-semibold"
                >
                  Clear
                </button>
              </div>

              {mlError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  <strong>Error:</strong> {mlError}
                </div>
              )}
            </div>
          </div>

          {/* ML Results Panel */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-purple-200">
              <BarChart3 className="w-6 h-6 text-purple-600" />
              <h2 className="text-2xl font-bold text-gray-800">AI Prediction Results</h2>
            </div>

            {!mlResults ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <Cpu className="w-16 h-16 mb-4 opacity-30" />
                <p className="text-lg font-medium">Enter parameters and click &quot;Predict Quality&quot;</p>
                <p className="text-sm mt-2">AI model will analyze the tea leaf quality</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Quality Result Card */}
                <div className={`bg-gradient-to-r ${getQualityColor(mlResults.quality).bg} rounded-xl p-6 text-white`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm opacity-90">AI Predicted Quality</p>
                      <h3 className="text-3xl font-bold mt-1 capitalize">{mlResults.quality}</h3>
                      <p className="text-sm opacity-80 mt-1">Quality Classification</p>
                    </div>
                    <div className="text-right">
                      <div className="w-20 h-20 rounded-full bg-white bg-opacity-20 flex items-center justify-center">
                        <span className="text-2xl font-bold">{mlResults.percentage}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 bg-white bg-opacity-20 rounded-full h-3">
                    <div
                      className="bg-white rounded-full h-3 transition-all duration-1000"
                      style={{ width: `${mlResults.percentage}%` }}
                    />
                  </div>
                </div>

                {/* Grade Percentage */}
                <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                  <div className="flex items-center gap-2 mb-3">
                    <Award className="w-5 h-5 text-purple-600" />
                    <h4 className="font-bold text-gray-800">Grade Percentage</h4>
                  </div>
                  <div className="flex items-end gap-2">
                    <span className="text-5xl font-bold text-purple-600">{mlResults.percentage}</span>
                    <span className="text-2xl text-gray-400 mb-1">%</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    {mlResults.percentage >= 95 ? 'Exceptional grade - suitable for premium markets' :
                     mlResults.percentage >= 90 ? 'High grade - excellent quality product' :
                     mlResults.percentage >= 85 ? 'Good grade - meets commercial standards' :
                     'Standard grade - may need quality improvements'}
                  </p>
                </div>

                {/* Quality Probabilities */}
                {mlResults.qualityProbabilities && (
                  <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                    <div className="flex items-center gap-2 mb-4">
                      <BarChart3 className="w-5 h-5 text-purple-600" />
                      <h4 className="font-bold text-gray-800">Quality Probability Breakdown</h4>
                    </div>
                    <div className="space-y-3">
                      {Object.entries(mlResults.qualityProbabilities)
                        .sort(([,a], [,b]) => b - a)
                        .map(([cls, prob]) => (
                        <div key={cls}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-semibold text-gray-700 capitalize">{cls}</span>
                            <span className={`text-sm font-bold ${getQualityColor(cls).text}`}>{prob}%</span>
                          </div>
                          <div className="bg-gray-200 rounded-full h-2.5">
                            <div
                              className={`rounded-full h-2.5 transition-all duration-700 bg-gradient-to-r ${getQualityColor(cls).bg}`}
                              style={{ width: `${prob}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Processing Info */}
                <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
                  <Cpu className="w-4 h-4" />
                  <span>Processed by XGBoost ML Model in {mlResults.processingTime}ms</span>
                </div>
              </div>
            )}
          </div>
        </div>
        )}
      </div>
    </div>
  );
};

export default TeaQuality;
