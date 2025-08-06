import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../models/User';

export interface NotificationData {
  type: 'poll_created' | 'poll_updated' | 'poll_voted' | 'reservation_created' | 'reservation_cancelled' | 'user_approved' | 'coin_request_approved';
  title: string;
  message: string;
  data?: any;
  timestamp: Date;
  userId?: string; // If notification is for specific user
  role?: string; // If notification is for specific role (admin, member)
}

class WebSocketService {
  private io: SocketIOServer | null = null;
  private connectedUsers: Map<string, string> = new Map(); // userId -> socketId

  initialize(server: HttpServer): void {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:4200",
        methods: ["GET", "POST"],
        credentials: true
      }
    });

    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Authentication error: No token provided'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        const user = await User.findById(decoded.id);
        
        if (!user || !user.isActive || !user.isApproved) {
          return next(new Error('Authentication error: Invalid user'));
        }

        socket.userId = (user._id as any).toString();
        socket.userRole = user.role;
        socket.userName = (user as any).fullName || user.username;
        
        next();
      } catch (error) {
        next(new Error('Authentication error: Invalid token'));
      }
    });

    this.io.on('connection', (socket) => {
      console.log(`🔌 User connected: ${socket.userName} (${socket.userId})`);
      
      // Store user connection
      this.connectedUsers.set(socket.userId, socket.id);
      
      // Join user-specific room
      socket.join(`user:${socket.userId}`);
      
      // Join role-specific room
      socket.join(`role:${socket.userRole}`);

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`🔌 User disconnected: ${socket.userName} (${socket.userId})`);
        this.connectedUsers.delete(socket.userId);
      });

      // Handle ping for connection health
      socket.on('ping', () => {
        socket.emit('pong');
      });
    });

    console.log('🚀 WebSocket service initialized');
  }

  // Send notification to all users
  broadcastNotification(notification: NotificationData): void {
    if (!this.io) return;
    
    this.io.emit('notification', {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date()
    });
  }

  // Send notification to specific user
  sendToUser(userId: string, notification: NotificationData): void {
    if (!this.io) return;
    
    this.io.to(`user:${userId}`).emit('notification', {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date()
    });
  }

  // Send notification to users with specific role
  sendToRole(role: string, notification: NotificationData): void {
    if (!this.io) return;
    
    this.io.to(`role:${role}`).emit('notification', {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date()
    });
  }

  // Send notification to all approved users
  sendToApprovedUsers(notification: NotificationData): void {
    if (!this.io) return;
    
    // Send to both members and superadmin roles
    this.io.to('role:member').to('role:superadmin').emit('notification', {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date()
    });
  }

  // Get connected users count
  getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  // Check if user is connected
  isUserConnected(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }
}

// Export singleton instance
export const websocketService = new WebSocketService();

// Type augmentation for socket
declare module 'socket.io' {
  interface Socket {
    userId: string;
    userRole: string;
    userName: string;
  }
}