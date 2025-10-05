/**
 * Semantic Similarity Module
 * Compares current message to last AI message for topical relevance and follow-up detection
 */

export class SemanticSimilarityModule {
  constructor(config = {}) {
    this.baseWeight = config.weight || 0.05; // Base weight (5% of total score)
    this.similarityThreshold = config.similarityThreshold || 0.3;
    this.minMessagesForFullWeight = config.minMessagesForFullWeight || 6; // Need 6+ messages for full weight
    this.minWeight = config.minWeight || 0.01; // Minimum weight for very short conversations
  }

  /**
   * Analyzes semantic similarity between user message and previous AI responses
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

    // Calculate dynamic weight based on conversation length
    const conversationLength = messages.length;
    const dynamicWeight = this.calculateDynamicWeight(conversationLength);

    // Find the most recent AI message
    const lastAiMessage = this.findLastAiMessage(messages);
    
    if (!lastAiMessage) {
      return { 
        score: conversationLength <= 2 ? 1 : 3, 
        reasoning: `No previous AI message to compare (conversation too short: ${conversationLength} messages)`, 
        confidence: 0.5,
        adjustedWeight: dynamicWeight 
      };
    }

    const userContent = lastMessage.content.toLowerCase();
    const aiContent = lastAiMessage.content.toLowerCase();

    // Perform semantic similarity analysis
    const similarity = this.calculateSimilarity(userContent, aiContent);
    const topicalRelevance = this.analyzeTopicalRelevance(userContent, aiContent);
    const referenceAnalysis = this.analyzeReferences(userContent, aiContent);

    let score = 0;
    let reasoning = "";
    let confidence = 0.7;

    // Adjust scoring based on conversation length
    if (conversationLength <= 2) {
      // Very short conversations - semantic similarity is less meaningful
      score = Math.min(3, score);
      reasoning = `Short conversation (${conversationLength} messages) - semantic similarity less reliable`;
      confidence = 0.3;
    } else if (conversationLength <= 4) {
      // Short conversations - reduce semantic similarity impact
      if (similarity.jaccard > 0.4 || similarity.cosine > 0.5) {
        score = 6; // Reduced from 8
        reasoning = `Moderate semantic similarity in short conversation (${conversationLength} messages)`;
        confidence = 0.6;
      } else if (topicalRelevance.score > 6) {
        score = Math.min(6, topicalRelevance.score);
        reasoning = topicalRelevance.reason + ` (short conversation: ${conversationLength} messages)`;
        confidence = 0.5;
      } else if (referenceAnalysis.score > 0) {
        score = referenceAnalysis.score;
        reasoning = referenceAnalysis.reason;
        confidence = 0.7;
      } else {
        score = 1;
        reasoning = `Low semantic similarity in short conversation (${conversationLength} messages)`;
        confidence = 0.4;
      }
    } else {
      // Longer conversations - full semantic similarity analysis
      if (similarity.jaccard > 0.4 || similarity.cosine > 0.5) {
        score = 8;
        reasoning = "High semantic similarity to previous AI message";
        confidence = 0.9;
      } else if (similarity.jaccard > 0.2 || similarity.cosine > 0.3) {
        score = 6;
        reasoning = "Moderate semantic similarity to previous AI message";
        confidence = 0.8;
      } else if (topicalRelevance.score > 6) {
        score = topicalRelevance.score;
        reasoning = topicalRelevance.reason;
        confidence = 0.7;
      } else if (referenceAnalysis.score > 0) {
        score = referenceAnalysis.score;
        reasoning = referenceAnalysis.reason;
        confidence = 0.8;
      } else {
        score = 2;
        reasoning = "Low semantic similarity to previous AI message";
        confidence = 0.6;
      }
    }

    return {
      score: Math.max(0, Math.min(10, score)),
      reasoning,
      confidence,
      adjustedWeight: dynamicWeight,
      conversationLength,
      details: {
        jaccardSimilarity: similarity.jaccard,
        cosineSimilarity: similarity.cosine,
        sharedKeywords: similarity.sharedKeywords,
        topicalRelevance: topicalRelevance.score,
        referenceScore: referenceAnalysis.score,
        baseWeight: this.baseWeight,
        dynamicWeight: dynamicWeight
      }
    };
  }

  /**
   * Finds the most recent AI message in the conversation
   * @param {Array} messages - Array of conversation messages
   * @returns {Object|null} - Last AI message or null if none found
   */
  findLastAiMessage(messages) {
    for (let i = messages.length - 2; i >= 0; i--) {
      if (messages[i].role === 'assistant') {
        return messages[i];
      }
    }
    return null;
  }

