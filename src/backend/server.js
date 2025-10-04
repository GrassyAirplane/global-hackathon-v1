import express from 'express';
import cors from 'cors';
import modelAPI from "./utils/gpt/gpt.js";
import APIRouter from './routes/api.js';

const app = express();
app.use(express.json());
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));

app.use("/api", APIRouter)

// api/verify

// async function testDMR() {
//   try {
//     console.log('Testing Docker Model Runner...\n');

//     // The prompt you’re sending to the model
//     const userMessage = {
//       role: 'user',
//       content: 'tell me a joke'
//     };

//     const completion = await modelAPI.chat.completions.create({
//       model: 'ai/llama3.2:1B-Q8_0',
//       messages: [userMessage],
//     });

//     const assistantMessage = completion.choices[0].message;

//     // 👇 Full combined log with user + assistant
//     const fullChat = {
//       id: completion.id || null,
//       object: completion.object || 'chat.completion',
//       created: completion.created || Math.floor(Date.now() / 1000),
//       model: completion.model,
//       conversation: [
//         userMessage,
//         assistantMessage
//       ],
//       choices: completion.choices.map((choice, index) => ({
//         index,
//         finish_reason: choice.finish_reason,
//         message: choice.message
//       }))
//     };

//     console.log(JSON.stringify(fullChat, null, 2));
//     console.log('\n✓ Docker Model Runner is working!');

//   } catch (error) {
//     console.error('Error:', error.message);
//     console.error('\nMake sure:');
//     console.error('1. Docker Model Runner is enabled in Docker Desktop');
//     console.error('2. TCP support is enabled on port 12434');
//     console.error('3. The model is running: docker model run ai/llama3.2:1B-Q8_0');
//   }
// }

// testDMR();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 API available at http://localhost:${PORT}/api/verify`);
});
