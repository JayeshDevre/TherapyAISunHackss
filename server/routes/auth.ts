import express from "express";
import { gcsService } from "../services/gcs-service";
import { fallbackAuthService } from "../services/fallback-auth";
import { sqliteAuthService } from "../services/sqlite-auth";
import { AuthService, UserData } from "../services/auth-interface";
import {
  validateRegisterInput,
  validateLoginInput,
  validateUserId,
} from "../middleware/validation";

// Priority: SQLite > GCS > Fallback (in-memory)
let authService: AuthService = sqliteAuthService;

// Initialize auth service with fallback chain
async function initializeAuthService() {
  // Try SQLite first (production-ready, persistent)
  try {
    const isConnected = await sqliteAuthService.testConnection();
    if (isConnected) {
      console.log("✅ Using SQLite authentication service (persistent storage)");
      authService = sqliteAuthService;
      return;
    }
  } catch (error) {
    console.warn("⚠️  SQLite not available, trying GCS...");
  }

  // Try GCS as second option
  try {
    const isConnected = await gcsService.testConnection();
    if (isConnected) {
      console.log("✅ Using GCS authentication service");
      authService = gcsService;
      return;
    }
  } catch (error) {
    console.warn("⚠️  GCS not available, using fallback...");
  }

  // Fallback to in-memory (development only)
  console.log("⚠️  Using in-memory authentication service (data will be lost on restart)");
  authService = fallbackAuthService;
}

// Initialize auth service
initializeAuthService();

const router = express.Router();

// Register new user
router.post("/register", validateRegisterInput, async (req, res) => {
  try {
    const { email, password, userType, rememberMe } = req.body;

    // Create new user (createUser will throw if user already exists)
    const userData = await authService.createUser(
      email,
      password,
      userType,
      rememberMe
    );

    // Return user data (without password hash)
    const { passwordHash, ...safeUserData } = userData;

    res.status(201).json({
      success: true,
      message: "User created successfully",
      user: safeUserData,
    });
  } catch (error: any) {
    console.error("Registration error:", error);
    
    // Handle duplicate user error
    if (error.message && error.message.includes("already exists")) {
      return res.status(409).json({
        success: false,
        message: "User already exists with this email",
      });
    }
    
    res.status(500).json({
      success: false,
      message: "Internal server error during registration",
    });
  }
});

// Login user
router.post("/login", validateLoginInput, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Authenticate user
    const userData = await authService.authenticateUser(email, password);

    if (!userData) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Return user data (without password hash)
    const { passwordHash, ...safeUserData } = userData;

    res.json({
      success: true,
      message: "Login successful",
      user: safeUserData,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error during login",
    });
  }
});

// Get user by ID
router.get("/user/:userId", validateUserId, async (req, res) => {
  try {
    const { userId } = req.params;

    const userData = await authService.getUserById(userId);

    if (!userData) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Return user data (without password hash)
    const { passwordHash, ...safeUserData } = userData;

    res.json({
      success: true,
      user: safeUserData,
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Update user profile
router.put("/user/:userId", validateUserId, async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = req.body;

    // Remove sensitive fields that shouldn't be updated via this endpoint
    delete updates.passwordHash;
    delete updates.id;
    delete updates.createdAt;

    const updatedUser = await authService.updateUser(userId, updates);

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Return updated user data (without password hash)
    const { passwordHash, ...safeUserData } = updatedUser;

    res.json({
      success: true,
      message: "User updated successfully",
      user: safeUserData,
    });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error during update",
    });
  }
});

// Deactivate user account
router.delete("/user/:userId", validateUserId, async (req, res) => {
  try {
    const { userId } = req.params;

    const success = await authService.deactivateUser(userId);

    if (!success) {
      return res.status(404).json({
        success: false,
        message: "User not found or already deactivated",
      });
    }

    res.json({
      success: true,
      message: "User account deactivated successfully",
    });
  } catch (error) {
    console.error("Deactivate user error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error during deactivation",
    });
  }
});

// Test connection
router.get("/test-connection", async (req, res) => {
  try {
    const isConnected = await authService.testConnection();

    res.json({
      success: isConnected,
      message: isConnected
        ? "Authentication service connected"
        : "Authentication service failed",
    });
  } catch (error) {
    console.error("Auth test error:", error);
    res.status(500).json({
      success: false,
      message: "Authentication service test failed",
    });
  }
});

export default router;
