'use client';

import React, { useEffect, useState } from 'react';
import { 
  Container, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  Box, 
  Avatar, 
  Button, 
  Chip, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText,
  Paper,
  Skeleton,
  Alert,
  Tab,
  Tabs,
  Divider, 
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Badge,
  CircularProgress
} from '@mui/material';
import { 
  Person, 
  Phone, 
  Email, 
  Event,
  ArrowBack,
  CalendarMonth,
  Image as ImageIcon,
  Message as MessageIcon,
  MedicalServices,
  History,
  Add,
  Description,
  Home as HomeIcon,
  MoreVert,
  AdminPanelSettings,
  Edit
} from '@mui/icons-material';
import { useRouter, useParams } from 'next/navigation';
import { ApiClient } from '@/lib/api/client';
import { format } from 'date-fns';
import { PatientStatus } from '@prisma/client';
import { useAuth } from '@/contexts/AuthContext';
import PatientNotesEditor from '@/components/patients/PatientNotesEditor';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { LoadingState } from '@/components/LoadingState';

interface PatientAddress {
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}

interface PatientContact {
  email: string;
  phone?: string;
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };
}

interface MedicalRecord {
  id: string;
  date: string;
  title: string;
  type: string;
  providerId: string;
  providerName: string;
  summary?: string;
}

interface Appointment {
  id: string;
  date: string;
  time: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
  type: string;
  providerId: string;
  providerName: string;
  notes?: string;
}

interface MedicalImage {
  id: string;
  uploadDate: string;
  title: string;
  type: string;
  thumbnailUrl?: string;
  status: 'PENDING' | 'REVIEWED';
}

interface Message {
  id: string;
  date: string;
  subject: string;
  preview: string;
  isRead: boolean;
  senderId: string;
  senderName: string;
}

interface Patient {
  id: string;
  name: string;
  dateOfBirth?: string;
  gender?: string;
  status: PatientStatus;
  contact: PatientContact;
  address?: PatientAddress;
  medicalRecords?: MedicalRecord[];
  appointments?: Appointment[];
  images?: MedicalImage[];
  messages?: Message[];
  insuranceProvider?: string;
  insuranceId?: string;
  notes?: string;
}

