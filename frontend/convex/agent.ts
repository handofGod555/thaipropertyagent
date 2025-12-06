import { action, internalQuery, ActionCtx } from "./_generated/server";
import { v } from "convex/values";
import { internal, api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// ============================================
// MCP TOOL DEFINITIONS - For Gemini Function Calling
// ============================================

// Tool definitions following MCP/Gemini function calling schema
const AGENT_TOOLS = [
  {
    name: "search_properties_database",
    description: `Search the local property database for Thai real estate listings. Use this tool FIRST when users ask about properties. 
Returns properties from our curated database with verified information.
Best for: Finding condos, houses, villas in Bangkok, Chiang Mai, Phuket with specific criteria.`,
    parameters: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["condo", "house", "villa", "townhouse"],
          description: "Property type (คอนโด=condo, บ้าน=house, วิลล่า=villa, ทาวน์เฮาส์=townhouse)",
        },
        maxPrice: {
          type: "number",
          description: "Maximum price in Thai Baht (e.g., 5000000 for 5 million)",
        },
        minPrice: {
          type: "number",
          description: "Minimum price in Thai Baht",
        },
        location: {
          type: "string",
          description: "City or area name (e.g., Bangkok, Chiang Mai, Sukhumvit)",
        },
        district: {
          type: "string",
          description: "District name (e.g., Sathorn, Phrom Phong, Nimman)",
        },
        minBedrooms: {
          type: "number",
          description: "Minimum number of bedrooms",
        },
        nearBts: {
          type: "boolean",
          description: "Filter for properties near BTS stations (ใกล้ BTS)",
        },
        nearMrt: {
          type: "boolean",
          description: "Filter for properties near MRT stations (ใกล้ MRT)",
        },
      },
      required: [],
    },
  },
  {
    name: "search_properties_web",
    description: `Search the internet for live property listings from Thai real estate websites.
Use this tool when:
- User asks for the latest/newest listings
- Database search returns no results
- User wants to compare market prices
- User asks about properties not in our database
Searches: DDProperty, HipFlat, FazWaz, Thailand-Property`,
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query in natural language (e.g., 'condo near BTS Phrom Phong under 5 million baht')",
        },
        numResults: {
          type: "number",
          description: "Number of results to return (default: 5, max: 10)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_property_details",
    description: `Get detailed information about a specific property from our database by ID.
Use when user asks for more details about a property mentioned in previous results.`,
    parameters: {
      type: "object",
      properties: {
        propertyId: {
          type: "string",
          description: "The property ID from previous search results",
        },
      },
      required: ["propertyId"],
    },
  },
  {
    name: "compare_properties",
    description: `Compare multiple properties side by side.
Use when user asks to compare options or says "เปรียบเทียบ".
Provides detailed comparison of price, size, location, and features.`,
    parameters: {
      type: "object",
      properties: {
        propertyIds: {
          type: "array",
          items: { type: "string" },
          description: "Array of property IDs to compare (2-4 properties)",
        },
      },
      required: ["propertyIds"],
    },
  },
];

// ============================================
// AGENT SYSTEM PROMPT
// ============================================

const AGENT_SYSTEM_PROMPT = `You are Thai Property Agent - an AI-powered real estate assistant that helps users find properties in Thailand.

## Your Role
You are a TRUE AGENT, not just a chatbot. You MUST use tools to help users - never just say you'll search without actually calling the tool.

## Available Tools
You have access to these tools via function calling:
1. **search_properties_database** - Search our curated database (use FIRST for property searches)
2. **search_properties_web** - Search live listings online (MUST USE when DB returns 0 results!)
3. **get_property_details** - Get detailed info about a specific property
4. **compare_properties** - Compare multiple properties side by side

## CRITICAL RULE - Auto-Escalation
When database search returns 0 results, you MUST IMMEDIATELY call search_properties_web.
DO NOT just tell the user you will search - actually CALL the search_properties_web tool!

## Decision Making Process
When a user asks about properties:
1. THINK: What does the user want? Extract criteria (type, price, location, features)
2. DECIDE: Which tool is best? Start with database, escalate to web if needed
3. ACT: Call the appropriate tool with extracted parameters
4. OBSERVE: Analyze the results
5. RESPOND or CONTINUE: 
   - If results found → present them
   - If 0 results from DB → CALL search_properties_web (don't just say you will!)
   - Never end without providing useful results or actually trying web search

## Language Rules
- Respond in the SAME language the user writes in (Thai or English)
- Use Thai real estate terminology when appropriate
- Thai price patterns: ล้าน = million, แสน = hundred thousand, บาท = baht

## Response Style
When presenting results:
1. State HOW MANY properties were found and WHICH TOOL you used
2. Explain WHY each property matches their needs
3. Provide price analysis (is it above/below average?)
4. Suggest next steps or follow-up questions

## Example - Auto-Escalation
User: "หาคอนโดสุขุมวิท 3 ล้าน"
STEP 1: search_properties_database(type="condo", location="Sukhumvit", maxPrice=3000000)
OBSERVE: 0 results (no properties match this criteria in DB)
STEP 2: IMMEDIATELY call search_properties_web(query="condo sukhumvit bangkok under 3 million baht")
OBSERVE: Found 5 results from web
RESPOND: Present web results with analysis

## Example - Direct Results
User: "หาคอนโดใกล้ BTS ไม่เกิน 5 ล้าน"
STEP 1: search_properties_database(type="condo", nearBts=true, maxPrice=5000000)
OBSERVE: Found 3 properties
RESPOND: Present results with reasoning`;

