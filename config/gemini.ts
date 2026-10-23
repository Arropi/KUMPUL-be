import { GoogleGenAI } from '@google/genai';
import 'dotenv/config';

export const GEMINI_API_KEY = (process.env.GEMINI_API_KEY || process.env.GEMIN_API_KEY) as string;

// Model default minim demand dengan latensi respons cepat (Flash-Lite series)
export const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

// Urutan model fallback jika model aktif terkendala beban trafik tinggi / 503 Service Unavailable
export const GEMINI_FALLBACK_MODELS = [
  DEFAULT_GEMINI_MODEL,
  'gemini-3.1-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-3.5-flash',
  'gemini-3.8-flash',
].filter((model, idx, arr) => arr.indexOf(model) === idx);

/**
 * Inisialisasi klien resmi Google Gen AI SDK.
 * Klien diinstansiasi jika API key tersedia.
 */
export const gemini_client = GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: GEMINI_API_KEY })
  : null;
