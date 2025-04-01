import React, { useState, useRef, useEffect } from 'react';
import 'react-quill/dist/quill.snow.css';
import { 
  Paper, 
  Typography, 
  Box, 
  Button, 
  Divider, 
  CircularProgress, 
  Snackbar, 
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  useMediaQuery,
  IconButton,
  useTheme
} from '@mui/material';
import { 
  Close as CloseIcon, 
  Save as SaveIcon,
  Edit as EditIcon 
} from '@mui/icons-material';
import dynamic from 'next/dynamic';
import { providerClient } from '@/lib/api/providerClient';
import type { ReactQuillProps } from 'react-quill';

// Dynamically import the rich text editor to avoid SSR issues
const ReactQuill = dynamic(
  async () => {
    const { default: RQ } = await import('react-quill');
    // Create a wrapper component that properly handles types
    const ReactQuillWrapper = (props: ReactQuillProps) => {
      const Component = RQ as any;
      return <Component {...props} />;
    };
    return ReactQuillWrapper;
  },
  { 
    ssr: false,
    loading: () => <Box sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <CircularProgress size={24} />
    </Box>
  }
);

interface PatientNotesEditorProps {
  patientId: string;
  initialNotes?: string;
  onSave?: (notes: string) => void;
  variant?: 'inline' | 'dialog';
  buttonText?: string;
}

const modules = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike', 'blockquote'],
    [{'list': 'ordered'}, {'list': 'bullet'}, {'indent': '-1'}, {'indent': '+1'}],
    ['link'],
    ['clean']
  ],
};

const formats = [
  'header',
  'bold', 'italic', 'underline', 'strike', 'blockquote',
  'list', 'bullet', 'indent',
  'link'
];

const PatientNotesEditor: React.FC<PatientNotesEditorProps> = ({ 
  patientId, 
  initialNotes = '', 
  onSave,
  variant = 'inline',
  buttonText = 'Add Notes'
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const quillRef = useRef<typeof ReactQuill>(null);

  useEffect(() => {
    if (initialNotes) {
      setNotes(initialNotes);
    }
  }, [initialNotes]);

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleChange = (value: string) => {
    setNotes(value);
  };

  const handleSave = async () => {
    if (!patientId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Call the API to save patient notes using providerClient
      const response = await providerClient.addPatientNotes(patientId, notes);
      
      if (response.status === 'success') {
        // Show success message
        setSuccess(true);
        
        // Call the onSave callback if provided
        if (onSave) {
          onSave(notes);
        }
        
        // Close dialog if in dialog mode
        if (variant === 'dialog') {
          handleClose();
        }
      } else {
        setError(response.error?.message || 'Failed to save notes. Please try again.');
      }
    } catch (error) {
      console.error('Error saving patient notes:', error);
      setError('Failed to save notes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSuccess(false);
    setError(null);
  };

  const renderEditor = () => (
    <>
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          Patient Notes
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Add clinical notes, observations, or any relevant information about the patient.
        </Typography>
      </Box>
      
      <Box 
        sx={{ 
          '.ql-container': {
            fontSize: '16px',
            height: isMobile ? '200px' : '250px',
            borderBottomLeftRadius: theme.shape.borderRadius,
            borderBottomRightRadius: theme.shape.borderRadius,
            border: `1px solid ${theme.palette.divider}`,
          },
          '.ql-toolbar': {
            borderTopLeftRadius: theme.shape.borderRadius,
            borderTopRightRadius: theme.shape.borderRadius,
            border: `1px solid ${theme.palette.divider}`,
            borderBottom: `1px solid ${theme.palette.divider}`,
          },
          mb: 2
        }}
      >
        <ReactQuill
          theme="snow"
          value={notes}
          onChange={handleChange}
          modules={modules}
          formats={formats}
          placeholder="Enter patient notes here..."
        />
      </Box>
      
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
        {variant === 'dialog' && (
          <Button 
            onClick={handleClose} 
            sx={{ mr: 1 }}
          >
            Cancel
          </Button>
        )}
        <Button 
          variant="contained" 
          color="primary" 
          onClick={handleSave}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
        >
          Save Notes
        </Button>
      </Box>
    </>
  );

  if (variant === 'dialog') {
    return (
      <>
        <Button 
          variant="outlined" 
          color="primary" 
          onClick={handleOpen}
          startIcon={<EditIcon />}
        >
          {buttonText}
        </Button>
        
        <Dialog
          open={open}
          onClose={handleClose}
          maxWidth="md"
          fullWidth
          fullScreen={isMobile}
        >
          <DialogTitle>
            Patient Notes
            <IconButton
              aria-label="close"
              onClick={handleClose}
              sx={{ position: 'absolute', right: 8, top: 8 }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            {renderEditor()}
          </DialogContent>
        </Dialog>
        
        <Snackbar 
          open={success || !!error} 
          autoHideDuration={6000} 
          onClose={handleCloseSnackbar}
        >
          <Alert 
            onClose={handleCloseSnackbar} 
            severity={error ? "error" : "success"}
            variant="filled"
          >
            {error || "Notes saved successfully"}
          </Alert>
        </Snackbar>
      </>
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        borderRadius: 2,
        boxShadow: theme.shadows[2],
      }}
    >
      {renderEditor()}
      
      <Snackbar 
        open={success || !!error} 
        autoHideDuration={6000} 
        onClose={handleCloseSnackbar}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={error ? "error" : "success"}
          variant="filled"
        >
          {error || "Notes saved successfully"}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

export default PatientNotesEditor; 