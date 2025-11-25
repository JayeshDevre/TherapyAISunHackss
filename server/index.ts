import "dotenv/config";
import { WebSocketServer } from "ws";
import type { WebSocket } from "ws";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { therapyReply, type ChatTurn, getLLMProvider } from "./llm";
import { detectCrisis, crisisResponse } from "./safety";
import personaRoutes from "./routes/personas";
import authRoutes from "./routes/auth";
import { requestLogger } from "./middleware/logger";

const PORT = Number(process.env.PORT || 8080);
const API_PORT = Number(process.env.API_PORT || 3001);
const LLM_PROVIDER = (process.env.LLM_PROVIDER || "gemini").toLowerCase();

// Environment variable validation on startup
console.log("\n=== Server Configuration ===");
console.log(`LLM Provider: ${LLM_PROVIDER}`);
console.log(`API Port: ${API_PORT}`);
console.log(`WebSocket Port: ${PORT}`);

if (LLM_PROVIDER === "gemini") {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY || GEMINI_API_KEY.length < 20) {
    console.warn("⚠️  WARNING: GEMINI_API_KEY not set or appears invalid!");
    console.warn("   The server will use a default key which may not work.");
    console.warn("   Set GEMINI_API_KEY in your .env file for production use.");
  } else {
    console.log("✅ Gemini API key configured");
  }
} else if (LLM_PROVIDER === "ollama") {
  console.log("✅ Using Ollama (local)");
  const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
  console.log(`   Ollama URL: ${OLLAMA_BASE_URL}`);
} else {
  console.warn(`⚠️  Unknown LLM_PROVIDER: ${LLM_PROVIDER}, defaulting to gemini`);
}
console.log("===========================\n");

type Session = {
  history: ChatTurn[]; // minimal memory per socket
  ping?: NodeJS.Timeout;
  persona?: string; // current persona
};

function send(ws: WebSocket, obj: Record<string, any>) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(obj));
}

// Create Express app for API routes
const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors());

// Request logging
app.use(requestLogger);

// Body parsing
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Rate limiting - 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Apply rate limiting to all API routes
app.use("/api", limiter);

// API routes
app.use("/api/personas", personaRoutes);
app.use("/api/auth", authRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Start API server
app.listen(API_PORT, () => {
  console.log(`[server] API server listening on port ${API_PORT}`);
}).on("error", (err: any) => {
  if (err.code === "EADDRINUSE") {
    console.error(`\n❌ Port ${API_PORT} is already in use!`);
    console.error(`   To fix this, run: lsof -ti:${API_PORT} | xargs kill -9`);
    console.error(`   Or use a different port: API_PORT=3002 npm start\n`);
  } else {
    console.error("Server error:", err);
  }
  process.exit(1);
});

const wss = new WebSocketServer({ port: PORT }, () =>
  console.log(`[server] Therapy WS listening on ${PORT}`)
).on("error", (err: any) => {
  if (err.code === "EADDRINUSE") {
    console.error(`\n❌ WebSocket port ${PORT} is already in use!`);
    console.error(`   To fix this, run: lsof -ti:${PORT} | xargs kill -9`);
    console.error(`   Or use a different port: PORT=8081 npm start\n`);
  } else {
    console.error("WebSocket server error:", err);
  }
  process.exit(1);
});

wss.on("connection", (ws: WebSocket) => {
  const sess: Session = { history: [], persona: "sarah" }; // default to sarah
  send(ws, { type: "ready" });
  send(ws, {
    type: "info",
    message: `LLM: ${getLLMProvider()}`,
  });

  // keep alive
  sess.ping = setInterval(() => {
    try {
      ws.ping();
    } catch {}
  }, 25000);

  ws.on("message", async (data, isBinary) => {
    if (isBinary) return; // no audio in this build

    try {
      const msg = JSON.parse(data.toString());

      // Set persona
      if (msg.type === "set_persona") {
        sess.persona = msg.persona || "sarah";
        send(ws, { type: "info", message: `Persona set to: ${sess.persona}` });
        return;
      }

      // Typed chat from client
      if (msg.type === "text_input") {
        const userText = String(msg.text || "").trim();
        if (!userText) return;

        // echo user text to UI
        send(ws, { type: "final_stt", text: userText });

        // basic crisis screen
        if (detectCrisis(userText)) {
          const reply = crisisResponse();
          sess.history.push({ role: "user", content: userText });
          sess.history.push({ role: "assistant", content: reply });
          send(ws, { type: "persona_say", who: "thera", text: reply });
          return;
        }

        // normal reply with persona context
        console.log(`[chat] User message: "${userText.substring(0, 50)}..."`);
        console.log(`[chat] Using persona: ${sess.persona}, LLM: ${getLLMProvider()}`);
        try {
          const reply = await therapyReply(userText, sess.history, sess.persona);
          console.log(`[chat] Response received (${reply.length} chars)`);
          // update memory (trim to last 10 turns)
          sess.history.push({ role: "user", content: userText });
          sess.history.push({ role: "assistant", content: reply });
          if (sess.history.length > 20)
            sess.history.splice(0, sess.history.length - 20);

          send(ws, { type: "persona_say", who: "thera", text: reply });
        } catch (llmError: any) {
          console.error("[chat] LLM error:", llmError);
          const errorMsg = llmError?.message || "Failed to get response from AI";
          send(ws, { type: "error", message: errorMsg });
        }
        return;
      }

      if (msg.type === "reset") {
        sess.history = [];
        send(ws, { type: "info", message: "Memory cleared" });
        return;
      }
    } catch (err: any) {
      console.error(err);
      send(ws, { type: "error", message: String(err?.message || err) });
    }
  });

  ws.on("close", () => {
    if (sess.ping) clearInterval(sess.ping);
  });
});
