import {
  users,
  scannedBoards,
  boardNames,
  type User,
  type UpsertUser,
  type InsertUser,
  type UpdateUser,
  type ScannedBoard,
  type InsertScannedBoard,
  type BoardName,
  type InsertBoardName,
  type UpdateBoardName,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, like, gte, lte, count, SQL } from "drizzle-orm";

export interface IStorage {
  // User operations - mandatory for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // User management
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: UpdateUser): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  getUsersByRole(role: string): Promise<User[]>;
  deactivateUser(id: string): Promise<void>;
  
  // Scanned boards
  createScannedBoard(board: InsertScannedBoard): Promise<ScannedBoard>;
  getScannedBoards(filters?: {
    userId?: string;
    boardType?: string;
    category?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<ScannedBoard[]>;
  getScannedBoardById(id: string): Promise<ScannedBoard | undefined>;
  getScannedBoardStats(): Promise<{
    totalToday: number;
    totalThisMonth: number;
    totalAll: number;
    topBoardTypes: Array<{ boardType: string; count: number }>;
    topCategories: Array<{ category: string; count: number }>;
  }>;
  getUserScannedBoards(userId: string): Promise<ScannedBoard[]>;
  
  // Board names management (Admin only)
  createBoardName(boardName: InsertBoardName): Promise<BoardName>;
  updateBoardName(id: string, updates: UpdateBoardName): Promise<BoardName | undefined>;
  deleteBoardName(id: string): Promise<void>;
  getAllBoardNames(): Promise<BoardName[]>;
  getBoardNamesByCategory(category: string): Promise<BoardName[]>;
  searchBoardNames(query: string): Promise<BoardName[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations - mandatory for Replit Auth
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
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
}

export const storage = new DatabaseStorage();
