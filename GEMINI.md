# Real-Time AI Voice Assistant

## 1. Project Overview

Build a full-stack real-time AI voice assistant web application.

The main purpose of this project is to learn and demonstrate:

* React 18
* Vite
* JavaScript ES6+
* React Router
* Zustand
* Radix UI
* Tailwind CSS
* JWT authentication
* WebSocket API
* SSE / EventSource API
* MediaRecorder API
* AssemblyAI SDK
* WebSocket lifecycle management
* Streaming state management
* Python 3.11+
* FastAPI
* Pydantic
* SQLAlchemy
* PostgreSQL
* Async Python
* Gemini API
* Docker and Docker Compose

The application should be built as a real production-style project, but kept simple enough to understand and maintain.

---

# 2. Main User Experience

When a user opens the application:

1. User registers or logs in.
2. User is authenticated using JWT.
3. User enters the dashboard.
4. User creates a new voice session.
5. User starts recording.
6. The browser captures microphone audio using the MediaRecorder API.
7. Audio chunks are streamed from React to FastAPI through WebSocket.
8. FastAPI streams the audio to AssemblyAI.
9. AssemblyAI returns live transcription.
10. FastAPI sends transcription events back to the browser through WebSocket.
11. React displays the transcript in real time.
12. When the session ends, the transcript is saved.
13. The user can request AI analysis.
14. FastAPI sends the transcript to Gemini.
15. Gemini's response is streamed back to the frontend using Server-Sent Events (SSE).
16. React displays the AI response progressively.
17. The user can view previous sessions and their AI analysis.

Basic flow:

```
User
  ↓
React
  ↓
MediaRecorder
  ↓
WebSocket
  ↓
FastAPI
  ↓
AssemblyAI
  ↓
Live Transcript
  ↓
FastAPI
  ↓
WebSocket
  ↓
React + Zustand
```

For AI analysis:

```
React
  ↓
FastAPI
  ↓
Gemini API
  ↓
Streaming response
  ↓
SSE
  ↓
React + Zustand
```

---

# 3. Important Learning Goal

Do not treat this project as just another CRUD application.

The main goal is to understand real-time and streaming architecture.

The project should demonstrate the difference between:

Traditional REST:

```
Client → Request → Server → Response
```

Real-time WebSocket:

```
Client ←→ Server
Connection remains open
Both sides can send data
```

SSE:

```
Server → Client
Connection remains open
Server continuously sends events
```

Audio streaming:

```
Microphone
    ↓
Audio chunks
    ↓
WebSocket
    ↓
FastAPI
    ↓
AssemblyAI
```

AI streaming:

```
Gemini
    ↓
Tokens/chunks
    ↓
FastAPI
    ↓
SSE
    ↓
React
```

---

# 4. Frontend Stack

Use:

* React 18
* Vite
* JavaScript ES6+
* React Router
* Zustand
* Radix UI
* Tailwind CSS
* Native WebSocket API
* Native EventSource API
* Native MediaRecorder API

Do not introduce unnecessary frontend frameworks.

Avoid Redux because this project is specifically intended to learn Zustand.

---

# 5. Backend Stack

Use:

* Python 3.11+
* FastAPI
* Pydantic
* SQLAlchemy 2.x
* PostgreSQL
* Async Python
* asyncpg
* JWT authentication
* Gemini API
* AssemblyAI SDK

All database operations should use asynchronous SQLAlchemy.

Use FastAPI dependency injection for database sessions and authentication.

---

# 6. Infrastructure

Use Docker.

The project should run using Docker Compose.

Expected services:

```
frontend
backend
postgres
```

If the frontend is configured for development, Vite may run with its development server.

The backend should run with Uvicorn.

PostgreSQL should use a Docker volume so database data survives container restarts.

Do not require the user to install PostgreSQL directly on their machine.

---

# 7. Project Structure

Use this general structure:

