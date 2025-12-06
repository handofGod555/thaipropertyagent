import { action, internalQuery, query } from "./_generated/server";
import { v } from "convex/values";
import { internal, api } from "./_generated/api";

// Type for extracted search criteria
interface PropertySearchCriteria {
  hasSearchIntent: boolean;
  type?: string;
  minPrice?: number;
  maxPrice?: number;
  location?: string;
  district?: string;
  minBedrooms?: number;
  nearBts?: boolean;
  nearMrt?: boolean;
}

// System prompt for extracting structured search criteria
const EXTRACTION_SYSTEM_PROMPT = `You are a property search criteria extractor. Analyze the user's message and conversation history to extract property search requirements.

Output ONLY valid JSON with this exact structure:
{
  "hasSearchIntent": boolean,  // true if user is looking for/asking about properties
  "type": string | null,       // "condo", "house", "villa", "townhouse", or null
  "minPrice": number | null,   // minimum price in Thai Baht
  "maxPrice": number | null,   // maximum price in Thai Baht
  "location": string | null,   // area name like "Bangkok", "Sukhumvit", "Silom"
  "district": string | null,   // district name like "Sathorn", "Phrom Phong"
  "minBedrooms": number | null,
  "nearBts": boolean | null,   // true if user wants near BTS
  "nearMrt": boolean | null    // true if user wants near MRT
}

Thai price patterns:
- "ไม่เกิน 5 ล้าน" = maxPrice: 5000000
- "3-5 ล้านบาท" = minPrice: 3000000, maxPrice: 5000000
- "มากกว่า 10 ล้าน" = minPrice: 10000000
- "ประมาณ 2 ล้าน" = minPrice: 1800000, maxPrice: 2200000

Thai property terms:
- คอนโด = condo
- บ้าน/บ้านเดี่ยว = house  
- วิลล่า = villa
- ทาวน์เฮาส์ = townhouse
- หอพัก/อพาร์ทเมนต์/ห้องเช่า = condo (map to condo as closest type)
- ใกล้ BTS / ใกล้รถไฟฟ้า = nearBts: true
- ใกล้ MRT = nearMrt: true
- ห้องนอน = bedrooms

Thai location shortcuts:
- มช. / มหาวิทยาลัยเชียงใหม่ / CMU = location: "Chiang Mai", district: "Suthep" or "Nimman"
- จุฬา / CU = location: "Bangkok", district: "Pathumwan"
- ธรรมศาสตร์ / TU = location: "Bangkok", district: "Rangsit"

Examples:
User: "หาคอนโดใกล้ BTS ราคาไม่เกิน 5 ล้าน"
Output: {"hasSearchIntent":true,"type":"condo","maxPrice":5000000,"nearBts":true}

User: "สวัสดีครับ"
Output: {"hasSearchIntent":false}

User: "มีบ้าน 3 ห้องนอนแถวสุขุมวิทไหม"
Output: {"hasSearchIntent":true,"type":"house","minBedrooms":3,"location":"Sukhumvit"}

IMPORTANT: Output ONLY the JSON object, no explanation or other text.`;

// Default system prompt for Thai Property Agent
const DEFAULT_SYSTEM_PROMPT = `คุณเป็นตัวแทนอสังหาริมทรัพย์ไทยที่เป็นมิตรและมีความรู้ (You are a friendly and knowledgeable Thai real estate agent assistant)

## Core Behaviors:
- Respond in the same language the user writes in (Thai or English)
- Be knowledgeable about Thai real estate markets (Bangkok, Chiang Mai, Phuket, etc.)
- Be friendly, professional, and HELPFUL like a trusted advisor
- Use Thai Baht (฿ or THB) for prices

## SMART REASONING - Your Key Differentiator:
When recommending properties, ALWAYS explain your reasoning:

1. **Match Reasoning**: Explain WHY each property fits the user's needs
   - "This matches your need for BTS access - it's only 3 minutes walk to Phrom Phong station"
   - "Perfect for your budget - at ฿2.8M, you'll have room for renovation"

2. **Lifestyle Fit**: Consider their implied lifestyle
   - Working professional → emphasize commute time, nearby amenities
   - Family → emphasize space, schools, safety
   - Investor → emphasize rental yield, appreciation potential

3. **Trade-off Analysis**: Be honest about pros and cons
   - "While it's slightly above budget, the BTS proximity could save you ฿5,000/month in transport"
   - "It's a bit smaller, but the location premium is worth it for Sukhumvit"

4. **Confidence Level**: Express how confident you are
   - "I'm very confident this is a great match because..."
   - "This could work, though you might also want to consider..."

5. **Proactive Suggestions**: End with helpful next steps
   - "Would you like me to compare these two options?"
   - "Should I look for similar properties in a nearby area?"

## Property Knowledge:
- คอนโด = Condo
- บ้านเดี่ยว = Detached house  
- ทาวน์เฮาส์ = Townhouse
- ใกล้ BTS = Near BTS
- ตารางเมตร = Square meters (sqm)

## Response Style:
- Be conversational, not robotic
- Use occasional Thai expressions for warmth (ครับ/ค่ะ, นะคะ)
- Keep responses focused but thorough
- Always give actionable recommendations`;

