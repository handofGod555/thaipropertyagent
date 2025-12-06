# 🏠 Thai Property Agent

**AI-Powered Bilingual Real Estate Assistant**

> Find your dream property in Thailand through natural conversation – in Thai or English, by voice or text.

[![Cursor Hackathon](https://img.shields.io/badge/Cursor%20Hackathon-Chiang%20Mai%202025-gold?style=for-the-badge)](https://cursor.com)
[![Built with Convex](https://img.shields.io/badge/Built%20with-Convex-orange?style=for-the-badge)](https://convex.dev)
[![Powered by Gemini](https://img.shields.io/badge/Powered%20by-Gemini%202.0-blue?style=for-the-badge)](https://ai.google.dev)

---

## ✨ Features

### 🤖 Smart AI Chat
- **Google Gemini 2.0 Flash** for intelligent property recommendations
- Bilingual support (Thai 🇹🇭 & English 🇺🇸)
- Context-aware conversations with smart reasoning
- Explains WHY each property fits your needs

### 🎤 Full Voice Pipeline
- **Speech-to-Text**: Native Thai & English recognition
- **Text-to-Speech**: ElevenLabs for natural Thai voice output
- Hands-free property searching

### 🔍 Smart Property Search
- **NLP-powered criteria extraction** from natural language
- Say "หาคอนโดใกล้ BTS ไม่เกิน 5 ล้าน" → AI understands: condo, near BTS, under ฿5M
- Thai price parsing (ล้านบาท, แสน, etc.)
- Property type recognition (คอนโด, บ้าน, วิลล่า, ทาวน์เฮาส์)

### ⚡ Real-Time Database
- **Convex** for instant data sync
- Persistent conversation history
- Live property updates

### 🌐 Web Search Integration
- **Exa** semantic search for live property listings
- Searches DDProperty, HipFlat, FazWaz, and more
- Real-time market price information

---

## 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| **Frontend** | Next.js 15, React 19, TypeScript |
| **Backend** | Convex (serverless functions + real-time DB) |
| **AI/LLM** | Google Gemini 2.0 Flash |
| **Voice Input** | Web Speech API |
| **Voice Output** | ElevenLabs TTS |
| **Web Search** | Exa AI |
| **Browser Automation** | Browserbase (optional) |
| **Styling** | Tailwind CSS |

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Convex account (free at [convex.dev](https://convex.dev))
- Google AI API key ([ai.google.dev](https://ai.google.dev))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/thaipropertyagent.git
   cd thaipropertyagent
   ```

2. **Install frontend dependencies**
   ```bash
   cd frontend
   npm install
   ```

3. **Set up Convex**
   ```bash
   npx convex dev
   ```
   This will prompt you to create a new Convex project.

4. **Configure environment variables**
   
   In your Convex dashboard, set these environment variables:
   ```
   GOOGLE_AI_API_KEY=your_google_ai_key
   ELEVENLABS_API_KEY=your_elevenlabs_key (optional)
   EXA_API_KEY=your_exa_key (optional)
   ```

5. **Seed the database with sample properties**
   ```bash
   npx convex run seed:seedProperties
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

7. **Open your browser**
   Navigate to `http://localhost:3000`

---

## 📁 Project Structure

```
thaipropertyagent/
├── frontend/
│   ├── convex/              # Convex backend functions
│   │   ├── chat.ts          # AI chat logic with smart search
│   │   ├── conversations.ts # Conversation management
│   │   ├── messages.ts      # Message persistence
│   │   ├── properties.ts    # Property CRUD
│   │   ├── schema.ts        # Database schema
│   │   ├── seed.ts          # Sample property data
│   │   ├── tools.ts         # Web search & browser automation
│   │   └── tts.ts           # Text-to-speech integration
│   ├── src/
│   │   ├── app/             # Next.js app router
│   │   ├── components/      # React components
│   │   │   ├── Chat.tsx     # Main chat interface
│   │   │   ├── MessageBubble.tsx
│   │   │   ├── PropertyCard.tsx
│   │   │   └── VoiceControls.tsx
│   │   └── hooks/           # Custom React hooks
│   │       ├── useElevenLabs.ts
│   │       └── useSpeechRecognition.ts
│   └── package.json
├── backend/                  # Express backend (optional)
├── presentation.html         # Slide deck
└── README.md
```

---

## 🎯 How It Works

### Smart Property Search Pipeline

```
User Message (Thai/English)
         │
         ▼
┌─────────────────────────┐
│  NLP Criteria Extractor │  ← Gemini extracts structured filters
│  (Low temperature)      │     from natural language
└─────────────────────────┘
         │
         ▼
┌─────────────────────────┐
│   Convex Database       │  ← Filtered property query
│   Property Query        │
└─────────────────────────┘
         │
         ▼
┌─────────────────────────┐
│  AI Response Generator  │  ← Gemini with property context
│  (With reasoning)       │     generates personalized response
└─────────────────────────┘
         │
         ▼
    Response + Property Cards
```

### Example Conversations

**Thai:**
```
User: หาคอนโดใกล้ BTS ราคาไม่เกิน 5 ล้าน 2 ห้องนอน
Bot:  พบ 3 คอนโดที่ตรงกับความต้องการครับ! 🎯

      1. The Line Sukhumvit - ฿4.5M
         ✓ ใกล้ BTS พร้อมพงษ์ (3 นาที)
         ✓ 2 ห้องนอน 45 ตร.ม.
         💡 ราคาต่ำกว่าค่าเฉลี่ย 15%
```

**English:**
```
User: I need a house in Chiang Mai with 3 bedrooms under 10 million
Bot:  I found 2 houses matching your criteria! 🏡

      1. Modern Villa Nimman - ฿8.9M
         ✓ 3 BR, 3 BA, 180 sqm
         ✓ Nimman area, walking distance to Maya Mall
         💡 Great value - newly renovated
```

---

## 🔧 Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_AI_API_KEY` | ✅ | Google AI Studio API key for Gemini |
| `ELEVENLABS_API_KEY` | ❌ | ElevenLabs API key for Thai TTS |
| `EXA_API_KEY` | ❌ | Exa API key for web search |
| `BROWSERBASE_API_KEY` | ❌ | Browserbase key for scraping |
| `BROWSERBASE_PROJECT_ID` | ❌ | Browserbase project ID |

### Supported Thai Property Terms

| Thai | English | Search Filter |
|------|---------|---------------|
| คอนโด | Condo | `type: "condo"` |
| บ้าน / บ้านเดี่ยว | House | `type: "house"` |
| วิลล่า | Villa | `type: "villa"` |
| ทาวน์เฮาส์ | Townhouse | `type: "townhouse"` |
| ห้องนอน | Bedrooms | `minBedrooms: N` |
| ใกล้ BTS | Near BTS | `nearBts: true` |
| ใกล้ MRT | Near MRT | `nearMrt: true` |
| ไม่เกิน X ล้าน | Under X million | `maxPrice: X000000` |
| ประมาณ X ล้าน | Around X million | `minPrice/maxPrice` |

---

## 🎨 UI Theme

The interface uses a Thai-inspired color palette:

| Color | Hex | Usage |
|-------|-----|-------|
| Royal Blue | `#1e3a5f` | Primary, headers |
| Gold | `#d4af37` | Accents, buttons |
| Cream | `#f5f0e8` | Backgrounds |

---

## 📝 API Endpoints

### Convex Actions

| Action | Description |
|--------|-------------|
| `chat.send` | Basic chat with AI |
| `chat.sendWithPropertySearch` | Smart search with NLP extraction |
| `chat.sendWithSearch` | Chat with web search integration |
| `tools.searchWeb` | Exa web search |
| `tts.synthesize` | ElevenLabs TTS generation |

---

## 🗺️ Roadmap

- [ ] **LINE Integration** - Connect to Thailand's #1 messaging app
- [ ] **WhatsApp Bot** - For international users
- [ ] **Property Viewing Scheduler** - Calendar integration
- [ ] **Virtual Tours** - Browserbase-powered property walkthroughs
- [ ] **Price Prediction** - ML-based market analysis
- [ ] **Agent Dashboard** - Lead management for real estate agencies

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Built at **Cursor Hackathon Chiang Mai 2025**
- Thanks to [Convex](https://convex.dev) for the amazing real-time database
- Thanks to [Google AI](https://ai.google.dev) for Gemini 2.0
- Thanks to [ElevenLabs](https://elevenlabs.io) for natural Thai voice synthesis
- Thanks to [Exa](https://exa.ai) for semantic search

---

<div align="center">

**Made with ❤️ in Chiang Mai, Thailand 🇹🇭**

[Live Demo](https://thaipropertyagent.vercel.app) · [Report Bug](https://github.com/yourusername/thaipropertyagent/issues) · [Request Feature](https://github.com/yourusername/thaipropertyagent/issues)

</div>
