// Structured logging middleware for requests
import { Request, Response, NextFunction } from "express";

interface LogEntry {
  timestamp: string;
  method: string;
  path: string;
  statusCode?: number;
  responseTime?: number;
  ip?: string;
  userAgent?: string;
}

// Simple logger that outputs structured JSON
export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const startTime = Date.now();
  const logEntry: LogEntry = {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.get("user-agent"),
  };

  // Log response when finished
  res.on("finish", () => {
    const responseTime = Date.now() - startTime;
    logEntry.statusCode = res.statusCode;
    logEntry.responseTime = responseTime;

    // Log level based on status code
    if (res.statusCode >= 500) {
      console.error(JSON.stringify({ level: "error", ...logEntry }));
    } else if (res.statusCode >= 400) {
      console.warn(JSON.stringify({ level: "warn", ...logEntry }));
    } else {
      console.log(JSON.stringify({ level: "info", ...logEntry }));
    }
  });

  next();
}