// System prompt for tool-enabled chat
const TOOL_ENABLED_SYSTEM_PROMPT = `${DEFAULT_SYSTEM_PROMPT}

## Available Tools:
You have access to the following tools to help answer user questions:

1. **Web Search** - Search for live property listings online
   - Use this when users ask about current market prices, specific properties not in database, or latest listings
   - Indicate when you need to search by including [SEARCH: your search query] in your response

2. **Property Database** - Access to stored property listings (already included in context)

When you need to search the web for information, include the search request in your response.
The system will automatically perform the search and provide results.`;

// Internal query to get properties for context
export const getPropertiesForContext = internalQuery({
  args: {},
  handler: async (ctx) => {
    const properties = await ctx.db.query("properties").take(20);
    return properties.map((p) => ({
      id: p._id,
      name: p.name,
      location: p.location,
      district: p.district,
      price: p.price,
      type: p.type,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      area: p.area,
      nearBts: p.nearBts,
      nearMrt: p.nearMrt,
      description_en: p.description_en,
      description_th: p.description_th,
    }));
  },
});

// Internal query to get filtered properties based on search criteria
export const getFilteredProperties = internalQuery({
  args: {
    type: v.optional(v.string()),
    minPrice: v.optional(v.number()),
    maxPrice: v.optional(v.number()),
    location: v.optional(v.string()),
    district: v.optional(v.string()),
    minBedrooms: v.optional(v.number()),
    nearBts: v.optional(v.boolean()),
    nearMrt: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let properties = await ctx.db.query("properties").collect();

    // Apply filters
    if (args.type) {
      properties = properties.filter(
        (p) => p.type.toLowerCase() === args.type!.toLowerCase()
      );
    }

    if (args.location) {
      properties = properties.filter(
        (p) => p.location.toLowerCase().includes(args.location!.toLowerCase())
      );
    }

    if (args.district) {
      properties = properties.filter(
        (p) => p.district.toLowerCase().includes(args.district!.toLowerCase())
      );
    }

    if (args.minPrice !== undefined) {
      properties = properties.filter((p) => p.price >= args.minPrice!);
    }

    if (args.maxPrice !== undefined) {
      properties = properties.filter((p) => p.price <= args.maxPrice!);
    }

    if (args.minBedrooms !== undefined) {
      properties = properties.filter((p) => p.bedrooms >= args.minBedrooms!);
    }

    if (args.nearBts === true) {
      properties = properties.filter((p) => p.nearBts && p.nearBts.length > 0);
    }

    if (args.nearMrt === true) {
      properties = properties.filter((p) => p.nearMrt && p.nearMrt.length > 0);
    }

    return properties.map((p) => ({
      id: p._id,
      name: p.name,
      location: p.location,
      district: p.district,
      price: p.price,
      type: p.type,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      area: p.area,
      nearBts: p.nearBts,
      nearMrt: p.nearMrt,
      description_en: p.description_en,
      description_th: p.description_th,
    }));
  },
});

