import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Stack,
  Grid,
  Alert,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  Divider,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Download as DownloadIcon,
  Preview as PreviewIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { attendanceApi } from '../services/api';
import { UploadSkeleton, ValidationSkeleton } from './LoadingSkeleton';
import ErrorBoundary from './ErrorBoundary';

interface UploadCenterProps {
  onUploadSuccess?: (results: any) => void;
  onError?: (error: string) => void;
  onSuccess?: (message: string) => void;
}

interface ValidationResults {
  valid: boolean;
  preview: any[];
  summary: {
    total_rows: number;
    valid_rows: number;
    error_rows: number;
    warning_rows: number;
  };
  employee_mapping_suggestions: any[];
}

const UploadCenter: React.FC<UploadCenterProps> = ({
  onUploadSuccess,
  onError,
  onSuccess
}) => {
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [validationResults, setValidationResults] = useState<ValidationResults | null>(null);
  const [uploadResults, setUploadResults] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);

  // Memoized validation status
  const validationStatus = useMemo(() => {
    if (!validationResults) return null;
    
    const { summary } = validationResults;
    const totalRows = summary.total_rows;
    const validRows = summary.valid_rows;
    const warningRows = summary.warning_rows;
    const errorRows = summary.error_rows;
    
    return {
      isValid: errorRows === 0,
      hasWarnings: warningRows > 0,
      successRate: totalRows > 0 ? Math.round((validRows / totalRows) * 100) : 0,
      canUpload: errorRows === 0 && totalRows > 0
    };
  }, [validationResults]);

  const handleDownloadTemplate = useCallback(async () => {
    try {
      setIsDownloadingTemplate(true);
      
      const token = localStorage.getItem('token');
      if (!token) {
        onError?.('Please login first to download the template');
        return;
      }
      
      const response = await fetch('/api/attendance/csv-template', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'attendance_template.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        onSuccess?.('Template downloaded successfully with current employee data');
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        onError?.(`Failed to download template: ${errorData.error || response.statusText}`);
      }
    } catch (err: any) {
      console.error('Template download error:', err);
      onError?.(`Failed to download template: ${err.message || 'Network error'}`);
    } finally {
      setIsDownloadingTemplate(false);
    }
  }, [onError, onSuccess]);

  const handleValidateFile = useCallback(async () => {
    if (!uploadFile) {
      onError?.('Please select a file');
      return;
    }

    try {
      setIsValidating(true);
      const formData = new FormData();
      formData.append('file', uploadFile);
      
      const response = await fetch('/api/attendance/validate-csv', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });
      
      const results = await response.json();
      setValidationResults(results);
      setShowPreview(true);
      
      if (results.valid) {
        onSuccess?.(`Validation passed! ${results.summary.valid_rows} valid records found.`);
      } else {
        onError?.(`Validation found ${results.summary.error_rows} errors. Please review and fix before uploading.`);
      }
    } catch (err) {
      onError?.('Failed to validate file');
    } finally {
      setIsValidating(false);
    }
  }, [uploadFile, onError, onSuccess]);

  const handleFileUpload = useCallback(async () => {
    if (!uploadFile) {
      onError?.('Please select a file');
      return;
    }

    try {
      setIsUploading(true);
      
      const response = await attendanceApi.upload(uploadFile);
      setUploadResults(response.data);
      
      const { summary } = response.data;
      onSuccess?.(`Upload successful! ${summary.successful_records} records processed, ${summary.total_hours} total hours, $${summary.total_pay} total pay calculated.`);
      
      // Reset form after successful upload
      setUploadFile(null);
      setValidationResults(null);
      setShowPreview(false);
      
      onUploadSuccess?.(response.data);
    } catch (err) {
      onError?.('Failed to upload file. Please check the format and try again.');
    } finally {
      setIsUploading(false);
    }
  }, [uploadFile, onError, onSuccess, onUploadSuccess]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    
    if (files.length > 0) {
      const file = files[0];
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        if (file.size > 10 * 1024 * 1024) { // 10MB limit
          onError?.('File size too large. Maximum size is 10MB.');
          return;
        }
        setUploadFile(file);
        setValidationResults(null);
        setUploadResults(null);
        setShowPreview(false);
      } else {
        onError?.('Please drop a valid CSV file');
      }
    }
  }, [onError]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        onError?.('File size too large. Maximum size is 10MB.');
        return;
      }
      setUploadFile(file);
      setValidationResults(null);
      setUploadResults(null);
      setShowPreview(false);
    }
  }, [onError]);

  const resetUpload = useCallback(() => {
    setUploadFile(null);
    setValidationResults(null);
    setUploadResults(null);
    setShowPreview(false);
  }, []);

  if (isValidating) {
    return <ValidationSkeleton />;
  }

  return (
    <ErrorBoundary>
      <Stack spacing={3}>
        {/* Header and Template Download */}
        <Box>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Box>
              <Typography variant="h6" gutterBottom>
                CSV Upload & Processing Center
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Upload attendance data with automatic validation and payroll calculation
              </Typography>
            </Box>
            <Tooltip title="Download a CSV template with current employee data">
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={handleDownloadTemplate}
                disabled={isDownloadingTemplate}
                size="small"
              >
                {isDownloadingTemplate ? 'Downloading...' : 'Get Template'}
              </Button>
            </Tooltip>
          </Stack>
        </Box>

        {/* Enhanced Drag-Drop Upload Zone */}
        <Card 
          variant="outlined" 
          sx={{ 
            border: dragOver ? '2px dashed #1976d2' : '2px dashed #e0e0e0',
            backgroundColor: dragOver ? '#f8f9ff' : 'transparent',
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              backgroundColor: '#fafafa',
              borderColor: '#bdbdbd'
            }
          }}
        >
          <CardContent>
            <Box
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              sx={{
                textAlign: 'center',
                py: 4,
                cursor: 'pointer'
              }}
              onClick={() => document.getElementById('upload-file-input')?.click()}
              role="button"
              tabIndex={0}
              aria-label="Click to upload file or drag and drop"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  document.getElementById('upload-file-input')?.click();
                }
              }}
            >
              <UploadIcon 
                sx={{ 
                  fontSize: 48, 
                  color: dragOver ? 'primary.main' : 'text.secondary', 
                  mb: 2 
                }} 
              />
              <Typography variant="h6" gutterBottom>
                {dragOver ? 'Drop your CSV file here' : 'Drag & drop CSV file or click to browse'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Maximum file size: 10MB • Required format: CSV with employee_id, date, clock_in, break_start, break_end, clock_out
              </Typography>
              
              <Alert severity="info" sx={{ maxWidth: 400, mx: 'auto' }}>
                <Typography variant="body2">
                  <strong>Pro tip:</strong> Download the template first to ensure your CSV has the correct format and current employee data
                </Typography>
              </Alert>
              
              <input
                id="upload-file-input"
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
                aria-label="Select CSV file"
              />
            </Box>

            {/* File Selected Info */}
            {uploadFile && (
              <Box sx={{ mt: 3, p: 2, bgcolor: 'success.50', borderRadius: 1, border: '1px solid', borderColor: 'success.200' }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <CheckIcon color="success" />
                  <Box flex={1}>
                    <Typography variant="body1" fontWeight="medium">
                      {uploadFile.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {Math.round(uploadFile.size / 1024)} KB • Modified: {new Date(uploadFile.lastModified).toLocaleDateString()}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1}>
                    <Tooltip title="Clear selected file">
                      <IconButton size="small" onClick={resetUpload}>
                        <RefreshIcon />
                      </IconButton>
                    </Tooltip>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<PreviewIcon />}
                      onClick={handleValidateFile}
                      disabled={isValidating}
                    >
                      Validate
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<UploadIcon />}
                      onClick={handleFileUpload}
                      disabled={isUploading || Boolean(validationResults && validationStatus && !validationStatus.canUpload)}
                    >
                      Upload
                    </Button>
                  </Stack>
                </Stack>
                
                {/* Upload Progress */}
                {isUploading && (
                  <Box sx={{ mt: 2 }}>
                    <LinearProgress variant="indeterminate" />
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Processing attendance data and calculating payroll...
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Validation Results Preview */}
        {validationResults && showPreview && validationStatus && (
          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <PreviewIcon color="primary" />
                  <Typography variant="h6">Validation Results</Typography>
                  <Chip 
                    label={validationStatus.isValid ? 'Ready to Upload' : 'Has Errors'} 
                    color={validationStatus.isValid ? 'success' : 'error'}
                    size="small"
                  />
                </Stack>
                {validationStatus && validationStatus.canUpload && (
                  <Button
                    variant="contained"
                    startIcon={<UploadIcon />}
                    onClick={handleFileUpload}
                    disabled={isUploading}
                  >
                    Upload Now
                  </Button>
                )}
              </Stack>
              
              {/* Summary Metrics */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={3}>
                  <Typography variant="body2" color="text.secondary">Total Rows</Typography>
                  <Typography variant="h6">{validationResults.summary.total_rows}</Typography>
                </Grid>
                <Grid size={3}>
                  <Typography variant="body2" color="success.main">Valid</Typography>
                  <Typography variant="h6" color="success.main">{validationResults.summary.valid_rows}</Typography>
                </Grid>
                <Grid size={3}>
                  <Typography variant="body2" color="warning.main">Warnings</Typography>
                  <Typography variant="h6" color="warning.main">{validationResults.summary.warning_rows}</Typography>
                </Grid>
                <Grid size={3}>
                  <Typography variant="body2" color="error.main">Errors</Typography>
                  <Typography variant="h6" color="error.main">{validationResults.summary.error_rows}</Typography>
                </Grid>
              </Grid>

              <Box sx={{ mb: 2 }}>
                <Chip 
                  label={`${validationStatus.successRate}% Success Rate`}
                  color={validationStatus.successRate >= 90 ? 'success' : validationStatus.successRate >= 70 ? 'warning' : 'error'}
                  variant="outlined"
                />
              </Box>

              {/* Preview Table */}
              <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 300 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Row</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Employee</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Work Hours</TableCell>
                      <TableCell>Issues</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {validationResults.preview.slice(0, 10).map((row: any) => (
                      <TableRow key={row.row} sx={{ '&:hover': { bgcolor: 'grey.50' } }}>
                        <TableCell>{row.row}</TableCell>
                        <TableCell>
                          {row.status === 'valid' && <CheckIcon color="success" fontSize="small" />}
                          {row.status === 'warning' && (
                            <Tooltip title={row.warnings.join('; ')}>
                              <WarningIcon color="warning" fontSize="small" />
                            </Tooltip>
                          )}
                          {row.status === 'error' && (
                            <Tooltip title={row.errors.join('; ')}>
                              <ErrorIcon color="error" fontSize="small" />
                            </Tooltip>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {row.data.resolved_employee_id || row.data.employee_id || row.data.employee_name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{row.data.date}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {row.data.clock_in} - {row.data.clock_out}
                            {row.data.break_start && ` (Break: ${row.data.break_start}-${row.data.break_end})`}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {row.errors.length > 0 && (
                            <Typography variant="body2" color="error.main" sx={{ fontSize: '0.75rem' }}>
                              {row.errors[0]}
                            </Typography>
                          )}
                          {row.warnings.length > 0 && (
                            <Typography variant="body2" color="warning.main" sx={{ fontSize: '0.75rem' }}>
                              {row.warnings[0]}
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              
              {validationResults.preview.length > 10 && (
                <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <InfoIcon color="action" fontSize="small" />
                  <Typography variant="body2" color="text.secondary">
                    Showing first 10 rows of {validationResults.summary.total_rows} total rows
                  </Typography>
                </Box>
              )}

              {/* Employee mapping suggestions */}
              {validationResults.employee_mapping_suggestions.length > 0 && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Smart Employee Matching Suggestions:
                  </Typography>
                  {validationResults.employee_mapping_suggestions.slice(0, 3).map((suggestion: any, index: number) => (
                    <Typography key={index} variant="body2">
                      • Row {suggestion.row}: "{suggestion.csv_name}" → "{suggestion.suggested_name}" ({Math.round(suggestion.confidence * 100)}% match)
                    </Typography>
                  ))}
                  {validationResults.employee_mapping_suggestions.length > 3 && (
                    <Typography variant="body2" color="text.secondary">
                      ...and {validationResults.employee_mapping_suggestions.length - 3} more suggestions
                    </Typography>
                  )}
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {/* Upload Results Summary */}
        {uploadResults && (
          <Card variant="outlined" sx={{ bgcolor: 'success.50', border: '1px solid', borderColor: 'success.200' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                <CheckIcon color="success" />
                <Typography variant="h6" color="success.main">
                  Upload Completed Successfully!
                </Typography>
              </Stack>
              
              <Grid container spacing={3}>
                <Grid size={3}>
                  <Typography variant="body2" color="text.secondary">Records Processed</Typography>
                  <Typography variant="h6">{uploadResults.summary.successful_records}</Typography>
                </Grid>
                <Grid size={3}>
                  <Typography variant="body2" color="text.secondary">Total Hours</Typography>
                  <Typography variant="h6">{uploadResults.summary.total_hours}</Typography>
                </Grid>
                <Grid size={3}>
                  <Typography variant="body2" color="text.secondary">Total Pay</Typography>
                  <Typography variant="h6">${uploadResults.summary.total_pay}</Typography>
                </Grid>
                <Grid size={3}>
                  <Typography variant="body2" color="text.secondary">Processing Time</Typography>
                  <Typography variant="h6">{uploadResults.summary.processing_time}s</Typography>
                </Grid>
              </Grid>

              {uploadResults.summary.failed_records > 0 && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  {uploadResults.summary.failed_records} records had errors and were not processed. 
                  Please check the validation results and re-upload if needed.
                </Alert>
              )}
            </CardContent>
          </Card>
        )}
      </Stack>
    </ErrorBoundary>
  );
};

export default React.memo(UploadCenter);