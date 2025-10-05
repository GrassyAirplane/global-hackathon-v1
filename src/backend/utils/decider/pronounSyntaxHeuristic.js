/**
 * Pronoun & Syntax Heuristic
 * Analyzes pronouns and syntax patterns that indicate direct address to the AI
 */

export class PronounSyntaxHeuristic {
  constructor(config = {}) {
    this.weight = config.weight || 0.20; // 20% of total score
  }

  /**
   * Analyzes messages for pronoun and syntax patterns indicating direct address
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
    const patterns = [];

    // Direct address pronouns - strong indicators
    const directAddressPatterns = [
      { pattern: /\byou\s+(are|were|can|could|will|would|should|might|must|need|have|had)\b/, score: 9, desc: "Direct 'you' + verb pattern" },
      { pattern: /\bcan\s+you\b/, score: 9, desc: "Direct question pattern 'can you'" },
      { pattern: /\bwould\s+you\b/, score: 9, desc: "Direct request pattern 'would you'" },
      { pattern: /\bcould\s+you\b/, score: 9, desc: "Direct request pattern 'could you'" },
      { pattern: /\bwill\s+you\b/, score: 8, desc: "Direct question pattern 'will you'" },
      { pattern: /\bdo\s+you\b/, score: 8, desc: "Direct question pattern 'do you'" },
      { pattern: /\bdid\s+you\b/, score: 8, desc: "Direct question pattern 'did you'" },
      { pattern: /\bhave\s+you\b/, score: 8, desc: "Direct question pattern 'have you'" },
    ];

    // Question patterns that suggest direct address
    const questionPatterns = [
      { pattern: /^what(\s+is|\s+are|\s+do|\s+did|\s+would|\s+should)\b/, score: 7, desc: "Question starting with 'what'" },
      { pattern: /^how(\s+do|\s+did|\s+can|\s+would|\s+should|\s+is|\s+are)\b/, score: 7, desc: "Question starting with 'how'" },
      { pattern: /^where(\s+is|\s+are|\s+do|\s+did|\s+can)\b/, score: 7, desc: "Question starting with 'where'" },
      { pattern: /^when(\s+is|\s+are|\s+do|\s+did|\s+will|\s+would)\b/, score: 7, desc: "Question starting with 'when'" },
      { pattern: /^why(\s+is|\s+are|\s+do|\s+did|\s+would|\s+should)\b/, score: 7, desc: "Question starting with 'why'" },
      { pattern: /\?$/, score: 5, desc: "Message ends with question mark" },
    ];

    // Command/imperative patterns
    const imperativePatterns = [
      { pattern: /^(please\s+)?(tell|show|give|find|get|help|explain|describe)\b/, score: 8, desc: "Imperative command pattern" },
      { pattern: /^(please\s+)?(check|look|search|calculate|create|make)\b/, score: 8, desc: "Imperative action pattern" },
      { pattern: /^please\s+/, score: 6, desc: "Polite request starting with 'please'" },
    ];

    // Conversational markers
    const conversationalPatterns = [
      { pattern: /\bthanks?\b|\bthank\s+you\b/, score: 6, desc: "Thank you pattern (suggests interaction)" },
      { pattern: /\bsorry\b|\bapologies\b/, score: 5, desc: "Apology pattern (suggests interaction)" },
      { pattern: /\bokay\b|\bok\b|\balright\b/, score: 4, desc: "Acknowledgment pattern" },
    ];

    // Conversational response patterns (common in follow-ups)
    const responsePatterns = [
      { pattern: /^(maybe|perhaps|possibly|probably)\b/, score: 6, desc: "Tentative response pattern" },
      { pattern: /^(well|hmm|uh|um)\b/, score: 5, desc: "Conversational filler (thinking)" },
      { pattern: /\bbut\s+i\s+(don't|can't|won't)\b/, score: 6, desc: "Qualification/concern pattern" },
      { pattern: /\bi\s+(think|believe|guess|suppose)\b/, score: 5, desc: "Opinion/response pattern" },
      { pattern: /\bdon't\s+know\b|\bnot\s+sure\b/, score: 6, desc: "Uncertainty response" },
      { pattern: /\bi\s+(would|could|might|should)\b/, score: 5, desc: "Conditional response" },
    ];

    // Check all pattern categories
    const allPatterns = [
      ...directAddressPatterns,
      ...questionPatterns,
      ...imperativePatterns,
      ...conversationalPatterns,
      ...responsePatterns
    ];

    let highestScore = 0;
    let matchedPatterns = [];

    for (const { pattern, score: patternScore, desc } of allPatterns) {
      if (pattern.test(content)) {
        matchedPatterns.push(desc);
        highestScore = Math.max(highestScore, patternScore);
      }
    }

    // Adjust confidence based on pattern strength
    if (matchedPatterns.length > 0) {
      score = highestScore;
      reasoning = `Detected patterns: ${matchedPatterns.slice(0, 2).join(', ')}`;
      confidence = this.calculateConfidence(matchedPatterns, content);
    } else {
      // Check for potential third-person references (negative indicators)
      if (this.hasThirdPersonIndicators(content)) {
        score = 1;
        reasoning = "Third-person reference detected (likely not addressing AI)";
        confidence = 0.8;
      } else {
        score = 3; // Neutral - no strong indicators either way
        reasoning = "No clear pronoun/syntax patterns detected";
        confidence = 0.5;
      }
    }

    return {
      score: Math.max(0, Math.min(10, score)),
      reasoning,
      confidence,
      details: {
        matchedPatterns,
        contentLength: content.length,
        hasQuestionMark: content.includes('?')
      }
    };
  }

  /**
   * Calculates confidence based on the strength and number of matched patterns
   * @param {Array} matchedPatterns - Array of matched pattern descriptions
   * @param {string} content - Message content
   * @returns {number} - Confidence score between 0 and 1
   */
  calculateConfidence(matchedPatterns, content) {
    let confidence = 0.7; // Base confidence

    // Increase confidence for multiple patterns
    if (matchedPatterns.length > 1) {
      confidence += 0.2;
    }

    // Increase confidence for longer, more structured messages
    if (content.length > 20) {
      confidence += 0.1;
    }

    // Decrease confidence for very short messages
    if (content.length < 10) {
      confidence -= 0.2;
    }

    return Math.max(0.3, Math.min(1.0, confidence));
  }

  /**
   * Checks for third-person indicators that suggest not talking to AI
   * @param {string} content - Message content (lowercase)
   * @returns {boolean}
   */
  hasThirdPersonIndicators(content) {
    const thirdPersonPatterns = [
      /\bhe\s+(is|was|will|would|can|could|should|has|had)\b/,
      /\bshe\s+(is|was|will|would|can|could|should|has|had)\b/,
      /\bthey\s+(are|were|will|would|can|could|should|have|had)\b/,
      /\bit\s+(is|was|will|would|can|could|should|has|had)\b/,
      /\bhis\s+/, /\bher\s+/, /\btheir\s+/, /\bits\s+/,
      /\babout\s+(him|her|them|it)\b/,
    ];

    return thirdPersonPatterns.some(pattern => pattern.test(content));
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
    return 'PronounSyntaxHeuristic';
  }
}

export default PronounSyntaxHeuristic;