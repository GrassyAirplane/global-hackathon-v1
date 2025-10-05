/**
 * Conversational Flow Analyzer
 * Evaluates conversation flow and context to determine if a response is expected
 */

export class ConversationalFlowAnalyzer {
  constructor(config = {}) {
    this.weight = config.weight || 0.15; // 15% of total score
    this.maxHistoryLength = config.maxHistoryLength || 10; // Look at last 10 messages
  }

  /**
   * Analyzes conversation flow to determine response expectation
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

    // Get recent conversation history
    const recentMessages = messages.slice(-this.maxHistoryLength);
    
    let score = 0;
    let reasoning = "";
    let confidence = 0.8;
    const flowIndicators = [];

    // Analyze conversation patterns
    const flowAnalysis = this.analyzeFlow(recentMessages);
    
    // 1. Check if this is a follow-up to AI's last response
    const followUpScore = this.analyzeFollowUp(recentMessages);
    if (followUpScore.score > 0) {
      flowIndicators.push(followUpScore.reason);
      score = Math.max(score, followUpScore.score);
    }

    // 2. Check conversation continuity
    const continuityScore = this.analyzeContinuity(recentMessages);
    if (continuityScore.score > 0) {
      flowIndicators.push(continuityScore.reason);
      score = Math.max(score, continuityScore.score);
    }

    // 3. Check engagement patterns
    const engagementScore = this.analyzeEngagement(recentMessages);
    if (engagementScore.score > 0) {
      flowIndicators.push(engagementScore.reason);
      score = Math.max(score, engagementScore.score);
    }

    // 4. Check for conversation gaps
    const gapScore = this.analyzeConversationGaps(recentMessages);
    if (gapScore.score > 0) {
      flowIndicators.push(gapScore.reason);
      score = Math.max(score, gapScore.score);
    }

    // 5. Check for topic coherence
    const coherenceScore = this.analyzeTopicCoherence(recentMessages);
    if (coherenceScore.score > 0) {
      flowIndicators.push(coherenceScore.reason);
      score = Math.max(score, coherenceScore.score);
    }

    if (flowIndicators.length === 0) {
      score = 4; // Neutral flow
      reasoning = "No clear conversational flow indicators";
      confidence = 0.5;
    } else {
      reasoning = `Flow indicators: ${flowIndicators.slice(0, 2).join(', ')}`;
      confidence = Math.min(1.0, 0.6 + (flowIndicators.length * 0.1));
    }

    return {
      score: Math.max(0, Math.min(10, score)),
      reasoning,
      confidence,
      details: {
        flowIndicators,
        messageCount: recentMessages.length,
        lastMessageRole: lastMessage.role,
        conversationLength: messages.length
      }
    };
  }

  /**
   * Analyzes if current message is a follow-up to AI's previous response
   * @param {Array} messages - Recent conversation messages
   * @returns {Object} - Score and reason
   */
  analyzeFollowUp(messages) {
    if (messages.length < 2) {
      return { score: 0, reason: "" };
    }

    const lastUserMessage = messages[messages.length - 1];
    const previousMessage = messages[messages.length - 2];

    // If previous message was from AI, this is likely a follow-up
    if (previousMessage.role === 'assistant') {
      const userContent = lastUserMessage.content.toLowerCase();
      const aiContent = previousMessage.content.toLowerCase();
      
      // Check if AI asked a question and user is responding
      if (aiContent.includes('?') || aiContent.match(/\b(what|how|which|any|do you|would you|can you)\b/)) {
        // Strong follow-up indicators for question responses
        const strongFollowUpPatterns = [
          /^(yes|yeah|yep|no|nope|maybe|perhaps)\b/,
          /^(i think|i believe|i guess|i suppose)\b/,
          /^(well|hmm|uh|um)\b/,
          /\b(but|however|although|though)\b/,
          /\bdon't know\b|\bnot sure\b/,
        ];

        if (strongFollowUpPatterns.some(pattern => pattern.test(userContent))) {
          return { score: 9, reason: "Strong response to AI's question" };
        }
        
        // Any response following AI question is likely a follow-up
        return { score: 8, reason: "Response following AI question" };
      }
      
      // General follow-up patterns
      const generalFollowUpPatterns = [
        /^(thanks|thank you|ok|okay|alright)\b/,
        /^(but|however|although|though)\b/,
        /^(and|also|additionally|furthermore)\b/,
        /^(wait|hold on|actually)\b/,
        /\bthat('s| is| was)\b/,
        /\bthis\b/,
        /\byour\s+(answer|response|suggestion)\b/
      ];

      if (generalFollowUpPatterns.some(pattern => pattern.test(userContent))) {
        return { score: 7, reason: "Follow-up indicators to AI response" };
      }

      // Direct follow-up (no specific patterns but follows AI message)
      return { score: 6, reason: "Direct follow-up to AI message" };
    }

    return { score: 0, reason: "" };
  }

  /**
   * Analyzes conversation continuity and natural flow
   * @param {Array} messages - Recent conversation messages
   * @returns {Object} - Score and reason
   */
  analyzeContinuity(messages) {
    if (messages.length < 3) {
      return { score: 3, reason: "Limited conversation history" };
    }

    const userMessages = messages.filter(msg => msg.role === 'user');
    const aiMessages = messages.filter(msg => msg.role === 'assistant');

    // Check for balanced conversation
    if (userMessages.length > 0 && aiMessages.length > 0) {
      const ratio = Math.min(userMessages.length, aiMessages.length) / Math.max(userMessages.length, aiMessages.length);
      
      if (ratio > 0.7) {
        return { score: 7, reason: "Balanced conversational exchange" };
      } else if (ratio > 0.4) {
        return { score: 5, reason: "Moderate conversational exchange" };
      }
    }

    return { score: 3, reason: "Unbalanced conversation flow" };
  }

  /**
   * Analyzes engagement patterns in the conversation
   * @param {Array} messages - Recent conversation messages
   * @returns {Object} - Score and reason
   */
  analyzeEngagement(messages) {
    const lastMessage = messages[messages.length - 1];
    const content = lastMessage.content.toLowerCase();

    // High engagement indicators
    const highEngagementPatterns = [
      /\binteresting\b|\bfascinating\b|\bamazing\b/,
      /\btell me more\b|\bexplain\b|\belaborate\b/,
      /\bi('d| would) like to\b/,
      /\bwhat if\b|\bhypothetically\b/,
      /\bby the way\b|\balso\b|\bbtw\b/
    ];

    if (highEngagementPatterns.some(pattern => pattern.test(content))) {
      return { score: 7, reason: "High engagement indicators" };
    }

    // Medium engagement indicators
    const mediumEngagementPatterns = [
      /\breally\?|\bseriously\?|\bis that so\?/,
      /\bhuh\b|\bhmm\b|\binteresting\b/,
      /\bi think\b|\bi believe\b|\bin my opinion\b/
    ];

    if (mediumEngagementPatterns.some(pattern => pattern.test(content))) {
      return { score: 5, reason: "Moderate engagement indicators" };
    }

    return { score: 0, reason: "" };
  }

  /**
   * Analyzes conversation gaps and timing
   * @param {Array} messages - Recent conversation messages
   * @returns {Object} - Score and reason
   */
  analyzeConversationGaps(messages) {
    // In this implementation, we don't have timestamps, so we analyze message sequence
    const lastMessage = messages[messages.length - 1];
    
    // If there are multiple consecutive user messages, it might indicate expectation
    if (messages.length >= 2) {
      const previousMessage = messages[messages.length - 2];
      if (previousMessage.role === 'user' && lastMessage.role === 'user') {
        return { score: 6, reason: "Multiple consecutive user messages (expecting response)" };
      }
    }

    return { score: 0, reason: "" };
  }

  /**
   * Analyzes topic coherence in the conversation
   * @param {Array} messages - Recent conversation messages
   * @returns {Object} - Score and reason
   */
  analyzeTopicCoherence(messages) {
    if (messages.length < 3) {
      return { score: 0, reason: "" };
    }

    const lastMessage = messages[messages.length - 1].content.toLowerCase();
    const previousMessages = messages.slice(-3, -1);

    // Simple keyword overlap analysis
    const lastWords = new Set(lastMessage.split(/\s+/).filter(word => word.length > 3));
    let overlapFound = false;

    for (const prevMsg of previousMessages) {
      const prevWords = new Set(prevMsg.content.toLowerCase().split(/\s+/).filter(word => word.length > 3));
      const overlap = new Set([...lastWords].filter(word => prevWords.has(word)));
      
      if (overlap.size > 0) {
        overlapFound = true;
        break;
      }
    }

    if (overlapFound) {
      return { score: 6, reason: "Topic coherence with previous messages" };
    }

    return { score: 0, reason: "" };
  }

  /**
   * Performs overall flow analysis
   * @param {Array} messages - Recent conversation messages
   * @returns {Object} - Flow analysis results
   */
  analyzeFlow(messages) {
    return {
      messageCount: messages.length,
      userMessageCount: messages.filter(msg => msg.role === 'user').length,
      assistantMessageCount: messages.filter(msg => msg.role === 'assistant').length,
      lastMessageRole: messages[messages.length - 1]?.role,
      conversationDepth: messages.length > 5 ? 'deep' : messages.length > 2 ? 'moderate' : 'shallow'
    };
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
    return 'ConversationalFlowAnalyzer';
  }
}

export default ConversationalFlowAnalyzer;