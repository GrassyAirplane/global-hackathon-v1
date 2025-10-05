/**
 * LLM Meta-Judge
 * Final LLM-based analyzer asking "Are they talking to me?" for complex cases
 */

import modelAPI from '../gpt/gpt.js';

export class LLMMetaJudge {
  constructor(config = {}) {
    this.weight = config.weight || 0.20; // 20% of total score - highest weight for complex reasoning
    this.aiName = config.aiName || 'Mirai';
    this.maxTokens = config.maxTokens || 100;
    this.temperature = config.temperature || 0.3;
  }

  /**
   * Uses LLM to make a final judgment on conversation relevance
   * @param {Array} messages - Array of conversation messages
   * @returns {Object} - Score and reasoning
   */
  async analyze(messages) {
    if (!messages || messages.length === 0) {
      return { score: 0, reasoning: "No messages to analyze", confidence: 1.0 };
    }

    const lastMessage = messages[messages.length - 1];
    
    // Only analyze user messages
    if (lastMessage.role !== 'user') {
      return { score: 0, reasoning: "Last message is not from user", confidence: 1.0 };
    }

    try {
      // Prepare conversation context for LLM
      const conversationContext = this.prepareConversationContext(messages);
      const prompt = this.buildAnalysisPrompt(conversationContext);

      console.log('LLM Meta-Judge analyzing conversation...');
      
      const completion = await modelAPI.chat.completions.create({
        model: 'ai/llama3.2:1B-Q8_0',
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt()
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: this.maxTokens,
        temperature: this.temperature,
      });

      const response = completion.choices[0].message.content.trim();
      console.log('LLM Meta-Judge raw response:', response);

      // Parse LLM response
      return this.parseResponse(response);

    } catch (error) {
      console.error('Error in LLM Meta-Judge:', error.message);
      return { 
        score: 5.0, 
        reasoning: "LLM analysis failed - using neutral score",
        confidence: 0.3 
      };
    }
  }

  /**
   * Prepares conversation context for LLM analysis
   * @param {Array} messages - Array of conversation messages
   * @returns {string} - Formatted conversation context
   */
  prepareConversationContext(messages) {
    // Get last 5 messages for context (to avoid token limits)
    const recentMessages = messages.slice(-5);
    
    return recentMessages.map((msg, index) => {
      const role = msg.role === 'assistant' ? this.aiName : 'User';
      const isLast = index === recentMessages.length - 1;
      const marker = isLast ? ' ← LATEST MESSAGE' : '';
      return `${role}: ${msg.content}${marker}`;
    }).join('\n');
  }

  /**
   * Builds the analysis prompt for the LLM
   * @param {string} conversationContext - Formatted conversation
   * @returns {string} - Analysis prompt
   */
  buildAnalysisPrompt(conversationContext) {
    return `Analyze this conversation and determine if the AI assistant "${this.aiName}" should respond to the latest user message.

CONVERSATION:
${conversationContext}

ANALYSIS FRAMEWORK:
1. WHO is being addressed? (The AI directly, or someone else about the AI?)
2. WHAT is the intent? (Question, command, description, casual mention?)
3. CONTEXT clues? (Punctuation, grammar, conversational flow?)

SCORING LOGIC:
- Direct address TO AI (greetings, questions, commands) = 8-10
- Follow-up responses in conversation = 7-8  
- Ambiguous or unclear context = 4-6
- Describing or mentioning AI to others = 1-3

Look for linguistic patterns:
- Vocative case (name + comma/punctuation) suggests direct address
- Possessive forms or descriptive language suggests talking about
- Question words and imperatives suggest direct engagement
- Casual mentions often indicate third-party conversation

Respond with JSON:
- "score": Number 1-10 based on likelihood of direct address
- "reasoning": Explain your linguistic analysis
- "confidence": 0.1-1.0 based on clarity of indicators`;
  }

