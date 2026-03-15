const Payment = require('../models/Payment');
const TeaLeafEntry = require('../models/TeaLeafEntry');
const Supplier = require('../models/Supplier');
const Advance = require('../models/Advance');
const TeaRate = require('../models/TeaRate');
const BankBatch = require('../models/BankBatch');

const getActorUserId = (req) => req?.user?.userId || req?.user?.id || req?.user?._id;

// Calculate monthly payments for suppliers
exports.calculateMonthlyPayments = async (req, res) => {
    try {
        const { factoryId, month, year, supplierIds } = req.body;

        if (!factoryId || !month || !year) {
            return res.status(400).json({
                success: false,
                message: 'Factory ID, month, and year are required'
            });
        }

        // Get active tea rate
        const teaRate = await TeaRate.findOne({
            factoryId,
            status: 'Active'
        }).sort({ effectiveDate: -1 });

        if (!teaRate) {
            return res.status(404).json({
                success: false,
                message: 'No active tea rate found'
            });
        }

        // Get tea leaf entries for the specified period
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        const query = {
            factoryId,
            date: { $gte: startDate, $lte: endDate },
            status: { $in: ['Recorded', 'Verified'] }
        };

        if (supplierIds && supplierIds.length > 0) {
            query.supplierId = { $in: supplierIds };
        }

        const teaLeafEntries = await TeaLeafEntry.find(query)
            .populate('supplierId')
            .populate('routeId');

        // Group by supplier
        const supplierMap = {};
        teaLeafEntries.forEach(entry => {
            const supplierId = entry.supplierId._id.toString();
            if (!supplierMap[supplierId]) {
                supplierMap[supplierId] = {
                    supplier: entry.supplierId,
                    routeId: entry.routeId._id,
                    entries: [],
                    totalWeight: 0,
                    totalBagWeight: 0,
                    totalWaterWeight: 0,
                    totalCoarseLeafWeight: 0,
                    netWeight: 0,
                    grossAmount: 0
                };
            }
            supplierMap[supplierId].entries.push(entry);
            supplierMap[supplierId].totalWeight += entry.weight;
            supplierMap[supplierId].totalBagWeight += entry.bagWeight || 0;
            supplierMap[supplierId].totalWaterWeight += entry.waterWeight || 0;
            supplierMap[supplierId].totalCoarseLeafWeight += entry.coarseLeafWeight || 0;
            supplierMap[supplierId].netWeight += entry.netWeight;
            supplierMap[supplierId].grossAmount += entry.netAmount;
        });

        // Calculate payments for each supplier
        const calculatedPayments = [];
        for (const supplierId in supplierMap) {
            const data = supplierMap[supplierId];

            // Get advances for this supplier in this period
            const advances = await Advance.find({
                supplierId,
                status: 'APPROVED',
                approvedDate: { $gte: startDate, $lte: endDate }
            });

            const totalAdvances = advances.reduce((sum, adv) => sum + adv.approvedAmount, 0);

            // Calculate transport cost
            const transportCost = data.netWeight * teaRate.transportRatePerKg;

            // Calculate total deductions
            const deductions = {
                advances: totalAdvances,
                fertilizer: data.supplier.outstandingFertilizer || 0,
                transport: transportCost,
                loans: 0, // TODO: Implement loan deductions
                others: 0
            };

            const totalDeductions = Object.values(deductions).reduce((sum, val) => sum + val, 0);
            const finalAmount = data.grossAmount - totalDeductions;

            const payment = new Payment({
                supplierId: data.supplier._id,
                factoryId,
                routeId: data.routeId,
                paymentType: 'Monthly',
                paymentPeriod: { month, year },
                totalWeight: data.totalWeight,
                bagWeight: data.totalBagWeight,
                waterWeight: data.totalWaterWeight,
                coarseLeafWeight: data.totalCoarseLeafWeight,
                netWeight: data.netWeight,
                ratePerKg: teaRate.defaultRate,
                grossAmount: data.grossAmount,
                deductions,
                totalDeductions,
                finalAmount,
                paymentMethod: data.supplier.preferredPaymentMethod,
                paymentStatus: 'Calculated',
                teaLeafEntries: data.entries.map(e => e._id)
            });

            await payment.save();

            // Update tea leaf entries status
            await TeaLeafEntry.updateMany(
                { _id: { $in: data.entries.map(e => e._id) } },
                { status: 'Processed' }
            );

            calculatedPayments.push(payment);
        }

        res.status(200).json({
            success: true,
            message: `Successfully calculated payments for ${calculatedPayments.length} suppliers`,
            data: calculatedPayments
        });
    } catch (error) {
        console.error('Error calculating monthly payments:', error);
        res.status(500).json({
            success: false,
            message: 'Error calculating monthly payments',
            error: error.message
        });
    }
};

