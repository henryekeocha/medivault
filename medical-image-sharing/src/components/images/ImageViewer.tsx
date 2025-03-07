'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as fabric from 'fabric';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import {
  Box,
  IconButton,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  LinearProgress,
  useMediaQuery,
  useTheme,
  Alert,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Close as CloseIcon,
  Refresh as RefreshIcon,
  ViewInAr as DicomIcon,
  Image as ImageIcon,
} from '@mui/icons-material';
import { AnnotationType } from '@prisma/client';
import { Image as ImageType } from '@/lib/api/types';
import { useWebSocket } from '@/contexts/WebSocketContext';  
import { AnnotationToolbar, Tool } from './AnnotationToolbar';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { LoadingState } from '@/components/LoadingState';

// Add module declaration for react-zoom-pan-pinch
declare module 'react-zoom-pan-pinch';

// Enhanced TypeScript interfaces for fabric.js
interface CustomFabricObjectData {
  id?: string;
  type?: string;
}

// Using type assertion instead of direct interface extension
type FabricObject = fabric.Object & {
  data?: CustomFabricObjectData;
};

// Fix fabric.js interface types
interface LoadImageOptions {
  crossOrigin?: string;
}

// Using type assertion instead of direct interface extension
type FabricCanvas = fabric.Canvas & {
  wrapperEl?: HTMLElement;
  isDrawingMode: boolean;
  setBackgroundImage(image: fabric.Image, callback: Function): void;
};

interface ImageViewerProps {
  image: ImageType;
  onClose: () => void;
  onSave?: () => void;
  readOnly?: boolean;
}

// Enum for viewer modes
enum ViewerMode {
  STANDARD = 'standard',
  DICOM = 'dicom',
}

