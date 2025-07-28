import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Button,
  Paper,
  Typography,
  Tab,
  Tabs,
  TextField,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Autocomplete,
  CircularProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Card,
  CardContent,
  Stack,
} from '@mui/material';
import { Grid } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import {
  CloudUpload as UploadIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Calculate as CalculateIcon,
  Preview as PreviewIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { format, parse } from 'date-fns';
import { attendanceApi, employeeApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import ErrorBoundary from '../components/ErrorBoundary';
import ConfirmationDialog from '../components/ConfirmationDialog';
import UploadCenter from '../components/UploadCenter';
import { TableSkeleton, HeaderSkeleton, FormSkeleton } from '../components/LoadingSkeleton';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

// Memoized data grid component for better performance
const AttendanceDataGrid = React.memo(({ attendance, loading, onDelete, isAdmin, isManager }: {
  attendance: any[];
  loading: boolean;
  onDelete: (id: string) => void;
  isAdmin: boolean;
  isManager: boolean;
}) => {
  const columns: GridColDef[] = useMemo(() => [
    { field: 'employee_id', headerName: 'Employee ID', width: 120 },
    { field: 'date', headerName: 'Date', width: 120 },
    { field: 'clock_in', headerName: 'Clock In', width: 100 },
    { field: 'clock_out', headerName: 'Clock Out', width: 100 },
    { field: 'break_start', headerName: 'Break Start', width: 100 },
    { field: 'break_end', headerName: 'Break End', width: 100 },
    {
      field: 'total_hours',
      headerName: 'Total Hours',
      width: 120,
      valueFormatter: (params: any) => params.value?.toFixed(2) || '0',
    },
    {
      field: 'overtime_hours',
      headerName: 'Overtime',
      width: 100,
      valueFormatter: (params: any) => params.value?.toFixed(2) || '0',
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 100,
      renderCell: (params: any) => (
        <IconButton
          size="small"
          onClick={() => onDelete(params.row.id)}
          disabled={!isAdmin && !isManager}
          aria-label={`Delete attendance record for ${params.row.employee_id}`}
        >
          <DeleteIcon />
        </IconButton>
      ),
    },
  ], [onDelete, isAdmin, isManager]);

  if (loading) {
    return <TableSkeleton rows={10} columns={8} />;
  }

  return (
    <DataGrid
      rows={attendance}
      columns={columns}
      loading={loading}
      autoHeight
      pageSizeOptions={[10, 25, 50, 100]}
      initialState={{
        pagination: {
          paginationModel: { pageSize: 25 },
        },
      }}
      disableRowSelectionOnClick
      sx={{
        '& .MuiDataGrid-row:hover': {
          backgroundColor: 'rgba(0, 0, 0, 0.04)',
        },
      }}
    />
  );
});

AttendanceDataGrid.displayName = 'AttendanceDataGrid';

const Attendance: React.FC = () => {
  const { isAdmin, isManager } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [attendance, setAttendance] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  // Calculate button states
  const [showCalculateDialog, setShowCalculateDialog] = useState(false);
  const [calculateDateRange, setCalculateDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    end: new Date()
  });
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [calculateResults, setCalculateResults] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  
  // Performance optimization: memoize expensive computations
  const attendanceWithIds = useMemo(() => 
    attendance.map((record, index) => ({
      ...record,
      id: record.id || `${record.employee_id}-${record.date}-${index}`
    })), [attendance]
  );
  
  const [formData, setFormData] = useState({
    employee_id: '',
    date: new Date(),
    clock_in: null as Date | null,
    clock_out: null as Date | null,
    break_start: null as Date | null,
    break_end: null as Date | null,
    notes: '',
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      fetchAttendance();
    }
  }, [selectedDate]);

  const fetchEmployees = useCallback(async () => {
    try {
      const response = await employeeApi.getAll();
      setEmployees(response.data);
    } catch (err) {
      console.error('Failed to fetch employees:', err);
      setError('Failed to load employees');
    }
  }, []);

  const fetchAttendance = useCallback(async () => {
    if (!selectedDate) return;
    
    try {
      setLoading(true);
      const response = await attendanceApi.getAll({
        date: format(selectedDate, 'yyyy-MM-dd'),
      });
      setAttendance(response.data);
    } catch (err) {
      setError('Failed to fetch attendance records');
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);


  const handleCalculateHours = useCallback(async () => {
    try {
      setIsCalculating(true);
      
      const response = await fetch('/api/attendance/calculate-bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          date_range: {
            start_date: format(calculateDateRange.start, 'yyyy-MM-dd'),
            end_date: format(calculateDateRange.end, 'yyyy-MM-dd')
          },
          employee_ids: selectedEmployees.length > 0 ? selectedEmployees : null,
          group_by: 'employee'
        })
      });
      
      const results = await response.json();
      setCalculateResults(results);
      setSuccess(`Calculation completed! ${results.summary.total_records} employees, ${results.summary.total_hours} total hours, $${results.summary.total_pay} total pay.`);
    } catch (err) {
      setError('Failed to calculate hours and pay');
    } finally {
      setIsCalculating(false);
    }
  }, [calculateDateRange.start, calculateDateRange.end, selectedEmployees]);

  const handleExportResults = useCallback(() => {
    if (!calculateResults) return;
    
    const headers = [
      'Employee ID',
      'Employee Name', 
      'Department',
      'Days Worked',
      'Total Hours',
      'Regular Hours',
      'Overtime Hours',
      'Hourly Rate',
      'Overtime Rate',
      'Regular Pay',
      'Overtime Pay',
      'Gross Pay',
      'Average Daily Hours',
      'Period'
    ];
    
    const csvData = calculateResults.calculations.map((calc: any) => [
      calc.employee_id,
      `"${calc.employee_name}"`,
      `"${calc.department || 'N/A'}"`,
      calc.days_worked,
      calc.total_hours,
      calc.regular_hours,
      calc.overtime_hours,
      calc.hourly_rate,
      calc.overtime_rate,
      calc.regular_pay,
      calc.overtime_pay,
      calc.gross_pay,
      calc.avg_daily_hours,
      `"${calc.period}"`
    ]);
    
    const csvContent = [
      headers.join(','),
      `"Summary",,,,${calculateResults.summary.total_hours},${calculateResults.summary.total_regular_hours},${calculateResults.summary.total_overtime_hours},,,$${calculateResults.summary.total_regular_pay},$${calculateResults.summary.total_overtime_pay},$${calculateResults.summary.total_pay},,`,
      '', // Empty row
      ...csvData.map((row: any[]) => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const filename = `payroll_report_${format(calculateDateRange.start, 'yyyy-MM-dd')}_to_${format(calculateDateRange.end, 'yyyy-MM-dd')}.csv`;
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setSuccess('Payroll report exported successfully!');
    }
  }, [calculateResults, calculateDateRange.start, calculateDateRange.end]);

  // Handler for upload success
  const handleUploadSuccess = useCallback((results: any) => {
    fetchAttendance();
  }, [fetchAttendance]);

  // Clear alerts after timeout
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 8000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleSubmit = useCallback(async () => {
    try {
      setLoading(true);
      const data = {
        ...formData,
        date: format(formData.date, 'yyyy-MM-dd'),
        clock_in: formData.clock_in ? format(formData.clock_in, 'HH:mm') : null,
        clock_out: formData.clock_out ? format(formData.clock_out, 'HH:mm') : null,
        break_start: formData.break_start ? format(formData.break_start, 'HH:mm') : null,
        break_end: formData.break_end ? format(formData.break_end, 'HH:mm') : null,
      };

      await attendanceApi.create(data);
      setSuccess('Attendance record saved successfully');
      handleCloseDialog();
      fetchAttendance();
    } catch (err) {
      setError('Failed to save attendance record');
    } finally {
      setLoading(false);
    }
  }, [formData, fetchAttendance]);

  const handleDeleteClick = useCallback((id: string) => {
    setRecordToDelete(id);
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!recordToDelete) return;
    
    try {
      setDeleting(true);
      await attendanceApi.delete(recordToDelete);
      setSuccess('Attendance record deleted successfully');
      fetchAttendance();
    } catch (err) {
      setError('Failed to delete record');
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setRecordToDelete(null);
    }
  }, [recordToDelete, fetchAttendance]);

  const handleDeleteCancel = useCallback(() => {
    setDeleteDialogOpen(false);
    setRecordToDelete(null);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setOpenDialog(false);
    setFormData({
      employee_id: '',
      date: new Date(),
      clock_in: null,
      clock_out: null,
      break_start: null,
      break_end: null,
      notes: '',
    });
  }, []);

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch('/api/attendance/csv-template', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'attendance_template.csv';
        a.click();
        setSuccess('Template downloaded successfully');
      } else {
        setError('Failed to download template');
      }
    } catch (err) {
      setError('Failed to download template');
    }
  };


  return (
    <ErrorBoundary>
      <Box>
        {loading && !attendance.length ? (
          <HeaderSkeleton />
        ) : (
          <Typography variant="h4" gutterBottom>
            Attendance Management
          </Typography>
        )}

      {error && (
        <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Paper>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
          <Tab label="View Attendance" />
          <Tab label="Add Record" disabled={!isAdmin && !isManager} />
          <Tab label="Upload CSV" disabled={!isAdmin && !isManager} />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <Box mb={2}>
            <DatePicker
              label="Select Date"
              value={selectedDate}
              onChange={setSelectedDate}
              sx={{ width: 300 }}
              slotProps={{
                textField: {
                  'aria-label': 'Select date to view attendance records'
                }
              }}
            />
          </Box>
          <AttendanceDataGrid 
            attendance={attendanceWithIds}
            loading={loading}
            onDelete={handleDeleteClick}
            isAdmin={isAdmin || false}
            isManager={isManager || false}
          />
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {loading ? (
            <FormSkeleton fields={7} />
          ) : (
            <Grid container spacing={3} maxWidth="md">
            <Grid size={{ xs: 12, sm: 6 }}>
              <Autocomplete
                options={employees}
                getOptionLabel={(option) => `${option.employee_id} - ${option.name}`}
                value={employees.find((e) => e.employee_id === formData.employee_id) || null}
                onChange={(e, value) =>
                  setFormData({ ...formData, employee_id: value?.employee_id || '' })
                }
                renderInput={(params) => (
                  <TextField {...params} label="Employee" required />
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <DatePicker
                label="Date"
                value={formData.date}
                onChange={(date) => setFormData({ ...formData, date: date! })}
                sx={{ width: '100%' }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TimePicker
                label="Clock In"
                value={formData.clock_in}
                onChange={(time) => setFormData({ ...formData, clock_in: time })}
                sx={{ width: '100%' }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TimePicker
                label="Clock Out"
                value={formData.clock_out}
                onChange={(time) => setFormData({ ...formData, clock_out: time })}
                sx={{ width: '100%' }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TimePicker
                label="Break Start"
                value={formData.break_start}
                onChange={(time) => setFormData({ ...formData, break_start: time })}
                sx={{ width: '100%' }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TimePicker
                label="Break End"
                value={formData.break_end}
                onChange={(time) => setFormData({ ...formData, break_end: time })}
                sx={{ width: '100%' }}
              />
            </Grid>
            <Grid size={12}>
              <TextField
                fullWidth
                label="Notes"
                multiline
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </Grid>
            <Grid size={12}>
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={!formData.employee_id || !formData.clock_in}
              >
                Save Attendance Record
              </Button>
            </Grid>
          </Grid>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <UploadCenter 
            onUploadSuccess={handleUploadSuccess}
            onError={setError}
            onSuccess={setSuccess}
          />

          {/* Calculate Hours Section */}
          <Divider sx={{ my: 3 }} />
          
          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
                <CalculateIcon color="primary" />
                <Typography variant="h6">Calculate Hours & Pay</Typography>
              </Stack>
              
              <Grid container spacing={3}>
                <Grid size={6}>
                  <DatePicker
                    label="From Date"
                    value={calculateDateRange.start}
                    onChange={(date) => setCalculateDateRange(prev => ({ ...prev, start: date! }))}
                    sx={{ width: '100%' }}
                    slotProps={{
                      textField: {
                        'aria-label': 'Select start date for calculation'
                      }
                    }}
                  />
                </Grid>
                <Grid size={6}>
                  <DatePicker
                    label="To Date"
                    value={calculateDateRange.end}
                    onChange={(date) => setCalculateDateRange(prev => ({ ...prev, end: date! }))}
                    sx={{ width: '100%' }}
                    slotProps={{
                      textField: {
                        'aria-label': 'Select end date for calculation'
                      }
                    }}
                  />
                </Grid>
              </Grid>
              
              <Box sx={{ mt: 3 }}>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<CalculateIcon />}
                  onClick={handleCalculateHours}
                  disabled={isCalculating}
                  fullWidth
                  aria-label={`Calculate hours and pay from ${format(calculateDateRange.start, 'MMM d')} to ${format(calculateDateRange.end, 'MMM d')}`}
                >
                  {isCalculating ? (
                    <Stack direction="row" spacing={1} alignItems="center">
                      <CircularProgress size={20} />
                      <span>Calculating...</span>
                    </Stack>
                  ) : (
                    `Calculate Hours & Pay (${format(calculateDateRange.start, 'MMM d')} - ${format(calculateDateRange.end, 'MMM d')})`
                  )}
                </Button>
              </Box>
            </CardContent>
          </Card>

            {/* Calculate Results */}
            {calculateResults && (
              <Card variant="outlined">
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                    <Typography variant="h6">
                      Calculation Results
                    </Typography>
                    <Button
                      variant="outlined"
                      startIcon={<DownloadIcon />}
                      onClick={handleExportResults}
                      size="small"
                    >
                      Export CSV
                    </Button>
                  </Stack>
                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid size={3}>
                      <Typography variant="body2" color="text.secondary">Employees</Typography>
                      <Typography variant="h6">{calculateResults.summary.total_records}</Typography>
                    </Grid>
                    <Grid size={3}>
                      <Typography variant="body2" color="text.secondary">Total Hours</Typography>
                      <Typography variant="h6">{calculateResults.summary.total_hours}</Typography>
                    </Grid>
                    <Grid size={3}>
                      <Typography variant="body2" color="text.secondary">Regular Pay</Typography>
                      <Typography variant="h6">${calculateResults.summary.total_regular_pay}</Typography>
                    </Grid>
                    <Grid size={3}>
                      <Typography variant="body2" color="text.secondary">Total Pay</Typography>
                      <Typography variant="h6" color="primary.main">${calculateResults.summary.total_pay}</Typography>
                    </Grid>
                  </Grid>
                  
                  <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 400 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell>Employee</TableCell>
                          <TableCell align="right">Days</TableCell>
                          <TableCell align="right">Hours</TableCell>
                          <TableCell align="right">Regular Pay</TableCell>
                          <TableCell align="right">Overtime Pay</TableCell>
                          <TableCell align="right">Total Pay</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {calculateResults.calculations.map((calc: any, index: number) => (
                          <TableRow key={index}>
                            <TableCell>{calc.employee_name}</TableCell>
                            <TableCell align="right">{calc.days_worked}</TableCell>
                            <TableCell align="right">{calc.total_hours}</TableCell>
                            <TableCell align="right">${calc.regular_pay}</TableCell>
                            <TableCell align="right">${calc.overtime_pay}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>${calc.gross_pay}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            )}
        </TabPanel>
      </Paper>
      
      {/* Confirmation Dialog for Deletions */}
      <ConfirmationDialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Attendance Record"
        message="Are you sure you want to delete this attendance record? This action cannot be undone."
        confirmText="Delete Record"
        cancelText="Keep Record"
        severity="error"
        confirmButtonColor="error"
        loading={deleting}
        details={[
          "The record will be permanently removed from the database",
          "Any associated payroll calculations will be affected",
          "This action cannot be reversed"
        ]}
      />
    </Box>
    </ErrorBoundary>
  );
};

export default React.memo(Attendance);