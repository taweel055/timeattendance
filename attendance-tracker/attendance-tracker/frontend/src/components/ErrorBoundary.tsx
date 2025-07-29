import React from 'react';
import { 
  Box, 
  Alert, 
  Button, 
  Typography, 
  Paper,
  Stack 
} from '@mui/material';
import { Refresh as RefreshIcon, BugReport as BugIcon } from '@mui/icons-material';
import logger from '../utils/logger';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ error, errorInfo });
    
    logger.error('ErrorBoundary caught an error:', { error: error.message, stack: error.stack, componentStack: errorInfo.componentStack });
    
    // In production, you would send to error tracking service
    // Example: Sentry.captureException(error, { extra: errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Box 
          display="flex" 
          justifyContent="center" 
          alignItems="center" 
          minHeight="400px"
          p={3}
        >
          <Paper elevation={3} sx={{ maxWidth: 600, p: 4 }}>
            <Stack spacing={3} alignItems="center">
              <BugIcon color="error" sx={{ fontSize: 64 }} />
              
              <Typography variant="h5" color="error" textAlign="center">
                Oops! Something went wrong
              </Typography>
              
              <Alert severity="error" sx={{ width: '100%' }}>
                <Typography variant="body2">
                  The application encountered an unexpected error. This has been logged 
                  and our team will investigate the issue.
                </Typography>
              </Alert>
              
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <Box sx={{ width: '100%' }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Error Details (Development):
                  </Typography>
                  <Box 
                    component="pre" 
                    sx={{ 
                      bgcolor: 'grey.100', 
                      p: 2, 
                      borderRadius: 1, 
                      fontSize: '0.75rem',
                      overflow: 'auto',
                      maxHeight: 200
                    }}
                  >
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </Box>
                </Box>
              )}
              
              <Stack direction="row" spacing={2}>
                <Button
                  variant="contained"
                  startIcon={<RefreshIcon />}
                  onClick={this.handleReset}
                >
                  Try Again
                </Button>
                <Button
                  variant="outlined"
                  onClick={this.handleReload}
                >
                  Reload Page
                </Button>
              </Stack>
            </Stack>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
