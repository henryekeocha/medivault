'use client';

import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import Link from 'next/link';
import { HeroImage } from '@/components/HeroImage';
import { WorkflowImage } from '@/components/WorkflowImage';
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
} from '@mui/icons-material';
import { routes } from '@/config/routes';

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1 }
};

// Stats data with animated values
const stats = [
  { value: "10M+", label: "Images Processed", icon: CloudDoneIcon },
  { value: "5,000+", label: "Healthcare Providers", icon: HospitalIcon },
  { value: "99.9%", label: "Uptime", icon: SpeedIcon },
  { value: "24/7", label: "Support", icon: GroupIcon }
];

// Workflow steps
const workflowSteps = [
  {
    step: 1,
    title: "Upload",
    description: "Securely upload medical images with end-to-end encryption",
    icon: CloudUploadIcon,
    color: "from-blue-500 to-blue-600"
  },
  {
    step: 2,
    title: "Share",
    description: "Collaborate with your team in real-time",
    icon: ShareIcon,
    color: "from-purple-500 to-purple-600"
  },
  {
    step: 3,
    title: "Analyze",
    description: "Advanced image analysis and reporting tools",
    icon: AnalyticsIcon,
    color: "from-green-500 to-green-600"
  }
];

// Features grid items
const features = [
  {
    title: "Secure Storage",
    description: "End-to-end encrypted storage for all medical images",
    icon: SecurityIcon,
    color: "from-blue-400 to-blue-600",
    span: "md:col-span-2 md:row-span-2"
  },
  {
    title: "Real-time Collaboration",
    description: "Work seamlessly with your team using annotations and comments",
    icon: GroupIcon,
    color: "from-purple-400 to-purple-600"
  },
  {
    title: "Advanced Analytics",
    description: "Powerful analysis tools with detailed reporting",
    icon: AnalyticsIcon,
    color: "from-green-400 to-green-600"
  },
  {
    title: "HIPAA Compliant",
    description: "Full compliance with healthcare regulations",
    icon: VerifiedUserIcon,
    color: "from-indigo-400 to-indigo-600"
  }
];

export default function HomeContent() {
  const { scrollY } = useScroll();
  const heroRef = useRef(null);
  const isHeroInView = useInView(heroRef);

  // Parallax effects
  const heroY = useTransform(scrollY, [0, 500], [0, 150]);
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Hero Section */}
      <section 
        ref={heroRef}
        className="relative w-full min-h-[85vh] flex items-center justify-center overflow-hidden"
      >
        {/* Hero Content */}
        <div className="relative max-w-7xl mx-auto px-6 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial="hidden"
              animate={isHeroInView ? "visible" : "hidden"}
              variants={fadeInUp}
              className="relative z-10"
            >
              <motion.h1 
                className="text-5xl lg:text-6xl xl:text-7xl font-bold mb-6"
                variants={fadeInUp}
              >
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                  Secure Medical
                  <br />
                  Image Sharing
                </span>
              </motion.h1>
              <motion.p 
                className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-xl"
                variants={fadeInUp}
              >
                Transform your medical imaging workflow with our secure, HIPAA-compliant platform.
                Share and collaborate seamlessly with healthcare professionals worldwide.
              </motion.p>
              <motion.div 
                className="flex flex-wrap gap-4"
                variants={fadeInUp}
              >
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Link
                    href={routes.root.register as any}
                    className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl shadow-lg hover:shadow-xl transform transition-all hover:-translate-y-0.5"
                  >
                    Get Started
                    <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </Link>
                </motion.div>
              </motion.div>
            </motion.div>

            <motion.div
              initial="hidden"
              animate={isHeroInView ? "visible" : "hidden"}
              variants={scaleIn}
              className="relative z-10"
            >
              <div className="relative">
                <HeroImage />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {features.map((feature) => (
              <motion.div
                key={feature.title}
                variants={fadeInUp}
                className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg"
              >
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${feature.color} flex items-center justify-center mb-4`}>
                  <feature.icon className="text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-600 dark:text-gray-300">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <motion.div
                key={stat.label}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeInUp}
                className="text-center"
              >
                <div className="mb-4">
                  <stat.icon className="w-8 h-8 mx-auto text-blue-600" />
                </div>
                <div className="text-3xl font-bold mb-2">{stat.value}</div>
                <div className="text-gray-600 dark:text-gray-300">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
} 