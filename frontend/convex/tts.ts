"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";

const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1";

// Generate speech from text using ElevenLabs API
export const generate = action({
  args: {
    text: v.string(),
    voiceId: v.optional(v.string()),
    modelId: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    const defaultVoiceId = process.env.ELEVENLABS_VOICE_ID || "pNInz6obpgDQGcFmaJgB";

    if (!apiKey) {
      throw new Error("ELEVENLABS_API_KEY not configured in Convex environment");
    }

    if (!args.text || args.text.trim().length === 0) {
      throw new Error("Text is required for TTS");
    }

    const voiceId = args.voiceId || defaultVoiceId;
    const url = `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Accept: "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
        },
        body: JSON.stringify({
          text: args.text,
          model_id: args.modelId || "eleven_v3", // Best for Thai
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
      }

      // Convert audio to base64 for sending to client
      const arrayBuffer = await response.arrayBuffer();
      const base64Audio = Buffer.from(arrayBuffer).toString("base64");

      return {
        audio: base64Audio,
        contentType: "audio/mpeg",
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`TTS generation failed: ${error.message}`);
      }
      throw error;
    }
  },
});

// Get available voices from ElevenLabs
export const getVoices = action({
  args: {},
  handler: async () => {
    const apiKey = process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
      throw new Error("ELEVENLABS_API_KEY not configured in Convex environment");
    }

    try {
      const response = await fetch(`${ELEVENLABS_API_URL}/voices`, {
        headers: {
          "xi-api-key": apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }

      const data = await response.json();
      return data.voices || [];
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to get voices: ${error.message}`);
      }
      throw error;
    }
  },
});

