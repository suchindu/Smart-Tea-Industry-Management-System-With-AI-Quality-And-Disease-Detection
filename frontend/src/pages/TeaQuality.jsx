import React, { useState } from 'react';
import { Coffee, DollarSign, Award, TrendingUp, Cpu, BarChart3, Loader2, FileDown, CheckCircle2, XCircle, Info, X } from 'lucide-react';
import jsPDF from 'jspdf';
import { predictTeaQuality } from '../api/teaFlavorQuality';

const TeaQuality = () => {
  // ML form state
  const [formData, setFormData] = useState({
    teaFlavor: '',
    basePrice: '',
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showInfoModal, setShowInfoModal] = useState(false);

  // Tea flavor definitions
  const teaFlavors = [
    { value: 'black_tea', label: 'Black Tea Powder', basePrice: 25500 },
    { value: 'green_tea', label: 'Green Tea Powder', basePrice: 36000 },
    { value: 'oolong_tea', label: 'Oolong Tea Powder', basePrice: 42000 },
    { value: 'white_tea', label: 'White Tea Powder', basePrice: 54000 },
    { value: 'matcha', label: 'Matcha Powder', basePrice: 105000 },
    { value: 'chai_spice', label: 'Chai Spice Tea Powder', basePrice: 28500 },
    { value: 'earl_grey', label: 'Earl Grey Tea Powder', basePrice: 33000 }
  ];

  // Handle input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const updated = { ...formData, [name]: value };

    // Auto-fill base price when tea flavor is selected
    if (name === 'teaFlavor') {
      const flavor = teaFlavors.find(t => t.value === value);
      if (flavor) {
        updated.basePrice = flavor.basePrice.toString();
      }
    }
    setFormData(updated);
  };

  // Submit prediction
  const handlePredict = async () => {
    setError(null);
    setLoading(true);
    try {
      const response = await predictTeaQuality({
        teaFlavor: formData.teaFlavor,
        basePrice: parseFloat(formData.basePrice),
        particleSize: parseFloat(formData.particleSize),
        moistureContent: parseFloat(formData.moistureContent),
        colorValue: parseFloat(formData.colorValue),
        aromaPower: parseFloat(formData.aromaPower),
        tasteStrength: parseFloat(formData.tasteStrength),
        solubility: parseFloat(formData.solubility),
        caffeineContent: parseFloat(formData.caffeineContent),
        powderFineness: parseFloat(formData.powderFineness),
        batchWeight: parseFloat(formData.batchWeight)
      });
      if (response.success) {
        setResults(response.data);
      } else {
        setError(response.message || 'Prediction failed');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Prediction failed');
    } finally {
      setLoading(false);
    }
  };

  // Clear form
  const clearForm = () => {
    setFormData({
      teaFlavor: '', basePrice: '', particleSize: '', moistureContent: '',
      colorValue: '', aromaPower: '', tasteStrength: '', solubility: '',
      caffeineContent: '', powderFineness: '', batchWeight: ''
    });
    setResults(null);
    setError(null);
  };

  // Color helpers
  const getQualityColor = (quality) => {
    switch (quality) {
      case 'Premium': return { bg: 'from-emerald-500 to-green-600', text: 'text-emerald-600', light: 'bg-emerald-50', border: 'border-emerald-200' };
      case 'Superior': return { bg: 'from-teal-500 to-cyan-600', text: 'text-teal-600', light: 'bg-teal-50', border: 'border-teal-200' };
      case 'High': return { bg: 'from-blue-500 to-indigo-600', text: 'text-blue-600', light: 'bg-blue-50', border: 'border-blue-200' };
      case 'Good': return { bg: 'from-sky-500 to-blue-500', text: 'text-sky-600', light: 'bg-sky-50', border: 'border-sky-200' };
      case 'Standard': return { bg: 'from-violet-500 to-purple-600', text: 'text-violet-600', light: 'bg-violet-50', border: 'border-violet-200' };
      case 'Commercial': return { bg: 'from-yellow-500 to-amber-500', text: 'text-amber-600', light: 'bg-amber-50', border: 'border-amber-200' };
      case 'Low': return { bg: 'from-orange-500 to-red-500', text: 'text-orange-600', light: 'bg-orange-50', border: 'border-orange-200' };
      case 'Reject': return { bg: 'from-red-600 to-rose-700', text: 'text-red-600', light: 'bg-red-50', border: 'border-red-200' };
      default: return { bg: 'from-gray-500 to-gray-600', text: 'text-gray-600', light: 'bg-gray-50', border: 'border-gray-200' };
    }
  };

  // Check if form is valid
  const isFormValid = formData.teaFlavor && formData.particleSize && formData.moistureContent &&
    formData.colorValue && formData.aromaPower && formData.tasteStrength &&
    formData.solubility && formData.caffeineContent && formData.powderFineness && formData.batchWeight;

  // Generate PDF report
  const generatePDF = () => {
    if (!results) return;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    let yPos = 20;

    // Header
    doc.setFillColor(124, 58, 237);
    doc.rect(0, 0, pageWidth, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont(undefined, 'bold');
    doc.text('Tea Quality Prediction Report', pageWidth / 2, 15, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, pageWidth / 2, 25, { align: 'center' });

    yPos = 45;
    doc.setTextColor(0, 0, 0);

    // Quality Result
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text(`Predicted Quality: ${results.quality} Grade`, 14, yPos);
    yPos += 8;
    doc.setFontSize(12);
    doc.text(`Quality Score: ${results.percentage}%`, 14, yPos);
    yPos += 12;

    // Pricing
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Price Analysis', 14, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    const pricing = results.pricing;
    doc.text(`Base Price: Rs ${pricing.basePrice.toLocaleString()}/kg`, 14, yPos); yPos += 6;
    doc.text(`Price Multiplier: x${pricing.priceMultiplier.toFixed(2)}`, 14, yPos); yPos += 6;
    doc.text(`Adjusted Price: Rs ${pricing.adjustedPricePerKg.toLocaleString()}/kg`, 14, yPos); yPos += 6;
    doc.text(`Batch Weight: ${pricing.batchWeight} kg`, 14, yPos); yPos += 6;
    doc.text(`Total Batch Value: Rs ${pricing.totalBatchValue.toLocaleString()}`, 14, yPos); yPos += 6;
    doc.text(`Price Difference: ${pricing.pricePercentDiff}%`, 14, yPos); yPos += 12;

    // Probabilities
    if (results.qualityProbabilities) {
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('Quality Probability Breakdown', 14, yPos);
      yPos += 8;

      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      Object.entries(results.qualityProbabilities)
        .sort(([, a], [, b]) => b - a)
        .forEach(([cls, prob]) => {
          doc.text(`${cls}: ${prob}%`, 18, yPos);
          yPos += 5;
        });
    }

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });
      doc.text('Tea Factory Quality Management System - AI Prediction', pageWidth / 2, doc.internal.pageSize.height - 6, { align: 'center' });
    }

    const selectedFlavor = teaFlavors.find(f => f.value === formData.teaFlavor);
    const flavorName = selectedFlavor ? selectedFlavor.label.replace(/\s+/g, '_') : 'Unknown';
    doc.save(`AI_Tea_Quality_Report_${flavorName}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-3 rounded-lg">
                <Cpu className="w-8 h-8 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold text-gray-800">Tea Quality & Price Predictor</h1>
                  <button 
                    onClick={() => setShowInfoModal(true)} 
                    className="text-purple-500 hover:text-purple-700 transition-colors p-1 rounded-full hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    title="View Quality Calculation Info"
                  >
                    <Info className="w-6 h-6" />
                  </button>
                </div>
                <p className="text-gray-600 mt-1">ML-powered quality assessment and price calculation</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              {results && (
                <button
                  onClick={generatePDF}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg"
                >
                  <FileDown className="w-5 h-5" />
                  <span className="font-semibold">Export PDF</span>
                </button>
              )}
              <div className="text-right">
                <p className="text-sm text-gray-500">Assessment Date</p>
                <p className="text-lg font-semibold text-gray-700">{new Date().toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ── Input Form ── */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-purple-200">
              <Coffee className="w-6 h-6 text-purple-600" />
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Quality Parameters</h2>
                <p className="text-sm text-gray-500 mt-1">Enter tea powder parameters for AI analysis</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Tea Flavor */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Tea Flavor Type *</label>
                <select
                  name="teaFlavor"
                  value={formData.teaFlavor}
                  onChange={handleInputChange}
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

              {/* Base Price (auto-filled, editable) */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Base Price (Rs/kg) *</label>
                <input
                  type="number"
                  name="basePrice"
                  value={formData.basePrice}
                  onChange={handleInputChange}
                  placeholder="Auto-filled from tea flavor"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all bg-purple-50"
                />
              </div>

              {/* Quality Parameters Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Particle Size (mesh) *</label>
                  <input type="number" name="particleSize" value={formData.particleSize} onChange={handleInputChange}
                    placeholder="e.g., 100" className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Moisture (%) *</label>
                  <input type="number" step="0.1" name="moistureContent" value={formData.moistureContent} onChange={handleInputChange}
                    placeholder="e.g., 3.0" className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Color Value (L*) *</label>
                  <input type="number" step="0.1" name="colorValue" value={formData.colorValue} onChange={handleInputChange}
                    placeholder="e.g., 75" className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Aroma Power (0-10) *</label>
                  <input type="number" step="0.1" min="0" max="10" name="aromaPower" value={formData.aromaPower} onChange={handleInputChange}
                    placeholder="e.g., 8" className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Taste Strength (0-10) *</label>
                  <input type="number" step="0.1" min="0" max="10" name="tasteStrength" value={formData.tasteStrength} onChange={handleInputChange}
                    placeholder="e.g., 8" className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Solubility (%) *</label>
                  <input type="number" step="0.1" name="solubility" value={formData.solubility} onChange={handleInputChange}
                    placeholder="e.g., 97" className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Caffeine (%) *</label>
                  <input type="number" step="0.1" name="caffeineContent" value={formData.caffeineContent} onChange={handleInputChange}
                    placeholder="e.g., 3.2" className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Powder Fineness (%) *</label>
                  <input type="number" step="0.1" name="powderFineness" value={formData.powderFineness} onChange={handleInputChange}
                    placeholder="e.g., 95" className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all" />
                </div>
              </div>

              {/* Batch Weight */}
              <div className="bg-purple-50 p-4 rounded-lg border-2 border-purple-200">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Batch Weight (kg) *</label>
                <input type="number" step="0.1" name="batchWeight" value={formData.batchWeight} onChange={handleInputChange}
                  placeholder="e.g., 100" className="w-full px-4 py-3 border-2 border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500" />
                <p className="text-xs text-gray-600 mt-2">Enter total batch weight for price calculation</p>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handlePredict}
                  disabled={loading || !isFormValid}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                >
                  {loading ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Predicting...</>
                  ) : (
                    <><Cpu className="w-5 h-5" /> Predict Quality & Price</>
                  )}
                </button>
                <button
                  onClick={clearForm}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all font-semibold"
                >
                  Clear
                </button>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  <strong>Error:</strong> {error}
                </div>
              )}
            </div>
          </div>

          {/* ── Results Panel ── */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-purple-200">
              <BarChart3 className="w-6 h-6 text-purple-600" />
              <h2 className="text-2xl font-bold text-gray-800"> Prediction & Pricing Results</h2>
            </div>

            {!results ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <Cpu className="w-16 h-16 mb-4 opacity-30" />
                <p className="text-lg font-medium">Enter parameters and click &quot;Predict Quality & Price&quot;</p>
                <p className="text-sm mt-2">AI model will analyze the tea leaf quality and calculate pricing</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Quality Result Card */}
                <div className={`bg-gradient-to-r ${getQualityColor(results.quality).bg} rounded-xl p-6 text-white`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm opacity-90">AI Predicted Quality</p>
                      <h3 className="text-3xl font-bold mt-1">{results.quality} Grade</h3>
                      <p className="text-sm opacity-80 mt-1">Quality Classification</p>
                    </div>
                    <div className="text-right">
                      <div className="w-20 h-20 rounded-full bg-white bg-opacity-20 flex items-center justify-center">
                        <span className="text-2xl font-bold">{results.percentage}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 bg-white bg-opacity-20 rounded-full h-3">
                    <div
                      className="bg-white rounded-full h-3 transition-all duration-1000"
                      style={{ width: `${results.percentage}%` }}
                    />
                  </div>
                </div>

                {/* Price Analysis Card */}
                {results.pricing && (
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border-2 border-green-200">
                    <div className="flex items-center gap-2 mb-4">
                      <DollarSign className="w-6 h-6 text-green-600" />
                      <h3 className="text-xl font-bold text-gray-800">Price Analysis</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-white p-4 rounded-lg shadow-sm">
                        <p className="text-xs text-gray-600 mb-1">Base Price</p>
                        <p className="text-2xl font-bold text-gray-800">Rs {results.pricing.basePrice.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">per kg</p>
                      </div>
                      <div className="bg-white p-4 rounded-lg shadow-sm">
                        <p className="text-xs text-gray-600 mb-1">Quality Adjusted</p>
                        <p className="text-2xl font-bold text-green-600">Rs {results.pricing.adjustedPricePerKg.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">per kg</p>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-lg shadow-sm mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-gray-700">Price Multiplier</span>
                        <span className="text-lg font-bold text-green-600">x{results.pricing.priceMultiplier.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-700">vs Base Price</span>
                        <span className={`text-lg font-bold ${results.pricing.priceDifference >= 0 ? 'text-green-600' : 'text-orange-600'}`}>
                          {results.pricing.priceDifference >= 0 ? '+' : ''}{results.pricing.pricePercentDiff}%
                        </span>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-5 rounded-lg text-white">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm opacity-90">Total Batch Value</p>
                          <p className="text-xs opacity-75 mt-1">{results.pricing.batchWeight} kg batch</p>
                        </div>
                        <p className="text-3xl font-bold">Rs {results.pricing.totalBatchValue.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Quality Probabilities */}
                {results.qualityProbabilities && (
                  <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                    <div className="flex items-center gap-2 mb-4">
                      <BarChart3 className="w-5 h-5 text-purple-600" />
                      <h4 className="font-bold text-gray-800">Quality Probability Breakdown</h4>
                    </div>
                    <div className="space-y-3">
                      {Object.entries(results.qualityProbabilities)
                        .sort(([, a], [, b]) => b - a)
                        .map(([cls, prob]) => (
                          <div key={cls}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-semibold text-gray-700">{cls}</span>
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
                  <span>Processed by XGBoost ML Model in {results.processingTime}ms</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Info Modal */}
      {showInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-800">Quality Calculation Guide</h3>
              </div>
              <button 
                onClick={() => setShowInfoModal(false)}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-200 p-2 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {/* Modal Content */}
            <div className="p-6 overflow-y-auto">
              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2 text-lg">How is Quality Calculated?</h4>
                  <p className="text-gray-600 leading-relaxed text-sm">
                    Our AI model evaluates 8 physical and chemical parameters of the tea leaf powder. 
                    These parameters are compared against strict standards for each specific tea flavor (e.g., Matcha vs. Black Tea).
                    The model predicts a <strong className="text-purple-600">Quality Score Percentage (0-100%)</strong> which maps directly to a market <strong className="text-purple-600">Grade Label</strong>.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-800 mb-3 text-lg">Grade Multipliers</h4>
                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left font-semibold text-gray-700">Grade Label</th>
                          <th className="px-6 py-3 text-left font-semibold text-gray-700">Score Range</th>
                          <th className="px-6 py-3 text-left font-semibold text-gray-700">Price Multiplier</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        <tr className="hover:bg-green-50"><td className="px-6 py-3 font-medium text-emerald-600">Premium</td><td className="px-6 py-3 text-gray-600">≥ 95%</td><td className="px-6 py-3 font-bold text-gray-800">1.35x</td></tr>
                        <tr className="hover:bg-teal-50"><td className="px-6 py-3 font-medium text-teal-600">Superior</td><td className="px-6 py-3 text-gray-600">90% - 94%</td><td className="px-6 py-3 font-bold text-gray-800">1.25x</td></tr>
                        <tr className="hover:bg-blue-50"><td className="px-6 py-3 font-medium text-blue-600">High</td><td className="px-6 py-3 text-gray-600">85% - 89%</td><td className="px-6 py-3 font-bold text-gray-800">1.15x</td></tr>
                        <tr className="hover:bg-sky-50"><td className="px-6 py-3 font-medium text-sky-600">Good</td><td className="px-6 py-3 text-gray-600">80% - 84%</td><td className="px-6 py-3 font-bold text-gray-800">1.05x</td></tr>
                        <tr className="hover:bg-violet-50"><td className="px-6 py-3 font-medium text-violet-600">Standard</td><td className="px-6 py-3 text-gray-600">75% - 79%</td><td className="px-6 py-3 font-bold text-gray-800">1.00x (Base)</td></tr>
                        <tr className="hover:bg-amber-50"><td className="px-6 py-3 font-medium text-amber-600">Commercial</td><td className="px-6 py-3 text-gray-600">70% - 74%</td><td className="px-6 py-3 font-bold text-gray-800">0.90x</td></tr>
                        <tr className="hover:bg-orange-50"><td className="px-6 py-3 font-medium text-orange-600">Low</td><td className="px-6 py-3 text-gray-600">60% - 69%</td><td className="px-6 py-3 font-bold text-gray-800">0.75x</td></tr>
                        <tr className="hover:bg-red-50"><td className="px-6 py-3 font-medium text-red-600">Reject</td><td className="px-6 py-3 text-gray-600">&lt; 60%</td><td className="px-6 py-3 font-bold text-gray-800">0.50x</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                  <h4 className="font-bold text-purple-800 mb-2">Price Formula</h4>
                  <code className="block bg-white p-3 rounded border border-purple-200 text-sm font-mono text-purple-700 shadow-sm">
                    Adjusted Price = Base Price × Price Multiplier<br/>
                    Total Batch Value = Adjusted Price × Batch Weight
                  </code>
                </div>
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button 
                onClick={() => setShowInfoModal(false)}
                className="px-6 py-2.5 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors font-semibold shadow-md"
              >
                Close Guide
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeaQuality;
