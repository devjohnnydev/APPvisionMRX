import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { analyzeCircuitBoard } from "./services/aiVision";
import { authenticateUser, createAdminUser } from "./lib/auth";
import { 
  insertScannedBoardSchema, 
  insertUserSchema, 
  insertBoardNameSchema, 
  updateBoardNameSchema,
  insertUserSessionSchema,
  updateUserSessionSchema,
  insertLotSchema,
  updateScannedBoardSchema
} from "@shared/schema";
import multer from "multer";
import session from "express-session";
import connectPg from "connect-pg-simple";

const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup session middleware for email/password auth
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  
  app.set("trust proxy", 1);
  app.use(session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: sessionTtl,
    },
  }));

  // Create admin user on startup (only if ADMIN_EMAIL env var is set)
  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    try {
      await createAdminUser(
        process.env.ADMIN_EMAIL, 
        process.env.ADMIN_PASSWORD, 
        process.env.ADMIN_FIRST_NAME || "Admin", 
        process.env.ADMIN_LAST_NAME || "User"
      );
    } catch (error) {
      console.log("Admin user already exists or failed to create:", error);
    }
  }

  // Email/Password Auth middleware
  const requireAuth = (req: any, res: any, next: any) => {
    if (!(req.session as any)?.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  };

  // Email/Password Auth routes
  app.post('/api/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email e senha são obrigatórios" });
      }

      const user = await authenticateUser(email, password);
      
      if (!user) {
        return res.status(401).json({ message: "Email ou senha incorretos" });
      }

      // Store user in session
      (req.session as any).user = user;
      
      res.json(user);
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.post('/api/logout', (req, res) => {
    req.session.destroy((err: any) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Erro ao fazer logout" });
      }
      res.json({ message: "Logout realizado com sucesso" });
    });
  });

  // Auth routes
  app.get('/api/auth/user', requireAuth, async (req: any, res) => {
    try {
      const user = (req.session as any).user;
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Dashboard stats
  app.get('/api/dashboard/stats', requireAuth, async (req: any, res) => {
    try {
      const stats = await storage.getScannedBoardStats();
      const activeUsers = await storage.getUsersByRole("user");
      const activeUserCount = activeUsers.filter(u => u.isActive).length;
      
      res.json({
        ...stats,
        activeUsers: activeUserCount,
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Scanned boards
  app.get('/api/scanned-boards', requireAuth, async (req: any, res) => {
    try {
      const { boardType, startDate, endDate, limit = 20, offset = 0 } = req.query;
      const user = (req.session as any).user;
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const filters: any = { limit: parseInt(limit), offset: parseInt(offset) };
      
      // Only admins can see all boards, users see only their own
      if (user.role !== "admin") {
        filters.userId = user.id;
      }
      
      if (boardType) filters.boardType = boardType;
      if (startDate) filters.startDate = new Date(startDate);
      if (endDate) filters.endDate = new Date(endDate);
      
      const boards = await storage.getScannedBoards(filters);
      
      // Include user info for each board
      const boardsWithUsers = await Promise.all(boards.map(async (board) => {
        const boardUser = await storage.getUser(board.userId);
        return {
          ...board,
          user: boardUser ? {
            firstName: boardUser.firstName,
            lastName: boardUser.lastName,
            email: boardUser.email,
          } : null,
        };
      }));
      
      res.json(boardsWithUsers);
    } catch (error) {
      console.error("Error fetching scanned boards:", error);
      res.status(500).json({ message: "Failed to fetch scanned boards" });
    }
  });

  app.post('/api/scan', requireAuth, upload.single('image'), async (req: any, res) => {
    try {
      const user = (req.session as any).user;
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No image provided" });
      }

      // Convert image to base64
      const base64Image = req.file.buffer.toString('base64');
      
      // Analyze with AI
      const analysis = await analyzeCircuitBoard(base64Image);
      
      // Parse location data from request body
      const { location, latitude, longitude } = req.body;
      
      // Save to database with new fields
      const boardData = {
        userId: user.id,
        boardType: analysis.boardType,
        category: analysis.category || "Unknown",
        deviceType: analysis.deviceType || "Unknown",
        manufacturer: analysis.manufacturer,
        model: analysis.model,
        confidence: analysis.confidence,
        imageUrl: `data:image/jpeg;base64,${base64Image}`,
        location: location || null,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
      };
      
      const scannedBoard = await storage.createScannedBoard(boardData);
      
      res.json({
        ...scannedBoard,
        analysis: {
          components: analysis.components,
          description: analysis.description,
        },
      });
    } catch (error) {
      console.error("Error processing scan:", error);
      res.status(500).json({ message: "Failed to process scan" });
    }
  });

  app.get('/api/scanned-boards/:id', requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const user = (req.session as any).user;
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const board = await storage.getScannedBoardById(id);
      
      if (!board) {
        return res.status(404).json({ message: "Scanned board not found" });
      }

      // Users can only access their own boards unless they're admin
      if (user.role !== "admin" && board.userId !== user.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(board);
    } catch (error) {
      console.error("Error fetching scanned board:", error);
      res.status(500).json({ message: "Failed to fetch scanned board" });
    }
  });

  // User management (admin only)
  app.get('/api/users', requireAuth, async (req: any, res) => {
    try {
      const user = (req.session as any).user;
      
      if (!user || user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post('/api/users', requireAuth, async (req: any, res) => {
    try {
      const user = (req.session as any).user;
      
      if (!user || user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const userData = insertUserSchema.parse(req.body);
      const newUser = await storage.createUser(userData);
      res.json(newUser);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.put('/api/users/:id', requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const user = (req.session as any).user;
      
      // Users can edit their own profile, admins can edit any profile
      if (!user || (user.role !== "admin" && user.id !== id)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updates = req.body;
      const updatedUser = await storage.updateUser(id, updates);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.delete('/api/users/:id', requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const user = (req.session as any).user;
      
      if (!user || user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      if (user.id === id) {
        return res.status(400).json({ message: "Cannot deactivate your own account" });
      }

      await storage.deactivateUser(id);
      res.json({ message: "User deactivated successfully" });
    } catch (error) {
      console.error("Error deactivating user:", error);
      res.status(500).json({ message: "Failed to deactivate user" });
    }
  });

  // Board names management (Admin only)
  app.get('/api/board-names', requireAuth, async (req: any, res) => {
    try {
      const user = (req.session as any).user;
      
      if (!user || user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { category } = req.query;
      let boardNames;
      
      if (category) {
        boardNames = await storage.getBoardNamesByCategory(category);
      } else {
        boardNames = await storage.getAllBoardNames();
      }
      
      res.json(boardNames);
    } catch (error) {
      console.error("Error fetching board names:", error);
      res.status(500).json({ message: "Failed to fetch board names" });
    }
  });

  app.post('/api/board-names', requireAuth, async (req: any, res) => {
    try {
      const user = (req.session as any).user;
      
      if (!user || user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const boardNameData = insertBoardNameSchema.parse({
        ...req.body,
        createdBy: user.id,
      });
      
      const newBoardName = await storage.createBoardName(boardNameData);
      res.json(newBoardName);
    } catch (error) {
      console.error("Error creating board name:", error);
      if (error instanceof Error && error.name === 'ZodError') {
        return res.status(400).json({ 
          message: "Invalid board name data",
          errors: (error as any).errors 
        });
      }
      res.status(500).json({ message: "Failed to create board name" });
    }
  });

  app.put('/api/board-names/:id', requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const user = (req.session as any).user;
      
      if (!user || user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const updates = updateBoardNameSchema.parse(req.body);
      const updatedBoardName = await storage.updateBoardName(id, updates);
      
      if (!updatedBoardName) {
        return res.status(404).json({ message: "Board name not found" });
      }

      res.json(updatedBoardName);
    } catch (error) {
      console.error("Error updating board name:", error);
      if (error instanceof Error && error.name === 'ZodError') {
        return res.status(400).json({ 
          message: "Invalid board name data",
          errors: (error as any).errors 
        });
      }
      res.status(500).json({ message: "Failed to update board name" });
    }
  });

  app.delete('/api/board-names/:id', requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const user = (req.session as any).user;
      
      if (!user || user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      await storage.deleteBoardName(id);
      res.json({ message: "Board name deleted successfully" });
    } catch (error) {
      console.error("Error deleting board name:", error);
      res.status(500).json({ message: "Failed to delete board name" });
    }
  });

  app.get('/api/board-names/search', requireAuth, async (req: any, res) => {
    try {
      const user = (req.session as any).user;
      
      if (!user || user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { q } = req.query;
      if (!q) {
        return res.status(400).json({ message: "Search query is required" });
      }
      
      const boardNames = await storage.searchBoardNames(q);
      res.json(boardNames);
    } catch (error) {
      console.error("Error searching board names:", error);
      res.status(500).json({ message: "Failed to search board names" });
    }
  });

  // User Activity APIs
  app.post('/api/activity/start', requireAuth, async (req: any, res) => {
    try {
      const user = (req.session as any).user;
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if there's already an active session today
      const activeSessions = await storage.getUserActiveSessions(user.id);
      if (activeSessions.length > 0) {
        return res.json(activeSessions[0]); // Return existing session
      }

      // Create new session
      const sessionData = insertUserSessionSchema.parse({
        userId: user.id,
        startedAt: new Date(),
        lastActiveAt: new Date(),
        activityDate: new Date().toISOString().split('T')[0],
      });
      
      const session = await storage.createUserSession(sessionData);
      res.json(session);
    } catch (error) {
      console.error("Error starting session:", error);
      res.status(500).json({ message: "Failed to start session" });
    }
  });

  app.post('/api/activity/ping', requireAuth, async (req: any, res) => {
    try {
      const user = (req.session as any).user;
      const { sessionId } = req.body;
      
      if (!user || !sessionId) {
        return res.status(400).json({ message: "User and sessionId required" });
      }

      const updateData = updateUserSessionSchema.parse({
        lastActiveAt: new Date(),
      });
      
      const session = await storage.updateUserSession(sessionId, updateData);
      
      res.json({ success: true, session });
    } catch (error) {
      console.error("Error updating session:", error);
      res.status(500).json({ message: "Failed to update session" });
    }
  });

  app.post('/api/activity/end', requireAuth, async (req: any, res) => {
    try {
      const user = (req.session as any).user;
      const { sessionId } = req.body;
      
      if (!user || !sessionId) {
        return res.status(400).json({ message: "User and sessionId required" });
      }

      const endTime = new Date();
      
      // Get session to calculate actual duration
      const activeSessions = await storage.getUserActiveSessions(user.id);
      const activeSession = activeSessions.find(s => s.id === sessionId);
      
      if (!activeSession) {
        return res.status(404).json({ message: "Active session not found" });
      }
      
      const startTime = new Date(activeSession.startedAt);
      const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000); // seconds
      
      await storage.endUserSession(sessionId, endTime, duration);
      res.json({ success: true });
    } catch (error) {
      console.error("Error ending session:", error);
      res.status(500).json({ message: "Failed to end session" });
    }
  });

  // Enhanced Scanned Boards APIs
  app.patch('/api/scanned-boards/:id', requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const user = (req.session as any).user;
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if board exists and user has access
      const existingBoard = await storage.getScannedBoardById(id);
      if (!existingBoard) {
        return res.status(404).json({ message: "Scanned board not found" });
      }

      if (user.role !== "admin" && existingBoard.userId !== user.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updates = updateScannedBoardSchema.parse(req.body);
      const updatedBoard = await storage.updateScannedBoard(id, updates);
      
      res.json(updatedBoard);
    } catch (error) {
      console.error("Error updating scanned board:", error);
      res.status(500).json({ message: "Failed to update scanned board" });
    }
  });

  // Lots Management APIs
  app.get('/api/lots', requireAuth, async (req: any, res) => {
    try {
      const user = (req.session as any).user;
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { status } = req.query;
      const lots = await storage.getAllLots(status);
      res.json(lots);
    } catch (error) {
      console.error("Error fetching lots:", error);
      res.status(500).json({ message: "Failed to fetch lots" });
    }
  });

  app.post('/api/lots', requireAuth, async (req: any, res) => {
    try {
      const user = (req.session as any).user;
      
      if (!user || user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const lotData = insertLotSchema.parse({
        ...req.body,
        createdBy: user.id,
      });
      
      const lot = await storage.createLot(lotData);
      res.json(lot);
    } catch (error) {
      console.error("Error creating lot:", error);
      res.status(500).json({ message: "Failed to create lot" });
    }
  });

  app.get('/api/lots/:id', requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const user = (req.session as any).user;
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const lot = await storage.getLotById(id);
      if (!lot) {
        return res.status(404).json({ message: "Lot not found" });
      }

      const stats = await storage.getLotStats(id);
      res.json({ ...lot, stats });
    } catch (error) {
      console.error("Error fetching lot:", error);
      res.status(500).json({ message: "Failed to fetch lot" });
    }
  });

  app.post('/api/lots/:id/close', requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const user = (req.session as any).user;
      
      if (!user || user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const lot = await storage.closeLot(id);
      if (!lot) {
        return res.status(404).json({ message: "Lot not found" });
      }

      res.json(lot);
    } catch (error) {
      console.error("Error closing lot:", error);
      res.status(500).json({ message: "Failed to close lot" });
    }
  });

  app.post('/api/lots/:id/add-boards', requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { boardIds } = req.body;
      const user = (req.session as any).user;
      
      if (!user || user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      if (!boardIds || !Array.isArray(boardIds)) {
        return res.status(400).json({ message: "boardIds array required" });
      }

      await storage.addBoardsToLot(id, boardIds);
      res.json({ success: true });
    } catch (error) {
      console.error("Error adding boards to lot:", error);
      res.status(500).json({ message: "Failed to add boards to lot" });
    }
  });

  // User Activity Stats (Admin only)
  app.get('/api/activity/stats', requireAuth, async (req: any, res) => {
    try {
      const user = (req.session as any).user;
      
      if (!user || user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { userId, startDate, endDate } = req.query;
      const stats = await storage.getUserActivityStats(
        userId, 
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined
      );
      
      res.json(stats);
    } catch (error) {
      console.error("Error fetching activity stats:", error);
      res.status(500).json({ message: "Failed to fetch activity stats" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
