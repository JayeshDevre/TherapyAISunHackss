# Therapy AI — Dual LLM Support (Gemini & Ollama)

An advanced therapy training platform that supports **both cloud (Gemini) and local (Ollama)** LLM providers. Practice therapeutic skills with AI-powered personas that simulate real patient interactions.

**Features:**
- 🧠 **Multiple LLM Providers**: Choose between Google Gemini (cloud) or Ollama (local)
- 👥 **AI Persona System**: Pre-built and custom personas for therapy training
- 📄 **Document Upload**: Generate personas from therapy case documents (PDF/DOCX)
- 🎯 **Practitioner & Student Dashboards**: Track progress and analytics
- 🔒 **Authentication System**: Secure user management
- 💬 **Real-time Chat**: WebSocket-based therapy sessions
- 🛡️ **Crisis Detection**: Automatic detection of crisis keywords with supportive responses

---

## Technology Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **React 18** - UI library
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Icon library
- **WebSocket API** - Real-time bidirectional communication
- **SpeechSynthesis API** - Browser-based text-to-speech

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **TypeScript** - Type-safe development
- **WebSocket (ws)** - Real-time WebSocket server
- **Google Generative AI** - Gemini API integration
- **Ollama** - Local LLM integration
- **Multer** - File upload handling
- **Mammoth** - DOCX document parsing
- **pdf-parse** - PDF document parsing
- **Google Cloud Storage** - Optional cloud storage (with fallback to in-memory)

### AI & ML
- **Google Gemini 2.5 Flash** - Cloud-based LLM
- **Ollama (Llama 3)** - Local LLM option
- **Custom Persona Generation** - AI-powered persona creation from documents

### Infrastructure & Deployment
- **Docker** - Containerization
- **Vercel** - Frontend deployment (configured)
- **Railway** - Backend deployment (configured)
- **Environment Variables** - Configuration management

---

## Architecture Overview

```
┌─────────────────┐         ┌──────────────────┐
│   Next.js App   │◄───────►│  Express Server   │
│   (Port 3000)   │  HTTP   │   (Port 3001)     │
└────────┬────────┘         └─────────┬─────────┘
         │                              │
         │ WebSocket                    │
         │ (Port 8080)                  │
         │                              │
         ▼                              ▼
┌─────────────────┐         ┌──────────────────┐
│  WebSocket      │         │   LLM Provider    │
│  Connection     │         │  (Gemini/Ollama)  │
└─────────────────┘         └───────────────────┘
```

### Component Architecture

**Frontend (Next.js)**
- `TherapyAi.tsx` - Main therapy interface with WebSocket client
- `PractitionerDashboard.tsx` - Analytics and progress tracking
- `StudentDashboard.tsx` - Student-specific features
- `PersonaManagement.tsx` - Persona selection and management
- `PersonaUploadModal.tsx` - Document upload and persona generation

**Backend (Node.js/Express)**
- `index.ts` - Main server with Express API and WebSocket server
- `llm.ts` - LLM provider router (Gemini/Ollama)
- `routes/auth.ts` - Authentication endpoints
- `routes/personas.ts` - Persona management endpoints
- `services/persona-generator.ts` - AI persona generation from documents
- `services/document-parser.ts` - PDF/DOCX parsing
- `services/ollama-llm.ts` - Ollama integration
- `safety.ts` - Crisis detection system

---

## Requirements

- **Node 18+** (or 20+ recommended)
- **For Gemini (Cloud)**: Google Gemini API key (free tier available)
- **For Ollama (Local)**: Ollama installed and running locally  
  Download: https://ollama.com/download

---

## Quick start

### Option A: Using Gemini (Cloud)

1. **Get a Gemini API key**:
   - Visit: https://makersuite.google.com/app/apikey
   - Create a free API key

2. **Set up environment variables**:
   ```bash
   cd server
   # Create .env file
   echo "GEMINI_API_KEY=your_api_key_here" > .env
   echo "LLM_PROVIDER=gemini" >> .env
   ```

3. **Install and start backend**:
   ```bash
   npm install
   npm start
   ```

### Option B: Using Ollama (Local) - Privacy-Focused