  /**
   * Gets the system prompt for the LLM
   * @returns {string} - System prompt
   */
  getSystemPrompt() {
    return `You are an expert conversation analyst specializing in determining when AI assistants should respond in natural conversations.

Your job is to analyze conversation context and determine if an AI assistant named "${this.aiName}" should respond to the latest user message.

CRITICAL DISTINCTION:
- TALKING TO AI: Direct address with name, questions, commands = HIGH SCORE (8-10)
- TALKING ABOUT AI: Describing AI to others, casual mentions = LOW SCORE (1-3)

SCORING GUIDELINES:
- 9-10: Clear direct address with intent (greetings + name, commands, questions TO the AI)
- 7-8: Follow-up responses, "you" questions likely directed at AI
- 4-6: Ambiguous context requiring careful analysis
- 1-3: Describing AI to others, casual mentions, possessive forms

KEY INDICATORS:
- Direct address: Name + comma/punctuation, greetings + name, commands
- Third-person: Possessive forms, past tense descriptions, casual mentions
- Context: Who is likely being addressed? What is the conversational setting?

Analyze the linguistic patterns and conversational context, not specific phrases.`;
  }

  /**
   * Parses the LLM response and extracts score, reasoning, and confidence
   * @param {string} response - Raw LLM response
   * @returns {Object} - Parsed response with score, reasoning, and confidence
   */
  parseResponse(response) {
    try {
      // Clean up markdown formatting if present
      let cleanResponse = response.trim();
      
      // Remove markdown code blocks
      cleanResponse = cleanResponse.replace(/```json\s*|```\s*/g, '');
      
      // Try to parse as JSON first
      const jsonResponse = JSON.parse(cleanResponse);
      
      let score = jsonResponse.score || 5.0;
      let reasoning = jsonResponse.reasoning || "LLM analysis provided";
      let confidence = jsonResponse.confidence || 0.7;

      // Validate and clamp values
      score = Math.max(1, Math.min(10, score));
      confidence = Math.max(0.1, Math.min(1.0, confidence));

      return {
        score,
        reasoning: `LLM Meta-Judge: ${reasoning}`,
        confidence,
        details: {
          rawResponse: response.substring(0, 200) + (response.length > 200 ? '...' : ''),
          parsedSuccessfully: true
        }
      };

    } catch (parseError) {
      console.log('LLM Meta-Judge JSON parsing failed, attempting fallback parsing...');
      
      // Fallback: try to extract score from text
      const scoreMatch = response.match(/(?:score|rating)[:=\s]*(\d+(?:\.\d+)?)/i);
      let score = scoreMatch ? parseFloat(scoreMatch[1]) : 5.0;
      score = Math.max(1, Math.min(10, score));

      // Try to extract reasoning
      const reasoningMatch = response.match(/(?:reasoning|explanation|because)[:=\s]*(.+?)(?:\n|$)/i);
      let reasoning = reasoningMatch ? reasoningMatch[1].trim() : "Unable to parse detailed reasoning";

      // Try to extract confidence
      const confidenceMatch = response.match(/(?:confidence)[:=\s]*(\d+(?:\.\d+)?)/i);
      let confidence = confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.5;
      confidence = Math.max(0.1, Math.min(1.0, confidence));

      return {
        score,
        reasoning: `LLM Meta-Judge: ${reasoning}`,
        confidence,
        details: {
          rawResponse: response.substring(0, 200) + (response.length > 200 ? '...' : ''),
          parsedSuccessfully: false,
          parseError: parseError.message
        }
      };
    }
  }

  /**
   * Gets the weight of this heuristic in the overall scoring
   * @returns {number}
   */
  getWeight() {
    return this.weight;
  }

  /**
   * Gets the name/identifier of this heuristic
   * @returns {string}
   */
  getName() {
    return 'LLMMetaJudge';
  }

  /**
   * Updates the AI name for this analyzer
   * @param {string} aiName - New AI name
   */
  setAiName(aiName) {
    this.aiName = aiName;
  }
}

export default LLMMetaJudge;