// Helper to convert OpenAI-style messages to Google Gemini format
function convertToGeminiFormat(
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>
): Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> {
  const geminiMessages: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];
  let systemPrompt = "";

  for (const msg of messages) {
    if (msg.role === "system") {
      // Accumulate system prompts to prepend to first user message
      systemPrompt += (systemPrompt ? "\n\n" : "") + msg.content;
    } else if (msg.role === "user") {
      // Prepend system prompt to first user message if exists
      const text = systemPrompt ? `${systemPrompt}\n\n${msg.content}` : msg.content;
      geminiMessages.push({ role: "user", parts: [{ text }] });
      systemPrompt = ""; // Clear after using
    } else if (msg.role === "assistant") {
      geminiMessages.push({ role: "model", parts: [{ text: msg.content }] });
    }
  }

  return geminiMessages;
}

// Helper to extract search requests from AI response
function extractSearchRequests(text: string): string[] {
  const searchPattern = /\[SEARCH:\s*([^\]]+)\]/gi;
  const matches: string[] = [];
  let match;
  while ((match = searchPattern.exec(text)) !== null) {
    matches.push(match[1].trim());
  }
  return matches;
}

// Send message to AI and get response
export const send = action({
  args: {
    message: v.string(),
    conversationHistory: v.optional(
      v.array(
        v.object({
          role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
          content: v.string(),
        })
      )
    ),
    systemPrompt: v.optional(v.string()),
    includeProperties: v.optional(v.boolean()),
    enableWebSearch: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.GOOGLE_AI_API_KEY;

    if (!apiKey) {
      throw new Error("GOOGLE_AI_API_KEY not configured in Convex environment");
    }

    if (!args.message || args.message.trim().length === 0) {
      throw new Error("Message is required");
    }

    // Determine system prompt based on tool availability
    const useToolPrompt = args.enableWebSearch && !!process.env.EXA_API_KEY;
    let systemContent = args.systemPrompt || (useToolPrompt ? TOOL_ENABLED_SYSTEM_PROMPT : DEFAULT_SYSTEM_PROMPT);

    if (args.includeProperties !== false) {
      // Get properties for context
      const properties = await ctx.runQuery(internal.chat.getPropertiesForContext);

      if (properties.length > 0) {
        const propertyContext = properties
          .map(
            (p) =>
              `- ${p.name} (${p.type}): ${p.location}, ${p.district}, ฿${p.price.toLocaleString()}, ${p.bedrooms}BR/${p.bathrooms}BA, ${p.area}sqm${p.nearBts ? `, near BTS ${p.nearBts}` : ""}${p.nearMrt ? `, near MRT ${p.nearMrt}` : ""}`
          )
          .join("\n");

        systemContent += `\n\n## Available Properties in Database:\n${propertyContext}`;
      }
    }

    // Build messages array (OpenAI-style first, then convert)
    const messages: Array<{ role: "user" | "assistant" | "system"; content: string }> = [
      { role: "system", content: systemContent },
      ...(args.conversationHistory || []),
      { role: "user", content: args.message },
    ];

    // Convert to Gemini format
    const geminiContents = convertToGeminiFormat(messages);

    // Google Gemini API endpoint - using gemini-2.0-flash (latest model)
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: geminiContents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1000,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Google AI API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      // Extract response from Gemini format
      let assistantMessage = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

      if (!assistantMessage) {
        // Check for safety blocks or other issues
        const blockReason = data.candidates?.[0]?.finishReason;
        if (blockReason === "SAFETY") {
          throw new Error("Response was blocked due to safety settings");
        }
        throw new Error("No response received from AI");
      }

      // Check if AI requested any web searches
      const searchRequests = extractSearchRequests(assistantMessage);
      let searchResults: Array<{ query: string; results: unknown[] }> = [];

      if (searchRequests.length > 0 && process.env.EXA_API_KEY) {
        // Perform web searches
        for (const query of searchRequests) {
          const result = await ctx.runAction(api.tools.searchWeb, {
            query: `Thailand property ${query}`,
            numResults: 3,
            includeText: true,
          });
          if (result.success) {
            searchResults.push({ query, results: result.results });
          }
        }

        // If we got search results, ask AI to incorporate them
        if (searchResults.length > 0) {
          const searchContext = searchResults
            .map(
              (sr) =>
                `Search results for "${sr.query}":\n${(sr.results as Array<{ title: string; url: string; snippet: string }>)
                  .map((r) => `- ${r.title}: ${r.snippet} (${r.url})`)
                  .join("\n")}`
            )
            .join("\n\n");

          // Make a follow-up call with search results
          const followUpMessages = [
            ...geminiContents,
            { role: "model" as const, parts: [{ text: assistantMessage }] },
            {
              role: "user" as const,
              parts: [
                {
                  text: `Here are the web search results:\n\n${searchContext}\n\nPlease provide an updated response incorporating this information. Remove the [SEARCH:] markers and provide a complete answer.`,
                },
              ],
            },
          ];

          const followUpResponse = await fetch(apiUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: followUpMessages,
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 1500,
              },
            }),
          });

          if (followUpResponse.ok) {
            const followUpData = await followUpResponse.json();
            const updatedMessage =
              followUpData.candidates?.[0]?.content?.parts?.[0]?.text;
            if (updatedMessage) {
              assistantMessage = updatedMessage;
            }
          }
        }
      }

      // Clean up any remaining search markers
      assistantMessage = assistantMessage.replace(/\[SEARCH:[^\]]+\]/gi, "").trim();

      return {
        message: assistantMessage,
        conversationId: data.usageMetadata?.promptTokenCount?.toString() || "gemini",
        metadata: {
          model: "gemini-2.0-flash",
          usage: {
            prompt_tokens: data.usageMetadata?.promptTokenCount,
            completion_tokens: data.usageMetadata?.candidatesTokenCount,
            total_tokens: data.usageMetadata?.totalTokenCount,
          },
          searchesPerformed: searchResults.length,
        },
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Chat failed: ${error.message}`);
      }
      throw error;
    }
  },
});

// Send message with explicit web search
export const sendWithSearch = action({
  args: {
    message: v.string(),
    searchQuery: v.optional(v.string()),
    conversationHistory: v.optional(
      v.array(
        v.object({
          role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
          content: v.string(),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.GOOGLE_AI_API_KEY;

    if (!apiKey) {
      throw new Error("GOOGLE_AI_API_KEY not configured in Convex environment");
    }

    // First, perform web search if requested
    let searchContext = "";
    if (args.searchQuery || args.message.toLowerCase().includes("search") || args.message.toLowerCase().includes("find online")) {
      const searchTerm = args.searchQuery || args.message;
      const searchResult = await ctx.runAction(api.tools.searchWeb, {
        query: `Thailand property ${searchTerm}`,
        numResults: 5,
        includeText: true,
      });

      if (searchResult.success && searchResult.results.length > 0) {
        searchContext = `\n\n## Web Search Results for "${searchTerm}":\n${
          (searchResult.results as Array<{ title: string; url: string; snippet: string }>)
            .map((r) => `- **${r.title}**: ${r.snippet}\n  URL: ${r.url}`)
            .join("\n\n")
        }`;
      }
    }

    // Get properties for context
    const properties = await ctx.runQuery(internal.chat.getPropertiesForContext);
    let propertyContext = "";
    if (properties.length > 0) {
      propertyContext = `\n\n## Available Properties in Database:\n${properties
        .map(
          (p) =>
            `- ${p.name} (${p.type}): ${p.location}, ${p.district}, ฿${p.price.toLocaleString()}, ${p.bedrooms}BR/${p.bathrooms}BA, ${p.area}sqm`
        )
        .join("\n")}`;
    }

    const systemContent = `${DEFAULT_SYSTEM_PROMPT}${propertyContext}${searchContext}`;

    const messages: Array<{ role: "user" | "assistant" | "system"; content: string }> = [
      { role: "system", content: systemContent },
      ...(args.conversationHistory || []),
      { role: "user", content: args.message },
    ];

    const geminiContents = convertToGeminiFormat(messages);
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: geminiContents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1500,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Google AI API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const assistantMessage = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

      return {
        message: assistantMessage,
        searchPerformed: !!searchContext,
        metadata: {
          model: "gemini-2.0-flash",
        },
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Chat failed: ${error.message}`);
      }
      throw error;
    }
  },
});

