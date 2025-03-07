'use client';

import React from 'react';
import {
  Box,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  IconButton,
  Divider,
  useMediaQuery,
  useTheme,
  Paper,
} from '@mui/material';
import {
  Create as DrawIcon,
  PanTool as MoveIcon,
  LocationOn as MarkerIcon,
  Straighten as MeasureIcon,
  TextFields as TextIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { AnnotationType } from '@prisma/client';

export type Tool =
  | 'move'
  | 'marker'
  | 'measure'
  | 'draw'
  | 'text'
  | null;

interface AnnotationToolbarProps {
  selectedTool: Tool;
  onToolChange: (tool: Tool) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onDelete: () => void;
  onSave: () => void;
  readOnly?: boolean;
}

export const AnnotationToolbar: React.FC<AnnotationToolbarProps> = ({
  selectedTool,
  onToolChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onDelete,
  onSave,
  readOnly = false,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const handleToolChange = (
    _event: React.MouseEvent<HTMLElement>,
    newTool: Tool
  ) => {
    onToolChange(newTool);
  };

  if (readOnly) return null;

  return (
    <Box
      sx={{
        position: 'absolute',
        top: { xs: 8, sm: 16 },
        right: { xs: 8, sm: 16 },
        zIndex: 10,
        display: 'flex',
        flexDirection: isMobile ? 'row' : 'column',
        gap: 1,
      }}
    >
      <Paper
        elevation={3}
        sx={{
          bgcolor: 'background.paper',
          borderRadius: 1,
          p: 0.5,
          display: 'flex',
        }}
      >
        <ToggleButtonGroup
          orientation={isMobile ? 'horizontal' : 'vertical'}
          value={selectedTool}
          exclusive
          onChange={handleToolChange}
          aria-label="annotation tools"
          size={isMobile ? "small" : "medium"}
        >
          <ToggleButton value="move" aria-label="move">
            <Tooltip title="Pan & Zoom" placement={isMobile ? 'top' : 'left'}>
              <MoveIcon fontSize={isMobile ? "small" : "medium"} />
            </Tooltip>
          </ToggleButton>
          <ToggleButton value="marker" aria-label="marker">
            <Tooltip title="Add Marker" placement={isMobile ? 'top' : 'left'}>
              <MarkerIcon fontSize={isMobile ? "small" : "medium"} />
            </Tooltip>
          </ToggleButton>
          <ToggleButton value="measure" aria-label="measure">
            <Tooltip title="Measure Distance" placement={isMobile ? 'top' : 'left'}>
              <MeasureIcon fontSize={isMobile ? "small" : "medium"} />
            </Tooltip>
          </ToggleButton>
          <ToggleButton value="draw" aria-label="draw">
            <Tooltip title="Free Draw" placement={isMobile ? 'top' : 'left'}>
              <DrawIcon fontSize={isMobile ? "small" : "medium"} />
            </Tooltip>
          </ToggleButton>
          <ToggleButton value="text" aria-label="text">
            <Tooltip title="Add Text" placement={isMobile ? 'top' : 'left'}>
              <TextIcon fontSize={isMobile ? "small" : "medium"} />
            </Tooltip>
          </ToggleButton>
        </ToggleButtonGroup>
      </Paper>

      <Paper
        elevation={3}
        sx={{
          bgcolor: 'background.paper',
          borderRadius: 1,
          p: 0.5,
          display: 'flex',
          flexDirection: isMobile ? 'row' : 'column',
          gap: 0.5,
        }}
      >
        <Tooltip title="Undo" placement={isMobile ? 'top' : 'left'}>
          <span>
            <IconButton
              size={isMobile ? "small" : "medium"}
              onClick={onUndo}
              disabled={!canUndo}
              color="inherit"
              sx={{ 
                minWidth: { xs: '36px', sm: '40px' },
                minHeight: { xs: '36px', sm: '40px' },
              }}
            >
              <UndoIcon fontSize={isMobile ? "small" : "medium"} />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Redo" placement={isMobile ? 'top' : 'left'}>
          <span>
            <IconButton
              size={isMobile ? "small" : "medium"}
              onClick={onRedo}
              disabled={!canRedo}
              color="inherit"
              sx={{ 
                minWidth: { xs: '36px', sm: '40px' },
                minHeight: { xs: '36px', sm: '40px' },
              }}
            >
              <RedoIcon fontSize={isMobile ? "small" : "medium"} />
            </IconButton>
          </span>
        </Tooltip>
        <Divider orientation={isMobile ? 'vertical' : 'horizontal'} flexItem />
        <Tooltip title="Delete Selected" placement={isMobile ? 'top' : 'left'}>
          <span>
            <IconButton
              size={isMobile ? "small" : "medium"}
              onClick={onDelete}
              color="error"
              sx={{ 
                minWidth: { xs: '36px', sm: '40px' },
                minHeight: { xs: '36px', sm: '40px' },
              }}
            >
              <DeleteIcon fontSize={isMobile ? "small" : "medium"} />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Save Changes" placement={isMobile ? 'top' : 'left'}>
          <span>
            <IconButton
              size={isMobile ? "small" : "medium"}
              onClick={onSave}
              color="primary"
              sx={{ 
                minWidth: { xs: '36px', sm: '40px' },
                minHeight: { xs: '36px', sm: '40px' },
              }}
            >
              <SaveIcon fontSize={isMobile ? "small" : "medium"} />
            </IconButton>
          </span>
        </Tooltip>
      </Paper>
    </Box>
  );
}; 