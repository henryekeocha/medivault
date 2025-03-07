'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  CloudUpload as UploadIcon,
  Share as ShareIcon,
  Analytics as AnalyticsIcon,
  Description as ReportIcon,
} from '@mui/icons-material';

const workflowSteps = [
  {
    icon: UploadIcon,
    title: 'Upload',
    color: 'from-blue-400 to-blue-600',
    description: 'Securely upload medical images',
  },
  {
    icon: ShareIcon,
    title: 'Share',
    color: 'from-purple-400 to-purple-600',
    description: 'Collaborate with your team',
  },
  {
    icon: AnalyticsIcon,
    title: 'Analyze',
    color: 'from-green-400 to-green-600',
    description: 'Advanced image analysis',
  },
  {
    icon: ReportIcon,
    title: 'Report',
    color: 'from-orange-400 to-orange-600',
    description: 'Generate detailed reports',
  },
];

export const WorkflowImage: React.FC = () => {
  return (
    <div className="relative w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-lg overflow-hidden p-8">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-30" />

      {/* Workflow Steps */}
      <div className="relative grid grid-cols-2 gap-8 h-full">
        {workflowSteps.map((step, index) => (
          <motion.div
            key={step.title}
            className="relative"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.2 }}
          >
            {/* Connection Lines */}
            {index < workflowSteps.length - 1 && (
              <motion.div
                className="absolute z-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.2 + 0.5 }}
              >
                {/* Horizontal Line (for same row) */}
                {index % 2 === 0 && (
                  <motion.div
                    className="absolute top-1/2 left-full w-8 h-0.5 bg-gradient-to-r from-blue-400/50 to-purple-400/50"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: index * 0.2 + 0.5, duration: 0.5 }}
                  >
                    {/* Animated Particle */}
                    <motion.div
                      className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-blue-500"
                      animate={{
                        x: ['0%', '100%'],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "linear"
                      }}
                    />
                  </motion.div>
                )}
                
                {/* Vertical Line (for different rows) */}
                {index % 2 === 0 && index < workflowSteps.length - 2 && (
                  <motion.div
                    className="absolute top-1/2 left-full ml-8 w-0.5 h-24 bg-gradient-to-b from-purple-400/50 to-green-400/50"
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ delay: index * 0.2 + 1, duration: 0.5 }}
                  >
                    {/* Animated Particle */}
                    <motion.div
                      className="absolute left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-purple-500"
                      animate={{
                        y: ['0%', '100%'],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "linear"
                      }}
                    />
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* Step Card */}
            <motion.div
              className="relative z-10 bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {/* Icon */}
              <motion.div
                className={`w-12 h-12 rounded-lg bg-gradient-to-r ${step.color} p-3 mb-4`}
                whileHover={{ rotate: 5 }}
              >
                <step.icon className="w-full h-full text-white" />
              </motion.div>

              {/* Content */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.2 + 0.3 }}
              >
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {step.description}
                </p>
              </motion.div>

              {/* Step Number */}
              <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                  {index + 1}
                </span>
              </div>
            </motion.div>
          </motion.div>
        ))}
      </div>

      {/* Decorative Elements */}
      <motion.div
        className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.2, 0.3],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      <motion.div
        className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.2, 0.3],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1
        }}
      />
    </div>
  );
}; 