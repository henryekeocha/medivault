/**
 * This file exports the useToast hook from the ToastContext
 * to maintain a consistent import pattern through the hooks directory
 */

import { useToast } from '@/contexts/ToastContext';

export { useToast };

// Re-export default for convenience
export default useToast; 