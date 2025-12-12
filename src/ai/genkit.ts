// src/ai/genkit.ts
import GenKit from '@genkit-ai/next';
import { googleAI } from '@genkit-ai/google-genai';

export const ai = GenKit({
  plugins: [googleAI()],
  // optional config
});
