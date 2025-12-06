"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// Default system prompt for Thai Property Agent
const DEFAULT_SYSTEM_PROMPT = `คุณเป็นตัวแทนอสังหาริมทรัพย์ไทยที่เป็นมิตรและมีความรู้ (You are a friendly and knowledgeable Thai real estate agent assistant)

Key behaviors:
- Respond in the same language the user writes in (Thai or English)
- Be knowledgeable about Thai real estate markets (Bangkok, Chiang Mai, Phuket, etc.)
- Provide helpful information about property types, prices, and locations
- Be friendly and professional
- When properties are available in the database, reference them specifically
- Use Thai Baht (฿ or THB) for prices

When discussing properties, mention:
- Location and neighborhood (ทำเล)
- Price range in Thai Baht (ราคา)
- Property type: condo (คอนโด), house (บ้าน), villa (วิลล่า)
- Key features and amenities
- Nearby BTS/MRT stations if applicable

Common Thai real estate terms:
- คอนโด = Condo
- บ้านเดี่ยว = Detached house
- ทาวน์เฮาส์ = Townhouse
- ใกล้ BTS = Near BTS
- ตารางเมตร = Square meters (sqm)`;

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
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.SMITHERY_API_KEY;
    const apiUrl = process.env.SMITHERY_API_URL || "https://api.smithery.ai/v1";

    if (!apiKey) {
      throw new Error("SMITHERY_API_KEY not configured in Convex environment");
    }

    if (!args.message || args.message.trim().length === 0) {
      throw new Error("Message is required");
    }

    // Build system prompt with property context if requested
    let systemContent = args.systemPrompt || DEFAULT_SYSTEM_PROMPT;

    if (args.includeProperties !== false) {
      // Get properties for context using internal query from chatQueries.ts
      const properties = await ctx.runQuery(internal.chatQueries.getPropertiesForContext);

      if (properties.length > 0) {
        const propertyContext = properties
          .map(
            (p) =>
              `- ${p.name} (${p.type}): ${p.location}, ${p.district}, ฿${p.price.toLocaleString()}, ${p.bedrooms}BR/${p.bathrooms}BA, ${p.area}sqm${p.nearBts ? `, near BTS ${p.nearBts}` : ""}${p.nearMrt ? `, near MRT ${p.nearMrt}` : ""}`
          )
          .join("\n");

        systemContent += `\n\n## Available Properties:\n${propertyContext}`;
      }
    }

    // Build messages array
    const messages = [
      { role: "system" as const, content: systemContent },
      ...(args.conversationHistory || []),
      { role: "user" as const, content: args.message },
    ];

    try {
      const response = await fetch(`${apiUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          messages,
          model: "default",
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Smithery API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const assistantMessage = data.choices?.[0]?.message?.content || "";

      return {
        message: assistantMessage,
        conversationId: data.id,
        metadata: {
          model: data.model,
          usage: data.usage,
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
    const apiKey = process.env.SMITHERY_API_KEY;
    return {
      configured: !!apiKey,
      service: "smithery",
    };
  },
});
