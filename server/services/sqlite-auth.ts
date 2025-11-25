// SQLite authentication service for persistent user storage
import crypto from "crypto";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { UserData, AuthService } from "./auth-interface";

// Ensure database directory exists
const dbDir = path.join(__dirname, "../database");
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, "users.db");
const db = new Database(dbPath);

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    passwordHash TEXT NOT NULL,
    userType TEXT NOT NULL CHECK(userType IN ('student', 'practitioner')),
    createdAt INTEGER NOT NULL,
    lastLogin INTEGER NOT NULL,
    isActive INTEGER NOT NULL DEFAULT 1,
    rememberMe INTEGER NOT NULL DEFAULT 0
  );

  CREATE INDEX IF NOT EXISTS idx_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_active ON users(isActive);
`);

export class SQLiteAuthService implements AuthService {
  // Hash password using SHA-256
  private hashPassword(password: string): string {
    return crypto.createHash("sha256").update(password).digest("hex");
  }

  // Generate unique user ID
  private generateUserId(email: string): string {
    return crypto
      .createHash("md5")
      .update(email + Date.now())
      .digest("hex");
  }

  // Convert database row to UserData
  private rowToUserData(row: any): UserData {
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.passwordHash,
      userType: row.userType as "student" | "practitioner",
      createdAt: row.createdAt,
      lastLogin: row.lastLogin,
      isActive: Boolean(row.isActive),
      rememberMe: Boolean(row.rememberMe),
    };
  }

  // Store user credentials in SQLite database
  async createUser(
    email: string,
    password: string,
    userType: "student" | "practitioner",
    rememberMe: boolean = false
  ): Promise<UserData> {
    try {
      const userId = this.generateUserId(email);
      const passwordHash = this.hashPassword(password);
      const now = Date.now();
      const normalizedEmail = email.toLowerCase().trim();

      // Check if user already exists
      const existing = db
        .prepare("SELECT id FROM users WHERE email = ?")
        .get(normalizedEmail);
      if (existing) {
        throw new Error("User already exists with this email");
      }

      // Insert new user
      db.prepare(
        `INSERT INTO users (id, email, passwordHash, userType, createdAt, lastLogin, isActive, rememberMe)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        userId,
        normalizedEmail,
        passwordHash,
        userType,
        now,
        now,
        1,
        rememberMe ? 1 : 0
      );

      const userData: UserData = {
        id: userId,
        email: normalizedEmail,
        passwordHash,
        userType,
        createdAt: now,
        lastLogin: now,
        isActive: true,
        rememberMe,
      };

      console.log(`User created successfully: ${email} (${userType})`);
      return userData;
    } catch (error: any) {
      console.error("Error creating user:", error);
      if (error.message.includes("UNIQUE constraint")) {
        throw new Error("User already exists with this email");
      }
      throw new Error("Failed to create user account");
    }
  }

  // Authenticate user
  async authenticateUser(
    email: string,
    password: string
  ): Promise<UserData | null> {
    try {
      const passwordHash = this.hashPassword(password);
      const normalizedEmail = email.toLowerCase().trim();

      const row = db
        .prepare(
          "SELECT * FROM users WHERE email = ? AND isActive = 1"
        )
        .get(normalizedEmail) as any;

      if (!row) {
        console.log(`Authentication failed for: ${email} (user not found)`);
        return null;
      }

      if (row.passwordHash !== passwordHash) {
        console.log(`Authentication failed for: ${email} (invalid password)`);
        return null;
      }

      // Update last login time
      db.prepare("UPDATE users SET lastLogin = ? WHERE id = ?").run(
        Date.now(),
        row.id
      );

      const userData = this.rowToUserData(row);
      userData.lastLogin = Date.now();

      console.log(`User authenticated successfully: ${email}`);
      return userData;
    } catch (error: any) {
      console.error("Error authenticating user:", error);
      throw new Error("Authentication failed");
    }
  }

  // Get user by ID
  async getUserById(userId: string): Promise<UserData | null> {
    try {
      const row = db
        .prepare("SELECT * FROM users WHERE id = ? AND isActive = 1")
        .get(userId) as any;

      if (!row) {
        return null;
      }

      return this.rowToUserData(row);
    } catch (error: any) {
      console.error("Error getting user by ID:", error);
      return null;
    }
  }

  // Update user data
  async updateUser(
    userId: string,
    updates: Partial<UserData>
  ): Promise<UserData | null> {
    try {
      const row = db
        .prepare("SELECT * FROM users WHERE id = ? AND isActive = 1")
        .get(userId) as any;

      if (!row) {
        return null;
      }

      // Build update query dynamically
      const updateFields: string[] = [];
      const updateValues: any[] = [];

      if (updates.email !== undefined) {
        updateFields.push("email = ?");
        updateValues.push(updates.email.toLowerCase().trim());
      }
      if (updates.userType !== undefined) {
        updateFields.push("userType = ?");
        updateValues.push(updates.userType);
      }
      if (updates.lastLogin !== undefined) {
        updateFields.push("lastLogin = ?");
        updateValues.push(updates.lastLogin);
      }
      if (updates.isActive !== undefined) {
        updateFields.push("isActive = ?");
        updateValues.push(updates.isActive ? 1 : 0);
      }
      if (updates.rememberMe !== undefined) {
        updateFields.push("rememberMe = ?");
        updateValues.push(updates.rememberMe ? 1 : 0);
      }

      if (updateFields.length > 0) {
        updateValues.push(userId);
        db.prepare(
          `UPDATE users SET ${updateFields.join(", ")} WHERE id = ?`
        ).run(...updateValues);
      }

      // Fetch updated user
      const updatedRow = db
        .prepare("SELECT * FROM users WHERE id = ?")
        .get(userId) as any;

      if (!updatedRow) {
        return null;
      }

      const userData = this.rowToUserData(updatedRow);
      console.log(`User updated successfully: ${userData.email}`);
      return userData;
    } catch (error: any) {
      console.error("Error updating user:", error);
      throw new Error("Failed to update user");
    }
  }

  // Deactivate user (soft delete)
  async deactivateUser(userId: string): Promise<boolean> {
    try {
      const result = await this.updateUser(userId, { isActive: false });
      return result !== null;
    } catch (error: any) {
      console.error("Error deactivating user:", error);
      return false;
    }
  }

  // Get all users (for admin purposes)
  async getAllUsers(): Promise<UserData[]> {
    try {
      const rows = db
        .prepare("SELECT * FROM users WHERE isActive = 1")
        .all() as any[];

      return rows.map((row) => this.rowToUserData(row));
    } catch (error: any) {
      console.error("Error getting all users:", error);
      return [];
    }
  }

  // Test connection (check if database is accessible)
  async testConnection(): Promise<boolean> {
    try {
      db.prepare("SELECT 1").get();
      return true;
    } catch (error: any) {
      console.error("SQLite connection test failed:", error);
      return false;
    }
  }
}

export const sqliteAuthService = new SQLiteAuthService();