// Get monthly payments for approval
exports.getMonthlyPaymentsForApproval = async (req, res) => {
    try {
        const { factoryId, month, year, page = 0, limit = 10 } = req.query;

        const query = {
            factoryId,
            paymentType: 'Monthly',
            paymentStatus: 'Calculated'
        };

        if (month) query['paymentPeriod.month'] = parseInt(month);
        if (year) query['paymentPeriod.year'] = parseInt(year);

        const skip = parseInt(page) * parseInt(limit);

        const payments = await Payment.find(query)
            .populate('supplierId')
            .populate('routeId')
            .sort({ calculatedDate: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Payment.countDocuments(query);

        res.status(200).json({
            success: true,
            content: payments,
            totalElements: total,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page)
        });
    } catch (error) {
        console.error('Error fetching payments for approval:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching payments for approval',
            error: error.message
        });
    }
};

// Approve monthly payments
exports.approveMonthlyPayments = async (req, res) => {
    try {
        const { paymentIds } = req.body;
        const approvedBy = getActorUserId(req);

        if (!paymentIds || paymentIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Payment IDs are required'
            });
        }

        if (!approvedBy) {
            return res.status(401).json({
                success: false,
                message: 'Authenticated user is required to approve payments'
            });
        }

        const result = await Payment.updateMany(
            { _id: { $in: paymentIds }, paymentStatus: 'Calculated' },
            {
                paymentStatus: 'Approved',
                approvedBy,
                approvedDate: new Date()
            }
        );

        res.status(200).json({
            success: true,
            message: `Successfully approved ${result.modifiedCount} payments`,
            data: result
        });
    } catch (error) {
        console.error('Error approving payments:', error);
        res.status(500).json({
            success: false,
            message: 'Error approving payments',
            error: error.message
        });
    }
};

// Create ad-hoc payment
exports.createAdhocPayment = async (req, res) => {
    try {
        const paymentData = req.body;
        paymentData.paymentType = 'Adhoc';
        paymentData.paymentStatus = 'Calculated';

        const payment = new Payment(paymentData);
        await payment.save();

        res.status(201).json({
            success: true,
            message: 'Ad-hoc payment created successfully',
            data: payment
        });
    } catch (error) {
        console.error('Error creating ad-hoc payment:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating ad-hoc payment',
            error: error.message
        });
    }
};

// Get pending ad-hoc payments
exports.getPendingAdhocPayments = async (req, res) => {
    try {
        const { factoryId, page = 0, limit = 10 } = req.query;

        const query = {
            factoryId,
            paymentType: 'Adhoc',
            paymentStatus: 'Calculated'
        };

        const skip = parseInt(page) * parseInt(limit);

        const payments = await Payment.find(query)
            .populate('supplierId')
            .populate('routeId')
            .sort({ calculatedDate: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Payment.countDocuments(query);

        res.status(200).json({
            success: true,
            content: payments,
            totalElements: total,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page)
        });
    } catch (error) {
        console.error('Error fetching pending ad-hoc payments:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching pending ad-hoc payments',
            error: error.message
        });
    }
};