export const ImageViewer: React.FC<ImageViewerProps> = ({
  image,
  onClose,
  onSave,
  readOnly = false,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [selectedTool, setSelectedTool] = useState<Tool>(null);
  const [canvasHistory, setCanvasHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [loading, setLoading] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [annotationDialog, setAnnotationDialog] = useState<{
    open: boolean;
    text: string;
    callback?: (text: string) => void;
  }>({
    open: false,
    text: '',
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<FabricCanvas | null>(null);
  const { onAnnotationEvent } = useWebSocket();
  
  // Initialize error handler
  const { 
    error, 
    handleError, 
    clearError,
    withErrorHandling 
  } = useErrorHandler({ 
    context: 'Image Viewer', 
    showToastByDefault: true 
  });

  // Add state for viewer mode
  const [viewerMode, setViewerMode] = useState<ViewerMode>(ViewerMode.STANDARD);

  // Handle window resize for responsive canvas
  const handleResize = useCallback(() => {
    if (!fabricRef.current) return;
    
    const canvas = fabricRef.current;
    const container = canvas.wrapperEl?.parentElement;
    if (!container) return;
    
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    canvas.setWidth(width);
    canvas.setHeight(height);
    canvas.renderAll();
  }, []);

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  const initializeCanvas = useCallback(() => {
    clearError();
    setLoading(true);
    
    if (!canvasRef.current) {
      setLoading(false);
      return handleError(new Error("Canvas reference not found"));
    }

    try {
      const containerEl = canvasRef.current.parentElement;
      const containerWidth = containerEl ? containerEl.clientWidth : window.innerWidth;
      const containerHeight = containerEl ? containerEl.clientHeight : window.innerHeight - 64;

      // Dispose of existing canvas if it exists
      if (fabricRef.current) {
        fabricRef.current.dispose();
      }

      // Create new canvas and cast to our FabricCanvas type
      const canvas = new fabric.Canvas(canvasRef.current, {
        width: containerWidth,
        height: containerHeight,
        selection: !readOnly,
      });
      
      // Type assertion to treat as our enhanced FabricCanvas type
      fabricRef.current = canvas as unknown as FabricCanvas;

      // Load background image
      fabric.Image.fromURL(
        image.s3Url || '', // Use s3Url instead of s3Key
        (img: fabric.Image) => { 
          const scale = Math.min(
            canvas.width! / (img.width || 1),
            canvas.height! / (img.height || 1)
          );

          img.scale(scale);
          img.set({
            left: (canvas.width! - (img.width || 0) * scale) / 2,
            top: (canvas.height! - (img.height || 0) * scale) / 2,
            selectable: false,
            evented: false,
          });

          (fabricRef.current as FabricCanvas).setBackgroundImage(img, () => {
            canvas.renderAll();
            setLoading(false);
            setImageLoaded(true); 
            
            // Initialize history after image is loaded
            addToHistory();
          });
        },
        { crossOrigin: 'anonymous' } as fabric.LoadImageOptions
      );

      // Handle canvas events
      canvas.on('mouse:down', (e) => handleCanvasClick(e as any));

      return canvas;
    } catch (err) {
      setLoading(false);
      handleError(err as Error);
      return null;
    }
  }, [image.s3Url, readOnly, handleError, clearError]);

  // Subscribe to real-time updates
  useEffect(() => {
    let unsubscribeAnnotations = () => {};
    
    try {
      unsubscribeAnnotations = onAnnotationEvent((data: any) => {
        handleRemoteAnnotationUpdate(data);
      });
    } catch (err) {
      handleError(new Error(`Failed to subscribe to annotations: ${(err as Error).message}`));
    }

    return () => {
      try {
        unsubscribeAnnotations();
      } catch (err) {
        console.error("Error unsubscribing from annotations:", err);
      }
    };
  }, [onAnnotationEvent, handleError]);

  // Initialize canvas
  useEffect(() => {
    const canvas = initializeCanvas();
    
    return () => {
      if (canvas) {
        // Ensure canvas is a FabricCanvas instance before calling off/dispose
        if (typeof canvas !== 'string' && canvas.off && canvas.dispose) {
          canvas.off('mouse:down', (e: any) => handleCanvasClick(e as any));
          canvas.dispose();
        }
      }
    };
  }, [image.id, image.s3Url, readOnly, initializeCanvas]);

  const handleRemoteAnnotationUpdate = useCallback((data: any) => {
    if (!fabricRef.current) return;

    try {
      const canvas = fabricRef.current;
      const { type, objectState } = data;

      switch (type) {
        case 'add':
          fabric.util.enlivenObjects(
            [objectState], 
            // Use type assertion to handle incompatible callback type
            function(objects: fabric.Object[]) {
              canvas.add(objects[0] as FabricObject);
              canvas.renderAll();
            } as unknown as any
          );
          break;
        case 'modify':
          const object = canvas.getObjects().find((obj) => 
            (obj as FabricObject).data?.id === objectState.data.id
          ) as FabricObject;
          if (object) {
            object.set(objectState);
            canvas.renderAll();
          }
          break;
        case 'delete':
          const objToRemove = canvas.getObjects().find((obj) => 
            (obj as FabricObject).data?.id === objectState.id
          ) as FabricObject;
          if (objToRemove) {
            canvas.remove(objToRemove);
            canvas.renderAll();
          }
          break;
      }
    } catch (err) {
      handleError(new Error(`Failed to process annotation update: ${(err as Error).message}`));
    }
  }, [handleError]);

  const addToHistory = useCallback(() => {
    if (!fabricRef.current) return;

    try {
      const json = JSON.stringify(fabricRef.current.toJSON());
      setCanvasHistory((prev) => {
        const newHistory = prev.slice(0, historyIndex + 1);
        return [...newHistory, json];
      });
      setHistoryIndex((prev) => prev + 1);
    } catch (err) {
      handleError(new Error(`Failed to add to history: ${(err as Error).message}`));
    }
  }, [historyIndex, handleError]);

  const handleToolChange = (tool: Tool) => {
    if (!fabricRef.current) return;

    try {
      const canvas = fabricRef.current;
      canvas.isDrawingMode = tool === 'draw';
      setSelectedTool(tool);
    } catch (err) {
      handleError(new Error(`Failed to change tool: ${(err as Error).message}`));
    }
  };

  const handleUndo = () => {
    if (historyIndex <= 0 || !fabricRef.current) return;

    try {
      const canvas = fabricRef.current;
      const newIndex = historyIndex - 1;
      const json = canvasHistory[newIndex];
      canvas.loadFromJSON(json, () => {
        setHistoryIndex(newIndex);
        canvas.renderAll();
      });
    } catch (err) {
      handleError(new Error(`Failed to undo: ${(err as Error).message}`));
    }
  };

  const handleRedo = () => {
    if (historyIndex >= canvasHistory.length - 1 || !fabricRef.current) return;

    try {
      const canvas = fabricRef.current;
      const newIndex = historyIndex + 1;
      const json = canvasHistory[newIndex];
      canvas.loadFromJSON(json, () => {
        setHistoryIndex(newIndex);
        canvas.renderAll();
      });
    } catch (err) {
      handleError(new Error(`Failed to redo: ${(err as Error).message}`));
    }
  };

  const handleDelete = () => {
    if (!fabricRef.current) return;

    try {
      const canvas = fabricRef.current;
      const activeObjects = canvas.getActiveObjects();
      canvas.remove(...activeObjects);
      canvas.discardActiveObject();
      canvas.renderAll();
      addToHistory();
    } catch (err) {
      handleError(new Error(`Failed to delete objects: ${(err as Error).message}`));
    }
  };

  const handleSave = () => {
    if (!fabricRef.current || !onSave) return;
    
    withErrorHandling(async () => {
      onSave();
    }, { 
      showToast: true,
      successMessage: 'Annotations saved successfully'
    });
  };

  const handleCanvasClick = (event: any) => {
    if (!fabricRef.current || readOnly || selectedTool === null || selectedTool === 'move') return;

    try {
      const canvas = fabricRef.current;
      const pointer = canvas.getPointer(event.e);

      switch (selectedTool) {
        case 'marker':
          const marker = new fabric.Circle({
            left: pointer.x,
            top: pointer.y,
            radius: isMobile ? 8 : 5, // Larger for touch screens
            fill: 'red',
            originX: 'center',
            originY: 'center',
            data: { type: AnnotationType.MARKER },
          }) as unknown as FabricObject;
          canvas.add(marker);
          addToHistory();
          break;

        case 'text':
          setAnnotationDialog({
            open: true,
            text: '',
            callback: (text) => {
              const textObj = new fabric.Text(text, {
                left: pointer.x,
                top: pointer.y,
                fontSize: isMobile ? 24 : 20, // Larger for touch screens
                data: { type: AnnotationType.MARKER }, // Use MARKER as fallback
              }) as unknown as FabricObject;
              canvas.add(textObj);
              addToHistory();
            },
          });
          break;

        case 'measure':
          // Implement measurement tool
          break;
      }
    } catch (err) {
      handleError(new Error(`Failed to process canvas click: ${(err as Error).message}`));
    }
  };

  // Add handler for changing viewer mode
  const handleModeChange = (_event: React.SyntheticEvent, newMode: ViewerMode) => {
    setViewerMode(newMode);
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        bgcolor: 'background.paper',
        zIndex: 1300,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box
        sx={{
          p: { xs: 1, sm: 2 },
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Typography 
          variant="h6"
          sx={{ 
            fontSize: { xs: '1rem', sm: '1.25rem' },
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: { xs: '200px', sm: '300px', md: 'none' }
          }}
        >
          {image.filename}
        </Typography>
        <IconButton onClick={onClose} aria-label="Close image viewer">
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Mode selection tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 1 }}>
        <Tabs 
          value={viewerMode} 
          onChange={handleModeChange}
          aria-label="image viewer mode"
          centered
        >
          <Tab 
            icon={<ImageIcon />} 
            label="Standard" 
            value={ViewerMode.STANDARD} 
            aria-label="Standard viewer"
          />
          <Tab 
            icon={<DicomIcon />} 
            label="DICOM" 
            value={ViewerMode.DICOM} 
            aria-label="DICOM viewer"
            disabled={!image.contentType?.includes('dicom')}
          />
        </Tabs>
      </Box>

      <Box sx={{ position: 'relative', flexGrow: 1, overflow: 'hidden' }}>
        {loading && <LoadingState size="medium" />}
        
        {error && !loading && (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center',
            height: '100%',
            p: 3
          }}>
            <Alert 
              severity="error" 
              sx={{ mb: 2, width: '100%', maxWidth: 500 }}
              action={
                <Button 
                  color="inherit" 
                  size="small" 
                  startIcon={<RefreshIcon />}
                  onClick={initializeCanvas}
                >
                  Retry
                </Button>
              }
            >
              {typeof error === 'string' ? error : (error as Error)?.message || 'Failed to load image viewer'}
            </Alert>
          </Box>
        )}

        {viewerMode === ViewerMode.STANDARD ? (
          !loading && !error && (
            <TransformWrapper
              initialScale={1}
              wheel={{ step: 0.1 }}
              pinch={{ step: 10 }}
              doubleClick={{ disabled: selectedTool !== 'move' && selectedTool !== null }}
            >
              <TransformComponent
                wrapperStyle={{ width: '100%', height: '100%' }}
                contentStyle={{ width: '100%', height: '100%' }}
              >
                <canvas 
                  ref={canvasRef}
                  style={{ 
                    width: '100%',
                    height: '100%',
                    touchAction: selectedTool === 'move' ? 'none' : 'auto',
                  }}
                />
              </TransformComponent>
            </TransformWrapper>
          )
        ) : (
          // DICOM viewer
          <Box 
            sx={{ 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography variant="body1" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
              DICOM viewer functionality will be integrated with Cornerstone.js.
              This feature is coming soon.
            </Typography>
            {/* Placeholder for DICOM viewer */}
            <Box 
              id="dicom-container" 
              sx={{ 
                width: '100%', 
                flexGrow: 1, 
                bgcolor: '#000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography variant="h6" color="grey.500">
                DICOM Viewer Loading...
              </Typography>
            </Box>
          </Box>
        )}

        {imageLoaded && !error && (
          <AnnotationToolbar
            selectedTool={selectedTool}
            onToolChange={handleToolChange}
            canUndo={historyIndex > 0}
            canRedo={historyIndex < canvasHistory.length - 1}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onDelete={handleDelete}
            onSave={handleSave}
            readOnly={readOnly}
          />
        )}
      </Box>

      <Dialog
        open={annotationDialog.open}
        onClose={() => setAnnotationDialog({ open: false, text: '' })}
        fullWidth
        maxWidth="sm"
        sx={{
          '& .MuiDialog-paper': {
            width: '100%',
            maxWidth: { xs: '95%', sm: '500px' },
            m: { xs: 1, sm: 2 }
          }
        }}
      >
        <DialogTitle>Add Text Annotation</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Text"
            fullWidth
            multiline
            rows={3}
            value={annotationDialog.text}
            onChange={(e) =>
              setAnnotationDialog((prev) => ({ ...prev, text: e.target.value }))
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAnnotationDialog({ open: false, text: '' })}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (annotationDialog.callback) {
                annotationDialog.callback(annotationDialog.text);
              }
              setAnnotationDialog({ open: false, text: '' });
            }}
            variant="contained"
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
