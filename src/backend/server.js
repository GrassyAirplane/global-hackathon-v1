import express from 'express';
import cors from 'cors';
import modelAPI from "./utils/gpt/gpt.js";

const app = express();
app.use(express.json());
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));

async function testDMR() {
  try {
    console.log('Testing Docker Model Runner...\n');
    
    const completion = await modelAPI.chat.completions.create({
      model: 'ai/llama3.2:1B-Q8_0',
      messages: [
        {
          role: 'user',
          content: 'tell me a joke'
        }
      ],
    });

    console.log('Response from model:');
    console.log(completion.choices[0].message.content);
    console.log('\n✓ Docker Model Runner is working!');
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error('\nMake sure:');
    console.error('1. Docker Model Runner is enabled in Docker Desktop');
    console.error('2. TCP support is enabled on port 12434');
    console.error('3. The model is running: docker model run ai/llama3.2:1B-Q8_0');
  }
}

testDMR();
