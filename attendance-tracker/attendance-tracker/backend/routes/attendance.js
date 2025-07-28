const express = require('express');
const multer = require('multer');
const { parse } = require('csv-parse');
const fs = require('fs');
const path = require('path');
const { format, parseISO, differenceInHours, differenceInMinutes } = require('date-fns');
const db = require('../database');
const { authenticateToken, authorizeAdmin } = require('../middleware/auth');
const { calculateHours } = require('../utils/timeCalculations');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage });

// Get attendance records
router.get('/', authenticateToken, (req, res) => {
  try {
    const { employee_id, date, start_date, end_date } = req.query;
    let query = 'SELECT * FROM attendance WHERE 1=1';
    const params = [];

    if (employee_id) {
      query += ' AND employee_id = ?';
      params.push(employee_id);
    }
    if (date) {
      query += ' AND date = ?';
      params.push(date);
    }
    if (start_date && end_date) {
      query += ' AND date BETWEEN ? AND ?';
      params.push(start_date, end_date);
    }

    query += ' ORDER BY date DESC';
    
    const records = db.prepare(query).all(...params);
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch attendance records' });
  }
});

// Create/Update attendance record
router.post('/', authenticateToken, (req, res) => {
  try {
    const {
      employee_id,
      date,
      clock_in,
      clock_out,
      break_start,
      break_end,
      status = 'present',
      notes
    } = req.body;

    // Calculate hours
    const { totalHours, regularHours, overtimeHours } = calculateHours({
      clock_in,
      clock_out,
      break_start,
      break_end
    });

    const stmt = db.prepare(`
      INSERT OR REPLACE INTO attendance (
        employee_id, date, clock_in, clock_out, break_start, break_end,
        total_hours, regular_hours, overtime_hours, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      employee_id,
      date,
      clock_in,
      clock_out,
      break_start,
      break_end,
      totalHours,
      regularHours,
      overtimeHours,
      status,
      notes
    );

    res.json({ 
      message: 'Attendance record saved successfully',
      totalHours,
      regularHours,
      overtimeHours
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save attendance record' });
  }
});

// Enhanced Upload CSV attendance with payroll calculations
router.post('/upload', authenticateToken, authorizeAdmin, upload.single('file'), async (req, res) => {
  const startTime = Date.now();
  let uploadBatchId = null;
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Create upload history record
    const uploadHistoryStmt = db.prepare(`
      INSERT INTO upload_history (user_id, filename, file_size, status) 
      VALUES (?, ?, ?, 'processing')
    `);
    const uploadResult = uploadHistoryStmt.run(req.user.id, req.file.originalname, req.file.size);
    uploadBatchId = uploadResult.lastInsertRowid;

    const results = [];
    const errors = [];
    const { calculatePay } = require('../utils/timeCalculations');

    // Get employee rates for payroll calculations
    const employees = db.prepare('SELECT employee_id, hourly_rate, overtime_rate FROM employees').all();
    const employeeRates = new Map(employees.map(e => [e.employee_id, { hourlyRate: e.hourly_rate || 0, overtimeRate: e.overtime_rate || 0 }]));
    const employeeNames = db.prepare('SELECT employee_id, name FROM employees').all();
    const nameToIdMap = new Map(employeeNames.map(e => [e.name.toLowerCase(), e.employee_id]));

    // Parse CSV file
    const parser = fs.createReadStream(req.file.path).pipe(parse({
      columns: true,
      skip_empty_lines: true,
      trim: true
    }));

    let lineNumber = 1;
    for await (const record of parser) {
      lineNumber++;
      try {
        // Resolve employee ID from name if needed
        let employeeId = record.employee_id;
        if (!employeeId && record.employee_name) {
          employeeId = nameToIdMap.get(record.employee_name.toLowerCase());
        }

        if (!employeeId) {
          errors.push({
            line: lineNumber,
            record,
            errors: ['Employee ID or valid employee name is required'],
            suggestions: ['Download template for valid employee IDs']
          });
          continue;
        }

        // Validate employee exists
        if (!employeeRates.has(employeeId)) {
          errors.push({
            line: lineNumber,
            record,
            errors: [`Employee ID "${employeeId}" not found in system`],
            suggestions: ['Check employee ID spelling', 'Download current template']
          });
          continue;
        }

        const {
          date,
          clock_in,
          clock_out,
          break_start,
          break_end
        } = record;

        // Validate required fields
        const validationErrors = [];
        if (!date) validationErrors.push('Date is required (YYYY-MM-DD format)');
        if (!clock_in) validationErrors.push('Clock in time is required (HH:MM format)');
        if (!clock_out) validationErrors.push('Clock out time is required (HH:MM format)');

        if (validationErrors.length > 0) {
          errors.push({
            line: lineNumber,
            record,
            errors: validationErrors,
            suggestions: ['Check CSV format', 'Download template for correct format']
          });
          continue;
        }

        // Calculate hours
        const hoursResult = calculateHours({
          clock_in,
          clock_out,
          break_start,
          break_end
        });

        // Calculate pay
        const rates = employeeRates.get(employeeId);
        const payResult = calculatePay(hoursResult, rates);

        // Insert or update record with payroll data
        const stmt = db.prepare(`
          INSERT OR REPLACE INTO attendance (
            employee_id, date, clock_in, clock_out, break_start, break_end,
            total_hours, regular_hours, overtime_hours, status,
            regular_pay, overtime_pay, gross_pay, upload_batch_id, last_calculated
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'present', ?, ?, ?, ?, datetime('now'))
        `);

        stmt.run(
          employeeId,
          date,
          clock_in,
          clock_out,
          break_start,
          break_end,
          hoursResult.totalHours,
          hoursResult.regularHours,
          hoursResult.overtimeHours,
          payResult.regularPay,
          payResult.overtimePay,
          payResult.grossPay,
          uploadBatchId
        );

        results.push({ 
          employee_id: employeeId, 
          date, 
          status: 'success',
          hours: hoursResult.totalHours,
          pay: payResult.grossPay,
          line: lineNumber
        });
      } catch (error) {
        errors.push({ 
          line: lineNumber,
          record, 
          errors: [error.message],
          suggestions: ['Check data format', 'Verify employee exists']
        });
      }
    }

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    // Update upload history
    const processingTime = (Date.now() - startTime) / 1000;
    const updateHistoryStmt = db.prepare(`
      UPDATE upload_history 
      SET total_records = ?, successful_records = ?, failed_records = ?, 
          status = ?, processing_time = ?, error_summary = ?
      WHERE id = ?
    `);
    
    const errorSummary = errors.length > 0 ? `${errors.length} validation errors` : null;
    const status = errors.length === 0 ? 'completed' : 'completed_with_errors';
    
    updateHistoryStmt.run(
      results.length + errors.length,
      results.length,
      errors.length,
      status,
      processingTime,
      errorSummary,
      uploadBatchId
    );

    // Calculate summary totals
    const totalHours = results.reduce((sum, r) => sum + (r.hours || 0), 0);
    const totalPay = results.reduce((sum, r) => sum + (r.pay || 0), 0);

    res.json({
      message: 'Upload processed successfully',
      upload_batch_id: uploadBatchId,
      summary: {
        total_records: results.length + errors.length,
        successful_records: results.length,
        failed_records: errors.length,
        total_hours: Math.round(totalHours * 100) / 100,
        total_pay: Math.round(totalPay * 100) / 100,
        processing_time: processingTime
      },
      results: results.slice(0, 20), // First 20 successful records
      errors: errors.slice(0, 20), // First 20 errors with detailed messages
      has_more_errors: errors.length > 20
    });
  } catch (error) {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    
    // Update upload history with failure
    if (uploadBatchId) {
      db.prepare(`
        UPDATE upload_history 
        SET status = 'failed', error_summary = ?, processing_time = ?
        WHERE id = ?
      `).run(error.message, (Date.now() - startTime) / 1000, uploadBatchId);
    }
    
    console.error('Upload processing error:', error);
    res.status(500).json({ 
      error: 'Failed to process upload',
      details: error.message,
      suggestions: ['Check file format', 'Verify employee data', 'Try smaller file']
    });
  }
});

// Delete attendance record
router.delete('/:id', authenticateToken, authorizeAdmin, (req, res) => {
  try {
    const stmt = db.prepare('DELETE FROM attendance WHERE id = ?');
    const result = stmt.run(req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }

    res.json({ message: 'Attendance record deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete attendance record' });
  }
});

// Bulk Calculate Hours and Pay
router.post('/calculate-bulk', authenticateToken, (req, res) => {
  try {
    const {
      date_range = {},
      employee_ids = null, // null means all employees
      group_by = 'employee', // 'employee', 'department', 'week', 'month'
      recalculate = false // force recalculation even if cached
    } = req.body;

    const { start_date, end_date } = date_range;
    
    // Build query conditions
    let whereConditions = ['1=1'];
    let queryParams = [];
    
    if (start_date) {
      whereConditions.push('a.date >= ?');
      queryParams.push(start_date);
    }
    
    if (end_date) {
      whereConditions.push('a.date <= ?');
      queryParams.push(end_date);
    }
    
    if (employee_ids && Array.isArray(employee_ids) && employee_ids.length > 0) {
      const placeholders = employee_ids.map(() => '?').join(',');
      whereConditions.push(`a.employee_id IN (${placeholders})`);
      queryParams.push(...employee_ids);
    }

    // Check cache first (unless recalculate is true)
    const cacheKey = JSON.stringify({ date_range, employee_ids, group_by });
    const cacheKeyHash = Buffer.from(cacheKey).toString('base64');
    
    if (!recalculate) {
      const cached = db.prepare(`
        SELECT results FROM calculation_cache 
        WHERE cache_key = ? AND expires_at > datetime('now')
      `).get(cacheKeyHash);
      
      if (cached) {
        return res.json({
          ...JSON.parse(cached.results),
          from_cache: true,
          cache_key: cacheKeyHash
        });
      }
    }

    const { calculatePay } = require('../utils/timeCalculations');
    let calculations = [];
    let totalHours = 0;
    let totalPay = 0;
    let totalRegularHours = 0;
    let totalOvertimeHours = 0;
    let totalRegularPay = 0;
    let totalOvertimePay = 0;

    if (group_by === 'employee') {
      // Group by employee
      const query = `
        SELECT 
          a.employee_id,
          e.name,
          e.department,
          e.hourly_rate,
          e.overtime_rate,
          COUNT(*) as days_worked,
          SUM(a.total_hours) as total_hours,
          SUM(a.regular_hours) as regular_hours,
          SUM(a.overtime_hours) as overtime_hours,
          MIN(a.date) as first_date,
          MAX(a.date) as last_date,
          AVG(a.total_hours) as avg_daily_hours
        FROM attendance a
        JOIN employees e ON a.employee_id = e.employee_id
        WHERE ${whereConditions.join(' AND ')}
        GROUP BY a.employee_id, e.name, e.department, e.hourly_rate, e.overtime_rate
        ORDER BY e.name
      `;
      
      const results = db.prepare(query).all(...queryParams);
      
      calculations = results.map(row => {
        const rates = { hourlyRate: row.hourly_rate || 0, overtimeRate: row.overtime_rate || 0 };
        const hours = { regularHours: row.regular_hours, overtimeHours: row.overtime_hours };
        const pay = calculatePay(hours, rates);
        
        totalHours += row.total_hours;
        totalRegularHours += row.regular_hours;
        totalOvertimeHours += row.overtime_hours;
        totalRegularPay += pay.regularPay;
        totalOvertimePay += pay.overtimePay;
        totalPay += pay.grossPay;
        
        return {
          employee_id: row.employee_id,
          employee_name: row.name,
          department: row.department,
          days_worked: row.days_worked,
          total_hours: Math.round(row.total_hours * 100) / 100,
          regular_hours: Math.round(row.regular_hours * 100) / 100,
          overtime_hours: Math.round(row.overtime_hours * 100) / 100,
          hourly_rate: row.hourly_rate,
          overtime_rate: row.overtime_rate,
          regular_pay: Math.round(pay.regularPay * 100) / 100,
          overtime_pay: Math.round(pay.overtimePay * 100) / 100,
          gross_pay: Math.round(pay.grossPay * 100) / 100,
          avg_daily_hours: Math.round(row.avg_daily_hours * 100) / 100,
          period: `${row.first_date} to ${row.last_date}`
        };
      });

    } else if (group_by === 'department') {
      // Group by department
      const query = `
        SELECT 
          e.department,
          COUNT(DISTINCT a.employee_id) as employee_count,
          COUNT(*) as total_days,
          SUM(a.total_hours) as total_hours,
          SUM(a.regular_hours) as regular_hours,
          SUM(a.overtime_hours) as overtime_hours,
          AVG(e.hourly_rate) as avg_hourly_rate,
          AVG(e.overtime_rate) as avg_overtime_rate
        FROM attendance a
        JOIN employees e ON a.employee_id = e.employee_id
        WHERE ${whereConditions.join(' AND ')}
        GROUP BY e.department
        ORDER BY total_hours DESC
      `;
      
      const results = db.prepare(query).all(...queryParams);
      
      calculations = results.map(row => {
        const rates = { hourlyRate: row.avg_hourly_rate || 0, overtimeRate: row.avg_overtime_rate || 0 };
        const hours = { regularHours: row.regular_hours, overtimeHours: row.overtime_hours };
        const pay = calculatePay(hours, rates);
        
        totalHours += row.total_hours;
        totalPay += pay.grossPay;
        
        return {
          department: row.department || 'Unassigned',
          employee_count: row.employee_count,
          total_days: row.total_days,
          total_hours: Math.round(row.total_hours * 100) / 100,
          regular_hours: Math.round(row.regular_hours * 100) / 100,
          overtime_hours: Math.round(row.overtime_hours * 100) / 100,
          estimated_total_pay: Math.round(pay.grossPay * 100) / 100,
          avg_hours_per_employee: Math.round((row.total_hours / row.employee_count) * 100) / 100
        };
      });

    } else if (group_by === 'week') {
      // Group by week
      const query = `
        SELECT 
          DATE(a.date, 'weekday 0', '-6 days') as week_start,
          DATE(a.date, 'weekday 0') as week_end,
          COUNT(DISTINCT a.employee_id) as employees_worked,
          COUNT(*) as total_days,
          SUM(a.total_hours) as total_hours,
          SUM(a.regular_hours) as regular_hours,
          SUM(a.overtime_hours) as overtime_hours
        FROM attendance a
        WHERE ${whereConditions.join(' AND ')}
        GROUP BY week_start
        ORDER BY week_start DESC
      `;
      
      const results = db.prepare(query).all(...queryParams);
      
      calculations = results.map(row => {
        totalHours += row.total_hours;
        
        return {
          week_period: `${row.week_start} to ${row.week_end}`,
          week_start: row.week_start,
          week_end: row.week_end,
          employees_worked: row.employees_worked,
          total_days: row.total_days,
          total_hours: Math.round(row.total_hours * 100) / 100,
          regular_hours: Math.round(row.regular_hours * 100) / 100,
          overtime_hours: Math.round(row.overtime_hours * 100) / 100,
          avg_hours_per_day: Math.round((row.total_hours / row.total_days) * 100) / 100
        };
      });
    }

    const response = {
      calculation_type: group_by,
      date_range: { start_date, end_date },
      employee_filter: employee_ids ? `${employee_ids.length} selected` : 'all employees',
      calculations,
      summary: {
        total_records: calculations.length,
        total_hours: Math.round(totalHours * 100) / 100,
        total_regular_hours: Math.round(totalRegularHours * 100) / 100,
        total_overtime_hours: Math.round(totalOvertimeHours * 100) / 100,
        total_regular_pay: Math.round(totalRegularPay * 100) / 100,
        total_overtime_pay: Math.round(totalOvertimePay * 100) / 100,
        total_pay: Math.round(totalPay * 100) / 100
      },
      calculated_at: new Date().toISOString(),
      from_cache: false
    };

    // Cache the results (expire in 1 hour)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    db.prepare(`
      INSERT OR REPLACE INTO calculation_cache 
      (cache_key, employee_ids, date_range_start, date_range_end, results, expires_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      cacheKeyHash,
      employee_ids ? JSON.stringify(employee_ids) : null,
      start_date,
      end_date,
      JSON.stringify(response),
      expiresAt
    );

    res.json(response);
  } catch (error) {
    console.error('Bulk calculation error:', error);
    res.status(500).json({ 
      error: 'Failed to calculate bulk attendance',
      details: error.message 
    });
  }
});

// CSV Template Download - generates template with current employee data
router.get('/csv-template', authenticateToken, authorizeAdmin, (req, res) => {
  try {
    const employees = db.prepare(`
      SELECT employee_id, name, department, hourly_rate, overtime_rate 
      FROM employees 
      ORDER BY name
    `).all();

    const today = format(new Date(), 'yyyy-MM-dd');
    const templateHeaders = 'employee_id,employee_name,date,clock_in,break_start,break_end,clock_out';
    
    // Create sample rows for each employee
    const sampleRows = employees.map(emp => 
      `${emp.employee_id},"${emp.name}",${today},09:00,12:00,13:00,17:00`
    );

    const csvContent = [templateHeaders, ...sampleRows].join('\n');
    
    // Track template downloads
    db.prepare(`
      INSERT INTO upload_history (user_id, filename, status, total_records) 
      VALUES (?, ?, 'template_download', ?)
    `).run(req.user.id, `attendance_template_${today}.csv`, employees.length);

    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="attendance_template_${today}.csv"`
    });
    res.send(csvContent);
  } catch (error) {
    console.error('Template generation error:', error);
    res.status(500).json({ error: 'Failed to generate CSV template' });
  }
});

// CSV Validation - validates file before processing
router.post('/validate-csv', authenticateToken, authorizeAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const validationResults = {
      valid: true,
      preview: [],
      summary: { total_rows: 0, valid_rows: 0, error_rows: 0, warning_rows: 0 },
      employee_mapping_suggestions: []
    };

    const employees = db.prepare('SELECT employee_id, name FROM employees').all();
    const employeeMap = new Map(employees.map(e => [e.employee_id, e.name]));
    const nameToIdMap = new Map(employees.map(e => [e.name.toLowerCase(), e.employee_id]));

    // Parse CSV
    const parser = fs.createReadStream(req.file.path).pipe(parse({
      columns: true,
      skip_empty_lines: true,
      trim: true
    }));

    let rowIndex = 0;
    for await (const record of parser) {
      rowIndex++;
      const errors = [];
      const warnings = [];
      
      // Validate required fields
      if (!record.employee_id && !record.employee_name) {
        errors.push('Either employee_id or employee_name is required');
      }
      
      if (!record.date) {
        errors.push('Date is required');
      } else if (!/^\d{4}-\d{2}-\d{2}$/.test(record.date)) {
        errors.push('Date must be in YYYY-MM-DD format');
      }

      if (!record.clock_in) {
        errors.push('Clock in time is required');
      } else if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(record.clock_in)) {
        errors.push('Clock in time must be in HH:MM format');
      }

      if (!record.clock_out) {
        errors.push('Clock out time is required');
      } else if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(record.clock_out)) {
        errors.push('Clock out time must be in HH:MM format');
      }

      // Employee validation and mapping
      let resolvedEmployeeId = record.employee_id;
      if (!resolvedEmployeeId && record.employee_name) {
        const nameKey = record.employee_name.toLowerCase();
        if (nameToIdMap.has(nameKey)) {
          resolvedEmployeeId = nameToIdMap.get(nameKey);
          warnings.push(`Mapped employee name "${record.employee_name}" to ID ${resolvedEmployeeId}`);
        } else {
          // Find fuzzy matches
          const fuzzyMatch = findFuzzyEmployeeMatch(record.employee_name, employees);
          if (fuzzyMatch.confidence > 0.7) {
            validationResults.employee_mapping_suggestions.push({
              csv_name: record.employee_name,
              suggested_employee_id: fuzzyMatch.employee_id,
              suggested_name: fuzzyMatch.name,
              confidence: fuzzyMatch.confidence,
              row: rowIndex
            });
            warnings.push(`Possible match: "${record.employee_name}" → "${fuzzyMatch.name}" (${Math.round(fuzzyMatch.confidence * 100)}% confidence)`);
          } else {
            errors.push(`Employee name "${record.employee_name}" not found. Download template for valid names.`);
          }
        }
      } else if (resolvedEmployeeId && !employeeMap.has(resolvedEmployeeId)) {
        errors.push(`Employee ID "${resolvedEmployeeId}" not found. Download template for valid IDs.`);
      }

      // Time logic validation
      if (record.clock_in && record.clock_out) {
        const clockIn = new Date(`2000-01-01 ${record.clock_in}`);
        const clockOut = new Date(`2000-01-01 ${record.clock_out}`);
        if (clockOut <= clockIn) {
          errors.push('Clock out time must be after clock in time');
        }
      }

      validationResults.preview.push({
        row: rowIndex,
        data: { ...record, resolved_employee_id: resolvedEmployeeId },
        errors,
        warnings,
        status: errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'valid'
      });

      validationResults.summary.total_rows++;
      if (errors.length > 0) {
        validationResults.summary.error_rows++;
        validationResults.valid = false;
      } else if (warnings.length > 0) {
        validationResults.summary.warning_rows++;
      } else {
        validationResults.summary.valid_rows++;
      }

      // Limit preview to first 100 rows
      if (rowIndex >= 100) break;
    }

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.json(validationResults);
  } catch (error) {
    if (req.file) fs.unlinkSync(req.file.path);
    console.error('Validation error:', error);
    res.status(500).json({ error: 'Failed to validate CSV file' });
  }
});

// Fuzzy employee matching function
function findFuzzyEmployeeMatch(searchName, employees) {
  let bestMatch = { employee_id: null, name: null, confidence: 0 };
  const searchLower = searchName.toLowerCase();
  
  for (const emp of employees) {
    const empNameLower = emp.name.toLowerCase();
    
    // Exact match
    if (empNameLower === searchLower) {
      return { employee_id: emp.employee_id, name: emp.name, confidence: 1.0 };
    }
    
    // Contains match
    if (empNameLower.includes(searchLower) || searchLower.includes(empNameLower)) {
      const confidence = Math.min(searchLower.length, empNameLower.length) / Math.max(searchLower.length, empNameLower.length);
      if (confidence > bestMatch.confidence) {
        bestMatch = { employee_id: emp.employee_id, name: emp.name, confidence };
      }
    }
    
    // Levenshtein-like similarity
    const similarity = calculateStringSimilarity(searchLower, empNameLower);
    if (similarity > bestMatch.confidence) {
      bestMatch = { employee_id: emp.employee_id, name: emp.name, confidence: similarity };
    }
  }
  
  return bestMatch;
}

// Simple string similarity calculation
function calculateStringSimilarity(str1, str2) {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1, str2) {
  const matrix = [];
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[str2.length][str1.length];
}

module.exports = router;