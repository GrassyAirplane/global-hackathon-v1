const OpenAI = require('openai');

// Configure OpenAI client to use local Llama model
const openai = new OpenAI({
  baseURL: 'http://localhost:11434/v1', // Default Ollama API endpoint
  apiKey: 'ollama', // Ollama doesn't require a real API key
});
