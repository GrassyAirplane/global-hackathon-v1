import RelevanceOrchestrator from '../utils/decider/relevanceOrchestrator.js';

// Initialize the orchestrator with configuration
const orchestrator = new RelevanceOrchestrator({
  aiName: 'Mirai',
  enableLLMMetaJudge: true,
  debug: true, // Set to true for detailed logging
  weights: {
    nameMention: 0.30,        // 30% - Direct name mentions are very strong indicators
    pronounSyntax: 0.25,      // 25% - Grammar patterns are quite reliable
    llmMetaJudge: 0.20,       // 20% - LLM provides nuanced understanding
    conversationalFlow: 0.20, // 20% - Flow analysis helps with context
    semanticSimilarity: 0.05  // 5% - Topic continuity is helpful but less critical
  }
});

const verifyRelevance = async (req, res) => {
  try {
    console.log("Verification request received:", req.body);
    
    const { messages } = req.body;
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ 
        error: "Invalid request. 'messages' array is required." 
      });
    }
    
    // Use the orchestrator to analyze conversation relevance
    const analysisResult = await orchestrator.analyzeRelevance(messages);
    
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
      message: `Score: ${analysisResult.score.toFixed(1)}/10 - ${action.replace('_', ' ')}`,
      details: analysisResult.details // Include orchestrator details for debugging
    });
    
  } catch (error) {
    console.error('Error in verifyRelevance:', error);
    res.status(500).json({ 
      error: "Internal server error while analyzing conversation" 
    });
  }
};

export default verifyRelevance;