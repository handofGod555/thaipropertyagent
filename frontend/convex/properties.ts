import { query } from "./_generated/server";
import { v } from "convex/values";

// Get all properties with optional filters
export const list = query({
  args: {
    location: v.optional(v.string()),
    district: v.optional(v.string()),
    type: v.optional(v.string()),
    minPrice: v.optional(v.number()),
    maxPrice: v.optional(v.number()),
    minBedrooms: v.optional(v.number()),
    nearBts: v.optional(v.boolean()),
    nearMrt: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let properties = await ctx.db.query("properties").collect();

    // Apply filters
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

    if (args.type) {
      properties = properties.filter(
        (p) => p.type.toLowerCase() === args.type!.toLowerCase()
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

    // Filter for properties near BTS
    if (args.nearBts === true) {
      properties = properties.filter((p) => p.nearBts && p.nearBts.length > 0);
    }

    // Filter for properties near MRT
    if (args.nearMrt === true) {
      properties = properties.filter((p) => p.nearMrt && p.nearMrt.length > 0);
    }

    return properties;
  },
});

// Get a single property by ID
export const get = query({
  args: { id: v.id("properties") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get properties near BTS/MRT
export const nearTransit = query({
  args: {
    station: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const properties = await ctx.db.query("properties").collect();

    if (!args.station) {
      // Return all properties with transit access
      return properties.filter((p) => p.nearBts || p.nearMrt);
    }

    const stationLower = args.station.toLowerCase();
    return properties.filter(
      (p) =>
        p.nearBts?.toLowerCase().includes(stationLower) ||
        p.nearMrt?.toLowerCase().includes(stationLower)
    );
  },
});

// Get unique locations for filtering
export const locations = query({
  args: {},
  handler: async (ctx) => {
    const properties = await ctx.db.query("properties").collect();
    const locationSet = new Set(properties.map((p) => p.location));
    return Array.from(locationSet).sort();
  },
});

// Search properties by text (name, description, location)
export const search = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const properties = await ctx.db.query("properties").collect();
    const queryLower = args.query.toLowerCase();

    return properties.filter(
      (p) =>
        p.name.toLowerCase().includes(queryLower) ||
        p.location.toLowerCase().includes(queryLower) ||
        p.district.toLowerCase().includes(queryLower) ||
        p.description_en.toLowerCase().includes(queryLower) ||
        p.description_th.includes(args.query)
    );
  },
});

