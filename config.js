// config.js
// Central configuration for LLM and TTS endpoints and models

const APP_CONFIG = {
    // Default Gemini endpoints (can be changed)
    TTS_API_URL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent',
    LLM_API_URL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent',
    TTS_MODEL: 'gemini-2.5-flash-preview-tts',
    LLM_MODEL: 'gemini-2.5-flash-preview-05-20',
    // Add more models/providers here as needed
};