1. **Install and pull a model**:
   ```bash
   # Install Ollama from https://ollama.com/download
   ollama --version            # sanity check
   ollama pull llama3          # base LLaMA 3 (8B). Works on CPU; faster with GPU
   ollama list                 # see what you have installed
   ```

2. **Set up environment variables**:
   ```bash
   cd server
   # Create .env file
   echo "LLM_PROVIDER=ollama" > .env
   echo "OLLAMA_MODEL=llama3" >> .env
   echo "OLLAMA_BASE_URL=http://localhost:11434" >> .env
   ```

3. **Start Ollama service** (if not running):
   ```bash
   ollama serve
   ```

4. **Install and start backend**:
   ```bash
   npm install
   npm start
   ```

You should see:
```
[server] API server listening on port 3001
[server] Therapy WS listening on 8080
```

### Environment Variables

**For Gemini:**
- `LLM_PROVIDER=gemini` (default)
- `GEMINI_API_KEY` – Your Google Gemini API key

**For Ollama:**
- `LLM_PROVIDER=ollama`
- `OLLAMA_MODEL` – Model name (default: `llama3`)
- `OLLAMA_BASE_URL` – Ollama service URL (default: `http://localhost:11434`)

**Common:**
- `PORT` – WebSocket port (default: `8080`)
- `API_PORT` – API server port (default: `3001`)

---

### 3) Frontend: start the Next.js app

```bash
cd web
# Create .env.local file
echo "NEXT_PUBLIC_WS_URL=ws://localhost:8080" > .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:3001" >> .env.local

npm install
npm run dev
```

Open http://localhost:3000

**Flow:**
1. Sign in or create an account
2. Choose Practitioner or Student dashboard
3. Select or create a persona
4. Start a therapy session
5. Chat with AI personas in real-time

---

## Project Structure

```
TherapyAISunHacks/
├── server/                          # Backend server
│   ├── index.ts                     # Main server (Express + WebSocket)
│   ├── llm.ts                       # LLM provider router (Gemini/Ollama)
│   ├── safety.ts                    # Crisis detection system
│   ├── routes/
│   │   ├── auth.ts                  # Authentication endpoints
│   │   └── personas.ts              # Persona CRUD operations
│   ├── services/
│   │   ├── auth-interface.ts        # Auth service interface
│   │   ├── fallback-auth.ts         # In-memory authentication
│   │   ├── gcs-service.ts           # Google Cloud Storage auth
│   │   ├── persona-generator.ts     # AI persona generation
│   │   ├── document-parser.ts       # PDF/DOCX parsing
│   │   ├── file-upload.ts           # Multer file handling
│   │   └── ollama-llm.ts            # Ollama integration
│   ├── knowledge-base/
│   │   ├── personas/                # Default persona JSON files
│   │   ├── custom-personas/         # User-generated personas
│   │   └── services/
│   │       └── persona-loader.ts    # Persona loading logic
│   ├── package.json                 # Backend dependencies
│   └── tsconfig.json                # TypeScript config
│
├── web/                              # Frontend application
│   ├── app/
│   │   ├── page.tsx                 # Landing page
│   │   ├── layout.tsx               # Root layout
│   │   └── globals.css              # Global styles
│   ├── components/
│   │   ├── TherapyAi.tsx           # Main therapy interface
│   │   ├── PractitionerDashboard.tsx
│   │   ├── StudentDashboard.tsx
│   │   ├── PersonaManagement.tsx
│   │   └── PersonaUploadModal.tsx
│   ├── package.json                 # Frontend dependencies
│   ├── next.config.js               # Next.js configuration
│   └── tailwind.config.js           # Tailwind CSS config
│
├── docker-compose.yml                # Docker orchestration
├── Dockerfile                        # Docker image definition
├── vercel.json                      # Vercel deployment config
├── .gitignore                       # Git ignore rules
└── README.md                        # This file
```

---

## How It Works

### System Flow

#### 1. **Initialization & Authentication**
- User registers/logs in through the frontend
- Authentication handled by fallback service (in-memory) or GCS (if configured)
- User type (student/practitioner) determines dashboard access

#### 2. **Persona Selection**
- User selects from pre-built personas (Sarah Chen, Marcus Williams, Elena Rodriguez)
- Or uploads a therapy case document (PDF/DOCX)
- Document is parsed and sent to Gemini API to generate a custom persona
- Persona includes: system prompt, few-shot examples, personality traits, speaking patterns

