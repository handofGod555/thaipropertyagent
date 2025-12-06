import axios from 'axios';

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

export interface TTSRequest {
  text: string;
  voiceId?: string;
  modelId?: string;
}

export interface TTSResponse {
  audio: Buffer;
  contentType: string;
}

export class ElevenLabsService {
  private apiKey: string;
  private defaultVoiceId: string;

  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY || '';
    this.defaultVoiceId = process.env.ELEVENLABS_VOICE_ID || 'pNInz6obpgDQGcFmaJgB'; // Default: Adam voice
    
    if (!this.apiKey) {
      console.warn('⚠️  ELEVENLABS_API_KEY not set - TTS will not work');
    }
  }

  /**
   * Generate speech audio from text using ElevenLabs API
   */
  async textToSpeech(request: TTSRequest): Promise<TTSResponse> {
    const { text, voiceId, modelId } = request;
    
    if (!this.apiKey) {
      throw new Error('ElevenLabs API key not configured');
    }

    if (!text || text.trim().length === 0) {
      throw new Error('Text is required for TTS');
    }

    const selectedVoiceId = voiceId || this.defaultVoiceId;
    const url = `${ELEVENLABS_API_URL}/text-to-speech/${selectedVoiceId}`;

    try {
      const response = await axios.post(
        url,
        {
          text,
          model_id: modelId || 'eleven_v3', // Best for Thai
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true,
          },
        },
        {
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': this.apiKey,
          },
          responseType: 'arraybuffer',
        }
      );

      return {
        audio: Buffer.from(response.data),
        contentType: 'audio/mpeg',
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data 
          ? Buffer.from(error.response.data).toString() 
          : error.message;
        throw new Error(`ElevenLabs API error: ${message}`);
      }
      throw error;
    }
  }

  /**
   * Get available voices from ElevenLabs
   */
  async getVoices(): Promise<unknown[]> {
    if (!this.apiKey) {
      throw new Error('ElevenLabs API key not configured');
    }

    try {
      const response = await axios.get(`${ELEVENLABS_API_URL}/voices`, {
        headers: {
          'xi-api-key': this.apiKey,
        },
      });

      return response.data.voices || [];
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`ElevenLabs API error: ${error.message}`);
      }
      throw error;
    }
  }
}

export const elevenLabsService = new ElevenLabsService();

