import React from 'react';
import {
  Box,
  Skeleton,
  Card,
  CardContent,
  Grid,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';

// Generic skeleton for cards
export const CardSkeleton: React.FC<{ height?: number }> = ({ height = 200 }) => (
  <Card>
    <CardContent>
      <Skeleton variant="text" sx={{ fontSize: '1.5rem', mb: 2 }} width="60%" />
      <Skeleton variant="rectangular" height={height - 100} />
      <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
        <Skeleton variant="rectangular" width={80} height={32} />
        <Skeleton variant="rectangular" width={100} height={32} />
      </Stack>
    </CardContent>
  </Card>
);

// Table skeleton for data grids
export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({ 
  rows = 5, 
  columns = 6 
}) => (
  <TableContainer component={Paper}>
    <Table>
      <TableHead>
        <TableRow>
          {Array.from({ length: columns }).map((_, index) => (
            <TableCell key={index}>
              <Skeleton variant="text" width="80%" />
            </TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <TableRow key={rowIndex}>
            {Array.from({ length: columns }).map((_, colIndex) => (
              <TableCell key={colIndex}>
                <Skeleton 
                  variant="text" 
                  width={colIndex === 0 ? "60%" : "40%"} 
                />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </TableContainer>
);

// Upload area skeleton
export const UploadSkeleton: React.FC = () => (
  <Card variant="outlined" sx={{ p: 4 }}>
    <Stack alignItems="center" spacing={3}>
      <Skeleton variant="circular" width={64} height={64} />
      <Skeleton variant="text" sx={{ fontSize: '1.5rem' }} width="60%" />
      <Skeleton variant="text" width="40%" />
      <Skeleton variant="rectangular" width={200} height={40} />
    </Stack>
  </Card>
);

// Dashboard metrics skeleton
export const MetricsSkeleton: React.FC = () => (
  <Grid container spacing={3}>
    {Array.from({ length: 4 }).map((_, index) => (
      <Grid size={3} key={index}>
        <Card>
          <CardContent>
            <Stack alignItems="center" spacing={1}>
              <Skeleton variant="text" width="70%" />
              <Skeleton variant="text" sx={{ fontSize: '2rem' }} width="50%" />
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    ))}
  </Grid>
);

// Form skeleton
export const FormSkeleton: React.FC<{ fields?: number }> = ({ fields = 6 }) => (
  <Grid container spacing={3}>
    {Array.from({ length: fields }).map((_, index) => (
      <Grid size={{ xs: 12, sm: 6 }} key={index}>
        <Stack spacing={1}>
          <Skeleton variant="text" width="30%" />
          <Skeleton variant="rectangular" height={56} />
        </Stack>
      </Grid>
    ))}
    <Grid size={12}>
      <Box sx={{ pt: 2 }}>
        <Skeleton variant="rectangular" width={200} height={40} />
      </Box>
    </Grid>
  </Grid>
);

// Calculation results skeleton
export const CalculationSkeleton: React.FC = () => (
  <Card variant="outlined">
    <CardContent>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Skeleton variant="text" sx={{ fontSize: '1.5rem' }} width="40%" />
        <Skeleton variant="rectangular" width={120} height={32} />
      </Stack>
      
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {Array.from({ length: 4 }).map((_, index) => (
          <Grid size={3} key={index}>
            <Stack spacing={1}>
              <Skeleton variant="text" width="80%" />
              <Skeleton variant="text" sx={{ fontSize: '1.25rem' }} width="60%" />
            </Stack>
          </Grid>
        ))}
      </Grid>
      
      <TableSkeleton rows={3} columns={6} />
    </CardContent>
  </Card>
);

// Validation preview skeleton
export const ValidationSkeleton: React.FC = () => (
  <Card variant="outlined">
    <CardContent>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
        <Skeleton variant="circular" width={24} height={24} />
        <Skeleton variant="text" sx={{ fontSize: '1.25rem' }} width="40%" />
        <Skeleton variant="rectangular" width={80} height={24} />
      </Stack>
      
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {Array.from({ length: 4 }).map((_, index) => (
          <Grid size={3} key={index}>
            <Stack spacing={1}>
              <Skeleton variant="text" width="70%" />
              <Skeleton variant="text" sx={{ fontSize: '1.25rem' }} width="50%" />
            </Stack>
          </Grid>
        ))}
      </Grid>
      
      <TableSkeleton rows={4} columns={6} />
    </CardContent>
  </Card>
);

// Page header skeleton
export const HeaderSkeleton: React.FC = () => (
  <Box sx={{ mb: 3 }}>
    <Skeleton variant="text" sx={{ fontSize: '2.5rem', mb: 1 }} width="50%" />
    <Skeleton variant="text" width="30%" />
  </Box>
);

export default {
  CardSkeleton,
  TableSkeleton,
  UploadSkeleton,
  MetricsSkeleton,
  FormSkeleton,
  CalculationSkeleton,
  ValidationSkeleton,
  HeaderSkeleton
};