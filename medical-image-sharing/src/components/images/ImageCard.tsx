'use client';

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  IconButton,
  Box,
  Menu,
  MenuItem,
  Chip,
  CardActionArea,
} from '@mui/material';
import {
  MoreVert as MoreIcon,
  Share as ShareIcon,
  Delete as DeleteIcon, 
  Download as DownloadIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { Image, ImageMetadata } from '@/lib/api/types';
import { ImageType, ImageStatus } from '@prisma/client';
import { format } from 'date-fns';

interface ImageCardProps {
  image: Image;
  onView: (image: Image) => void;
  onShare: (image: Image) => void;
  onDelete: (image: Image) => void;
  onDownload: (image: Image) => void;
}

export const ImageCard: React.FC<ImageCardProps> = ({
  image,
  onView,
  onShare,
  onDelete,
  onDownload,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleAction = (action: (image: Image) => void) => {
    handleClose();
    action(image);
  };

  const getStatusColor = (status: ImageStatus) => {
    switch (status) {
      case ImageStatus.PROCESSING:
        return 'warning';
      case ImageStatus.READY:
        return 'success';
      case ImageStatus.ERROR:
        return 'error';
      default:
        return 'default';
    }
  };

  const metadata = image.metadata as ImageMetadata;

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardActionArea onClick={() => onView(image)}>
        <CardMedia
          component="img"
          height="200"
          image={`/api/images/${image.id}/thumbnail`}
          alt={image.filename}
          sx={{ objectFit: 'cover' }}
        />
      </CardActionArea>
      <CardContent sx={{ flexGrow: 1 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            mb: 1,
          }}
        >
          <Typography variant="subtitle1" component="div" noWrap>
            {image.filename}
          </Typography>
          <IconButton
            size="small"
            onClick={handleClick}
            aria-label="more options"
          >
            <MoreIcon />
          </IconButton>
        </Box>

        <Box sx={{ mb: 1 }}>
          <Chip
            label={image.type}
            size="small"
            color="primary"
            sx={{ mr: 1 }}
          />
          <Chip
            label={image.status}
            size="small"
            color={getStatusColor(image.status)}
            sx={{ mr: 1 }}
          />
          {metadata.scanDate && (
            <Chip
              label={format(new Date(metadata.scanDate), 'MMM d, yyyy')}
              size="small"
              variant="outlined"
            />
          )}
        </Box>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            mb: 1,
          }}
        >
          {metadata.notes || 'No notes provided'}
        </Typography>

        {metadata.patientId && (
          <Typography variant="caption" color="text.secondary" display="block">
            Patient ID: {metadata.patientId}
          </Typography>
        )}
        <Typography variant="caption" color="text.secondary" display="block">
          Uploaded: {image.createdAt ? format(new Date(image.createdAt), 'MMM d, yyyy') : 'Date unknown'}
        </Typography>
      </CardContent>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        onClick={(e) => e.stopPropagation()}
      >
        <MenuItem onClick={() => handleAction(onView)}>
          <ViewIcon fontSize="small" sx={{ mr: 1 }} /> View
        </MenuItem>
        <MenuItem onClick={() => handleAction(onShare)}>
          <ShareIcon fontSize="small" sx={{ mr: 1 }} /> Share
        </MenuItem>
        <MenuItem onClick={() => handleAction(onDownload)}>
          <DownloadIcon fontSize="small" sx={{ mr: 1 }} /> Download
        </MenuItem>
        <MenuItem
          onClick={() => handleAction(onDelete)}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} /> Delete
        </MenuItem>
      </Menu>
    </Card>
  );
};