  /**
   * Calculates similarity between two text strings using multiple methods
   * @param {string} text1 - First text (user message)
   * @param {string} text2 - Second text (AI message)
   * @returns {Object} - Similarity scores and shared keywords
   */
  calculateSimilarity(text1, text2) {
    const words1 = this.extractKeywords(text1);
    const words2 = this.extractKeywords(text2);

    // Jaccard similarity
    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);
    const jaccard = union.size > 0 ? intersection.size / union.size : 0;

    // Simple cosine similarity approximation
    const cosine = this.calculateCosineSimilarity(words1, words2);

    return {
      jaccard,
      cosine,
      sharedKeywords: Array.from(intersection)
    };
  }

  /**
   * Extracts meaningful keywords from text
   * @param {string} text - Input text
   * @returns {Set} - Set of keywords
   */
  extractKeywords(text) {
    // Remove common stop words and short words
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
      'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does',
      'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'i', 'you', 'he',
      'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his',
      'her', 'its', 'our', 'their', 'this', 'that', 'these', 'those'
    ]);

    const words = text
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .map(word => word.toLowerCase())
      .filter(word => word.length > 2 && !stopWords.has(word));

    return new Set(words);
  }

  /**
   * Calculates a simple cosine similarity approximation
   * @param {Set} words1 - Keywords from first text
   * @param {Set} words2 - Keywords from second text
   * @returns {number} - Cosine similarity score
   */
  calculateCosineSimilarity(words1, words2) {
    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const magnitude1 = Math.sqrt(words1.size);
    const magnitude2 = Math.sqrt(words2.size);
    
    if (magnitude1 === 0 || magnitude2 === 0) return 0;
    
    return intersection.size / (magnitude1 * magnitude2);
  }

  /**
   * Analyzes topical relevance using domain-specific patterns
   * @param {string} userText - User message content
   * @param {string} aiText - AI message content
   * @returns {Object} - Topical relevance score and reason
   */
  analyzeTopicalRelevance(userText, aiText) {
    // Extract topics/entities from AI message
    const aiTopics = this.extractTopics(aiText);
    const userTopics = this.extractTopics(userText);
    
    // Extract broader themes and categories
    const aiThemes = this.extractThemes(aiText);
    const userThemes = this.extractThemes(userText);

    // Check for direct topic overlap
    const topicOverlap = aiTopics.filter(topic => 
      userTopics.some(userTopic => 
        userTopic.includes(topic) || topic.includes(userTopic)
      )
    );

    // Check for thematic connections (e.g., "Japanese food" → "sushi")
    const themeOverlap = aiThemes.filter(theme =>
      userThemes.some(userTheme => 
        userTheme === theme
      )
    );

    if (topicOverlap.length > 0) {
      return {
        score: Math.min(8, 5 + topicOverlap.length),
        reason: `Direct topical relevance: shared topics (${topicOverlap.slice(0, 2).join(', ')})`
      };
    }
    
    if (themeOverlap.length > 0) {
      return {
        score: Math.min(7, 4 + themeOverlap.length),
        reason: `Thematic relevance: related themes (${themeOverlap.slice(0, 2).join(', ')})`
      };
    }

    return { score: 0, reason: "" };
  }

  /**
   * Extracts broader themes/categories from text
   * @param {string} text - Input text
   * @returns {Array} - Array of themes
   */
  extractThemes(text) {
    const themes = [];
    const lowerText = text.toLowerCase();
    
    // Food-related themes
    const foodThemes = {
      'food': ['food', 'eat', 'eating', 'cook', 'cooking', 'meal', 'dish', 'recipe'],
      'japanese-food': ['japanese', 'sushi', 'ramen', 'tempura', 'miso', 'sake', 'wasabi'],
      'cooking': ['cook', 'cooking', 'bake', 'baking', 'prepare', 'kitchen', 'chef'],
    };
    
    // Technology themes
    const techThemes = {
      'technology': ['tech', 'computer', 'software', 'app', 'digital', 'online'],
      'programming': ['code', 'coding', 'program', 'development', 'api', 'function'],
    };
    
    // Learning themes
    const learningThemes = {
      'learning': ['learn', 'learning', 'study', 'education', 'tutorial', 'guide'],
      'help': ['help', 'assist', 'support', 'advice', 'guidance', 'tips'],
    };
    
    const allThemes = { ...foodThemes, ...techThemes, ...learningThemes };
    
    for (const [theme, keywords] of Object.entries(allThemes)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        themes.push(theme);
      }
    }
    
    return themes;
  }

  /**
   * Extracts topics/entities from text using simple heuristics
   * @param {string} text - Input text
   * @returns {Array} - Array of potential topics
   */
  extractTopics(text) {
    // Simple topic extraction - could be enhanced with NLP libraries
    const topics = [];
    
    // Extract capitalized words (potential proper nouns)
    const capitalizedWords = text.match(/\b[A-Z][a-z]+\b/g) || [];
    topics.push(...capitalizedWords.map(word => word.toLowerCase()));
    
    // Extract quoted phrases
    const quotedPhrases = text.match(/"([^"]+)"/g) || [];
    topics.push(...quotedPhrases.map(phrase => phrase.replace(/"/g, '').toLowerCase()));
    
    // Extract compound words or technical terms
    const compoundWords = text.match(/\b\w+[-_]\w+\b/g) || [];
    topics.push(...compoundWords.map(word => word.toLowerCase()));
    
    return [...new Set(topics)]; // Remove duplicates
  }

  /**
   * Analyzes direct references to AI's previous message
   * @param {string} userText - User message content
   * @param {string} aiText - AI message content
   * @returns {Object} - Reference analysis score and reason
   */
  analyzeReferences(userText, aiText) {
    const referencePatterns = [
      /\bthat\b.*\b(you|said|mentioned|told|suggested)\b/,
      /\byour\s+(answer|response|suggestion|recommendation|idea)\b/,
      /\bwhat\s+you\s+(said|mentioned|told|suggested)\b/,
      /\bas\s+you\s+(said|mentioned|suggested)\b/,
      /\blike\s+you\s+(said|mentioned|suggested)\b/,
      /\babout\s+what\s+you\b/,
      /\bin\s+your\s+(last|previous)\s+(message|response)\b/
    ];

    for (const pattern of referencePatterns) {
      if (pattern.test(userText)) {
        return {
          score: 8,
          reason: "Direct reference to AI's previous message"
        };
      }
    }

    // Check for demonstrative pronouns that might refer to AI content
    const demonstrativePatterns = [
      /\bthat\s+(is|was|seems|sounds)\b/,
      /\bthis\s+(is|was|seems|sounds)\b/,
      /\bthose\s+(are|were|seem|sound)\b/,
      /\bthese\s+(are|were|seem|sound)\b/
    ];

    for (const pattern of demonstrativePatterns) {
      if (pattern.test(userText)) {
        return {
          score: 5,
          reason: "Potential reference to AI content (demonstrative pronouns)"
        };
      }
    }

    return { score: 0, reason: "" };
  }

  /**
   * Calculates dynamic weight based on conversation length
   * @param {number} conversationLength - Number of messages in conversation
   * @returns {number} - Adjusted weight
   */
  calculateDynamicWeight(conversationLength) {
    if (conversationLength <= 2) {
      // Very short conversations: minimal weight
      return this.minWeight;
    } else if (conversationLength <= 4) {
      // Short conversations: reduced weight
      return this.baseWeight * 0.5;
    } else if (conversationLength < this.minMessagesForFullWeight) {
      // Growing conversations: gradually increase weight
      const progress = (conversationLength - 4) / (this.minMessagesForFullWeight - 4);
      return this.baseWeight * (0.5 + (0.5 * progress));
    } else {
      // Long conversations: full weight
      return this.baseWeight;
    }
  }

  /**
   * Gets the weight of this heuristic in the overall scoring
   * Can be called with conversation length for dynamic weight
   * @param {number} conversationLength - Optional conversation length for dynamic weight
   * @returns {number}
   */
  getWeight(conversationLength = null) {
    if (conversationLength !== null) {
      return this.calculateDynamicWeight(conversationLength);
    }
    return this.baseWeight;
  }

  /**
   * Gets the name/identifier of this heuristic
   * @returns {string}
   */
  getName() {
    return 'SemanticSimilarityModule';
  }
}

export default SemanticSimilarityModule;