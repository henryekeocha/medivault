'use client';

import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Button,
  IconButton,
  Tooltip,
  Box,
} from '@mui/material';
import {
  Visibility as ViewIcon,
  Delete as DeleteIcon,
  Share as ShareIcon,
  Upload as UploadIcon,
} from '@mui/icons-material';
import { DataTable } from '@/components/DataTable';
import { withProtectedRoute } from '@/components/ProtectedRoute';
import { useToast } from '@/components/Toast';
import { api } from '@/lib/api/api';
import { useRouter } from 'next/navigation';
import { Route } from 'next';

interface MedicalImage {
  id: string;
  title: string;
  type: string;
  uploadedAt: string;
  size: number;
  status: 'processing' | 'ready' | 'error';
  sharedWith: string[];
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function ImagesPage() {
  const [loading, setLoading] = useState(true);
  const [images, setImages] = useState<MedicalImage[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const toast = useToast();
  const router = useRouter();

  const loadImages = async () => {
    try { 
      setLoading(true);
      const response = await api.get<{
        images: MedicalImage[];
        total: number;
      }>('/api/images', {
        params: {
          page: page + 1,
          limit: rowsPerPage,
        },
      });
      setImages(response.images);
      setTotalCount(response.total);
    } catch (error) {
      toast.showError('Failed to load images');
      console.error('Error loading images:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadImages();
  }, [page, rowsPerPage]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this image?')) return;

    try {
      await api.delete(`/api/images/${id}`);
      toast.showSuccess('Image deleted successfully');
      loadImages();
    } catch (error) {
      toast.showError('Failed to delete image');
      console.error('Error deleting image:', error);
    }
  };

  const handleShare = (id: string) => {
    router.push(`/images/${id}/share` as Route);
  };

  const columns = [
    { 
      id: 'title' as const, 
      label: 'Title', 
      minWidth: 170 
    },
    { 
      id: 'type' as const, 
      label: 'Type', 
      minWidth: 100 
    },
    {
      id: 'uploadedAt' as const,
      label: 'Upload Date',
      minWidth: 170,
      format: (value: string | number | string[]) => new Date(value as string).toLocaleString()
    },
    {
      id: 'size' as const,
      label: 'Size',
      minWidth: 100,
      align: 'right' as const,
      format: (value: string | number | string[]) => formatFileSize(value as number)
    },
    {
      id: 'status' as const,
      label: 'Status',
      minWidth: 100,
      format: (value: string | number | string[]) => (
        <Box
          component="span"
          sx={{
            px: 1,
            py: 0.5,
            borderRadius: 1,
            typography: 'body2',
            fontWeight: 'medium',
            ...(value === 'ready' && {
              bgcolor: 'success.light',
              color: 'success.dark',
            }),
            ...(value === 'processing' && {
              bgcolor: 'warning.light',
              color: 'warning.dark',
            }),
            ...(value === 'error' && {
              bgcolor: 'error.light',
              color: 'error.dark',
            }),
          }}
        >
          {value}
        </Box>
      )
    },
    {
      id: 'sharedWith' as const,
      label: 'Shared With',
      minWidth: 130,
      format: (value: string | number | string[]) => (value as string[]).length
    }
  ];

  const rowActions = (row: MedicalImage) => (
    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
      <Tooltip title="View">
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/images/${row.id}` as Route);
          }}
        >
          <ViewIcon />
        </IconButton>
      </Tooltip>
      <Tooltip title="Share">
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            handleShare(row.id);
          }}
        >
          <ShareIcon />
        </IconButton>
      </Tooltip>
      <Tooltip title="Delete">
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            handleDelete(row.id);
          }}
        >
          <DeleteIcon />
        </IconButton>
      </Tooltip>
    </Box>
  );

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Medical Images
        </Typography>
        <Button
          variant="contained"
          startIcon={<UploadIcon />}
          onClick={() => router.push('/images/upload' as Route)}
        >
          Upload Image
        </Button>
      </Box>

      <DataTable
        columns={columns}
        data={images}
        loading={loading}
        onRefresh={loadImages}
        searchable
        onSearch={(query) => console.log('Search:', query)}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        totalCount={totalCount}
        rowActions={rowActions}
        onRowClick={(row) => router.push(`/images/${row.id}` as Route)}
      />
    </Container>
  );
}

export default withProtectedRoute(ImagesPage, {
  allowedRoles: ['PATIENT', 'PROVIDER', 'ADMIN'],
  requireAuth: true,
}); 