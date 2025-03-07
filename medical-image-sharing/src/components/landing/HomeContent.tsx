'use client';

import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import type { Route } from 'next';
import '@/styles/home.css';
import { 
  Security as SecurityIcon,
  Speed as SpeedIcon,
  Analytics as AnalyticsIcon,
  CloudUpload as CloudUploadIcon,
  Group as GroupIcon,
  VerifiedUser as VerifiedUserIcon,
  LocalHospital as HospitalIcon,
  CloudDone as CloudDoneIcon,
  Share as ShareIcon,
  ExpandMore as ExpandMoreIcon,
  Check as CheckIcon,
  AccessTime as AccessTimeIcon,
  Storage as StorageIcon,
  Shield as ShieldIcon,
  Timeline as TimelineIcon,
  LocalHospital,
  Refresh as RefreshIcon,
  MedicalServices as MedicalServicesIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { routes } from '@/config/routes';
import { 
  Accordion, 
  AccordionSummary, 
  AccordionDetails, 
  Typography, 
  Box, 
  Container, 
  Grid, 
  Paper,
  Button,
  Alert,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Logo } from "../logo";
import { Chatbot } from "../chatbot";
import { useErrorHandler } from '@/hooks/useErrorHandler';

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
};

const fadeInLeft = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6 } }
};

const fadeInRight = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6 } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2
    }
  }
};

// Stats data
const stats = [
  {
    title: "99.9% Uptime",
    description: "Our platform maintains industry-leading reliability with continuous monitoring and redundant systems.",
    icon: <SpeedIcon color="primary" fontSize="large" />
  },
  {
    title: "24/7 Support",
    description: "Access our dedicated support team anytime, ensuring you get help when you need it most.",
    icon: <GroupIcon color="primary" fontSize="large" />
  }
];

// Features data
const features = [
  {
    title: "Secure Storage",
    description: "End-to-end encrypted storage ensuring your medical images are protected with military-grade security.",
    icon: <SecurityIcon color="primary" fontSize="large" />,
    color: "primary" as const
  },
  {
    title: "Easy Sharing",
    description: "Share medical images securely with healthcare providers and patients with just a few clicks.",
    icon: <ShareIcon color="secondary" fontSize="large" />,
    color: "secondary" as const
  },
  {
    title: "AI-Powered Insights",
    description: "Advanced AI algorithms provide valuable insights and assist in faster, more accurate diagnoses.",
    icon: <AnalyticsIcon color="success" fontSize="large" />,
    color: "success" as const
  },
  {
    title: "Real-time Collaboration",
    description: "Collaborate with healthcare professionals in real-time for better patient care.",
    icon: <GroupIcon color="info" fontSize="large" />,
    color: "info" as const
  },
  {
    title: "Patient Portal",
    description: "Give patients secure access to their treatments, medical images and reports through a user-friendly portal.",
    icon: <StorageIcon color="warning" fontSize="large" />,
    color: "warning" as const
  },
  {
    title: "Analytics Dashboard",
    description: "Track and analyze medical imaging history with comprehensive analytics.",
    icon: <TimelineIcon color="error" fontSize="large" />,
    color: "error" as const
  },
  {
    title: "Provider Integration",
    description: "Seamlessly connect with your healthcare providers for better care coordination.",
    icon: <MedicalServicesIcon color="primary" fontSize="large" />,
  },
  {
    title: "24/7 Access",
    description: "Access your medical images anytime, anywhere from any device.",
    icon: <AccessTimeIcon color="primary" fontSize="large" />,
  },
  {
    title: "Centralized Medical Records",
    description: "View timeline of All treatements from all providers in one place for ultimate management of care.",
    icon: <PersonIcon color="primary" fontSize="large" />,
  },
];

