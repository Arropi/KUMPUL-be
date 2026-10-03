import { GoogleGenAI } from '@google/genai';
import 'dotenv/config';

export const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
export const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

/**
 * Inisialisasi klien resmi Google Gen AI SDK.
 * Klien diinstansiasi jika API key tersedia.
 */
export const gemini_client = GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: GEMINI_API_KEY })
  : null;
