import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-pro',
    temperature: process.env.GEMINI_TEMPERATURE
      ? parseFloat(process.env.GEMINI_TEMPERATURE)
      : 0.7,
    maxTokens: process.env.GEMINI_MAX_TOKENS
      ? parseInt(process.env.GEMINI_MAX_TOKENS, 10)
      : 32768,
  },
};