// Benefits data
const benefits = [
  {
    title: "Enhanced Security",
    description: "Military-grade encryption and HIPAA compliance ensure your medical data is always protected.",
    icon: <ShieldIcon color="primary" fontSize="large" />
  },
  {
    title: "Improved Efficiency",
    description: "Streamline your workflow with instant sharing and real-time collaboration features.",
    icon: <AccessTimeIcon color="primary" fontSize="large" />
  },
  {
    title: "Better Patient Care",
    description: "Provide better care with quick access to medical images and AI-powered insights.",
    icon: <LocalHospital color="primary" fontSize="large" />
  }
];

// FAQ data
const faqs = [
  {
    question: "How secure is MedVault?",
    answer: "MedVault employs military-grade encryption and is fully HIPAA compliant. All data is encrypted both in transit and at rest, ensuring your medical images are always protected."
  },
  {
    question: "Can I share my medical images with my doctor?",
    answer: "Yes, you can easily and securely share your medical images with any healthcare provider. Our platform ensures secure transmission and maintains a detailed access log."
  },
  {
    question: "What types of medical images can I store?",
    answer: "MedVault supports all standard medical imaging formats including DICOM, X-rays, MRIs, CT scans, ultrasounds, and more."
  },
  {
    question: "How does the AI-powered insight feature work?",
    answer: "Our AI algorithms analyze medical images to provide preliminary insights, assist in diagnoses, and highlight areas of interest. This helps healthcare providers make faster, more informed decisions."
  }
];