// Approve ad-hoc payment
exports.approveAdhocPayment = async (req, res) => {
    try {
        const { paymentId } = req.params;
        const { notes } = req.body;
        const approvedBy = getActorUserId(req);

        if (!approvedBy) {
            return res.status(401).json({
                success: false,
                message: 'Authenticated user is required to approve payments'
            });
        }

        const payment = await Payment.findById(paymentId);
        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found'
            });
        }

        payment.paymentStatus = 'Approved';
        payment.approvedBy = approvedBy;
        payment.approvedDate = new Date();
        if (notes) payment.notes = notes;

        await payment.save();

        res.status(200).json({
            success: true,
            message: 'Ad-hoc payment approved successfully',
            data: payment
        });
    } catch (error) {
        console.error('Error approving ad-hoc payment:', error);
        res.status(500).json({
            success: false,
            message: 'Error approving ad-hoc payment',
            error: error.message
        });
    }
};

// Get bank payments queue
exports.getBankPaymentsQueue = async (req, res) => {
    try {
        const { factoryId, page = 0, limit = 10 } = req.query;

        const query = {
            factoryId,
            paymentMethod: 'Bank',
            paymentStatus: 'Approved'
        };

        const skip = parseInt(page) * parseInt(limit);

        const payments = await Payment.find(query)
            .populate('supplierId')
            .populate('routeId')
            .sort({ approvedDate: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Payment.countDocuments(query);

        res.status(200).json({
            success: true,
            content: payments,
            totalElements: total,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page)
        });
    } catch (error) {
        console.error('Error fetching bank payments queue:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching bank payments queue',
            error: error.message
        });
    }
};

// Generate bank CSV
exports.generateBankCsv = async (req, res) => {
    try {
        const { factoryId, paymentIds } = req.body;
        const generatedBy = getActorUserId(req);

        if (!factoryId) {
            return res.status(400).json({
                success: false,
                message: 'Factory ID is required'
            });
        }

        if (!paymentIds || paymentIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Payment IDs are required'
            });
        }

        if (!generatedBy) {
            return res.status(401).json({
                success: false,
                message: 'Authenticated user is required to generate CSV'
            });
        }

        const payments = await Payment.find({
            _id: { $in: paymentIds },
            factoryId,
            paymentMethod: 'Bank',
            paymentStatus: 'Approved'
        }).populate('supplierId');

        if (payments.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No eligible payments found'
            });
        }

        // Generate batch number
        const batchNumber = `BANK-${Date.now()}`;
        const totalAmount = payments.reduce((sum, p) => sum + p.finalAmount, 0);

        // Create bank batch record
        const bankBatch = new BankBatch({
            factoryId,
            batchNumber,
            generatedBy,
            paymentIds,
            totalPayments: payments.length,
            totalAmount,
            csvFileName: `${batchNumber}.csv`,
            status: 'Generated'
        });

        await bankBatch.save();

        // Update payment statuses
        await Payment.updateMany(
            { _id: { $in: paymentIds } },
            {
                paymentStatus: 'Queued',
                bankBatchId: batchNumber
            }
        );

        // Generate CSV data
        const csvData = payments.map(p => ({
            supplierId: p.supplierId.supplierCode,
            supplierName: p.supplierId.name,
            accountNumber: p.supplierId.bankDetails?.accountNumber || '',
            bankName: p.supplierId.bankDetails?.bankName || '',
            branchName: p.supplierId.bankDetails?.branchName || '',
            amount: p.finalAmount,
            reference: `Payment-${p._id}`
        }));

        res.status(200).json({
            success: true,
            message: 'Bank CSV generated successfully',
            data: {
                batchId: bankBatch._id,
                batchNumber,
                totalPayments: payments.length,
                totalAmount,
                csvData
            }
        });
    } catch (error) {
        console.error('Error generating bank CSV:', error);
        res.status(500).json({
            success: false,
            message: 'Error generating bank CSV',
            error: error.message
        });
    }
};

