import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { analyzeCircuitBoard } from "./services/aiVision";
import { 
  insertScannedBoardSchema, 
  insertUserSchema, 
  insertBoardNameSchema, 
  updateBoardNameSchema 
} from "@shared/schema";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Dashboard stats
  app.get('/api/dashboard/stats', isAuthenticated, async (req: any, res) => {
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
  app.get('/api/scanned-boards', isAuthenticated, async (req: any, res) => {
    try {
      const { boardType, startDate, endDate, limit = 20, offset = 0 } = req.query;
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const filters: any = { limit: parseInt(limit), offset: parseInt(offset) };
      
      // Only admins can see all boards, users see only their own
      if (user.role !== "admin") {
        filters.userId = userId;
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

  app.post('/api/scan', isAuthenticated, upload.single('image'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
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
        userId,
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

  app.get('/api/scanned-boards/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const board = await storage.getScannedBoardById(id);
      
      if (!board) {
        return res.status(404).json({ message: "Scanned board not found" });
      }

      // Users can only access their own boards unless they're admin
      if (user.role !== "admin" && board.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(board);
    } catch (error) {
      console.error("Error fetching scanned board:", error);
      res.status(500).json({ message: "Failed to fetch scanned board" });
    }
  });

  // User management (admin only)
  app.get('/api/users', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
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

  app.post('/api/users', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
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

  app.put('/api/users/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // Users can edit their own profile, admins can edit any profile
      if (!user || (user.role !== "admin" && userId !== id)) {
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

  app.delete('/api/users/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      if (userId === id) {
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
  app.get('/api/board-names', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
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

  app.post('/api/board-names', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const boardNameData = insertBoardNameSchema.parse({
        ...req.body,
        createdBy: userId,
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

  app.put('/api/board-names/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
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

  app.delete('/api/board-names/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
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

  app.get('/api/board-names/search', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
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

  const httpServer = createServer(app);
  return httpServer;
}