// Smart chat with property search - extracts criteria and queries database
export const sendWithPropertySearch = action({
  args: {
    message: v.string(),
    conversationHistory: v.optional(
      v.array(
        v.object({
          role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
          content: v.string(),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.GOOGLE_AI_API_KEY;

    if (!apiKey) {
      throw new Error("GOOGLE_AI_API_KEY not configured in Convex environment");
    }

    if (!args.message || args.message.trim().length === 0) {
      throw new Error("Message is required");
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    // Step 1: Extract search criteria from the message
    let searchCriteria: PropertySearchCriteria = { hasSearchIntent: false };
    
    try {
      // Build context from conversation history for extraction
      const historyContext = (args.conversationHistory || [])
        .slice(-6)
        .map((m) => `${m.role}: ${m.content}`)
        .join("\n");

      const extractionPrompt = historyContext
        ? `Previous conversation:\n${historyContext}\n\nCurrent user message: ${args.message}`
        : args.message;

      const extractionMessages = [
        { role: "user" as const, parts: [{ text: `${EXTRACTION_SYSTEM_PROMPT}\n\nAnalyze this:\n${extractionPrompt}` }] },
      ];

      const extractionResponse = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: extractionMessages,
          generationConfig: {
            temperature: 0.1, // Low temperature for consistent extraction
            maxOutputTokens: 500,
          },
        }),
      });

      if (extractionResponse.ok) {
        const extractionData = await extractionResponse.json();
        const extractedText = extractionData.candidates?.[0]?.content?.parts?.[0]?.text || "";
        
        // Parse the JSON from the response
        const jsonMatch = extractedText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          searchCriteria = JSON.parse(jsonMatch[0]) as PropertySearchCriteria;
        }
      }
    } catch (error) {
      console.log("Extraction failed, proceeding without search:", error);
    }

    // Step 2: Query properties if search intent detected
    type PropertyResult = {
      id: string;
      name: string;
      location: string;
      district: string;
      price: number;
      type: string;
      bedrooms: number;
      bathrooms: number;
      area: number;
      nearBts?: string;
      nearMrt?: string;
      description_en: string;
      description_th: string;
    };
    
    let matchedProperties: PropertyResult[] = [];
    let searchPerformed = false;

    if (searchCriteria.hasSearchIntent) {
      searchPerformed = true;
      // Convert null values to undefined (Convex validators accept undefined but not null)
      matchedProperties = await ctx.runQuery(internal.chat.getFilteredProperties, {
        type: searchCriteria.type ?? undefined,
        minPrice: searchCriteria.minPrice ?? undefined,
        maxPrice: searchCriteria.maxPrice ?? undefined,
        location: searchCriteria.location ?? undefined,
        district: searchCriteria.district ?? undefined,
        minBedrooms: searchCriteria.minBedrooms ?? undefined,
        nearBts: searchCriteria.nearBts ?? undefined,
        nearMrt: searchCriteria.nearMrt ?? undefined,
      });
    }

    // Step 3: Build system prompt with matched properties
    let propertyContext = "";
    if (matchedProperties.length > 0) {
      propertyContext = `\n\n## Properties Matching User's Criteria (${matchedProperties.length} found):\n${matchedProperties
        .map(
          (p, i) =>
            `${i + 1}. **${p.name}** (${p.type})
   - Location: ${p.location}, ${p.district}
   - Price: ฿${p.price.toLocaleString()}
   - Size: ${p.bedrooms} bedrooms, ${p.bathrooms} bathrooms, ${p.area} sqm
   ${p.nearBts ? `- Near BTS: ${p.nearBts}` : ""}${p.nearMrt ? `- Near MRT: ${p.nearMrt}` : ""}
   - ${p.description_en}`
        )
        .join("\n\n")}`;
    } else if (searchCriteria.hasSearchIntent) {
      propertyContext = `\n\n## Search Results:\nNo properties found matching the user's exact criteria. You can suggest broadening the search or offer alternative options.`;
    }

    // Also get a few other properties for general context
    const allProperties = await ctx.runQuery(internal.chat.getPropertiesForContext);
    const otherProperties = allProperties
      .filter((p) => !matchedProperties.some((mp) => mp.id === p.id))
      .slice(0, 5);

    let otherContext = "";
    if (otherProperties.length > 0 && searchCriteria.hasSearchIntent && matchedProperties.length < 3) {
      otherContext = `\n\n## Other Available Properties (may partially match):\n${otherProperties
        .map(
          (p) =>
            `- ${p.name} (${p.type}): ${p.location}, ฿${p.price.toLocaleString()}, ${p.bedrooms}BR`
        )
        .join("\n")}`;
    }

    // Calculate price statistics for context
    const allPrices = allProperties.map(p => p.price);
    const avgPrice = allPrices.length > 0 ? allPrices.reduce((a, b) => a + b, 0) / allPrices.length : 0;
    const matchedPrices = matchedProperties.map(p => p.price);
    const matchedAvg = matchedPrices.length > 0 ? matchedPrices.reduce((a, b) => a + b, 0) / matchedPrices.length : 0;

    // Build price intelligence context
    let priceIntelligence = "";
    if (avgPrice > 0) {
      priceIntelligence = `\n\n## Price Intelligence:
- Average price in database: ฿${Math.round(avgPrice).toLocaleString()}
- Use this to tell users if a property is "below average", "good value", or "premium priced"
- For matched properties: ${matchedAvg > 0 ? `avg ฿${Math.round(matchedAvg).toLocaleString()}` : "N/A"}`;
    }

    // Build comparison instructions if multiple properties
    let comparisonInstructions = "";
    if (matchedProperties.length >= 2) {
      comparisonInstructions = `\n\n## Comparison Mode:
If user asks to compare or says "เปรียบเทียบ", provide:
1. Side-by-side key stats (price, size, location)
2. Pros and cons of each
3. Your TOP recommendation with clear reasoning
4. Format as a clear comparison, not just a list`;
    }

    const systemContent = `${DEFAULT_SYSTEM_PROMPT}${propertyContext}${otherContext}${priceIntelligence}${comparisonInstructions}

## Response Guidelines:
When properties match, present each with:
1. **Property name** and why it's a good fit
2. **Price analysis**: Is it good value? (compare to avg ฿${Math.round(avgPrice).toLocaleString()})
3. **Key features** that match their criteria
4. **Trade-offs** to consider
5. **Your confidence level** in the recommendation

End with a helpful follow-up question or suggestion.`;

    // Step 4: Generate final response
    const messages: Array<{ role: "user" | "assistant" | "system"; content: string }> = [
      { role: "system", content: systemContent },
      ...(args.conversationHistory || []),
      { role: "user", content: args.message },
    ];

    const geminiContents = convertToGeminiFormat(messages);

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: geminiContents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1500,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Google AI API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const assistantMessage = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

      if (!assistantMessage) {
        throw new Error("No response received from AI");
      }

      return {
        message: assistantMessage,
        searchPerformed,
        searchCriteria: searchCriteria.hasSearchIntent ? searchCriteria : null,
        matchedProperties: matchedProperties.map((p) => ({
          id: p.id,
          name: p.name,
          type: p.type,
          location: p.location,
          district: p.district,
          price: p.price,
          bedrooms: p.bedrooms,
          bathrooms: p.bathrooms,
          area: p.area,
          nearBts: p.nearBts,
          nearMrt: p.nearMrt,
        })),
        totalMatches: matchedProperties.length,
        metadata: {
          model: "gemini-2.0-flash",
          usage: {
            prompt_tokens: data.usageMetadata?.promptTokenCount,
            completion_tokens: data.usageMetadata?.candidatesTokenCount,
            total_tokens: data.usageMetadata?.totalTokenCount,
          },
        },
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Chat failed: ${error.message}`);
      }
      throw error;
    }
  },
});

// Check if chat service is configured
export const status = action({
  args: {},
  handler: async () => {
    return {
      chat: {
        configured: !!process.env.GOOGLE_AI_API_KEY,
        service: "google-gemini",
      },
      webSearch: {
        configured: !!process.env.EXA_API_KEY,
        service: "exa",
      },
      browserAutomation: {
        configured: !!process.env.BROWSERBASE_API_KEY && !!process.env.BROWSERBASE_PROJECT_ID,
        service: "browserbase",
      },
    };
  },
});