// Download bank CSV (return CSV data)
exports.downloadBankCsv = async (req, res) => {
    try {
        const { batchId } = req.params;

        const bankBatch = await BankBatch.findById(batchId);
        if (!bankBatch) {
            return res.status(404).json({
                success: false,
                message: 'Bank batch not found'
            });
        }

        const payments = await Payment.find({
            _id: { $in: bankBatch.paymentIds }
        }).populate('supplierId');

        // Generate CSV content
        const csvHeader = 'Supplier Code,Supplier Name,Account Number,Bank Name,Branch Name,Amount,Reference\n';
        const csvRows = payments.map(p =>
            `${p.supplierId.supplierCode},${p.supplierId.name},${p.supplierId.bankDetails?.accountNumber || ''},${p.supplierId.bankDetails?.bankName || ''},${p.supplierId.bankDetails?.branchName || ''},${p.finalAmount},Payment-${p._id}`
        ).join('\n');

        const csvContent = csvHeader + csvRows;

        // Update batch status
        bankBatch.status = 'Downloaded';
        await bankBatch.save();

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${bankBatch.csvFileName}"`);
        res.status(200).send(csvContent);
    } catch (error) {
        console.error('Error downloading bank CSV:', error);
        res.status(500).json({
            success: false,
            message: 'Error downloading bank CSV',
            error: error.message
        });
    }
};

// Get bank CSV history
exports.getBankCsvHistory = async (req, res) => {
    try {
        const { factoryId, page = 0, limit = 10 } = req.query;

        const skip = parseInt(page) * parseInt(limit);

        const batches = await BankBatch.find({ factoryId })
            .populate('generatedBy', 'name email')
            .sort({ generatedDate: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await BankBatch.countDocuments({ factoryId });

        res.status(200).json({
            success: true,
            content: batches,
            totalElements: total,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page)
        });
    } catch (error) {
        console.error('Error fetching bank CSV history:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching bank CSV history',
            error: error.message
        });
    }
};

// Get cash payments queue
exports.getCashPaymentsQueue = async (req, res) => {
    try {
        const { factoryId, page = 0, limit = 10 } = req.query;

        const query = {
            factoryId,
            paymentMethod: 'Cash',
            paymentStatus: 'Approved'
        };

        const skip = parseInt(page) * parseInt(limit);

        const payments = await Payment.find(query)
            .populate('supplierId')
            .populate('routeId')
            .sort({ approvedDate: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Payment.countDocuments(query);

        res.status(200).json({
            success: true,
            content: payments,
            totalElements: total,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page)
        });
    } catch (error) {
        console.error('Error fetching cash payments queue:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching cash payments queue',
            error: error.message
        });
    }
};

// Get cash payments by route
exports.getCashPaymentsByRoute = async (req, res) => {
    try {
        const { routeId } = req.params;

        const payments = await Payment.find({
            routeId,
            paymentMethod: 'Cash',
            paymentStatus: 'Approved'
        })
            .populate('supplierId')
            .sort({ approvedDate: -1 });

        res.status(200).json({
            success: true,
            data: payments
        });
    } catch (error) {
        console.error('Error fetching cash payments by route:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching cash payments by route',
            error: error.message
        });
    }
};

// Disburse cash
exports.disburseCash = async (req, res) => {
    try {
        const { paymentIds, receiptNumbers } = req.body;
        const disbursedBy = getActorUserId(req);

        if (!paymentIds || paymentIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Payment IDs are required'
            });
        }

        if (!disbursedBy) {
            return res.status(401).json({
                success: false,
                message: 'Authenticated user is required to disburse cash payments'
            });
        }

        const updates = paymentIds.map((id, index) => ({
            updateOne: {
                filter: { _id: id, paymentStatus: 'Approved' },
                update: {
                    paymentStatus: 'Paid',
                    disbursedBy,
                    disbursementDate: new Date(),
                    paidDate: new Date(),
                    receiptNumber: receiptNumbers?.[index] || `CASH-${Date.now()}-${index}`
                }
            }
        }));

        const result = await Payment.bulkWrite(updates);

        res.status(200).json({
            success: true,
            message: `Successfully disbursed ${result.modifiedCount} cash payments`,
            data: result
        });
    } catch (error) {
        console.error('Error disbursing cash:', error);
        res.status(500).json({
            success: false,
            message: 'Error disbursing cash',
            error: error.message
        });
    }
};