```
ai-voice-assistant/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── layouts/
│   │   ├── hooks/
│   │   ├── stores/
│   │   │   ├── authStore.js
│   │   │   ├── sessionStore.js
│   │   │   └── voiceStore.js
│   │   ├── services/
│   │   │   ├── api.js
│   │   │   ├── websocket.js
│   │   │   └── sse.js
│   │   ├── router/
│   │   ├── App.jsx
│   │   └── main.jsx
│   │
│   ├── package.json
│   ├── vite.config.js
│   └── Dockerfile
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth.py
│   │   │   ├── sessions.py
│   │   │   ├── voice.py
│   │   │   └── analysis.py
│   │   │
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   ├── database.py
│   │   │   └── security.py
│   │   │
│   │   ├── models/
│   │   │   ├── user.py
│   │   │   ├── session.py
│   │   │   ├── transcript.py
│   │   │   └── analysis.py
│   │   │
│   │   ├── schemas/
│   │   ├── services/
│   │   │   ├── auth_service.py
│   │   │   ├── session_service.py
│   │   │   ├── assemblyai_service.py
│   │   │   └── gemini_service.py
│   │   │
│   │   └── main.py
│   │
│   ├── requirements.txt
│   └── Dockerfile
│
├── .env
├── .env.example
├── .gitignore
├── docker-compose.yml
└── GEMINI.md
```

Keep the structure understandable. Do not create unnecessary layers or files.

---

# 8. Database Design

Use PostgreSQL.

## users

Fields:

* id
* email
* password_hash
* created_at

## sessions

Fields:

* id
* user_id
* title
* status
* started_at
* ended_at
* created_at

Possible status values:

* created
* active
* completed

## transcripts

Fields:

* id
* session_id
* speaker
* content
* is_final
* timestamp
* created_at

Possible speakers:

* user
* assistant

## analyses

Fields:

* id
* session_id
* summary
* strengths
* weaknesses
* suggestions
* created_at

Use SQLAlchemy relationships where appropriate.

---

# 9. Authentication

Use JWT authentication.

Required functionality:

* Register
* Login
* Get current user
* Protected routes
* Logout on frontend

Backend should:

1. Receive email/password.
2. Hash password before storing.
3. Verify password during login.
4. Generate JWT.
5. Validate JWT on protected endpoints.
6. Retrieve the authenticated user.

Frontend should maintain authentication state using Zustand.

Create an auth store containing appropriate state such as:

```
user
token
isAuthenticated
```

Do not store passwords.

---

# 10. WebSocket Architecture

The voice session should use WebSocket.

Example endpoint:

```
/ws/sessions/{session_id}
```

Expected lifecycle:

```
CONNECTING
    ↓
CONNECTED
    ↓
STREAMING
    ↓
STOPPING
    ↓
CLOSED
```

Handle:

* connection
* authentication
* audio streaming
* incoming events
* errors
* client disconnect
* server disconnect
* cleanup
* reconnect where appropriate

Do not leave WebSocket connections running after the session ends.

Always clean up:

* MediaRecorder
* microphone stream
* WebSocket
* timers/listeners
* related state

---

# 11. MediaRecorder

Use the browser's native MediaRecorder API.

The frontend should:

1. Request microphone permission.
2. Create a MediaStream.
3. Create a MediaRecorder.
4. Start recording.
5. Receive audio chunks.
6. Send chunks through WebSocket.
7. Stop recording.
8. Stop microphone tracks.

Do not upload one large audio file for the primary real-time flow.

The purpose is to learn streaming audio.

---

# 12. AssemblyAI

Use AssemblyAI for real-time speech-to-text.

Expected flow:

```
MediaRecorder
    ↓
Audio chunk
    ↓
Browser WebSocket
    ↓
FastAPI
    ↓
AssemblyAI streaming connection
    ↓
Partial/final transcript
    ↓
FastAPI
    ↓
Browser WebSocket
    ↓
Zustand
    ↓
React UI
```

The application should distinguish between:

```
partial transcript
```

and:

```
final transcript
```

Partial transcript is temporary and can change.

Final transcript should be stored as a completed transcript segment.

Keep AssemblyAI-specific logic inside:

```
backend/app/services/assemblyai_service.py
```

