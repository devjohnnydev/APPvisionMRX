import bcrypt from "bcryptjs";
import { storage } from "../storage";

export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function authenticateUser(email: string, password: string) {
  try {
    const user = await storage.getUserByEmail(email);
    
    if (!user || !user.passwordHash || !user.isActive) {
      return null;
    }

    const isValidPassword = await verifyPassword(password, user.passwordHash);
    
    if (!isValidPassword) {
      return null;
    }

    // Return user without password hash
    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  } catch (error) {
    console.error("Authentication error:", error);
    return null;
  }
}

export async function createAdminUser(email: string, password: string, firstName: string, lastName: string) {
  try {
    const existingUser = await storage.getUserByEmail(email);
    
    if (existingUser) {
      console.log("Admin user already exists");
      return existingUser;
    }

    const passwordHash = await hashPassword(password);
    
    const adminUser = await storage.createUser({
      email,
      passwordHash,
      firstName,
      lastName,
      role: "admin",
      isActive: true,
    });

    console.log("Admin user created successfully");
    return adminUser;
  } catch (error) {
    console.error("Error creating admin user:", error);
    throw error;
  }
}