// Get cash collection history
exports.getCashCollectionHistory = async (req, res) => {
    try {
        const { factoryId, page = 0, limit = 10 } = req.query;

        const query = {
            factoryId,
            paymentMethod: 'Cash',
            paymentStatus: 'Paid'
        };

        const skip = parseInt(page) * parseInt(limit);

        const payments = await Payment.find(query)
            .populate('supplierId')
            .populate('routeId')
            .populate('disbursedBy', 'name email')
            .sort({ disbursementDate: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Payment.countDocuments(query);

        res.status(200).json({
            success: true,
            content: payments,
            totalElements: total,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page)
        });
    } catch (error) {
        console.error('Error fetching cash collection history:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching cash collection history',
            error: error.message
        });
    }
};

// Get payment by ID
exports.getPaymentById = async (req, res) => {
    try {
        const { paymentId } = req.params;

        const payment = await Payment.findById(paymentId)
            .populate('supplierId')
            .populate('routeId')
            .populate('approvedBy', 'name email')
            .populate('disbursedBy', 'name email')
            .populate('teaLeafEntries');

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found'
            });
        }

        res.status(200).json({
            success: true,
            data: payment
        });
    } catch (error) {
        console.error('Error fetching payment:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching payment',
            error: error.message
        });
    }
};

// Get payments by supplier
exports.getPaymentsBySupplier = async (req, res) => {
    try {
        const { supplierId } = req.params;
        const { page = 0, limit = 10, status } = req.query;

        const query = { supplierId };
        if (status) query.paymentStatus = status;

        const skip = parseInt(page) * parseInt(limit);

        const payments = await Payment.find(query)
            .populate('routeId')
            .sort({ calculatedDate: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Payment.countDocuments(query);

        res.status(200).json({
            success: true,
            content: payments,
            totalElements: total,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page)
        });
    } catch (error) {
        console.error('Error fetching payments by supplier:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching payments by supplier',
            error: error.message
        });
    }
};

// Get payments by route
exports.getPaymentsByRoute = async (req, res) => {
    try {
        const { routeId } = req.params;
        const { page = 0, limit = 10, status } = req.query;

        const query = { routeId };
        if (status) query.paymentStatus = status;

        const skip = parseInt(page) * parseInt(limit);

        const payments = await Payment.find(query)
            .populate('supplierId')
            .sort({ calculatedDate: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Payment.countDocuments(query);

        res.status(200).json({
            success: true,
            content: payments,
            totalElements: total,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page)
        });
    } catch (error) {
        console.error('Error fetching payments by route:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching payments by route',
            error: error.message
        });
    }
};

