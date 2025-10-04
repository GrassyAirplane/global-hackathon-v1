import OpenAI from 'openai';

// Configure OpenAI client to use Docker Model Runner (DMR)
// Use different base URL depending on environment
const isContainer = process.env.NODE_ENV === 'production' || process.env.DOCKER_ENV;
const baseURL = isContainer 
  ? 'http://model-runner.docker.internal/engines/llama.cpp/v1'
  : 'http://localhost:12434/engines/llama.cpp/v1';

const modelAPI = new OpenAI({
  baseURL,
  apiKey: 'dmr', // DMR doesn't require a real API key
});

export default modelAPI;
