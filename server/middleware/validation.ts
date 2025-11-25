// Input validation and sanitization middleware
import { Request, Response, NextFunction } from "express";

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Sanitize string input (remove potentially dangerous characters)
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, "") // Remove < and > to prevent XSS
    .substring(0, 500); // Limit length
}

// Validate email format
export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email) && email.length <= 254;
}

// Validate password strength
export function isValidPassword(password: string): boolean {
  return password.length >= 6 && password.length <= 128;
}

// Validate user type
export function isValidUserType(userType: string): boolean {
  return userType === "student" || userType === "practitioner";
}

// Middleware to validate registration input
export function validateRegisterInput(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { email, password, userType } = req.body;

  // Check required fields
  if (!email || !password || !userType) {
    return res.status(400).json({
      success: false,
      message: "Email, password, and user type are required",
    });
  }

  // Validate email
  if (!isValidEmail(email)) {
    return res.status(400).json({
      success: false,
      message: "Invalid email format",
    });
  }

  // Validate password
  if (!isValidPassword(password)) {
    return res.status(400).json({
      success: false,
      message: "Password must be between 6 and 128 characters",
    });
  }

  // Validate user type
  if (!isValidUserType(userType)) {
    return res.status(400).json({
      success: false,
      message: "Invalid user type. Must be student or practitioner",
    });
  }

  // Sanitize inputs
  req.body.email = sanitizeString(email).toLowerCase();
  req.body.userType = userType;

  next();
}

// Middleware to validate login input
export function validateLoginInput(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { email, password } = req.body;

  // Check required fields
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required",
    });
  }

  // Validate email
  if (!isValidEmail(email)) {
    return res.status(400).json({
      success: false,
      message: "Invalid email format",
    });
  }

  // Sanitize email
  req.body.email = sanitizeString(email).toLowerCase();

  next();
}

// Middleware to validate user ID parameter
export function validateUserId(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { userId } = req.params;

  if (!userId || userId.length < 10 || userId.length > 100) {
    return res.status(400).json({
      success: false,
      message: "Invalid user ID",
    });
  }

  // Sanitize user ID
  req.params.userId = sanitizeString(userId);

  next();
}