// Get payment history
exports.getPaymentHistory = async (req, res) => {
    try {
        const { factoryId, page = 0, limit = 10, startDate, endDate, paymentType, status } = req.query;

        const query = { factoryId };

        if (startDate && endDate) {
            query.calculatedDate = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        if (paymentType) query.paymentType = paymentType;
        if (status) query.paymentStatus = status;

        const skip = parseInt(page) * parseInt(limit);

        const payments = await Payment.find(query)
            .populate('supplierId')
            .populate('routeId')
            .sort({ calculatedDate: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Payment.countDocuments(query);

        res.status(200).json({
            success: true,
            content: payments,
            totalElements: total,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page)
        });
    } catch (error) {
        console.error('Error fetching payment history:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching payment history',
            error: error.message
        });
    }
};

// Get dashboard statistics for payment manager
exports.getDashboardStats = async (req, res) => {
    try {
        const { factoryId, month, year } = req.query;

        const now = new Date();
        const m = parseInt(month) || now.getMonth() + 1;
        const y = parseInt(year) || now.getFullYear();

        const periodStart = new Date(y, m - 1, 1);
        const periodEnd = new Date(y, m, 0, 23, 59, 59);

        const baseQuery = factoryId ? { factoryId } : {};

        // Monthly pending count and sum
        const [monthlyPending, adhocPending, cashApproved, bankApproved, routeCount, supplierCount] = await Promise.all([
            Payment.find({ ...baseQuery, paymentType: 'Monthly', paymentStatus: 'Calculated', 'paymentPeriod.month': m, 'paymentPeriod.year': y }),
            Payment.find({ ...baseQuery, paymentType: 'Adhoc', paymentStatus: 'Calculated' }),
            Payment.find({ ...baseQuery, paymentMethod: 'Cash', paymentStatus: 'Approved' }),
            Payment.find({ ...baseQuery, paymentMethod: 'Bank', paymentStatus: 'Approved' }),
            Payment.distinct('routeId', baseQuery),
            Payment.distinct('supplierId', baseQuery),
        ]);

        const adhocBank = adhocPending.filter(p => p.paymentMethod === 'Bank');
        const adhocCash = adhocPending.filter(p => p.paymentMethod === 'Cash');

        const sum = (arr) => arr.reduce((s, p) => s + (p.finalAmount || 0), 0);

        res.status(200).json({
            success: true,
            data: {
                monthlyPendingCount: monthlyPending.length,
                monthlyPendingSum: sum(monthlyPending),
                adhocPendingCount: adhocPending.length,
                adhocPendingSum: sum(adhocPending),
                adhocBankCount: adhocBank.length,
                adhocBankSum: sum(adhocBank),
                adhocCashCount: adhocCash.length,
                adhocCashSum: sum(adhocCash),
                adhocApprovedSum: sum(adhocPending.filter(p => p.paymentStatus === 'Approved')),
                cashReadySum: sum(cashApproved),
                bankQueueSum: sum(bankApproved),
                totalRoutes: routeCount.length,
                totalSuppliers: supplierCount.length,
            }
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching dashboard stats',
            error: error.message
        });
    }
};

// Get payment summary
exports.getPaymentSummary = async (req, res) => {
    try {
        const { factoryId, month, year } = req.query;
        const baseQuery = factoryId ? { factoryId } : {};

        const [total, paid, approved, calculated, cancelled] = await Promise.all([
            Payment.countDocuments(baseQuery),
            Payment.countDocuments({ ...baseQuery, paymentStatus: 'Paid' }),
            Payment.countDocuments({ ...baseQuery, paymentStatus: 'Approved' }),
            Payment.countDocuments({ ...baseQuery, paymentStatus: 'Calculated' }),
            Payment.countDocuments({ ...baseQuery, paymentStatus: 'Cancelled' }),
        ]);

        const totalAmountPaid = await Payment.aggregate([
            { $match: { ...baseQuery, paymentStatus: 'Paid' } },
            { $group: { _id: null, total: { $sum: '$finalAmount' } } }
        ]);

        res.status(200).json({
            success: true,
            data: {
                total,
                paid,
                approved,
                calculated,
                cancelled,
                totalAmountPaid: totalAmountPaid[0]?.total || 0,
            }
        });
    } catch (error) {
        console.error('Error fetching payment summary:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching payment summary',
            error: error.message
        });
    }
};

// @desc    Get payment overview for owner
// @route   GET /api/payments/owner-overview
// @access  Private (Owner)
exports.getOwnerPaymentOverview = async (req, res) => {
    try {
        // Placeholder implementation
        res.status(200).json({
            success: true,
            message: 'Owner payment overview - Feature coming soon',
            data: {}
        });
    } catch (error) {
        console.error('Error in getOwnerPaymentOverview:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching owner payment overview'
        });
    }
};

// @desc    Get route-wise payment summary for owner
// @route   GET /api/payments/owner-route-summary
// @access  Private (Owner)
exports.getOwnerRoutePaymentSummary = async (req, res) => {
    try {
        // Placeholder implementation
        res.status(200).json({
            success: true,
            message: 'Owner route payment summary - Feature coming soon',
            data: []
        });
    } catch (error) {
        console.error('Error in getOwnerRoutePaymentSummary:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching owner route payment summary'
        });
    }
};

