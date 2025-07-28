import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  TextField,
  Button,
  Alert,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

const Settings: React.FC = () => {
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Settings
        </Typography>
        <Alert severity="warning">
          You need administrator privileges to access settings.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Working Hours Configuration
            </Typography>
            <Grid container spacing={2}>
              <Grid size={12}>
                <TextField
                  fullWidth
                  label="Standard Hours Per Day"
                  type="number"
                  defaultValue="8"
                  helperText="Number of hours in a standard work day"
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  fullWidth
                  label="Weekly Overtime Threshold"
                  type="number"
                  defaultValue="40"
                  helperText="Hours per week before overtime applies"
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  fullWidth
                  label="Overtime Multiplier"
                  type="number"
                  defaultValue="1.5"
                  helperText="Multiplier for overtime pay (e.g., 1.5 for time and a half)"
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  fullWidth
                  label="Standard Break Duration (minutes)"
                  type="number"
                  defaultValue="60"
                  helperText="Default break duration in minutes"
                />
              </Grid>
              <Grid size={12}>
                <Button variant="contained">Save Working Hours Settings</Button>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Company Information
            </Typography>
            <Grid container spacing={2}>
              <Grid size={12}>
                <TextField
                  fullWidth
                  label="Company Name"
                  defaultValue="Your Company"
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  fullWidth
                  label="Company Address"
                  multiline
                  rows={3}
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  fullWidth
                  label="Currency"
                  defaultValue="USD"
                  helperText="Currency symbol for salary calculations"
                />
              </Grid>
              <Grid size={12}>
                <Button variant="contained">Save Company Settings</Button>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        <Grid size={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              System Configuration
            </Typography>
            <Alert severity="info" sx={{ mb: 2 }}>
              Note: These settings are currently display-only. Backend integration required for full functionality.
            </Alert>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Date Format"
                  defaultValue="MM/DD/YYYY"
                  select
                  SelectProps={{ native: true }}
                >
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Time Format"
                  defaultValue="12"
                  select
                  SelectProps={{ native: true }}
                >
                  <option value="12">12 Hour (AM/PM)</option>
                  <option value="24">24 Hour</option>
                </TextField>
              </Grid>
              <Grid size={12}>
                <Button variant="contained">Save System Settings</Button>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Settings;