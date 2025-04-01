import { AnnotationService } from './annotation.service';
import { ImageService } from './image.service';
import { ShareService } from './share.service';
import { WebSocketService } from './websocket.service';
import { useAuth } from '@clerk/nextjs';

export { ImageService } from './image.service';
export { ShareService } from './share.service';
export { AnnotationService } from './annotation.service';
export { WebSocketService } from './websocket.service';

// Create instances of services
const imageService = new ImageService();
const shareService = new ShareService();
const annotationService = new AnnotationService();
const wsService = WebSocketService.getInstance();

// Helper function to initialize all services
export function initializeServices() {
  const { isSignedIn } = useAuth();
  
  // Connect WebSocket if authenticated
  if (isSignedIn) {
    wsService.connect();
  }

  return {
    images: imageService,
    shares: shareService,
    annotations: annotationService,
    ws: wsService,
  };
}

// Export singleton instances
export const images = imageService;
export const shares = shareService;
export const annotations = annotationService;
export const ws = wsService; 