---
name: Convex-Only Backend
overview: Use Convex as the sole backend for Thai Property Agent. Convex actions will call ElevenLabs TTS and Smithery AI APIs directly. No separate Express backend needed.
todos:
  - id: init-backend
    content: Create package.json and tsconfig.json with Express + TypeScript deps
    status: cancelled
  - id: express-server
    content: Set up Express server entry point with middleware
    status: cancelled
  - id: elevenlabs-service
    content: Create ElevenLabs TTS service and route
    status: cancelled
  - id: smithery-service
    content: Create Smithery AI chat service and route
    status: cancelled
  - id: env-config
    content: Add .env.example and .gitignore
    status: cancelled
  - id: setup-convex
    content: Initialize Convex in frontend and create schema
    status: completed
  - id: convex-queries
    content: Create Convex queries for properties and messages
    status: completed
  - id: convex-mutations
    content: Create Convex mutations for saving messages
    status: completed
  - id: convex-actions
    content: Create Convex actions for ElevenLabs TTS and Smithery AI
    status: completed
  - id: seed-data
    content: Seed Convex with Thai property data
    status: completed
---

# Convex-Only Backend (Updated Plan)

## Overview

Use Convex as the sole backend - no Express server needed. Convex actions will call ElevenLabs and Smithery APIs directly, keeping API keys secure in Convex environment variables.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                Frontend (Next.js)                   │
│  - useQuery() for real-time property/message data   │
│  - useMutation() to save messages                   │
│  - useAction() to trigger TTS and AI chat           │
└───────────────────────────┬─────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────┐
│                   Convex Backend                    │
│                                                     │
│  Queries:                                           │
│  - getProperties() - list/filter properties         │
│  - getMessages() - get conversation messages        │
│                                                     │
│  Mutations:                                         │
│  - saveMessage() - save user/assistant messages     │
│  - createConversation() - start new chat            │
│                                                     │
│  Actions (server-side, can call external APIs):     │
│  - generateSpeech() ─────► ElevenLabs API           │
│  - sendMessage() ────────► Smithery AI API          │
│                                                     │
│  Environment Variables (in Convex Dashboard):       │
│  - ELEVENLABS_API_KEY                               │
│  - ELEVENLABS_VOICE_ID                              │
│  - SMITHERY_API_KEY                                 │
└─────────────────────────────────────────────────────┘
```

## Implementation

### 1. Initialize Convex in Frontend

```bash
cd frontend
npm install convex
npx convex dev
```

### 2. Convex Schema (`frontend/convex/schema.ts`)

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  properties: defineTable({
    name: v.string(),
    location: v.string(),
    price: v.number(),
    type: v.string(),
    bedrooms: v.number(),
    bathrooms: v.number(),
    description_th: v.string(),
    description_en: v.string(),
    imageUrl: v.optional(v.string()),
  }).index("by_location", ["location"]),

  conversations: defineTable({
    sessionId: v.string(),
    createdAt: v.number(),
  }),

  messages: defineTable({
    conversationId: v.id("conversations"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    timestamp: v.number(),
  }).index("by_conversation", ["conversationId"]),
});
```

### 3. Convex Functions Structure

```
frontend/convex/
├── schema.ts           # Database schema
├── properties.ts       # Property queries
├── conversations.ts    # Conversation queries/mutations
├── messages.ts         # Message queries/mutations
├── tts.ts              # ElevenLabs TTS action
├── chat.ts             # Smithery AI action
└── seed.ts             # Seed data script
```

### 4. Environment Variables (Convex Dashboard)

Set these in Convex Dashboard → Settings → Environment Variables:

- `ELEVENLABS_API_KEY` - Your ElevenLabs API key
- `ELEVENLABS_VOICE_ID` - Thai voice ID (e.g., multilingual voice)
- `SMITHERY_API_KEY` - Your Smithery API key

### 5. Key Convex Functions

**Actions** (can make HTTP calls):

- `tts.generate` - Call ElevenLabs API, return audio URL
- `chat.send` - Call Smithery API, return AI response

**Mutations** (write to database):

- `messages.save` - Save a message to conversation
- `conversations.create` - Create new conversation

**Queries** (read from database, real-time):

- `properties.list` - Get all properties (with filters)
- `messages.list` - Get messages for a conversation

## Files to Create

1. `frontend/convex/schema.ts` - Database schema
2. `frontend/convex/properties.ts` - Property queries
3. `frontend/convex/conversations.ts` - Conversation functions
4. `frontend/convex/messages.ts` - Message functions
5. `frontend/convex/tts.ts` - ElevenLabs TTS action
6. `frontend/convex/chat.ts` - Smithery AI action
7. `frontend/convex/seed.ts` - Seed Thai properties

## Benefits of Convex-Only

1. **Simpler architecture** - One backend, one deployment
2. **Real-time by default** - All queries auto-update
3. **Type-safe** - Full TypeScript from DB to frontend
4. **Secure API keys** - Stored in Convex environment
5. **No CORS issues** - Everything goes through Convex
6. **Free tier** - Generous limits for hackathon

## Note on Express Backend

The Express backend in `/backend` folder is no longer needed. You can:

- Delete the `/backend` folder, OR
- Keep it for future use if your friend wants to work on it later