#### 3. **WebSocket Connection**
- Frontend establishes WebSocket connection to `ws://localhost:8080`
- Server sends `ready` message and LLM provider info
- Connection maintained with keep-alive pings every 25 seconds

#### 4. **Therapy Session Flow**

```
User Input → WebSocket → Server Processing → LLM → Response → WebSocket → UI
```

**Detailed Steps:**
1. **User sends message** via chat interface
2. **Frontend** sends `{ type: "text_input", text: "..." }` via WebSocket
3. **Server receives message** and:
   - Echoes message back (`final_stt`) for UI consistency
   - Runs **crisis detection** on user input
   - If crisis keywords detected → returns safety message immediately
   - Otherwise → proceeds to LLM processing
4. **LLM Processing**:
   - Loads selected persona (system prompt + few-shot examples)
   - Prepares conversation history (last 20 turns)
   - Routes to selected LLM provider:
     - **Gemini**: Calls Google Gemini API with persona context
     - **Ollama**: Calls local Ollama service via HTTP
   - Receives AI-generated response in persona's voice
5. **Response Handling**:
   - Server stores conversation in session history
   - Sends `{ type: "persona_say", who: "thera", text: "..." }` to frontend
6. **Frontend Display**:
   - Displays response in chat UI
   - Optionally uses browser `SpeechSynthesis` API for voice output
   - Updates session analytics (message count, duration, etc.)

#### 5. **Persona Generation from Documents**

When a user uploads a therapy case document:

1. **File Upload** → Multer handles file upload to `/uploads`
2. **Document Parsing**:
   - PDF → `pdf-parse` extracts text
   - DOCX → `mammoth` converts to text
3. **Content Validation** → Checks if document contains therapy-related content
4. **AI Generation** → Sends document text to Gemini API with prompt to extract:
   - Patient demographics
   - Presenting concerns
   - Personality traits
   - Speaking patterns
   - System prompt for roleplay
   - Few-shot conversation examples
5. **Persona Storage** → Saves generated persona JSON to `knowledge-base/custom-personas/{userId}/`
6. **Persona Loading** → PersonaLoader retrieves persona data when selected

### LLM Provider Selection
The app automatically uses the provider specified in `LLM_PROVIDER` environment variable:
- **`gemini`** (default): Uses Google Gemini API - better quality, requires API key
- **`ollama`**: Uses local Ollama service - fully private, requires local setup

### Crisis Detection System
- Monitors user input for crisis keywords (suicide, self-harm, etc.)
- Returns immediate supportive safety message
- Does NOT replace professional crisis intervention
- Keywords defined in `server/safety.ts`

---

## WebSocket messages (for reference)

Client → Server
- `{ type: "text_input", text: string }`  
- `{ type: "reset" }` – clears server-side memory

Server → Client
- `{ type: "ready" }`
- `{ type: "info", message }`
- `{ type: "error", message }`
- `{ type: "final_stt", text }` – echoes what you sent (UI consistency)
- `{ type: "persona_say", who: "thera", text }` – model’s reply

---

## Customizing

### Switch LLM Providers
**To use Ollama instead of Gemini:**
```bash
export LLM_PROVIDER=ollama
export OLLAMA_MODEL=llama3
npm start
```

**To switch back to Gemini:**
```bash
export LLM_PROVIDER=gemini
npm start
```

### Switch Ollama Models
- Pull a different model: `ollama pull mistral`
- Set env: `export OLLAMA_MODEL=mistral`
- Restart the server

### Adjust LLM Parameters
**For Ollama** (in `server/services/ollama-llm.ts`):
- `temperature` (0.3–0.8): Lower = more focused, higher = more creative
- `num_predict` (200–500): Response length
- `repeat_penalty` (1.0–1.2): Reduces repetition

**For Gemini** (in `server/llm.ts`):
- `temperature` (0.7–0.9): Response creativity
- `maxOutputTokens` (512–2048): Response length

### Greeting behavior
If a simple “hello” should answer with a short invite (not a long paragraph), use the quick-greet guard shown in our chat and return early before calling the LLM.