export default function HomeContent() {
  const theme = useTheme();
  const { error, clearError } = useErrorHandler();
  const heroRef = useRef(null);
  const featuresRef = useRef(null);
  const benefitsRef = useRef(null);
  const faqRef = useRef(null);
  const isHeroInView = useInView(heroRef);
  const isFeaturesInView = useInView(featuresRef);
  const isBenefitsInView = useInView(benefitsRef);
  const isFaqInView = useInView(faqRef);
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const { scrollY } = useScroll();

  // Parallax effects
  const heroY = useTransform(scrollY, [0, 500], [0, 150]);
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.3,
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5,
      },
    },
  };

  return (
    <Box className="min-h-screen">
      {/* Error Alert - Only shown if there's an error */}
      {error && (
        <Alert 
          severity="error"
          action={
            <Button
              color="inherit"
              size="small"
              startIcon={<RefreshIcon />}
              onClick={clearError}
            >
              Dismiss
            </Button>
          }
        >
          {error || 'An error occurred. Please refresh the page and try again.'}
        </Alert>
      )}
    
      {/* Hero Section */}
      <Box 
        ref={heroRef}
        component="section" 
        className="hero-section relative w-full min-h-[100vh] overflow-hidden"
      >
        <Box className="absolute inset-0 z-0 bg-grid-pattern opacity-5" />
        <Box className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background" />

        {/* Main content container - Centered Stack Layout */}
        <Container maxWidth="xl" sx={{ height: '100%', position: 'relative' }}>
          <Box className="w-full h-full relative flex flex-col items-center justify-center" sx={{ pt: 12 }}>
            
            {/* Centered Title, Description and Button - Above the image */}
            <Box sx={{ textAlign: 'center', mb: 6, zIndex: 20, maxWidth: '1000px', mx: 'auto', mt: { xs: 8, md: 6 } }}>
              <motion.div
                initial="hidden"
                animate={isHeroInView ? "visible" : "hidden"}
                variants={fadeInUp}
              >
                <Typography
                  variant="h1"
                  className="font-bold mb-4 text-white drop-shadow-lg"
                  sx={{ 
                    fontSize: { xs: '2.5rem', sm: '3rem', md: '3.5rem', lg: '4rem' },
                    fontWeight: 900,
                    lineHeight: 1.2
                  }}
                >
                  Centralized Medical Management & AI Powered Medical Imaging
                </Typography>
              </motion.div>
              
              <motion.div
                initial="hidden"
                animate={isHeroInView ? "visible" : "hidden"}
                variants={fadeInUp}
              >
                <Typography
                  variant="h5"
                  className="mb-6 text-white/90"
                  sx={{ maxWidth: '800px', mx: 'auto', mt: 3 }}
                >
                  Take control of the care you give and give the patients control of the care they receive
                </Typography>
              </motion.div>

              <motion.div
                initial="hidden"
                animate={isHeroInView ? "visible" : "hidden"}
                variants={fadeInUp}
              >
                <Button
                  component={Link}
                  href={routes.root.register as Route}
                  variant="contained"
                  color="primary"
                  size="large"
                  sx={{
                    px: 4,
                    py: 2,
                    fontSize: '1.25rem',
                    borderRadius: 2,
                    textTransform: 'none'
                  }}
                >
                  Get Started
                </Button>
              </motion.div>
            </Box>
          
            {/* Hero Image */}
            <motion.div
              initial="hidden"
              animate={isHeroInView ? "visible" : "hidden"}
              variants={fadeInUp}
              style={{
                width: '100%',
                maxWidth: '1000px',
                margin: '0 auto',
                position: 'relative'
              }}
            >
              {/* Image Container */}
              <div className="relative w-full" style={{ aspectRatio: '16/9', position: 'relative', zIndex: 1 }}>
                {/* @ts-expect-error - Image is valid here, TypeScript issue */}
                <Image
                  src="/demo.gif"
                  alt="MediVault Demo"
                  fill
                  priority
                  className="rounded-lg shadow-2xl"
                  style={{
                    objectFit: 'cover',
                    filter: 'brightness(0.9) contrast(1.1)'
                  }}
                  sizes="(max-width: 480px) 100vw, (max-width: 768px) 80vw, 1000px"
                />
              </div>
            </motion.div>
          </Box>
        </Container>
      </Box>

      {/* Features Section */}
      <Box component="section" id="features" sx={{ py: 25 }}>
        <Container maxWidth="xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center mb-20"
          >
            <motion.div variants={fadeInUp}>
              <Typography 
                variant="h2" 
                className="font-bold" 
                sx={{ 
                  textAlign: 'center',
                  fontSize: { xs: '2.5rem', sm: '3rem', md: '3.5rem' },
                  fontWeight: 800,
                  mb: 3
                }}
              >
                Key Features
              </Typography>
            </motion.div>
            <motion.div variants={fadeInUp}>
              <Typography 
                variant="h5" 
                color="text.secondary" 
                sx={{ 
                  maxWidth: '800px', 
                  mx: 'auto', 
                  textAlign: 'center',
                  fontSize: { xs: '1.25rem', md: '1.5rem' },
                  fontWeight: 500,
                  mb: 8 // Increased spacing between title and features
                }}
              >
                Everything you need for secure medical image management
              </Typography>
            </motion.div>
          </motion.div>

          <Grid container spacing={4}>
            {features.map((feature, index) => (
              <Grid item xs={12} md={6} lg={4} key={feature.title}>
                <motion.div
                  variants={fadeInUp}
                  whileHover={{ scale: 1.02 }}
                  style={{ height: '100%' }}
                >
                  <Paper
                    elevation={2}
                    sx={{
                      p: 6,
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center'
                    }}
                  >
                    <Box
                      sx={{
                        mb: 4,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {feature.icon}
                    </Box>
                    <Typography variant="h5" gutterBottom>
                      {feature.title}
                    </Typography>
                    <Typography color="text.secondary">
                      {feature.description}
                    </Typography>
                  </Paper>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Benefits Section */}
      <Box
        component="section"
        sx={{
          py: 10,
          background: (theme) => 
            theme.palette.mode === 'dark' 
              ? 'linear-gradient(to bottom right, #1a237e, #311b92)'
              : 'linear-gradient(to bottom right, #e3f2fd, #e1f5fe)'
        }}
      >
        <Container maxWidth="xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center mb-12"
          >
            <motion.div variants={fadeInUp}>
              <Typography variant="h2" className="text-4xl font-bold mb-4" sx={{ textAlign: 'center' }}>
                Why Choose MediVault?
              </Typography>
            </motion.div>
            <motion.div variants={fadeInUp}>
              <Typography variant="h5" color="text.secondary" sx={{ textAlign: 'center' }}>
                Experience the benefits of modern medical image management
              </Typography>
            </motion.div>
          </motion.div>

          <Grid container spacing={4}>
            {benefits.map((benefit) => (
              <Grid item xs={12} md={4} key={benefit.title}>
                <motion.div variants={fadeInUp} style={{ height: '100%' }}>
                  <Paper
                    elevation={2}
                    sx={{
                      p: 4,
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center'
                    }}
                  >
                    <Box sx={{ mb: 3 }}>
                      {benefit.icon}
                    </Box>
                    <Typography variant="h5" gutterBottom>
                      {benefit.title}
                    </Typography>
                    <Typography color="text.secondary">
                      {benefit.description}
                    </Typography>
                  </Paper>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Stats Section */}
      <Box component="section" sx={{ py: 10 }}>
        <Container maxWidth="xl">
          <Grid container spacing={4}>
            {stats.map((stat) => (
              <Grid item xs={12} md={6} key={stat.title}>
                <motion.div variants={fadeInUp} style={{ height: '100%' }}>
                  <Paper
                    elevation={2}
                    sx={{
                      p: 4,
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center'
                    }}
                  >
                    <Box sx={{ mb: 3 }}>
                      {stat.icon}
                    </Box>
                    <Typography variant="h5" gutterBottom>
                      {stat.title}
                    </Typography>
                    <Typography color="text.secondary">
                      {stat.description}
                    </Typography>
                  </Paper>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* FAQ Section */}
      <Box component="section" sx={{ py: 10 }}>
        <Container maxWidth="xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center mb-20"
          >
            <motion.div variants={fadeInUp}>
              <Typography variant="h2" className="text-4xl font-bold mb-4" sx={{ textAlign: 'center' }}>
                Frequently Asked Questions
              </Typography>
            </motion.div>
            <motion.div variants={fadeInUp}>
              <Typography variant="h5" color="text.secondary" sx={{ textAlign: 'center' }}>
                Find answers to common questions about MedVault
              </Typography>
            </motion.div>
          </motion.div>

          <Box maxWidth="md" sx={{ mx: 'auto' }}>
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                className="mb-4"
              >
                <Accordion>
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    aria-controls={`faq-content-${index}`}
                    id={`faq-header-${index}`}
                  >
                    <Typography variant="subtitle1" fontWeight="medium">
                      {faq.question}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography variant="body1" color="text.secondary">
                      {faq.answer}
                    </Typography>
                  </AccordionDetails>
                </Accordion>
              </motion.div>
            ))}
          </Box>
        </Container>
      </Box>

      {/* CTA Section */}
      <Box
        component="section"
        sx={{
          py: 10,
          background: (theme) =>
            `linear-gradient(to right, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`
        }}
      >
        <Container maxWidth="xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center text-white"
          >
            <motion.div variants={fadeInUp}>
              <Typography variant="h2" color="white" className="text-5xl font-bold mb-6" sx={{ textAlign: 'center' }}>
                Ready to Get Started?
              </Typography>
            </motion.div>
            <motion.div variants={fadeInUp}>
              <Typography variant="h4" color="white" sx={{ opacity: 0.9, mb: 5, textAlign: 'center' }}>
                Join thousands of healthcare professionals using MediVault
              </Typography>
            </motion.div>
            <Box sx={{ textAlign: 'center', display: 'flex', justifyContent: 'center' }}>
              <motion.div variants={fadeInUp}>
                <Button
                  component={Link}
                  href={routes.root.register as Route}
                  variant="contained"
                  color="inherit"
                  size="large"
                  sx={{
                    px: 6,
                    py: 2,
                    fontSize: '1.25rem',
                    borderRadius: 4,
                    textTransform: 'none',
                    backgroundColor: 'white',
                    color: 'primary.main',
                    '&:hover': {
                      backgroundColor: 'grey.100'
                    }
                  }}
                >
                  Create Your Account
                </Button>
              </motion.div>
            </Box>
          </motion.div>
        </Container>
      </Box>

      <Chatbot />
    </Box>
  );
} 