Do not put AssemblyAI logic directly inside the WebSocket route.

---

# 13. Streaming State Management

Use Zustand for real-time frontend state.

The voice store should manage concepts such as:

```
connectionStatus
isRecording
isProcessing
partialTranscript
finalTranscripts
error
```

Example connection states:

```
disconnected
connecting
connected
reconnecting
error
```

Do not put every piece of application state into one huge Zustand store.

Keep authentication, sessions, and voice streaming logically separated.

---

# 14. SSE / EventSource

Use SSE for streaming Gemini responses.

Example endpoint:

```
GET /sessions/{session_id}/analysis/stream
```

Frontend:

```
EventSource
    ↓
SSE events
    ↓
Zustand
    ↓
React UI
```

The AI response should appear progressively instead of waiting for the complete response.

For example:

```
"The"
"The candidate"
"The candidate demonstrated"
"The candidate demonstrated strong..."
```

The UI should update as new content arrives.

Handle:

* connection
* message
* error
* completion
* cleanup

Close EventSource when streaming finishes or when the component unmounts.

---

# 15. Gemini

Use Gemini for analyzing completed transcripts.

Gemini should produce useful information such as:

* summary
* key topics
* strengths
* weaknesses
* suggestions
* follow-up questions

Keep Gemini-specific logic inside:

```
backend/app/services/gemini_service.py
```

Do not call Gemini directly from React.

API keys must remain on the backend.

Never expose Gemini or AssemblyAI secret keys to the frontend.

---

# 16. REST API

Use REST APIs for normal application operations.

Examples:

```
POST   /auth/register
POST   /auth/login
GET    /auth/me

POST   /sessions
GET    /sessions
GET    /sessions/{id}
DELETE /sessions/{id}
```

Use WebSocket for real-time voice communication.

Use SSE for streaming AI analysis.

This separation is important.

---

# 17. Frontend Pages

Create:

### Login

User logs in.

### Register

User creates an account.

### Dashboard

Show:

* number of sessions
* recent sessions
* create session button

### Sessions

Show previous sessions.

### Live Session

Show:

* connection status
* recording status
* microphone button
* live transcript
* stop session button

### Session Details

Show:

* complete transcript
* session information
* AI analysis
* summary
* strengths
* weaknesses
* suggestions

---

# 18. UI Requirements

Use Tailwind CSS for styling.

Use Radix UI where appropriate.

Examples:

* Dialog
* AlertDialog
* DropdownMenu
* Tabs
* Toast
* Tooltip

Keep the UI clean and simple.

Do not spend excessive time on visual design before the functionality works.

The realtime status should be visually obvious.

For example:

```
Connected
Recording
Reconnecting
Disconnected
```

---

# 19. Error Handling

The application should handle common failures.

Frontend:

* microphone permission denied
* WebSocket connection failure
* WebSocket disconnection
* SSE failure
* API errors
* authentication failure

Backend:

* invalid JWT
* missing session
* unauthorized session access
* database errors
* AssemblyAI errors
* Gemini errors
* WebSocket disconnect

Never expose secret keys or internal stack traces to users.

---

# 20. Security Rules

Never expose:

* JWT signing secret
* Gemini API key
* AssemblyAI API key
* database credentials

Frontend environment variables must only contain values safe to expose to the browser.

Backend secrets belong in `.env`.

`.env` must be included in `.gitignore`.

Provide `.env.example` without real secrets.

---

# 21. Docker

The project must be runnable using:

```
docker compose up --build
```

Docker Compose should provide:

```
frontend
backend
postgres
```

Backend should communicate with PostgreSQL using the Docker service name, not localhost.

Example:

```
postgresql+asyncpg://postgres:postgres@postgres:5432/ai_voice
```

Do not use:

```
@localhost
```

from inside the backend container.

---

# 22. Development Rules

Keep the code simple and readable.

Prefer:

* small functions
* clear names
* async/await
* type hints in Python
* Pydantic schemas
* service separation
* reusable React components
* Zustand stores for shared state

Avoid:

* unnecessary abstractions
* unnecessary dependencies
* over-engineering
* duplicated code
* putting business logic directly in React components
* putting third-party API logic directly in route handlers

---

# 23. Important Architecture Rule

Use the following responsibility separation.

Frontend:

```
UI
↓
Zustand
↓
API / WebSocket / SSE services
```

Backend:

```
Route
↓
Service
↓
Database / External API
```

For example:

```
voice.py
    ↓
assemblyai_service.py
    ↓
AssemblyAI
```

And:

```
analysis.py
    ↓
gemini_service.py
    ↓
Gemini
```

---

# 24. Project Phases

Build the application incrementally.

Do not implement all phases at once.

## Phase 1 — Project Setup

Build:

* repository structure
* React + Vite
* FastAPI
* PostgreSQL
* Docker Compose
* environment variables
* basic frontend/backend connection

Goal:

All containers start successfully and frontend can communicate with backend.

---

## Phase 2 — Authentication

Build:

* user model
* registration
* login
* password hashing
* JWT
* current-user endpoint
* frontend auth store
* protected routes

Goal:

A user can register, login, and access the dashboard only when authenticated.

---

## Phase 3 — Session Management

Build:

* session model
* session CRUD
* session service
* session pages
* Zustand session store

Goal:

Authenticated users can create and manage voice sessions.

---

## Phase 4 — Basic WebSocket

Before adding audio, build a simple WebSocket connection.

Build:

* WebSocket endpoint
* React WebSocket client
* connection states
* send/receive test messages
* disconnect handling

Goal:

Understand WebSocket lifecycle management before introducing audio.

---

## Phase 5 — MediaRecorder

Build:

* microphone permission
* MediaRecorder
* start recording
* stop recording
* audio chunks
* cleanup

Initially do not connect AssemblyAI.

Goal:

Understand how browser audio streaming works.

---

## Phase 6 — WebSocket Audio Streaming

Connect:

```
MediaRecorder
    ↓
WebSocket
    ↓
FastAPI
```

Build:

* binary audio messages
* audio streaming
* connection lifecycle
* cleanup
* errors

Goal:

Successfully stream microphone audio from browser to FastAPI.

---

Phase 7 — AssemblyAI Realtime Transcription

Integrate the current AssemblyAI Streaming Speech-to-Text API.

Use the current v3 WebSocket endpoint:

wss://streaming.assemblyai.com/v3/ws

Use connection parameters such as:

sample_rate=16000
speech_model=u3-rt-pro

The resulting URL can be:

wss://streaming.assemblyai.com/v3/ws?sample_rate=16000&speech_model=u3-rt-pro

Build:

AssemblyAI streaming connection
server-side AssemblyAI authentication
FastAPI → AssemblyAI audio forwarding
AssemblyAI → FastAPI transcript handling
partial transcript handling
final transcript handling
normalized application transcript events
FastAPI → browser WebSocket transcript events
frontend transcript display
graceful AssemblyAI termination
error handling
cleanup

Architecture:

Browser
   │
   │ PCM16 binary audio
   ▼
FastAPI WebSocket
   │
   │ PCM16 binary audio
   ▼
AssemblyAI WebSocket
   │
   │ Turn events
   ▼
FastAPI
   │
   │ normalized transcript events
   ▼
Browser
   │
   ▼
Zustand
   │
   ▼
React UI

AssemblyAI transcript handling:

Turn
  ↓
end_of_turn = false
  ↓
partial transcript

Turn
  ↓
end_of_turn = true
  ↓
final transcript

Do not duplicate partial transcript text in the final transcript list.

When a final turn arrives:

Replace/clear the current partial transcript.
Add the final transcript to the final transcript collection.
Persist the final transcript to PostgreSQL if appropriate.

Use the official AssemblyAI documentation as the source of truth for the current API behavior.

Do not use old v2 examples or the old endpoint:

wss://api.assemblyai.com/v2/realtime/ws

Goal:

The user speaks into the microphone and sees their speech appear as a live transcript in the application.

---

## Phase 8 — Streaming State Management

Improve Zustand.

Build:

* voiceStore
* connection status
* recording status
* partial transcript
* final transcript
* errors
* reconnecting state

Goal:

Understand how a frontend manages continuously changing realtime state.

---

## Phase 9 — SSE / EventSource

Build a simple SSE endpoint first without Gemini.

The backend should send multiple events over time.

Frontend should consume them with EventSource.

Goal:

Understand SSE independently before combining it with AI.

---

## Phase 10 — Gemini Streaming

Integrate Gemini.

Build:

* Gemini service
* transcript analysis
* streaming Gemini response
* SSE endpoint
* EventSource frontend client
* streaming AI UI

Goal:

Gemini's response appears progressively in the browser.

---

## Phase 11 — Save AI Analysis

Build:

* analysis model
* database persistence
* session analysis endpoint
* analysis UI

Goal:

Users can return later and see previous AI analysis.

---

## Phase 12 — Production Improvements

Add:

* better error handling
* WebSocket reconnect strategy
* connection cleanup
* loading states
* empty states
* better authentication handling
* logging
* API validation
* Docker improvements
* database migrations with Alembic

Do not add production complexity before the basic system works.

---

# 25. How Gemini/Antigravity Should Work

Implement the project one phase at a time.

When the user provides:

```
"Phase 1"
```

Only implement Phase 1.

Do not automatically implement Phase 2.

After completing a phase:

1. Explain what was created.
2. List the important files.
3. Explain how to run it.
4. Explain how to test it.
5. Mention any important concepts learned.
6. Stop and wait for the next phase.

Do not silently implement future phases.

If a phase depends on something missing from a previous phase, explain the dependency before making changes.

---

# 26. Coding Style

Python:

* Python 3.11+
* async/await
* type hints
* Pydantic
* SQLAlchemy 2.x style
* FastAPI dependency injection

JavaScript:

* ES6+
* functional React components
* hooks
* async/await
* clean Zustand stores
* avoid unnecessary class-based code

Use clear names.

Prefer understandable code over clever code.

---

# 27. API Keys

Use environment variables.

Backend `.env`:

```
DATABASE_URL=...
JWT_SECRET=...
GEMINI_API_KEY=...
ASSEMBLYAI_API_KEY=...
```

Never hardcode these values.

Never send these values to the frontend.

---

# 28. Testing Philosophy

Each phase must be tested before moving to the next phase.

Examples:

Phase 1:

```
frontend → backend → database
```

Phase 2:

```
register → login → JWT → protected route
```

Phase 4:

```
browser → WebSocket → FastAPI → browser
```

Phase 5:

```
microphone → MediaRecorder → audio chunks
```

Phase 7:

```
microphone → WebSocket → FastAPI → AssemblyAI → transcript
```

Phase 10:

```
transcript → Gemini → SSE → React
```

Do not assume a phase works just because the code compiles.

---

# 29. Final Architecture

The completed system should look like:

```
                     ┌──────────────┐
                     │  PostgreSQL  │
                     └──────▲───────┘
                            │
                            │
```

┌─────────────┐          ┌──────┴───────┐
│   React     │          │   FastAPI    │
│             │          │              │
│  Zustand    │◄────────►│ REST API     │
│             │          │              │
│ MediaRecorder│◄───────►│ WebSocket    │
│             │          │              │
│ EventSource │◄─────────│ SSE          │
└─────────────┘          └──────┬───────┘
│
┌───────────┴───────────┐
│                       │
┌─────▼─────┐          ┌──────▼──────┐
│ AssemblyAI│          │    Gemini   │
│            │          │             │
│ Speech →   │          │ Transcript  │
│ Text       │          │ → Analysis  │
└────────────┘          └─────────────┘

The completed application should demonstrate a clear understanding of:

* REST APIs
* JWT authentication
* PostgreSQL
* SQLAlchemy
* FastAPI async programming
* WebSockets
* WebSocket lifecycle management
* MediaRecorder
* real-time speech-to-text
* AssemblyAI streaming
* SSE
* EventSource
* Gemini streaming
* Zustand
* streaming state management
* Docker
* frontend/backend architecture