// ============================================
// INTERNAL QUERIES FOR TOOL EXECUTION
// ============================================

// Internal query to search properties in database
export const searchPropertiesInternal = internalQuery({
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
      type: p.type,
      location: p.location,
      district: p.district,
      price: p.price,
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

// Internal query to get property by ID
export const getPropertyByIdInternal = internalQuery({
  args: {
    propertyId: v.id("properties"),
  },
  handler: async (ctx, args) => {
    const property = await ctx.db.get(args.propertyId);
    if (!property) return null;

    return {
      id: property._id,
      name: property.name,
      type: property.type,
      location: property.location,
      district: property.district,
      price: property.price,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      area: property.area,
      nearBts: property.nearBts,
      nearMrt: property.nearMrt,
      description_en: property.description_en,
      description_th: property.description_th,
      features: property.features,
      imageUrl: property.imageUrl,
    };
  },
});

// Internal query to get multiple properties for comparison
export const getPropertiesForComparisonInternal = internalQuery({
  args: {
    propertyIds: v.array(v.id("properties")),
  },
  handler: async (ctx, args) => {
    const properties = await Promise.all(
      args.propertyIds.map((id) => ctx.db.get(id))
    );

    return properties
      .filter((p) => p !== null)
      .map((p) => ({
        id: p!._id,
        name: p!.name,
        type: p!.type,
        location: p!.location,
        district: p!.district,
        price: p!.price,
        bedrooms: p!.bedrooms,
        bathrooms: p!.bathrooms,
        area: p!.area,
        nearBts: p!.nearBts,
        nearMrt: p!.nearMrt,
        pricePerSqm: Math.round(p!.price / p!.area),
      }));
  },
});

// ============================================
// TOOL EXECUTION HELPER
// ============================================

interface ToolCall {
  name: string;
  args: Record<string, unknown>;
}

interface ToolResult {
  tool: string;
  success: boolean;
  data: unknown;
  error?: string;
}

async function executeToolCall(
  ctx: ActionCtx,
  toolCall: ToolCall
): Promise<ToolResult> {
  const { name, args } = toolCall;

  try {
    switch (name) {
      case "search_properties_database": {
        const results = await ctx.runQuery(internal.agent.searchPropertiesInternal, {
          type: args.type as string | undefined,
          minPrice: args.minPrice as number | undefined,
          maxPrice: args.maxPrice as number | undefined,
          location: args.location as string | undefined,
          district: args.district as string | undefined,
          minBedrooms: args.minBedrooms as number | undefined,
          nearBts: args.nearBts as boolean | undefined,
          nearMrt: args.nearMrt as boolean | undefined,
        });
        return {
          tool: name,
          success: true,
          data: {
            count: results.length,
            properties: results,
            source: "database",
          },
        };
      }

      case "search_properties_web": {
        const result = await ctx.runAction(api.tools.searchWeb, {
          query: `Thailand property ${args.query as string}`,
          numResults: (args.numResults as number) || 5,
          includeText: true,
        });
        return {
          tool: name,
          success: result.success,
          data: {
            count: result.results?.length || 0,
            listings: result.results || [],
            source: "web",
            query: args.query,
          },
          error: result.error,
        };
      }

      case "get_property_details": {
        const property = await ctx.runQuery(internal.agent.getPropertyByIdInternal, {
          propertyId: args.propertyId as Id<"properties">,
        });
        return {
          tool: name,
          success: !!property,
          data: property,
          error: property ? undefined : "Property not found",
        };
      }

      case "compare_properties": {
        const properties = await ctx.runQuery(
          internal.agent.getPropertiesForComparisonInternal,
          {
            propertyIds: args.propertyIds as Id<"properties">[],
          }
        );
        return {
          tool: name,
          success: properties.length > 0,
          data: {
            count: properties.length,
            properties,
            comparison: generateComparison(properties),
          },
        };
      }

      default:
        return {
          tool: name,
          success: false,
          data: null,
          error: `Unknown tool: ${name}`,
        };
    }
  } catch (error) {
    return {
      tool: name,
      success: false,
      data: null,
      error: error instanceof Error ? error.message : "Tool execution failed",
    };
  }
}

// Helper to generate comparison summary
function generateComparison(properties: Array<{
  name: string;
  price: number;
  area: number;
  bedrooms: number;
  pricePerSqm: number;
  location: string;
}>) {
  if (properties.length < 2) return null;

  const avgPrice = properties.reduce((sum, p) => sum + p.price, 0) / properties.length;
  const avgPricePerSqm = properties.reduce((sum, p) => sum + p.pricePerSqm, 0) / properties.length;
  const cheapest = properties.reduce((a, b) => (a.price < b.price ? a : b));
  const largest = properties.reduce((a, b) => (a.area > b.area ? a : b));
  const bestValue = properties.reduce((a, b) => (a.pricePerSqm < b.pricePerSqm ? a : b));

  return {
    avgPrice: Math.round(avgPrice),
    avgPricePerSqm: Math.round(avgPricePerSqm),
    cheapest: cheapest.name,
    largest: largest.name,
    bestValue: bestValue.name,
  };
}

// ============================================
// MAIN AGENT ACTION - ReAct Loop
// ============================================

export const runAgent = action({
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
      throw new Error("GOOGLE_AI_API_KEY not configured");
    }

    if (!args.message || args.message.trim().length === 0) {
      throw new Error("Message is required");
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    // Build conversation context
    const conversationContext = (args.conversationHistory || [])
      .slice(-10)
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n");

    // Agent loop variables
    const MAX_ITERATIONS = 5;
    const toolsUsed: ToolResult[] = [];
    let finalResponse = "";

    for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
      // Build the current context including tool results
      let currentContext = AGENT_SYSTEM_PROMPT;

      if (conversationContext) {
        currentContext += `\n\n## Previous Conversation:\n${conversationContext}`;
      }

      if (toolsUsed.length > 0) {
        currentContext += `\n\n## Tool Results from this conversation:\n`;
        
        // Check if any database search returned 0 results
        const dbSearchWithNoResults = toolsUsed.find(
          (r) => r.tool === "search_properties_database" && r.success && 
          (r.data as { count?: number })?.count === 0
        );
        const hasWebSearch = toolsUsed.some((r) => r.tool === "search_properties_web");
        
        for (const result of toolsUsed) {
          currentContext += `\nTool: ${result.tool}\nSuccess: ${result.success}\nData: ${JSON.stringify(result.data, null, 2)}\n`;
        }
        
        // If database returned 0 results and we haven't tried web search yet, FORCE web search
        if (dbSearchWithNoResults && !hasWebSearch) {
          currentContext += `\n⚠️ IMPORTANT: Database returned 0 results. You MUST call search_properties_web NOW to find results from online sources. Do NOT respond with text - call the tool!`;
        } else {
          currentContext += `\nBased on these results, provide your response to the user.`;
        }
      }

      // Build Gemini request with function calling
      const geminiRequest = {
        contents: [
          {
            role: "user",
            parts: [{ text: `${currentContext}\n\nUser message: ${args.message}` }],
          },
        ],
        tools: [
          {
            functionDeclarations: AGENT_TOOLS,
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1500,
        },
      };

      try {
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(geminiRequest),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        const candidate = data.candidates?.[0];

        if (!candidate) {
          throw new Error("No response from Gemini");
        }

        // Check if model wants to call a function
        const functionCall = candidate.content?.parts?.find(
          (part: { functionCall?: { name: string; args: Record<string, unknown> } }) => part.functionCall
        );

        if (functionCall?.functionCall) {
          // Execute the tool
          console.log(`Agent calling tool: ${functionCall.functionCall.name}`);
          const toolResult = await executeToolCall(ctx, {
            name: functionCall.functionCall.name,
            args: functionCall.functionCall.args || {},
          });
          toolsUsed.push(toolResult);

          // Continue the loop to process results
          continue;
        }

        // Model returned text response - we're done
        const textPart = candidate.content?.parts?.find(
          (part: { text?: string }) => part.text
        );
        finalResponse = textPart?.text || "";

        // Check for safety blocks
        if (!finalResponse && candidate.finishReason === "SAFETY") {
          finalResponse = "ขออภัย ไม่สามารถตอบคำถามนี้ได้ (Sorry, I cannot answer this question)";
        }

        break;
      } catch (error) {
        console.error(`Agent iteration ${iteration} error:`, error);
        if (iteration === MAX_ITERATIONS - 1) {
          throw error;
        }
      }
    }

    // If no response after all iterations, generate a fallback
    if (!finalResponse && toolsUsed.length > 0) {
      finalResponse = generateFallbackResponse(toolsUsed);
    }

    // Extract matched properties from tool results for UI display
    const matchedProperties = extractMatchedProperties(toolsUsed);

    return {
      message: finalResponse,
      toolsUsed: toolsUsed.map((t) => ({
        tool: t.tool,
        success: t.success,
        resultCount: getResultCount(t),
      })),
      matchedProperties,
      metadata: {
        model: "gemini-2.0-flash",
        iterations: toolsUsed.length + 1,
        isAgent: true,
      },
    };
  },
});

// Helper to extract properties from tool results for UI
function extractMatchedProperties(toolResults: ToolResult[]) {
  for (const result of toolResults) {
    if (result.tool === "search_properties_database" && result.success) {
      const data = result.data as { properties?: Array<{
        id: string;
        name: string;
        type: string;
        location: string;
        district: string;
        price: number;
        bedrooms: number;
        bathrooms: number;
        area: number;
        nearBts?: string;
        nearMrt?: string;
      }> };
      return data.properties || [];
    }
  }
  return [];
}

// Helper to get result count from tool result
function getResultCount(result: ToolResult): number {
  if (!result.success) return 0;
  const data = result.data as { count?: number; properties?: unknown[] };
  return data?.count || data?.properties?.length || 0;
}

// Generate fallback response from tool results
function generateFallbackResponse(toolResults: ToolResult[]): string {
  const dbResult = toolResults.find((t) => t.tool === "search_properties_database");
  const webResult = toolResults.find((t) => t.tool === "search_properties_web");

  if (dbResult?.success) {
    const data = dbResult.data as { count: number; properties: Array<{ name: string; price: number }> };
    if (data.count > 0) {
      const propertyList = data.properties
        .slice(0, 3)
        .map((p) => `• ${p.name} - ฿${p.price.toLocaleString()}`)
        .join("\n");
      return `พบ ${data.count} รายการในฐานข้อมูลครับ:\n\n${propertyList}\n\nต้องการรายละเอียดเพิ่มเติมไหมครับ?`;
    }
  }

  if (webResult?.success) {
    const data = webResult.data as { 
      count?: number; 
      listings?: Array<{ title: string; url: string; snippet?: string }>;
      note?: string;
    };
    if (data.listings && data.listings.length > 0) {
      const webListings = data.listings
        .slice(0, 3)
        .map((l) => `🔗 **${l.title}**\n   ${l.url}`)
        .join("\n\n");
      
      const intro = data.note 
        ? "ไม่พบในฐานข้อมูลของเรา แต่ผมแนะนำเว็บไซต์เหล่านี้สำหรับค้นหาครับ:\n\n"
        : `พบ ${data.listings.length} รายการจากการค้นหาออนไลน์ครับ:\n\n`;
      
      return `${intro}${webListings}\n\nลองเข้าไปดูรายละเอียดได้เลยครับ! 🏠`;
    }
  }

  // If we tried both and found nothing
  if (dbResult && webResult) {
    return "ขออภัยครับ ไม่พบอสังหาริมทรัพย์ที่ตรงกับความต้องการทั้งในฐานข้อมูลและออนไลน์ ลองปรับเงื่อนไขดูไหมครับ? เช่น เพิ่มงบประมาณ หรือเปลี่ยนทำเล";
  }

  return "ไม่พบอสังหาริมทรัพย์ที่ตรงกับความต้องการครับ ลองปรับเงื่อนไขดูไหมครับ?";
}

// ============================================
// AGENT STATUS - Check configuration
// ============================================

export const status = action({
  args: {},
  handler: async () => {
    return {
      agent: {
        enabled: true,
        model: "gemini-2.0-flash",
        tools: AGENT_TOOLS.map((t) => t.name),
      },
      gemini: {
        configured: !!process.env.GOOGLE_AI_API_KEY,
      },
      webSearch: {
        configured: !!process.env.EXA_API_KEY,
        provider: "exa",
      },
    };
  },
});

