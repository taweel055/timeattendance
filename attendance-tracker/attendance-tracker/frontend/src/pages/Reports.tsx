import React, { useState } from 'react';
import {
  Box,
  Button,
  Paper,
  Typography,
  Tab,
  Tabs,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  CircularProgress,
  Card,
  CardContent,
} from '@mui/material';
import {
  Download as DownloadIcon,
  CalendarToday as CalendarIcon,
  AttachMoney as MoneyIcon,
  AccessTime as TimeIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { reportApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

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
      id={`report-tabpanel-${index}`}
      aria-labelledby={`report-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

interface SummaryCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ title, value, icon, color }) => (
  <Card>
    <CardContent>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography color="textSecondary" gutterBottom variant="body2">
            {title}
          </Typography>
          <Typography variant="h5">{value}</Typography>
        </Box>
        <Box
          sx={{
            backgroundColor: color,
            borderRadius: '8px',
            p: 1,
            color: 'white',
          }}
        >
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const Reports: React.FC = () => {
  const { isAdmin } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dailyDate, setDailyDate] = useState<Date | null>(new Date());
  const [weekStartDate, setWeekStartDate] = useState<Date | null>(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [monthYear, setMonthYear] = useState<Date | null>(new Date());
  const [dailyReport, setDailyReport] = useState<any>(null);
  const [weeklyReport, setWeeklyReport] = useState<any>(null);
  const [monthlyReport, setMonthlyReport] = useState<any>(null);

  const fetchDailyReport = async () => {
    if (!dailyDate) return;
    try {
      setLoading(true);
      const response = await reportApi.getDaily(format(dailyDate, 'yyyy-MM-dd'));
      setDailyReport(response.data);
    } catch (err) {
      setError('Failed to fetch daily report');
    } finally {
      setLoading(false);
    }
  };

  const fetchWeeklyReport = async () => {
    if (!weekStartDate) return;
    try {
      setLoading(true);
      const weekEnd = endOfWeek(weekStartDate, { weekStartsOn: 1 });
      const response = await reportApi.getWeekly(
        format(weekStartDate, 'yyyy-MM-dd'),
        format(weekEnd, 'yyyy-MM-dd')
      );
      setWeeklyReport(response.data);
    } catch (err) {
      setError('Failed to fetch weekly report');
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthlyReport = async () => {
    if (!monthYear) return;
    try {
      setLoading(true);
      const response = await reportApi.getMonthly(
        monthYear.getFullYear(),
        monthYear.getMonth() + 1
      );
      setMonthlyReport(response.data);
    } catch (err) {
      setError('Failed to fetch monthly report');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (type: string) => {
    try {
      let params = {};
      if (type === 'daily' && dailyDate) {
        params = { date: format(dailyDate, 'yyyy-MM-dd') };
      } else if (type === 'weekly' && weekStartDate) {
        const weekEnd = endOfWeek(weekStartDate, { weekStartsOn: 1 });
        params = {
          week_start: format(weekStartDate, 'yyyy-MM-dd'),
          week_end: format(weekEnd, 'yyyy-MM-dd'),
        };
      }

      const response = await reportApi.exportReport(type, params);
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance_${type}_report_${format(new Date(), 'yyyyMMdd')}.csv`;
      a.click();
    } catch (err) {
      setError('Failed to export report');
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Reports
      </Typography>

      {error && (
        <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
          <Tab label="Daily Report" />
          <Tab label="Weekly Report" />
          <Tab label="Monthly Report" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <Box mb={3}>
            <Grid container spacing={2} alignItems="center">
              <Grid>
                <DatePicker
                  label="Select Date"
                  value={dailyDate}
                  onChange={setDailyDate}
                />
              </Grid>
              <Grid>
                <Button variant="contained" onClick={fetchDailyReport}>
                  Generate Report
                </Button>
              </Grid>
              {dailyReport && isAdmin && (
                <Grid>
                  <Button
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    onClick={() => handleExport('daily')}
                  >
                    Export CSV
                  </Button>
                </Grid>
              )}
            </Grid>
          </Box>

          {loading && <CircularProgress />}

          {dailyReport && (
            <>
              <Grid container spacing={3} mb={3}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <SummaryCard
                    title="Total Employees"
                    value={dailyReport.summary.totalEmployees}
                    icon={<CalendarIcon />}
                    color="#1976d2"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <SummaryCard
                    title="Total Hours"
                    value={dailyReport.summary.totalHours.toFixed(2)}
                    icon={<TimeIcon />}
                    color="#2e7d32"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <SummaryCard
                    title="Overtime Hours"
                    value={dailyReport.summary.totalOvertimeHours.toFixed(2)}
                    icon={<TimeIcon />}
                    color="#ed6c02"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <SummaryCard
                    title="Total Pay"
                    value={`$${dailyReport.summary.totalPay.toFixed(2)}`}
                    icon={<MoneyIcon />}
                    color="#9c27b0"
                  />
                </Grid>
              </Grid>

              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Employee ID</TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell>Department</TableCell>
                      <TableCell>Clock In</TableCell>
                      <TableCell>Clock Out</TableCell>
                      <TableCell align="right">Total Hours</TableCell>
                      <TableCell align="right">Regular Pay</TableCell>
                      <TableCell align="right">Overtime Pay</TableCell>
                      <TableCell align="right">Gross Pay</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {dailyReport.details.map((row: any) => (
                      <TableRow key={row.id}>
                        <TableCell>{row.employee_id}</TableCell>
                        <TableCell>{row.name}</TableCell>
                        <TableCell>{row.department}</TableCell>
                        <TableCell>{row.clock_in}</TableCell>
                        <TableCell>{row.clock_out}</TableCell>
                        <TableCell align="right">{row.total_hours?.toFixed(2)}</TableCell>
                        <TableCell align="right">${row.regularPay?.toFixed(2)}</TableCell>
                        <TableCell align="right">${row.overtimePay?.toFixed(2)}</TableCell>
                        <TableCell align="right">${row.grossPay?.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box mb={3}>
            <Grid container spacing={2} alignItems="center">
              <Grid>
                <DatePicker
                  label="Week Start Date"
                  value={weekStartDate}
                  onChange={setWeekStartDate}
                />
              </Grid>
              <Grid>
                <Button variant="contained" onClick={fetchWeeklyReport}>
                  Generate Report
                </Button>
              </Grid>
              {weeklyReport && isAdmin && (
                <Grid>
                  <Button
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    onClick={() => handleExport('weekly')}
                  >
                    Export CSV
                  </Button>
                </Grid>
              )}
            </Grid>
          </Box>

          {loading && <CircularProgress />}

          {weeklyReport && (
            <>
              <Grid container spacing={3} mb={3}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <SummaryCard
                    title="Total Employees"
                    value={weeklyReport.summary.totalEmployees}
                    icon={<CalendarIcon />}
                    color="#1976d2"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <SummaryCard
                    title="Total Hours"
                    value={weeklyReport.summary.totalHours.toFixed(2)}
                    icon={<TimeIcon />}
                    color="#2e7d32"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <SummaryCard
                    title="Overtime Hours"
                    value={weeklyReport.summary.totalOvertimeHours.toFixed(2)}
                    icon={<TimeIcon />}
                    color="#ed6c02"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <SummaryCard
                    title="Total Pay"
                    value={`$${weeklyReport.summary.totalPay.toFixed(2)}`}
                    icon={<MoneyIcon />}
                    color="#9c27b0"
                  />
                </Grid>
              </Grid>

              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Employee ID</TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell>Department</TableCell>
                      <TableCell align="right">Days Worked</TableCell>
                      <TableCell align="right">Total Hours</TableCell>
                      <TableCell align="right">Regular Hours</TableCell>
                      <TableCell align="right">Overtime Hours</TableCell>
                      <TableCell align="right">Gross Pay</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {weeklyReport.details.map((row: any) => (
                      <TableRow key={row.employee_id}>
                        <TableCell>{row.employee_id}</TableCell>
                        <TableCell>{row.name}</TableCell>
                        <TableCell>{row.department}</TableCell>
                        <TableCell align="right">{row.days_worked}</TableCell>
                        <TableCell align="right">{row.total_hours?.toFixed(2)}</TableCell>
                        <TableCell align="right">{row.weekly_regular_hours?.toFixed(2)}</TableCell>
                        <TableCell align="right">{row.weekly_overtime_hours?.toFixed(2)}</TableCell>
                        <TableCell align="right">${row.grossPay?.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Box mb={3}>
            <Grid container spacing={2} alignItems="center">
              <Grid>
                <DatePicker
                  label="Select Month"
                  views={['year', 'month']}
                  value={monthYear}
                  onChange={setMonthYear}
                />
              </Grid>
              <Grid>
                <Button variant="contained" onClick={fetchMonthlyReport}>
                  Generate Report
                </Button>
              </Grid>
            </Grid>
          </Box>

          {loading && <CircularProgress />}

          {monthlyReport && (
            <>
              <Grid container spacing={3} mb={3}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <SummaryCard
                    title="Total Employees"
                    value={monthlyReport.summary.totalEmployees}
                    icon={<CalendarIcon />}
                    color="#1976d2"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <SummaryCard
                    title="Active Employees"
                    value={monthlyReport.summary.activeEmployees}
                    icon={<CalendarIcon />}
                    color="#2e7d32"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <SummaryCard
                    title="Total Hours"
                    value={monthlyReport.summary.totalHours.toFixed(2)}
                    icon={<TimeIcon />}
                    color="#ed6c02"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <SummaryCard
                    title="Total Pay"
                    value={`$${monthlyReport.summary.totalPay.toFixed(2)}`}
                    icon={<MoneyIcon />}
                    color="#9c27b0"
                  />
                </Grid>
              </Grid>

              <Typography variant="h6" gutterBottom>
                Department Summary
              </Typography>
              <TableContainer component={Paper} sx={{ mb: 3 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Department</TableCell>
                      <TableCell align="right">Employee Count</TableCell>
                      <TableCell align="right">Total Hours</TableCell>
                      <TableCell align="right">Overtime Hours</TableCell>
                      <TableCell align="right">Avg Hours</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {monthlyReport.departmentSummary.map((dept: any) => (
                      <TableRow key={dept.department}>
                        <TableCell>{dept.department}</TableCell>
                        <TableCell align="right">{dept.employee_count}</TableCell>
                        <TableCell align="right">{dept.total_hours?.toFixed(2)}</TableCell>
                        <TableCell align="right">{dept.overtime_hours?.toFixed(2)}</TableCell>
                        <TableCell align="right">{dept.avg_hours?.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Typography variant="h6" gutterBottom>
                Employee Details
              </Typography>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Employee ID</TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell>Department</TableCell>
                      <TableCell align="right">Days Worked</TableCell>
                      <TableCell align="right">Total Hours</TableCell>
                      <TableCell align="right">Avg Daily Hours</TableCell>
                      <TableCell align="right">Gross Pay</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {monthlyReport.details.map((row: any) => (
                      <TableRow key={row.employee_id}>
                        <TableCell>{row.employee_id}</TableCell>
                        <TableCell>{row.name}</TableCell>
                        <TableCell>{row.department}</TableCell>
                        <TableCell align="right">{row.days_worked}</TableCell>
                        <TableCell align="right">{row.total_hours?.toFixed(2)}</TableCell>
                        <TableCell align="right">{row.avg_daily_hours?.toFixed(2)}</TableCell>
                        <TableCell align="right">${row.grossPay?.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default Reports;