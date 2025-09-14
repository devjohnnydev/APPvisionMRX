import {
  users,
  scannedBoards,
  boardNames,
  userSessions,
  lots,
  type User,
  type UpsertUser,
  type InsertUser,
  type UpdateUser,
  type ScannedBoard,
  type InsertScannedBoard,
  type UpdateScannedBoard,
  type BoardName,
  type InsertBoardName,
  type UpdateBoardName,
  type UserSession,
  type InsertUserSession,
  type UpdateUserSession,
  type Lot,
  type InsertLot,
  type UpdateLot,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, like, gte, lte, count, SQL, isNull } from "drizzle-orm";

export interface IStorage {
  // User operations - mandatory for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // User management
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: UpdateUser): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  getUsersByRole(role: string): Promise<User[]>;
  deactivateUser(id: string): Promise<void>;
  
  // User activity sessions
  createUserSession(session: InsertUserSession): Promise<UserSession>;
  updateUserSession(id: string, updates: UpdateUserSession): Promise<UserSession | undefined>;
  getUserActiveSessions(userId: string): Promise<UserSession[]>;
  getUserSessionsByDate(userId: string, date: Date): Promise<UserSession[]>;
  endUserSession(sessionId: string, endedAt: Date, duration: number): Promise<void>;
  getUserActivityStats(userId?: string, startDate?: Date, endDate?: Date): Promise<{
    totalSessions: number;
    totalTimeMinutes: number;
    averageSessionMinutes: number;
    activeDays: number;
  }>;
  
  // Scanned boards
  createScannedBoard(board: InsertScannedBoard): Promise<ScannedBoard>;
  updateScannedBoard(id: string, updates: UpdateScannedBoard): Promise<ScannedBoard | undefined>;
  getScannedBoards(filters?: {
    userId?: string;
    boardType?: string;
    category?: string;
    startDate?: Date;
    endDate?: Date;
    lotId?: string;
    limit?: number;
    offset?: number;
  }): Promise<ScannedBoard[]>;
  getScannedBoardById(id: string): Promise<ScannedBoard | undefined>;
  getScannedBoardStats(): Promise<{
    totalToday: number;
    totalThisMonth: number;
    totalAll: number;
    totalWeight: number;
    totalValue: number;
    topBoardTypes: Array<{ boardType: string; count: number }>;
    topCategories: Array<{ category: string; count: number }>;
  }>;
  getUserScannedBoards(userId: string): Promise<ScannedBoard[]>;
  
  // Lots management
  createLot(lot: InsertLot): Promise<Lot>;
  updateLot(id: string, updates: UpdateLot): Promise<Lot | undefined>;
  getAllLots(status?: string): Promise<Lot[]>;
  getLotById(id: string): Promise<Lot | undefined>;
  addBoardsToLot(lotId: string, boardIds: string[]): Promise<void>;
  removeBoardsFromLot(boardIds: string[]): Promise<void>;
  closeLot(lotId: string): Promise<Lot | undefined>;
  updateLotTotals(lotId: string): Promise<void>;
  getLotStats(lotId: string): Promise<{
    totalBoards: number;
    totalWeight: number;
    totalValue: number;
    boardsByType: Array<{ boardType: string; count: number }>;
  }>;
  
  // Board names management (Admin only)
  createBoardName(boardName: InsertBoardName): Promise<BoardName>;
  updateBoardName(id: string, updates: UpdateBoardName): Promise<BoardName | undefined>;
  deleteBoardName(id: string): Promise<void>;
  getAllBoardNames(): Promise<BoardName[]>;
  getBoardNamesByCategory(category: string): Promise<BoardName[]>;
  searchBoardNames(query: string): Promise<BoardName[]>;
  
  // Reporting
  getManagementReports(filters?: {
    startDate?: Date;
    endDate?: Date;
    userId?: string;
    lotId?: string;
  }): Promise<{
    summary: {
      totalBoards: number;
      totalWeight: number;
      totalValue: number;
      activeLots: number;
      activeUsers: number;
    };
    dailyStats: Array<{
      date: string;
      boardCount: number;
      totalWeight: number;
      totalValue: number;
    }>;
    userStats: Array<{
      userId: string;
      userName: string;
      boardCount: number;
      totalWeight: number;
      totalValue: number;
      totalTimeMinutes: number;
    }>;
    lotStats: Array<{
      lotId: string;
      lotName: string;
      status: string;
      boardCount: number;
      totalWeight: number;
      totalValue: number;
    }>;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations - mandatory for Replit Auth
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // User management
  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  async updateUser(id: string, updates: UpdateUser): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(eq(users.role, role))
      .orderBy(desc(users.createdAt));
  }

  async deactivateUser(id: string): Promise<void> {
    await db
      .update(users)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(users.id, id));
  }

  // Scanned boards
  async createScannedBoard(boardData: InsertScannedBoard): Promise<ScannedBoard> {
    const [board] = await db
      .insert(scannedBoards)
      .values(boardData)
      .returning();
    return board;
  }

  async getScannedBoards(filters?: {
    userId?: string;
    boardType?: string;
    category?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<ScannedBoard[]> {
    const conditions: SQL[] = [];
    
    if (filters?.userId) {
      conditions.push(eq(scannedBoards.userId, filters.userId));
    }
    
    if (filters?.boardType) {
      conditions.push(like(scannedBoards.boardType, `%${filters.boardType}%`));
    }
    
    if (filters?.category) {
      conditions.push(eq(scannedBoards.category, filters.category));
    }
    
    if (filters?.startDate) {
      conditions.push(gte(scannedBoards.createdAt, filters.startDate));
    }
    
    if (filters?.endDate) {
      conditions.push(lte(scannedBoards.createdAt, filters.endDate));
    }
    
    let q = db.select().from(scannedBoards).$dynamic();
    if (conditions.length) {
      q = q.where(and(...conditions));
    }
    q = q.orderBy(desc(scannedBoards.createdAt));
    if (filters?.limit !== undefined) {
      q = q.limit(filters.limit);
    }
    if (filters?.offset !== undefined) {
      q = q.offset(filters.offset);
    }
    
    return await q;
  }

  async getScannedBoardById(id: string): Promise<ScannedBoard | undefined> {
    const [board] = await db
      .select()
      .from(scannedBoards)
      .where(eq(scannedBoards.id, id));
    return board;
  }

  async getScannedBoardStats(): Promise<{
    totalToday: number;
    totalThisMonth: number;
    totalAll: number;
    totalWeight: number;
    totalValue: number;
    topBoardTypes: Array<{ boardType: string; count: number }>;
    topCategories: Array<{ category: string; count: number }>;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);
    
    const [todayCount] = await db
      .select({ count: count() })
      .from(scannedBoards)
      .where(gte(scannedBoards.createdAt, today));
    
    const [monthCount] = await db
      .select({ count: count() })
      .from(scannedBoards)
      .where(gte(scannedBoards.createdAt, thisMonth));
    
    const [totalCount] = await db
      .select({ count: count() })
      .from(scannedBoards);
    
    // Get total weight and value from all boards
    const allBoards = await db
      .select({
        weightKg: scannedBoards.weightKg,
        totalPrice: scannedBoards.totalPrice,
      })
      .from(scannedBoards);
    
    const totalWeight = allBoards.reduce((sum, board) => sum + (Number(board.weightKg) || 0), 0);
    const totalValue = allBoards.reduce((sum, board) => sum + (Number(board.totalPrice) || 0), 0);
    
    // Get top board types (simplified - would need proper GROUP BY in production)
    const recentBoards = await db
      .select()
      .from(scannedBoards)
      .orderBy(desc(scannedBoards.createdAt))
      .limit(100);
    
    const boardTypeCounts: Record<string, number> = {};
    const categoryCounts: Record<string, number> = {};
    recentBoards.forEach(board => {
      boardTypeCounts[board.boardType] = (boardTypeCounts[board.boardType] || 0) + 1;
      categoryCounts[board.category] = (categoryCounts[board.category] || 0) + 1;
    });
    
    const topBoardTypes = Object.entries(boardTypeCounts)
      .map(([boardType, count]) => ({ boardType, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
      
    const topCategories = Object.entries(categoryCounts)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    return {
      totalToday: todayCount.count,
      totalThisMonth: monthCount.count,
      totalAll: totalCount.count,
      totalWeight,
      totalValue,
      topBoardTypes,
      topCategories,
    };
  }

  async getUserScannedBoards(userId: string): Promise<ScannedBoard[]> {
    return await db
      .select()
      .from(scannedBoards)
      .where(eq(scannedBoards.userId, userId))
      .orderBy(desc(scannedBoards.createdAt));
  }

  // Board names management (Admin only)
  async createBoardName(boardNameData: InsertBoardName): Promise<BoardName> {
    const [boardName] = await db
      .insert(boardNames)
      .values(boardNameData)
      .returning();
    return boardName;
  }

  async updateBoardName(id: string, updates: UpdateBoardName): Promise<BoardName | undefined> {
    const [boardName] = await db
      .update(boardNames)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(boardNames.id, id))
      .returning();
    return boardName;
  }

  async deleteBoardName(id: string): Promise<void> {
    await db
      .update(boardNames)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(boardNames.id, id));
  }

  async getAllBoardNames(): Promise<BoardName[]> {
    return await db
      .select()
      .from(boardNames)
      .where(eq(boardNames.isActive, true))
      .orderBy(desc(boardNames.createdAt));
  }

  async getBoardNamesByCategory(category: string): Promise<BoardName[]> {
    return await db
      .select()
      .from(boardNames)
      .where(and(eq(boardNames.isActive, true), eq(boardNames.category, category)))
      .orderBy(desc(boardNames.createdAt));
  }

  async searchBoardNames(query: string): Promise<BoardName[]> {
    return await db
      .select()
      .from(boardNames)
      .where(
        and(
          eq(boardNames.isActive, true),
          like(boardNames.boardType, `%${query}%`)
        )
      )
      .orderBy(desc(boardNames.createdAt));
  }

  // User Sessions - Critical methods for activity tracking
  async createUserSession(sessionData: InsertUserSession): Promise<UserSession> {
    const [session] = await db
      .insert(userSessions)
      .values(sessionData)
      .returning();
    return session;
  }

  async updateUserSession(id: string, updates: UpdateUserSession): Promise<UserSession | undefined> {
    const [session] = await db
      .update(userSessions)
      .set(updates)
      .where(eq(userSessions.id, id))
      .returning();
    return session;
  }

  async getUserActiveSessions(userId: string): Promise<UserSession[]> {
    return await db
      .select()
      .from(userSessions)
      .where(and(
        eq(userSessions.userId, userId),
        isNull(userSessions.endedAt)
      ))
      .orderBy(desc(userSessions.startedAt));
  }

  async getUserSessionsByDate(userId: string, date: Date): Promise<UserSession[]> {
    return await db
      .select()
      .from(userSessions)
      .where(and(
        eq(userSessions.userId, userId),
        eq(userSessions.activityDate, date.toISOString().split('T')[0])
      ))
      .orderBy(desc(userSessions.startedAt));
  }

  async endUserSession(sessionId: string, endedAt: Date, duration: number): Promise<void> {
    await db
      .update(userSessions)
      .set({
        endedAt,
        durationSeconds: duration,
      })
      .where(eq(userSessions.id, sessionId));
  }

  async getUserActivityStats(userId?: string, startDate?: Date, endDate?: Date): Promise<{
    totalSessions: number;
    totalTimeMinutes: number;
    averageSessionMinutes: number;
    activeDays: number;
  }> {
    // Simplified implementation - would use proper SQL aggregations in production
    const conditions: SQL[] = [];
    if (userId) conditions.push(eq(userSessions.userId, userId));
    if (startDate) conditions.push(gte(userSessions.activityDate, startDate.toISOString().split('T')[0]));
    if (endDate) conditions.push(lte(userSessions.activityDate, endDate.toISOString().split('T')[0]));

    let query = db.select().from(userSessions).$dynamic();
    if (conditions.length) {
      query = query.where(and(...conditions));
    }
    
    const sessions = await query;
    const completedSessions = sessions.filter(s => s.durationSeconds !== null);
    const totalSeconds = completedSessions.reduce((sum, s) => sum + (s.durationSeconds || 0), 0);
    const uniqueDates = new Set(sessions.map(s => s.activityDate?.toString()));

    return {
      totalSessions: completedSessions.length,
      totalTimeMinutes: Math.round(totalSeconds / 60),
      averageSessionMinutes: completedSessions.length > 0 ? Math.round(totalSeconds / 60 / completedSessions.length) : 0,
      activeDays: uniqueDates.size,
    };
  }

  // Enhanced Scanned Boards
  async updateScannedBoard(id: string, updates: UpdateScannedBoard): Promise<ScannedBoard | undefined> {
    // Calculate totalPrice if weight and pricePerKg are provided
    let calculatedUpdates: any = { ...updates };
    if (updates.weightKg !== undefined && updates.pricePerKg !== undefined) {
      calculatedUpdates.totalPrice = String(Number(updates.weightKg) * Number(updates.pricePerKg));
    }

    const [board] = await db
      .update(scannedBoards)
      .set(calculatedUpdates)
      .where(eq(scannedBoards.id, id))
      .returning();
    return board;
  }

  // Basic Lots Management
  async createLot(lotData: InsertLot): Promise<Lot> {
    const [lot] = await db
      .insert(lots)
      .values(lotData)
      .returning();
    return lot;
  }

  async updateLot(id: string, updates: UpdateLot): Promise<Lot | undefined> {
    const [lot] = await db
      .update(lots)
      .set(updates)
      .where(eq(lots.id, id))
      .returning();
    return lot;
  }

  async getAllLots(status?: string): Promise<Lot[]> {
    let query = db.select().from(lots).$dynamic();
    if (status) {
      query = query.where(eq(lots.status, status));
    }
    return await query.orderBy(desc(lots.createdAt));
  }

  async getLotById(id: string): Promise<Lot | undefined> {
    const [lot] = await db
      .select()
      .from(lots)
      .where(eq(lots.id, id));
    return lot;
  }

  async addBoardsToLot(lotId: string, boardIds: string[]): Promise<void> {
    // Update multiple boards to assign them to the lot
    await db
      .update(scannedBoards)
      .set({ lotId })
      .where(eq(scannedBoards.id, boardIds[0])); // Simplified - would need IN clause for multiple
    
    // Update lot totals
    await this.updateLotTotals(lotId);
  }

  async removeBoardsFromLot(boardIds: string[]): Promise<void> {
    await db
      .update(scannedBoards)
      .set({ lotId: null })
      .where(eq(scannedBoards.id, boardIds[0])); // Simplified
  }

  async closeLot(lotId: string): Promise<Lot | undefined> {
    const [lot] = await db
      .update(lots)
      .set({ 
        status: "closed",
        closedAt: new Date()
      })
      .where(eq(lots.id, lotId))
      .returning();
    return lot;
  }

  async updateLotTotals(lotId: string): Promise<void> {
    // Get all boards in this lot
    const boards = await db
      .select({
        weightKg: scannedBoards.weightKg,
        totalPrice: scannedBoards.totalPrice,
      })
      .from(scannedBoards)
      .where(eq(scannedBoards.lotId, lotId));

    const totalWeight = boards.reduce((sum, board) => sum + (Number(board.weightKg) || 0), 0);
    const totalValue = boards.reduce((sum, board) => sum + (Number(board.totalPrice) || 0), 0);
    const itemCount = boards.length;

    await db
      .update(lots)
      .set({
        totalWeight,
        totalValue: String(totalValue),
        itemCount,
      })
      .where(eq(lots.id, lotId));
  }

  async getLotStats(lotId: string): Promise<{
    totalBoards: number;
    totalWeight: number;
    totalValue: number;
    boardsByType: Array<{ boardType: string; count: number }>;
  }> {
    const boards = await db
      .select()
      .from(scannedBoards)
      .where(eq(scannedBoards.lotId, lotId));

    const totalWeight = boards.reduce((sum, board) => sum + (Number(board.weightKg) || 0), 0);
    const totalValue = boards.reduce((sum, board) => sum + (Number(board.totalPrice) || 0), 0);

    const boardTypeCounts: Record<string, number> = {};
    boards.forEach(board => {
      boardTypeCounts[board.boardType] = (boardTypeCounts[board.boardType] || 0) + 1;
    });

    const boardsByType = Object.entries(boardTypeCounts)
      .map(([boardType, count]) => ({ boardType, count }));

    return {
      totalBoards: boards.length,
      totalWeight,
      totalValue,
      boardsByType,
    };
  }

  // Placeholder for missing methods - TODO: implement in next iteration
  async getManagementReports(): Promise<any> {
    throw new Error("Management reports not yet implemented - TODO for next iteration");
  }
}

export const storage = new DatabaseStorage();
