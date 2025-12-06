import { action } from "./_generated/server";
import { v } from "convex/values";

// ============================================
// EXA WEB SEARCH - Semantic search for property listings
// ============================================

interface ExaSearchResult {
  title: string;
  url: string;
  publishedDate?: string;
  author?: string;
  text?: string;
  highlights?: string[];
  score?: number;
}

interface ExaSearchResponse {
  results: ExaSearchResult[];
  autopromptString?: string;
}

// Search the web for Thai property listings and real estate information
export const searchWeb = action({
  args: {
    query: v.string(),
    numResults: v.optional(v.number()),
    includeText: v.optional(v.boolean()),
    includeDomains: v.optional(v.array(v.string())),
  },
  handler: async (_, args) => {
    const apiKey = process.env.EXA_API_KEY;

    if (!apiKey) {
      // Return helpful mock results with real property website URLs
      console.log("EXA_API_KEY not configured, returning helpful suggestions");
      const { query } = args;
      return {
        success: true,
        results: [
          {
            title: "DDProperty - Thailand's Leading Property Portal",
            url: `https://www.ddproperty.com/en/property-for-sale?search=${encodeURIComponent(query)}`,
            snippet: "Search thousands of properties on DDProperty. Find condos, houses, and villas across Thailand.",
            highlights: ["Largest property database in Thailand", "Verified listings"],
          },
          {
            title: "HipFlat - Buy Property in Thailand",
            url: `https://www.hipflat.co.th/en/search?q=${encodeURIComponent(query)}`,
            snippet: "HipFlat connects buyers with real estate in Bangkok, Phuket, Chiang Mai and more.",
            highlights: ["Market price insights", "Neighborhood guides"],
          },
          {
            title: "FazWaz - Thailand Property for Sale",
            url: `https://www.fazwaz.com/property-for-sale/thailand?search=${encodeURIComponent(query)}`,
            snippet: "Discover properties in Thailand with FazWaz. International buyer friendly.",
            highlights: ["English support", "Foreign ownership info"],
          },
        ],
        query,
        totalResults: 3,
        note: "These are suggested property websites for your search. Visit them for live listings.",
      };
    }

    const { query, numResults = 5, includeText = true, includeDomains } = args;

    try {
      const response = await fetch("https://api.exa.ai/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify({
          query,
          numResults,
          contents: includeText
            ? {
                text: { maxCharacters: 1000 },
                highlights: { numSentences: 3 },
              }
            : undefined,
          includeDomains: includeDomains || [
            "ddproperty.com",
            "hipflat.co.th",
            "fazwaz.com",
            "thailand-property.com",
            "renthub.in.th",
            "baania.com",
          ],
          type: "neural",
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Exa API error: ${response.status} - ${errorText}`);
      }

      const data: ExaSearchResponse = await response.json();

      return {
        success: true,
        results: data.results.map((r) => ({
          title: r.title,
          url: r.url,
          snippet: r.text?.substring(0, 300) || "",
          highlights: r.highlights || [],
          score: r.score,
        })),
        query,
        totalResults: data.results.length,
      };
    } catch (error) {
      if (error instanceof Error) {
        return {
          success: false,
          error: error.message,
          results: [],
        };
      }
      throw error;
    }
  },
});

// ============================================
// BROWSERBASE - Browser automation for scraping
// ============================================

interface BrowserbaseSession {
  id: string;
  status: string;
  connectUrl?: string;
}

// Create a browser session for automation
export const createBrowserSession = action({
  args: {
    projectId: v.optional(v.string()),
  },
  handler: async (_, args) => {
    const apiKey = process.env.BROWSERBASE_API_KEY;
    const projectId = args.projectId || process.env.BROWSERBASE_PROJECT_ID;

    if (!apiKey) {
      return {
        success: false,
        error: "BROWSERBASE_API_KEY not configured in Convex environment",
      };
    }

    if (!projectId) {
      return {
        success: false,
        error: "BROWSERBASE_PROJECT_ID not configured in Convex environment",
      };
    }

    try {
      const response = await fetch("https://www.browserbase.com/v1/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-bb-api-key": apiKey,
        },
        body: JSON.stringify({
          projectId,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Browserbase API error: ${response.status} - ${errorText}`);
      }

      const session: BrowserbaseSession = await response.json();

      return {
        success: true,
        sessionId: session.id,
        status: session.status,
        connectUrl: session.connectUrl,
      };
    } catch (error) {
      if (error instanceof Error) {
        return {
          success: false,
          error: error.message,
        };
      }
      throw error;
    }
  },
});

// Scrape a property listing page
export const scrapePropertyPage = action({
  args: {
    url: v.string(),
  },
  handler: async (_, args) => {
    // For now, use a simple fetch with a scraping approach
    // In production, you'd use Browserbase's full automation
    const apiKey = process.env.BROWSERBASE_API_KEY;

    if (!apiKey) {
      // Fallback: Try simple fetch for basic HTML
      try {
        const response = await fetch(args.url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.status}`);
        }

        const html = await response.text();

        // Basic extraction (very simplified)
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        const priceMatch = html.match(
          /(?:฿|THB|baht)\s*[\d,]+(?:\.\d{2})?/gi
        );
        const bedroomMatch = html.match(/(\d+)\s*(?:bed|bedroom|ห้องนอน)/gi);

        return {
          success: true,
          url: args.url,
          title: titleMatch ? titleMatch[1].trim() : "Unknown",
          prices: priceMatch ? priceMatch.slice(0, 3) : [],
          bedrooms: bedroomMatch ? bedroomMatch.slice(0, 3) : [],
          note: "Basic scraping without Browserbase - limited data extraction",
        };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to scrape page",
          url: args.url,
        };
      }
    }

    // Full Browserbase implementation would go here
    // This requires setting up a proper browser automation flow
    return {
      success: false,
      error: "Full Browserbase scraping not yet implemented",
      url: args.url,
    };
  },
});

// ============================================
// TOOL STATUS - Check which tools are configured
// ============================================

export const getToolsStatus = action({
  args: {},
  handler: async () => {
    return {
      webSearch: {
        provider: "exa",
        configured: !!process.env.EXA_API_KEY,
        description: "Semantic web search for Thai property listings",
      },
      browserAutomation: {
        provider: "browserbase",
        configured:
          !!process.env.BROWSERBASE_API_KEY &&
          !!process.env.BROWSERBASE_PROJECT_ID,
        description: "Browser automation for scraping property websites",
      },
      chat: {
        provider: "google-gemini",
        configured: !!process.env.GOOGLE_AI_API_KEY,
        description: "AI chat powered by Google Gemini",
      },
      tts: {
        provider: "elevenlabs",
        configured: !!process.env.ELEVENLABS_API_KEY,
        description: "Text-to-speech for Thai language",
      },
    };
  },
});

