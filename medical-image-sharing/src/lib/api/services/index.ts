import { AnnotationService } from './annotation.service';
import { AuthService } from './auth.service';
import { ImageService } from './image.service';
import { ShareService } from './share.service';
import { WebSocketService } from './websocket.service';

export { AuthService } from './auth.service';
export { ImageService } from './image.service';
export { ShareService } from './share.service';
export { AnnotationService } from './annotation.service';
export { WebSocketService } from './websocket.service';

// Helper function to initialize all services
export function initializeServices() {
  // Initialize all services to ensure they're ready
  const auth = AuthService.getInstance();
  const images = ImageService.getInstance();
  const shares = ShareService.getInstance();
  const annotations = AnnotationService.getInstance();
  const ws = WebSocketService.getInstance();

  // Connect WebSocket if authenticated
  if (auth.isAuthenticated()) {
    ws.connect();
  }

  return {
    auth,
    images,
    shares,
    annotations,
    ws,
  };
} 