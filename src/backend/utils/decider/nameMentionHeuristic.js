/**
 * Name Mention Heuristic
 * Detects direct mentions of the AI's name or similar patterns that indicate direct address
 */

export class NameMentionHeuristic {
  constructor(config = {}) {
    this.aiName = config.aiName || 'Mirai';
    this.aliases = config.aliases || ['AI', 'Assistant', 'Bot'];
    this.weight = config.weight || 0.25; // 25% of total score
  }

  /**
   * Analyzes messages for direct name mentions or aliases
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

    const content = lastMessage.content.toLowerCase();
    let score = 0;
    let reasoning = "";
    let confidence = 1.0;

    // First check for third-person indicators (talking ABOUT the AI)
    if (this.isThirdPersonReference(content)) {
      score = 1;
      reasoning = `Third-person reference to ${this.aiName} detected (talking about, not to)`;
      confidence = 0.9;
    }
    // Check for direct name mention (talking TO the AI)
    else if (content.includes(this.aiName.toLowerCase())) {
      // Check if it's in a direct address context
      if (this.isDirectAddress(content)) {
        score = 10;
        reasoning = `Direct address to AI name "${this.aiName}" detected`;
      } else {
        score = 3;
        reasoning = `AI name "${this.aiName}" mentioned but context unclear`;
        confidence = 0.6;
      }
    }
    // Check for aliases
    else if (this.aliases.some(alias => content.includes(alias.toLowerCase()))) {
      const foundAlias = this.aliases.find(alias => content.includes(alias.toLowerCase()));
      if (this.isDirectAddress(content)) {
        score = 8;
        reasoning = `Direct address using AI alias "${foundAlias}"`;
      } else {
        score = 2;
        reasoning = `AI alias "${foundAlias}" mentioned but unclear context`;
        confidence = 0.6;
      }
    }
    // Check for common address patterns
    else if (this.hasAddressPatterns(content)) {
      score = 6;
      reasoning = "Potential address pattern detected (hey, hello, etc.)";
      confidence = 0.7; // Lower confidence for patterns
    }
    else {
      score = 0;
      reasoning = "No name mentions or address patterns found";
    }

    return {
      score: Math.max(0, Math.min(10, score)),
      reasoning,
      confidence,
      details: {
        aiName: this.aiName,
        contentAnalyzed: content.substring(0, 100) + (content.length > 100 ? '...' : '')
      }
    };
  }

  /**
   * Checks if the message is a third-person reference (talking ABOUT the AI)
   * @param {string} content - Message content (lowercase)
   * @returns {boolean}
   */
  isThirdPersonReference(content) {
    const aiName = this.aiName.toLowerCase();
    
    // Check for possessive forms (AI's, AI has, etc.)
    if (new RegExp(`${aiName}'s\\s+\\w+`).test(content)) {
      return true;
    }
    
    // Check for descriptive statements about the AI
    const descriptiveWords = ['is', 'was', 'has', 'had', 'been', 'seems', 'looks', 'sounds', 'helps', 'helped', 'works', 'worked'];
    for (const word of descriptiveWords) {
      if (new RegExp(`${aiName}\\s+${word}\\b`).test(content)) {
        return true;
      }
    }
    
    // Check for conversational acknowledgments at start
    const acknowledgmentWords = ['yeah', 'yes', 'well', 'so'];
    for (const ack of acknowledgmentWords) {
      if (new RegExp(`^${ack}[,\\s]+${aiName}\\b`).test(content)) {
        return true;
      }
    }
    
    // Check for discussing/describing patterns
    const discussionWords = ['about', 'with', 'using', 'that', 'this'];
    for (const word of discussionWords) {
      if (new RegExp(`\\b${word}\\s+${aiName}\\b`).test(content)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Checks if the name mention is in a direct address context
   * @param {string} content - Message content (lowercase)
   * @returns {boolean}
   */
  isDirectAddress(content) {
    const aiName = this.aiName.toLowerCase();
    
    // Check for greeting patterns at start
    const greetings = ['hey', 'hi', 'hello', 'yo'];
    for (const greeting of greetings) {
      if (new RegExp(`^${greeting}[,\\s]+${aiName}\\b`).test(content)) {
        return true;
      }
    }
    
    // Check for name followed by comma or colon (direct address punctuation)
    if (new RegExp(`\\b${aiName}\\s*[,:]+`).test(content)) {
      return true;
    }
    
    // Check for imperative patterns (commands/requests)
    const imperativeWords = ['can', 'could', 'would', 'will', 'please', 'help'];
    for (const word of imperativeWords) {
      if (new RegExp(`\\b${aiName}[,\\s]+${word}\\b`).test(content)) {
        return true;
      }
    }
    
    // Check for question patterns
    const questionWords = ['what', 'how', 'why', 'when', 'where', 'who'];
    for (const qword of questionWords) {
      if (new RegExp(`\\b${aiName}[,\\s]+${qword}\\b`).test(content)) {
        return true;
      }
    }
    
    // Check for action requests
    const actionWords = ['tell', 'show', 'give', 'find', 'get', 'explain', 'describe'];
    for (const action of actionWords) {
      if (new RegExp(`\\b(ask|tell)\\s+${aiName}\\b`).test(content) ||
          new RegExp(`\\b${aiName}[,\\s]+${action}\\b`).test(content)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Checks for common address patterns that might indicate talking to AI
   * @param {string} content - Message content (lowercase)
   * @returns {boolean}
   */
  hasAddressPatterns(content) {
    const addressPatterns = [
      /^hey[\s,]/, // "hey,"
      /^hello[\s,]/, // "hello,"
      /^hi[\s,]/, // "hi,"
      /\bhey\s+(?:there|you)\b/, // "hey there", "hey you"
      /\bcan\s+you\b/, // "can you"
      /\bwould\s+you\b/, // "would you"
      /\bcould\s+you\b/, // "could you"
      /\bwill\s+you\b/, // "will you"
      /\bplease\s+/, // "please [do something]"
    ];

    return addressPatterns.some(pattern => pattern.test(content));
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
    return 'NameMentionHeuristic';
  }
}

export default NameMentionHeuristic;