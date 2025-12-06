# Thai Property Agent - 2 Minute Hackathon Presentation Script

## 🎬 PRESENTATION SCRIPT (2 Minutes)

---

### **[0:00 - 0:15] HOOK & PROBLEM**

> "Imagine moving to Thailand. You don't speak Thai. You need to find a home. Traditional property sites are overwhelming, in Thai only, and you can't ask questions naturally."
>
> "We built **Thai Property Agent** – an AI real estate assistant that speaks both Thai and English, understands what you REALLY need, and finds properties through natural conversation."

---

### **[0:15 - 0:40] LIVE DEMO - Voice & Bilingual AI**

> "Let me show you. I'll speak in Thai..."

🎤 **[Speak into mic]:** *"หาคอนโดใกล้ BTS ราคาไม่เกิน 5 ล้าน"*
*(Translation: Find me a condo near BTS under 5 million baht)*

> "The AI understands Thai numbers, property terms, and even slang. Watch it instantly search our database..."

**[Show property results appearing]**

> "It found 3 matching condos with smart reasoning – explaining WHY each property fits. Not just a list, but personalized recommendations."

---

### **[0:40 - 1:10] KEY FEATURES**

> "What makes this special?"

**🧠 Smart NLP Extraction**
> "Say 'บ้านสองห้องนอนแถวสุขุมวิท' – our AI extracts: house, 2 bedrooms, Sukhumvit. No forms. No filters. Just talk."

**🎤 Full Voice Pipeline**  
> "Speech-to-text recognizes Thai perfectly. ElevenLabs reads responses aloud in fluent Thai. True hands-free property search."

**⚡ Real-Time with Convex**
> "Every message, every search, persisted instantly. Come back tomorrow – your conversation continues."

**🔍 Live Web Search** *(if enabled)*
> "For current market prices, it searches DDProperty, HipFlat, and more in real-time."

---

### **[1:10 - 1:35] TECHNICAL ARCHITECTURE**

> "Built in 24 hours with:"

| Layer | Tech |
|-------|------|
| **AI Brain** | Google Gemini 2.0 Flash |
| **Voice In** | Web Speech API |
| **Voice Out** | ElevenLabs TTS |
| **Backend** | Convex (serverless functions + real-time DB) |
| **Frontend** | Next.js 15 + TypeScript |
| **Search** | Exa semantic search |

> "The secret sauce? A two-stage AI pipeline – one model extracts search criteria from natural language, another generates contextual property recommendations with pricing analysis."

---

### **[1:35 - 1:55] IMPACT & VISION**

> "Thailand has 40 million tourists yearly. Expats struggle finding homes. Real estate agents spend hours on repetitive questions."

> "Thai Property Agent can:"
> - **Serve customers 24/7** in any language
> - **Pre-qualify leads** before human contact
> - **Scale** to thousands of concurrent users

> "We're not replacing agents – we're making them 10x more productive."

---

### **[1:55 - 2:00] CLOSE**

> "Thai Property Agent. Find your home in Thailand – just by talking."
>
> "สวัสดีครับ! 🙏"

---

## 📋 DEMO FLOW CHECKLIST

Before presenting:
- [ ] Open app at `http://localhost:3000`
- [ ] Test microphone permissions
- [ ] Have 2-3 prepared Thai phrases ready
- [ ] Clear chat history for fresh demo

**Backup phrases if voice fails:**
- Type: `หาบ้าน 3 ห้องนอน ราคา 10-15 ล้าน`
- Type: `Show me condos near BTS Phrom Phong`

---

## 🎯 KEY TALKING POINTS

If judges ask questions:

**Q: "How accurate is the Thai language understanding?"**
> "We use Gemini 2.0 which has strong multilingual capabilities. For property terms, we've crafted prompts that map Thai vocabulary like 'ล้านบาท' (million baht) and 'ห้องนอน' (bedrooms) to structured search filters."

**Q: "What's the business model?"**
> "B2B SaaS for real estate agencies. They embed this on their sites to handle initial inquiries, reducing agent workload by 60%."

**Q: "What would you build next?"**
> "Property viewing scheduler with calendar integration, virtual tours via Browserbase automation, and LINE/WhatsApp integration for Thailand's dominant messaging platforms."

---

## ⏱️ TIMING BREAKDOWN

| Segment | Duration | Cumulative |
|---------|----------|------------|
| Hook & Problem | 15s | 0:15 |
| Live Demo | 25s | 0:40 |
| Key Features | 30s | 1:10 |
| Technical Architecture | 25s | 1:35 |
| Impact & Vision | 20s | 1:55 |
| Close | 5s | 2:00 |

---

*Good luck! 🇹🇭✨*