### Crisis wording
`server/safety.ts` has a tiny keyword list and a canned response. Adjust both for your use case. This is **not** a substitute for professional triage.

---

## Troubleshooting


### General Issues

**1) The app connects but nothing happens**
- Check backend logs for errors
- Ensure `NEXT_PUBLIC_WS_URL=ws://localhost:8080` in `web/.env.local`
- Verify the LLM provider is correctly set in `server/.env`
- Reload the Next app after changing environment variables

**2) Replies feel generic / off-topic**
- **Ollama**: Lower `temperature` to `0.4–0.5`, raise `repeat_penalty` to `1.12`
- **Gemini**: Lower `temperature` to `0.7`
- Try a stronger model (e.g., `llama3:70b` for Ollama)

**3) Persona not loading**
- Check persona files exist in `server/knowledge-base/personas/`
- Verify persona ID matches the filename
- Check server logs for loading errors

---

## Why choose Ollama vs Gemini?

### Ollama (Local) - Best for:
- ✅ **Complete Privacy**: Conversations never leave your machine
- ✅ **Zero API Costs**: Unlimited usage, no rate limits
- ✅ **Offline Operation**: Works without internet
- ✅ **Data Control**: Full control over your data

### Gemini (Cloud) - Best for:
- ✅ **Better Quality**: More advanced AI model
- ✅ **No Setup**: No need to install/run Ollama
- ✅ **Faster Responses**: Cloud infrastructure
- ✅ **Hackathon Demos**: More impressive for presentations
- ✅ **Cross-Platform**: Works on any device

**Recommendation**: Use **Gemini for hackathons/demos**, **Ollama for production/privacy**.

---

## Roadmap ideas (easy adds)

- **Check-ins**: `/check-in` command that logs mood (1–10) + notes to local storage.
- **Guided tools**: 3-minute breathing, grounding, thought records (CBT), worry time.
- **Export chat**: save a session to a `.txt` file.
- **Voice input**: add local STT with Whisper.cpp and keep everything offline.

---

## Key Technical Features

### 1. **Dual LLM Architecture**
- Provider abstraction allows switching between Gemini and Ollama
- Lazy initialization - only loads selected provider
- Graceful fallback and error handling

### 2. **Real-time Communication**
- WebSocket for bidirectional communication
- Keep-alive mechanism (ping every 25s)
- Session-based conversation history
- Error handling with user-friendly messages

### 3. **Document Processing Pipeline**
- Multi-format support (PDF, DOCX)
- Text extraction and cleaning
- Content validation for therapy cases
- AI-powered persona extraction

### 4. **Persona System**
- JSON-based persona storage
- Dynamic loading from file system
- Custom persona generation via AI
- Few-shot learning examples for consistent responses

### 5. **Security Features**
- Environment variable configuration
- No hardcoded API keys
- Crisis detection system
- Input validation and sanitization

### 6. **Error Handling**
- Comprehensive logging
- User-friendly error messages
- Frontend error display in chat UI
- Graceful degradation


## License and Safety

This is an educational demo. It's **not medical advice** and not a crisis resource. If someone is in immediate danger, contact local emergency services or a trusted person right away.

**Disclaimer**: This application is designed for educational and training purposes only. It should not be used as a substitute for professional mental health services.

---

## Quick Start Commands

### Using Gemini (Recommended)

```bash
# Terminal 1 – Backend
cd server
echo "GEMINI_API_KEY=your_key_here" > .env
echo "LLM_PROVIDER=gemini" >> .env
npm install
npm start

# Terminal 2 – Frontend
cd web
echo "NEXT_PUBLIC_WS_URL=ws://localhost:8080" > .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:3001" >> .env.local
npm install
npm run dev
# Open http://localhost:3000
```

### Using Ollama (Local)

```bash
# Terminal 1 – Start Ollama
ollama pull llama3
ollama serve

# Terminal 2 – Backend
cd server
echo "LLM_PROVIDER=ollama" > .env
echo "OLLAMA_MODEL=llama3" >> .env
npm install
npm start

# Terminal 3 – Frontend
cd web
echo "NEXT_PUBLIC_WS_URL=ws://localhost:8080" > .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:3001" >> .env.local
npm install
npm run dev
# Open http://localhost:3000
```