export default function PatientDetailPage() {
  const router = useRouter();
  const params = useParams();
  const patientId = params?.id as string;
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [key, setKey] = useState(0);
  
  // Initialize the error handler
  const { 
    error, 
    clearError, 
    handleError, 
    withErrorHandling 
  } = useErrorHandler({
    context: 'Patient Details',
    showToastByDefault: true
  });

  useEffect(() => {
    if (!patientId || !user?.id) return;
    fetchPatientDetails();
  }, [patientId, user?.id]);

  const fetchPatientDetails = async () => {
    await withErrorHandling(async () => {
      setLoading(true);
      
      const apiClient = ApiClient.getInstance();
      
      // Get basic patient details
      const patientResponse = await apiClient.getPatientDetails(patientId);
      if (patientResponse.status !== 'success' || !patientResponse.data) {
        throw new Error('Failed to fetch patient details');
      }
      
      const patientData = patientResponse.data;
      
      // Get medical records
      let medicalRecords = [];
      try {
        const recordsResponse = await apiClient.getPatientMedicalRecords(patientId);
        if (recordsResponse.status === 'success' && recordsResponse.data) {
          medicalRecords = recordsResponse.data;
        }
      } catch (err) {
        console.error('Error fetching medical records:', err);
        // Continue with other data fetching even if this fails
      }
      
      // Get appointments
      let appointments = [];
      try {
        const appointmentsResponse = await apiClient.getPatientAppointmentsForProvider(patientId);
        if (appointmentsResponse.status === 'success' && appointmentsResponse.data) {
          appointments = appointmentsResponse.data;
        }
      } catch (err) {
        console.error('Error fetching appointments:', err);
      }
      
      // Get images
      let images = [];
      try {
        const imagesResponse = await apiClient.getPatientImagesForProvider(patientId);
        if (imagesResponse.status === 'success' && imagesResponse.data) {
          images = imagesResponse.data;
        }
      } catch (err) {
        console.error('Error fetching images:', err);
      }
      
      // Get messages
      let messages = [];
      try {
        const messagesResponse = await apiClient.getPatientMessagesForProvider(patientId);
        if (messagesResponse.status === 'success' && messagesResponse.data) {
          messages = messagesResponse.data;
        }
      } catch (err) {
        console.error('Error fetching messages:', err);
      }
      
      // Combine all data into a complete patient object
      const completePatient = {
        ...patientData,
        medicalRecords: medicalRecords || [],
        appointments: appointments || [],
        images: images || [],
        messages: messages || []
      };
      
      setPatient(completePatient);
    });
    
    // Always set loading to false, even on error
    setLoading(false);
  };

  const handleGoBack = () => {
    router.back();
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleNavigateToMessages = () => {
    router.push(`/provider/messages?patientId=${patientId}`);
  };

  const handleNavigateToImages = () => {
    router.push(`/provider/images?patientId=${patientId}`);
  };

  const handleAddMedicalRecord = () => {
    router.push(`/provider/medical-records/add?patientId=${patientId}` as any);
  };

  const handleAddAppointment = () => {
    router.push(`/provider/appointments/schedule?patientId=${patientId}` as any);
  };

  const handleEditPatient = () => {
    router.push(`/provider/patients/edit/${patientId}`);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMMM d, yyyy');
    } catch (error) {
      return dateString;
    }
  };

  const formatDateTime = (dateString?: string, timeString?: string) => {
    if (!dateString) return 'N/A';
    try {
      const dateObj = new Date(dateString);
      if (timeString) {
        const [hours, minutes] = timeString.split(':');
        dateObj.setHours(parseInt(hours), parseInt(minutes));
        return format(dateObj, 'MMM d, yyyy h:mm a');
      }
      return format(dateObj, 'MMM d, yyyy');
    } catch (error) {
      return `${dateString} ${timeString || ''}`;
    }
  };

  const calculateAge = (dateOfBirth?: string) => {
    if (!dateOfBirth) return 'N/A';
    try {
      const birthDate = new Date(dateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      return age;
    } catch (error) {
      return 'N/A';
    }
  };

  const handleNotesUpdate = async (notes: string) => {
    await withErrorHandling(async () => {
      const apiClient = ApiClient.getInstance();
      const response = await apiClient.addPatientNotes(patientId, notes);
      
      if (response.status === 'success') {
        // Successfully updated notes
        fetchPatientDetails(); // Reload patient data to get updated notes
        setKey(prev => prev + 1); // Force re-render of notes editor
      } else {
        throw new Error(response.error?.message || 'Failed to update patient notes');
      }
    });
  };

  if (loading) {
    return <LoadingState message="Loading patient details..." fullScreen />;
  }

  if (error || !patient) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Button 
          startIcon={<ArrowBack />} 
          onClick={handleGoBack}
          sx={{ mb: 3 }}
        >
          Back to Patients
        </Button>
        
        <LoadingState 
          error={error || 'Patient not found'} 
          onRetry={fetchPatientDetails}
        />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Button 
          startIcon={<ArrowBack />} 
          onClick={handleGoBack}
        >
          Back to Patients
        </Button>
        
        <Box>
          <Button 
            startIcon={<Edit />}
            variant="outlined"
            onClick={handleEditPatient}
            sx={{ mr: 1 }}
          >
            Edit Patient
          </Button>
        </Box>
      </Box>
      
      <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'center', sm: 'flex-start' } }}>
          <Avatar 
            sx={{ 
              width: 100, 
              height: 100, 
              bgcolor: 'primary.main', 
              mb: { xs: 2, sm: 0 },
              fontSize: '2rem'
            }}
          >
            {patient.name.charAt(0)}
          </Avatar>
          
          <Box sx={{ ml: { xs: 0, sm: 3 }, textAlign: { xs: 'center', sm: 'left' }, flexGrow: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', justifyContent: { xs: 'center', sm: 'flex-start' } }}>
              <Typography variant="h4" component="h1" sx={{ mr: 1 }}>
                {patient.name}
              </Typography>
              
              <Chip 
                label={patient.status.replace(/_/g, ' ')}
                color={patient.status === PatientStatus.ACTIVE ? 'success' : 'default'}
                size="small"
                sx={{ mt: { xs: 1, sm: 0 }, ml: 1 }}
              />
            </Box>
            
            <Typography variant="body1" color="text.secondary" gutterBottom>
              {patient.gender || 'Gender not specified'} • Age: {calculateAge(patient.dateOfBirth)} • DOB: {formatDate(patient.dateOfBirth)}
            </Typography>
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Email fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />
                <Typography variant="body2">{patient.contact.email}</Typography>
              </Box>
              
              {patient.contact.phone && (
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Phone fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />
                  <Typography variant="body2">{patient.contact.phone}</Typography>
                </Box>
              )}
            </Box>
          </Box>
          
          <Box>
            <PatientNotesEditor 
              patientId={patientId}
              initialNotes={patient.notes || ''}
              onSave={handleNotesUpdate}
              variant="dialog"
              buttonText="Edit Notes"
            />
          </Box>
        </Box>
        
        {patient.notes && (
          <Box sx={{ mt: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'text.secondary', mb: 1 }}>
              Notes:
            </Typography>
            <Box 
              sx={{ 
                '& a': { color: 'primary.main' },
                '& ul, & ol': { pl: 2 },
                '& blockquote': { 
                  borderLeft: '3px solid', 
                  borderColor: 'divider',
                  pl: 2,
                  color: 'text.secondary'
                }
              }}
              dangerouslySetInnerHTML={{ __html: patient.notes }}
            />
          </Box>
        )}
      </Paper>
      
      <Box sx={{ mb: 4 }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange} 
          aria-label="patient details tabs"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Personal Info" icon={<Person />} iconPosition="start" />
          <Tab 
            label="Medical Records" 
            icon={<MedicalServices />} 
            iconPosition="start"
          />
          <Tab 
            label="Appointments" 
            icon={<Event />} 
            iconPosition="start" 
          />
          <Tab 
            label="Images" 
            icon={
              <Badge badgeContent={patient.images?.filter(img => img.status === 'PENDING').length || 0} color="error">
                <ImageIcon />
              </Badge>
            } 
            iconPosition="start" 
          />
          <Tab 
            label="Messages" 
            icon={
              <Badge badgeContent={patient.messages?.filter(msg => !msg.isRead).length || 0} color="error">
                <MessageIcon />
              </Badge>
            } 
            iconPosition="start" 
          />
        </Tabs>
        
        <Box sx={{ p: 3, border: 1, borderColor: 'divider', borderTop: 0 }}>
          {/* Personal Info Tab */}
          {activeTab === 0 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6">Contact Information</Typography>
                    </Box>
                    <Divider sx={{ mb: 2 }} />
                    
                    <List dense>
                      <ListItem>
                        <ListItemIcon>
                          <Email />
                        </ListItemIcon>
                        <ListItemText primary="Email" secondary={patient.contact.email} />
                      </ListItem>
                      
                      {patient.contact.phone && (
                        <ListItem>
                          <ListItemIcon>
                            <Phone />
                          </ListItemIcon>
                          <ListItemText primary="Phone" secondary={patient.contact.phone} />
                        </ListItem>
                      )}
                      
                      {patient.address && (
                        <ListItem>
                          <ListItemIcon>
                            <HomeIcon />
                          </ListItemIcon>
                          <ListItemText 
                            primary="Address" 
                            secondary={
                              <>
                                {patient.address.street && <span>{patient.address.street}<br/></span>}
                                {patient.address.city && patient.address.state && (
                                  <span>{patient.address.city}, {patient.address.state} {patient.address.zipCode}<br/></span>
                                )}
                                {patient.address.country && <span>{patient.address.country}</span>}
                              </>
                            } 
                          />
                        </ListItem>
                      )}
                    </List>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6">Emergency Contact</Typography>
                    </Box>
                    <Divider sx={{ mb: 2 }} />
                    
                    {patient.contact.emergencyContact ? (
                      <List dense>
                        <ListItem>
                          <ListItemIcon>
                            <Person />
                          </ListItemIcon>
                          <ListItemText 
                            primary="Name" 
                            secondary={patient.contact.emergencyContact.name} 
                          />
                        </ListItem>
                        
                        <ListItem>
                          <ListItemIcon>
                            <AdminPanelSettings />
                          </ListItemIcon>
                          <ListItemText 
                            primary="Relationship" 
                            secondary={patient.contact.emergencyContact.relationship} 
                          />
                        </ListItem>
                        
                        <ListItem>
                          <ListItemIcon>
                            <Phone />
                          </ListItemIcon>
                          <ListItemText 
                            primary="Phone" 
                            secondary={patient.contact.emergencyContact.phone} 
                          />
                        </ListItem>
                      </List>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No emergency contact information provided.
                      </Typography>
                    )}
                  </CardContent>
                </Card>
                
                <Card sx={{ mt: 3 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6">Insurance Information</Typography>
                    </Box>
                    <Divider sx={{ mb: 2 }} />
                    
                    {patient.insuranceProvider ? (
                      <List dense>
                        <ListItem>
                          <ListItemText 
                            primary="Provider" 
                            secondary={patient.insuranceProvider} 
                          />
                        </ListItem>
                        
                        {patient.insuranceId && (
                          <ListItem>
                            <ListItemText 
                              primary="Insurance ID" 
                              secondary={patient.insuranceId} 
                            />
                          </ListItem>
                        )}
                      </List>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No insurance information provided.
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
          
          {/* Medical Records Tab */}
          {activeTab === 1 && (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <Button 
                  variant="contained" 
                  color="primary" 
                  startIcon={<Add />}
                  onClick={handleAddMedicalRecord}
                >
                  Add Medical Record
                </Button>
              </Box>
              
              {patient.medicalRecords && patient.medicalRecords.length > 0 ? (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="medium">
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Title</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Provider</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {patient.medicalRecords.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>{formatDate(record.date)}</TableCell>
                          <TableCell>{record.title}</TableCell>
                          <TableCell>{record.type}</TableCell>
                          <TableCell>{record.providerName}</TableCell>
                          <TableCell>
                            <IconButton 
                              size="small"
                              onClick={() => router.push(`/provider/medical-records/${record.id}` as any)}
                            >
                              <Description fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body1" color="text.secondary">
                    No medical records found for this patient.
                  </Typography>
                </Box>
              )}
            </>
          )}
          
          {/* Appointments Tab */}
          {activeTab === 2 && (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <Button 
                  variant="contained" 
                  color="primary" 
                  startIcon={<Add />}
                  onClick={handleAddAppointment}
                >
                  Schedule Appointment
                </Button>
              </Box>
              
              {patient.appointments && patient.appointments.length > 0 ? (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="medium">
                    <TableHead>
                      <TableRow>
                        <TableCell>Date & Time</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Provider</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {patient.appointments.map((appointment) => (
                        <TableRow key={appointment.id}>
                          <TableCell>{formatDateTime(appointment.date, appointment.time)}</TableCell>
                          <TableCell>{appointment.type}</TableCell>
                          <TableCell>
                            <Chip 
                              label={appointment.status}
                              color={
                                appointment.status === 'SCHEDULED' ? 'primary' :
                                appointment.status === 'COMPLETED' ? 'success' : 'default'
                              }
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{appointment.providerName}</TableCell>
                          <TableCell>
                            <IconButton 
                              size="small"
                              onClick={() => router.push(`/provider/appointments/${appointment.id}`)}
                            >
                              <MoreVert fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body1" color="text.secondary">
                    No appointments found for this patient.
                  </Typography>
                </Box>
              )}
            </>
          )}
          
          {/* Images Tab */}
          {activeTab === 3 && (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Medical Images
                  {patient.images && patient.images.filter(img => img.status === 'PENDING').length > 0 && (
                    <Chip 
                      label={`${patient.images.filter(img => img.status === 'PENDING').length} pending review`}
                      color="warning"
                      size="small"
                      sx={{ ml: 2 }}
                    />
                  )}
                </Typography>
                <Button 
                  variant="contained" 
                  color="primary"
                  onClick={handleNavigateToImages}
                >
                  View All Images
                </Button>
              </Box>
              
              {patient.images && patient.images.length > 0 ? (
                <Grid container spacing={2}>
                  {patient.images.map((image) => (
                    <Grid item xs={12} sm={6} md={4} key={image.id}>
                      <Card variant="outlined">
                        <Box 
                          sx={{
                            height: 200,
                            bgcolor: 'grey.100',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          {image.thumbnailUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img 
                              src={image.thumbnailUrl} 
                              alt={image.title}
                              style={{ 
                                maxWidth: '100%', 
                                maxHeight: '100%', 
                                objectFit: 'contain' 
                              }}
                            />
                          ) : (
                            <ImageIcon sx={{ fontSize: 60, color: 'text.secondary' }} />
                          )}
                        </Box>
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <Typography variant="body1" component="div">
                              {image.title}
                            </Typography>
                            <Chip
                              label={image.status}
                              color={image.status === 'REVIEWED' ? 'success' : 'warning'}
                              size="small"
                            />
                          </Box>
                          <Typography variant="body2" color="text.secondary">
                            {image.type} • {formatDate(image.uploadDate)}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body1" color="text.secondary">
                    No medical images found for this patient.
                  </Typography>
                </Box>
              )}
            </>
          )}
          
          {/* Messages Tab */}
          {activeTab === 4 && (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Messages
                  {patient.messages && patient.messages.filter(msg => !msg.isRead).length > 0 && (
                    <Chip 
                      label={`${patient.messages.filter(msg => !msg.isRead).length} unread`}
                      color="error"
                      size="small"
                      sx={{ ml: 2 }}
                    />
                  )}
                </Typography>
                <Button 
                  variant="contained" 
                  color="primary"
                  onClick={handleNavigateToMessages}
                >
                  View All Messages
                </Button>
              </Box>
              
              {patient.messages && patient.messages.length > 0 ? (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="medium">
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Subject</TableCell>
                        <TableCell>From</TableCell>
                        <TableCell>Preview</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {patient.messages.map((message) => (
                        <TableRow 
                          key={message.id}
                          sx={{ 
                            bgcolor: !message.isRead ? 'action.hover' : 'inherit',
                            cursor: 'pointer',
                            '&:hover': { bgcolor: 'action.selected' }
                          }}
                          onClick={() => router.push(`/provider/messages/${message.id}` as any)}
                        >
                          <TableCell>{formatDate(message.date)}</TableCell>
                          <TableCell>
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                fontWeight: !message.isRead ? 'bold' : 'normal'
                              }}
                            >
                              {message.subject}
                            </Typography>
                          </TableCell>
                          <TableCell>{message.senderName}</TableCell>
                          <TableCell>{message.preview}</TableCell>
                          <TableCell>
                            {!message.isRead ? (
                              <Chip label="Unread" size="small" color="error" />
                            ) : (
                              <Chip label="Read" size="small" color="default" />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body1" color="text.secondary">
                    No messages found for this patient.
                  </Typography>
                </Box>
              )}
            </>
          )}
        </Box>
      </Box>
    </Container>
  );
} 