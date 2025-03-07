'use client';

import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  IconButton,
  Divider,
  Card,
  CardContent,
  CardActions,
  TextField,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Alert,
  Breadcrumbs,
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  FormatListBulleted as TemplateIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  ContentCopy as CopyIcon,
  ArrowBack as BackIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import Link from 'next/link';
import { useToast } from '@/components/Toast';
import { ApiClient } from '@/lib/api/client';

// Template category options
const categories = [
  { id: 'general', name: 'General' },
  { id: 'appointment', name: 'Appointment' },
  { id: 'results', name: 'Test Results' },
  { id: 'followup', name: 'Follow-up Care' },
  { id: 'prescription', name: 'Prescription' },
  { id: 'billing', name: 'Billing & Insurance' },
];

// Template interface
interface MessageTemplate {
  id: string;
  title: string;
  content: string;
  category: string;
  isDefault?: boolean;
}

// Initial templates (would come from API in a real app)
const initialTemplates: MessageTemplate[] = [
  {
    id: 'template-1',
    title: 'Appointment Reminder',
    content: 'This is a reminder that you have an appointment scheduled for [DATE] at [TIME]. Please let us know if you need to reschedule.',
    category: 'appointment',
    isDefault: true,
  },
  {
    id: 'template-2',
    title: 'Results Ready',
    content: 'Your test results are now available. Please schedule a follow-up appointment to discuss the findings.',
    category: 'results',
    isDefault: true,
  },
  {
    id: 'template-3',
    title: 'Prescription Refill',
    content: 'Your prescription refill has been processed and is ready for pickup at your pharmacy.',
    category: 'prescription',
    isDefault: true,
  },
  {
    id: 'template-4',
    title: 'Follow-up Needed',
    content: 'Based on your recent imaging study, we recommend a follow-up appointment to discuss the results and next steps.',
    category: 'followup',
    isDefault: true,
  },
  {
    id: 'template-5',
    title: 'Additional Information Needed',
    content: 'We need some additional information about your symptoms before your appointment. Can you please provide more details?',
    category: 'general',
    isDefault: true,
  },
];

// Template interface
interface MessageTemplate {
  id: string;
  title: string;
  content: string;
  category: string;
  isDefault?: boolean;
}

// Category interface
interface TemplateCategory {
  id: string;
  name: string;
}

