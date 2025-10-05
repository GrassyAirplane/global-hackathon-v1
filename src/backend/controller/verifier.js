import modelAPI from '../utils/gpt/gpt.js';

const verifyRelevance = async (req, res) => {
  try {
    console.log("Verification request received:", req.body);
    
    const { messages } = req.body;
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ 
        error: "Invalid request. 'messages' array is required." 
      });
    }
    
    // Get the relevance analysis from our AI model
    const analysisResult = await analyzeConversationRelevance(messages);
    
    // Determine action based on score
    let action;
    if (analysisResult.score >= 7) {
      action = "respond";
    } else if (analysisResult.score >= 4) {
      action = "maybe_respond";
    } else {
      action = "ignore";
    }
    
    res.json({ 
      relevanceScore: analysisResult.score,
      reasoning: analysisResult.reasoning,
      action: action,
      message: `Score: ${analysisResult.score}/10 - ${action.replace('_', ' ')}`
    });
    
  } catch (error) {
    console.error('Error in verifyRelevance:', error);
    res.status(500).json({ 
      error: "Internal server error while analyzing conversation" 
    });
  }
};

async function analyzeConversationRelevance(messages) {
  try {
    console.log('Analyzing conversation relevance with Llama...\n');

    // Create a prompt for the AI to analyze conversation relevance
    const conversationText = messages.map(msg => 
      `${msg.role}: ${msg.content}`
    ).join('\n');

    console.log('Conversation to analyze:\n', conversationText);
    
    const systemPrompt = `You are an AI conversation relevance detector for an AI companion named "Mirai". 

Your job is to analyze conversations and determine if Mirai should respond based on the context.

SCORING CRITERIA (1-10):
- 10: Direct mention of "Mirai" or clear question/request directed at the AI
- 8-9: Strong contextual indication that a response is expected 
- 6-7: Conversational flow suggests engagement is appropriate
- 4-5: Ambiguous - might be talking to AI, unclear context
- 2-3: Likely talking to someone else or monologuing
- 1: Clearly not directed at AI (self-talk, talking about AI to others)

DECISION LOGIC:
- Score 7-10: Respond (clear indication)
- Score 4-6: Maybe respond (uncertain context)  
- Score 1-3: Ignore (not directed at AI)

Analyze this conversation and respond with a JSON object containing:
1. "score": A number from 1-10 
2. "reasoning": A brief explanation (1-2 sentences) of why you gave this score

Example response format:
{"score": 8, "reasoning": "User directly mentions Mirai by name and asks a clear question, indicating they expect a response from the AI assistant."}`;

    const completion = await modelAPI.chat.completions.create({
      model: 'ai/llama3.2:1B-Q8_0',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: `Conversation to analyze:\n${conversationText}\n\nProvide your analysis as JSON:`
        }
      ],
      max_tokens: 150,
      temperature: 0.3,
    });

    const response = completion.choices[0].message.content.trim();
    console.log('Raw AI response:', response);
    
    try {
      // Try to parse as JSON first
      const jsonResponse = JSON.parse(response);
      let score = jsonResponse.score || 5.0;
      let reasoning = jsonResponse.reasoning || "No reasoning provided";
      
      // Ensure score is within 1-10 range
      score = Math.max(1, Math.min(10, score));
      
      console.log(`Relevance Analysis Complete - Score: ${score}/10`);
      console.log(`Reasoning: ${reasoning}`);
      
      return { score, reasoning };
      
    } catch (parseError) {
      // Fallback: try to extract just the number if JSON parsing fails
      console.log('JSON parsing failed, trying number extraction...');
      const scoreMatch = response.match(/(\d+(?:\.\d+)?)/);
      let score = scoreMatch ? parseFloat(scoreMatch[1]) : 5.0;
      score = Math.max(1, Math.min(10, score));
      
      return { 
        score, 
        reasoning: "Unable to parse detailed reasoning from model response" 
      };
    }

  } catch (error) {
    console.error('Error analyzing conversation relevance:', error.message);
    // Return a default score of 5 if analysis fails
    return { 
      score: 5.0, 
      reasoning: "Error occurred during analysis - using default score" 
    };
  }
}

export default verifyRelevance;