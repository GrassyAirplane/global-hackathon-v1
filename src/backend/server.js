const express = require('express');
const OpenAI = require('openai');
const readline = require('readline');

// Create Express app
const app = express();
const PORT = 5000;

// Configure OpenAI client to use local Llama model
const openai = new OpenAI({
  baseURL: 'http://localhost:11434/v1', // Default Ollama API endpoint
  apiKey: 'ollama', // Ollama doesn't require a real API key
});

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to generate poem
async function generatePoem(topic) {
  try {
    console.log(`\n🤖 Generating a poem about "${topic}"...\n`);
    
    const completion = await openai.chat.completions.create({
      model: process.env.MODEL || 'llama3.2:1B-Q8_0',
      messages: [
        {
          role: 'system',
          content: 'You are a creative poet. Write beautiful, meaningful poems based on the given topic. Keep the poems concise but impactful.'
        },
        {
          role: 'user',
          content: `Write a poem about: ${topic}`
        }
      ],
      max_tokens: 300,
      temperature: 0.8,
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error('❌ Error generating poem:', error.message);
    return null;
  }
}

// Function to prompt user for poem topic
function promptForPoem() {
  rl.question('\n📝 What would you like me to write a poem about? (or type "quit" to exit): ', async (topic) => {
    if (topic.toLowerCase() === 'quit') {
      console.log('\n👋 Goodbye! Thanks for using the poem generator!');
      rl.close();
      return;
    }

    if (topic.trim() === '') {
      console.log('❌ Please enter a valid topic.');
      promptForPoem();
      return;
    }

    const poem = await generatePoem(topic);
    
    if (poem) {
      console.log('\n' + '='.repeat(50));
      console.log('📖 YOUR POEM:');
      console.log('='.repeat(50));
      console.log(poem);
      console.log('='.repeat(50));
    } else {
      console.log('❌ Sorry, I couldn\'t generate a poem. Please make sure your local Llama model is running.');
    }

    // Ask for another poem
    promptForPoem();
  });
}

// Express middleware
app.use(express.json());

// Basic health check endpoint
app.get('/', (req, res) => {
  res.json({ message: 'Poem Generator Server is running!' });
});

// API endpoint to generate poem
app.post('/generate-poem', async (req, res) => {
  const { topic } = req.body;
  
  if (!topic) {
    return res.status(400).json({ error: 'Topic is required' });
  }

  const poem = await generatePoem(topic);
  
  if (poem) {
    res.json({ topic, poem });
  } else {
    res.status(500).json({ error: 'Failed to generate poem' });
  }
});

// Start the server
function startServer() {
  console.log('🚀 Starting Poem Generator Server...');
  console.log('📡 Server will be available at http://localhost:' + PORT);
  console.log('🦙 Make sure your Llama model is running: docker run -d -p 11434:11434 ollama/ollama');
  console.log('   Then: docker exec -it <container_id> ollama run llama3.2:1B-Q8_0');
  console.log('\n' + '='.repeat(60));
  console.log('🎭 WELCOME TO THE AI POEM GENERATOR!');
  console.log('='.repeat(60));
  
  // Start the interactive poem generator
  promptForPoem();
}

// Start the server
app.listen(PORT, () => {
  console.log(`✅ Express server is running on port ${PORT}`);
});

// Start the interactive poem generator
startServer();
