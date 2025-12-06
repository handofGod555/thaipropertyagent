import { internalQuery } from "./_generated/server";

// Internal query to get properties for context
export const getPropertiesForContext = internalQuery({
  args: {},
  handler: async (ctx) => {
    const properties = await ctx.db.query("properties").take(20);
    return properties.map((p) => ({
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
    }));
  },
});