export default function MessageTemplatesPage() {
  const { showSuccess, showError } = useToast();
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [categories, setCategories] = useState<TemplateCategory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTemplate, setCurrentTemplate] = useState<MessageTemplate | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState<boolean>(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);

  // Fetch templates and categories on component mount
  useEffect(() => {
    fetchMessageTemplates();
    fetchTemplateCategories();
  }, []);

  const fetchMessageTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      const apiClient = ApiClient.getInstance();
      const response = await apiClient.getMessageTemplates();
      
      if (response.status === 'success' && response.data) {
        setTemplates(response.data);
      } else {
        setError('Failed to load message templates');
      }
    } catch (err) {
      console.error('Error fetching message templates:', err);
      setError('Failed to load message templates. Please try again later.');
      showError('Failed to load message templates');
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplateCategories = async () => {
    try {
      const apiClient = ApiClient.getInstance();
      const response = await apiClient.getMessageTemplateCategories();
      
      if (response.status === 'success' && response.data) {
        setCategories(response.data);
      } else {
        console.error('Failed to load template categories');
      }
    } catch (err) {
      console.error('Error fetching template categories:', err);
      // Not showing error to user as this is not critical
    }
  };

  // Filtered templates based on category and search query
  const filteredTemplates = templates.filter(template => {
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    const matchesSearch = searchQuery === '' || 
      template.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      template.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });
  
  // Handle template creation
  const handleCreateTemplate = () => {
    const newTemplate: MessageTemplate = {
      id: `template-${Date.now()}`,
      title: 'New Template',
      content: '',
      category: 'general',
    };
    setCurrentTemplate(newTemplate);
    setIsEditing(true);
  };
  
  // Handle template editing
  const handleEditTemplate = (template: MessageTemplate) => {
    setCurrentTemplate({ ...template });
    setIsEditing(true);
  };
  
  // Handle template deletion dialog
  const handleDeleteDialog = (templateId: string) => {
    setTemplateToDelete(templateId);
    setIsDeleteConfirmOpen(true);
  };
  
  // Handle template deletion confirmation
  const handleDeleteTemplate = () => {
    if (templateToDelete) {
      setTemplates(prevTemplates => prevTemplates.filter(t => t.id !== templateToDelete));
      showSuccess('Template deleted successfully');
    }
    setIsDeleteConfirmOpen(false);
    setTemplateToDelete(null);
  };
  
  // Handle template duplication
  const handleDuplicateTemplate = (template: MessageTemplate) => {
    const duplicatedTemplate: MessageTemplate = {
      ...template,
      id: `template-${Date.now()}`,
      title: `${template.title} (Copy)`,
      isDefault: false,
    };
    setTemplates(prevTemplates => [...prevTemplates, duplicatedTemplate]);
    showSuccess('Template duplicated successfully');
  };
  
  // Handle template save
  const handleSaveTemplate = () => {
    if (!currentTemplate) return;
    
    // Validate form
    if (!currentTemplate.title.trim()) {
      showError('Template title is required');
      return;
    }
    
    if (!currentTemplate.content.trim()) {
      showError('Template content is required');
      return;
    }
    
    // Check if it's a new template or editing an existing one
    const isNewTemplate = !templates.some(t => t.id === currentTemplate.id);
    
    if (isNewTemplate) {
      setTemplates(prevTemplates => [...prevTemplates, currentTemplate]);
    } else {
      setTemplates(prevTemplates => 
        prevTemplates.map(t => t.id === currentTemplate.id ? currentTemplate : t)
      );
    }
    
    setCurrentTemplate(null);
    setIsEditing(false);
    showSuccess(`Template ${isNewTemplate ? 'created' : 'updated'} successfully`);
  };
  
  // Handle template edit cancel
  const handleCancelEdit = () => {
    setCurrentTemplate(null);
    setIsEditing(false);
  };
  
  // Copy template content to clipboard
  const handleCopyContent = (content: string) => {
    navigator.clipboard.writeText(content)
      .then(() => showSuccess('Template copied to clipboard'))
      .catch(() => showError('Failed to copy template to clipboard'));
  };
  
  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
        <Link href="/provider/dashboard" passHref>
          <Typography color="inherit" sx={{ cursor: 'pointer' }}>Dashboard</Typography>
        </Link>
        <Link href="/provider/messages" passHref>
          <Typography color="inherit" sx={{ cursor: 'pointer' }}>Messages</Typography>
        </Link>
        <Typography color="text.primary">Message Templates</Typography>
      </Breadcrumbs>
      
      {/* Page Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TemplateIcon /> Message Templates
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<BackIcon />}
            onClick={() => window.history.back()}
            sx={{ mr: 1 }}
          >
            Back
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateTemplate}
          >
            Create Template
          </Button>
        </Box>
      </Box>
      
      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />,
              }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={selectedCategory}
                label="Category"
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <MenuItem value="all">All Categories</MenuItem>
                {categories.map(category => (
                  <MenuItem key={category.id} value={category.id}>
                    {category.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Template Editing Form */}
      {currentTemplate && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            {templates.some(t => t.id === currentTemplate.id) ? 'Edit Template' : 'Create New Template'}
          </Typography>
          <Divider sx={{ mb: 3 }} />
          
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Template Title"
                value={currentTemplate.title}
                onChange={(e) => setCurrentTemplate({ ...currentTemplate, title: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={currentTemplate.category}
                  label="Category"
                  onChange={(e) => setCurrentTemplate({ ...currentTemplate, category: e.target.value })}
                >
                  {categories.map(category => (
                    <MenuItem key={category.id} value={category.id}>
                      {category.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Template Content"
                value={currentTemplate.content}
                onChange={(e) => setCurrentTemplate({ ...currentTemplate, content: e.target.value })}
                multiline
                rows={5}
                required
                helperText="Use placeholders like [NAME], [DATE], etc. to be replaced when using the template"
              />
            </Grid>
          </Grid>
          
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3, gap: 1 }}>
            <Button 
              variant="outlined" 
              startIcon={<CancelIcon />}
              onClick={handleCancelEdit}
            >
              Cancel
            </Button>
            <Button 
              variant="contained" 
              startIcon={<SaveIcon />}
              onClick={handleSaveTemplate}
            >
              Save Template
            </Button>
          </Box>
        </Paper>
      )}
      
      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <Alert severity="info" sx={{ mt: 3 }}>
          No templates found. {searchQuery || selectedCategory !== 'all' ? 'Try adjusting your filters or ' : ''} 
          <Button 
            size="small" 
            onClick={handleCreateTemplate}
          >
            create a new template
          </Button>
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {filteredTemplates.map(template => (
            <Grid item key={template.id} xs={12} sm={6} md={4}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography variant="h6" component="div" noWrap sx={{ maxWidth: 'calc(100% - 80px)' }}>
                      {template.title}
                    </Typography>
                    {template.isDefault && (
                      <Chip size="small" label="Default" color="primary" />
                    )}
                  </Box>
                  
                  <Typography 
                    variant="caption" 
                    color="text.secondary" 
                    sx={{ mb: 2, display: 'block' }}
                  >
                    {categories.find(c => c.id === template.category)?.name || 'General'}
                  </Typography>
                  
                  <Typography 
                    variant="body2" 
                    color="text.secondary"
                    sx={{ 
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 4,
                      WebkitBoxOrient: 'vertical',
                      minHeight: '80px'
                    }}
                  >
                    {template.content}
                  </Typography>
                </CardContent>
                
                <CardActions sx={{ justifyContent: 'space-between', borderTop: 1, borderColor: 'divider', px: 2, py: 1 }}>
                  <Box>
                    <Tooltip title="Edit Template">
                      <IconButton 
                        size="small" 
                        onClick={() => handleEditTemplate(template)}
                        disabled={template.isDefault}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Duplicate Template">
                      <IconButton 
                        size="small"
                        onClick={() => handleDuplicateTemplate(template)}
                      >
                        <CopyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Template">
                      <IconButton 
                        size="small" 
                        color="error"
                        onClick={() => handleDeleteDialog(template.id)}
                        disabled={template.isDefault}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  
                  <Button 
                    size="small"
                    onClick={() => handleCopyContent(template.content)}
                  >
                    Copy Text
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
      >
        <DialogTitle>Delete Template</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this template? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsDeleteConfirmOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteTemplate} color="error">Delete</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
} 