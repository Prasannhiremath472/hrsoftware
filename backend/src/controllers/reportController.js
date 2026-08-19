const asyncHandler = require('../middleware/asyncHandler');
const { ok } = require('../utils/response');
const reportModel = require('../models/reportModel');
const { toCsv } = require('../utils/csv');

/** CSV export always covers the complete filtered result, never a single page. */
function reportParams(req) {
  const isCsv = req.query.format === 'csv';
  return {
    isCsv,
    params: isCsv ? { ...req.query, page: undefined, limit: undefined } : req.query,
  };
}

function respondCsvOrJson(req, res, isCsv, result, columns, filename) {
  if (isCsv) {
    const rows = Array.isArray(result) ? result : result.rows;
    const csv = toCsv(rows, columns);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(csv);
  }
  return ok(res, result, 'OK');
}

const candidates = asyncHandler(async (req, res) => {
  const { isCsv, params } = reportParams(req);
  const result = await reportModel.candidatesReport(params);
  const columns = [
    { key: 'candidate_number', header: 'Candidate Number' },
    { key: 'full_name', header: 'Full Name' },
    { key: 'mobile', header: 'Mobile' },
    { key: 'email', header: 'Email' },
    { key: 'status', header: 'Status' },
    { key: 'current_step', header: 'Current Step' },
    { key: 'coordinator_name', header: 'Coordinator' },
    { key: 'created_at', header: 'Created At' },
    { key: 'submitted_at', header: 'Submitted At' },
  ];
  return respondCsvOrJson(req, res, isCsv, result, columns, 'candidates-report.csv');
});

const coordinators = asyncHandler(async (req, res) => {
  const { isCsv, params } = reportParams(req);
  const result = await reportModel.coordinatorsReport(params);
  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'mobile', header: 'Mobile' },
    { key: 'email', header: 'Email' },
    { key: 'status', header: 'Status' },
    { key: 'total_candidates', header: 'Total Candidates' },
    { key: 'completed_candidates', header: 'Completed Candidates' },
  ];
  return respondCsvOrJson(req, res, isCsv, result, columns, 'coordinators-report.csv');
});

const status = asyncHandler(async (req, res) => {
  const { isCsv, params } = reportParams(req);
  const result = await reportModel.statusReport(params);
  const columns = [
    { key: 'status', header: 'Status' },
    { key: 'total', header: 'Total' },
  ];
  return respondCsvOrJson(req, res, isCsv, result, columns, 'status-report.csv');
});

const biometric = asyncHandler(async (req, res) => {
  const { isCsv, params } = reportParams(req);
  const result = await reportModel.biometricReport(params);
  const columns = [
    { key: 'candidate_number', header: 'Candidate Number' },
    { key: 'full_name', header: 'Full Name' },
    { key: 'hand', header: 'Hand' },
    { key: 'provider', header: 'Provider' },
    { key: 'quality_score', header: 'Quality Score' },
    { key: 'verification_status', header: 'Verification Status' },
    { key: 'captured_at', header: 'Captured At' },
  ];
  return respondCsvOrJson(req, res, isCsv, result, columns, 'biometric-report.csv');
});

const documents = asyncHandler(async (req, res) => {
  const { isCsv, params } = reportParams(req);
  const result = await reportModel.documentsReport(params);
  const columns = [
    { key: 'candidate_number', header: 'Candidate Number' },
    { key: 'full_name', header: 'Full Name' },
    { key: 'document_type', header: 'Document Type' },
    { key: 'status', header: 'Status' },
    { key: 'created_at', header: 'Uploaded At' },
    { key: 'verified_at', header: 'Verified At' },
  ];
  return respondCsvOrJson(req, res, isCsv, result, columns, 'documents-report.csv');
});

const monthlyRegistrations = asyncHandler(async (req, res) => {
  const rows = await reportModel.monthlyRegistrations();
  return ok(res, rows, 'OK');
});

module.exports = { candidates, coordinators, status, biometric, documents, monthlyRegistrations };
