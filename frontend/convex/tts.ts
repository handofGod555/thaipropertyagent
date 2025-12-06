"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";

const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1";
const MAX_TEXT_LENGTH = 5000; // ElevenLabs limit
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// Multilingual voice that supports Thai properly
// Charlotte (XB0fDUnXU5powFXDhCwa) - female, excellent multilingual support
// River (SAz9YHcvj6GT2YYXdXww) - neutral, good multilingual support
const DEFAULT_THAI_VOICE_ID = "XB0fDUnXU5powFXDhCwa"; // Charlotte - great for Thai

// Helper function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Generate speech from text using ElevenLabs API
export const generate = action({
  args: {
    text: v.string(),
    voiceId: v.optional(v.string()),
    modelId: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    // Use Thai-supporting multilingual voice as default
    const defaultVoiceId = process.env.ELEVENLABS_VOICE_ID || DEFAULT_THAI_VOICE_ID;

    if (!apiKey) {
      throw new Error("ELEVENLABS_API_KEY not configured in Convex environment");
    }

    if (!args.text || args.text.trim().length === 0) {
      throw new Error("Text is required for TTS");
    }

    // Truncate text if too long
    const text = args.text.length > MAX_TEXT_LENGTH 
      ? args.text.slice(0, MAX_TEXT_LENGTH) 
      : args.text;

    const voiceId = args.voiceId || defaultVoiceId;
    const url = `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`;
    
    // Use eleven_turbo_v2_5 which has excellent native Thai language support
    const modelId = args.modelId || "eleven_turbo_v2_5";

    let lastError: Error | null = null;

    // Retry logic for transient errors
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            Accept: "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": apiKey,
          },
          body: JSON.stringify({
            text,
            model_id: modelId,
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
          
          // Retry on 500 errors (transient server errors)
          if (response.status >= 500 && attempt < MAX_RETRIES) {
            console.log(`ElevenLabs API error (attempt ${attempt}/${MAX_RETRIES}): ${response.status} - retrying...`);
            await delay(RETRY_DELAY_MS * attempt); // Exponential backoff
            continue;
          }
          
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
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Only retry on network errors or 5xx errors
        if (attempt < MAX_RETRIES && !lastError.message.includes("4")) {
          console.log(`TTS attempt ${attempt}/${MAX_RETRIES} failed: ${lastError.message} - retrying...`);
          await delay(RETRY_DELAY_MS * attempt);
          continue;
        }
        
        throw new Error(`TTS generation failed: ${lastError.message}`);
      }
    }

    throw new Error(`TTS generation failed after ${MAX_RETRIES} attempts: ${lastError?.message || "Unknown error"}`);
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

