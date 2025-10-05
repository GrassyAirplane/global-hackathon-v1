/**
 * Relevance Orchestrator
 * Main orchestration file that runs all heuristics in parallel and fuses scores with weighted logic
 */

import NameMentionHeuristic from './nameMentionHeuristic.js';
import PronounSyntaxHeuristic from './pronounSyntaxHeuristic.js';
import ConversationalFlowAnalyzer from './conversationalFlowAnalyzer.js';
import SemanticSimilarityModule from './semanticSimilarityModule.js';
import LLMMetaJudge from './llmMetaJudge.js';

export class RelevanceOrchestrator {
  constructor(config = {}) {
    this.aiName = config.aiName || 'Mirai';
    this.enableLLMMetaJudge = config.enableLLMMetaJudge !== false; // Enabled by default
    this.debug = config.debug || false;

    // Initialize all heuristics with configuration
    this.heuristics = [
      new NameMentionHeuristic({ 
        aiName: this.aiName, 
        weight: config.weights?.nameMention || 0.30 
      }),
      new PronounSyntaxHeuristic({ 
        weight: config.weights?.pronounSyntax || 0.25 
      }),
      new ConversationalFlowAnalyzer({ 
        weight: config.weights?.conversationalFlow || 0.20 
      }),
      new SemanticSimilarityModule({ 
        weight: config.weights?.semanticSimilarity || 0.05 
      }),
      new LLMMetaJudge({ 
        aiName: this.aiName,
        weight: config.weights?.llmMetaJudge || 0.20 
      })
    ];

    // Validate weights sum to 1.0
    this.validateWeights();
  }

  /**
   * Main analysis function - orchestrates all heuristics
   * @param {Array} messages - Array of conversation messages
   * @returns {Object} - Final score and comprehensive reasoning
   */
  async analyzeRelevance(messages) {
    try {
      console.log('🎯 Relevance Orchestrator starting analysis...');
      
      if (!messages || messages.length === 0) {
        return { score: 0, reasoning: "No messages to analyze" };
      }

      const startTime = Date.now();
      
      // Run all heuristics in parallel (except LLM Meta-Judge which runs last)
      const fastHeuristics = this.heuristics.filter(h => h.getName() !== 'LLMMetaJudge');
      const llmMetaJudge = this.heuristics.find(h => h.getName() === 'LLMMetaJudge');

      // Execute fast heuristics in parallel
      console.log('🚀 Running fast heuristics in parallel...');
      const fastResults = await Promise.all(
        fastHeuristics.map(async (heuristic) => {
          try {
            const result = await heuristic.analyze(messages);
            return {
              name: heuristic.getName(),
              weight: heuristic.getWeight(),
              ...result
            };
          } catch (error) {
            console.error(`Error in ${heuristic.getName()}:`, error.message);
            return {
              name: heuristic.getName(),
              weight: heuristic.getWeight(),
              score: 5.0,
              reasoning: `Error in ${heuristic.getName()}: ${error.message}`,
              confidence: 0.1
            };
          }
        })
      );

      // Calculate initial weighted score from fast heuristics
      const fastScore = this.calculateWeightedScore(fastResults, messages);
      console.log(`⚡ Fast heuristics score: ${fastScore.toFixed(2)}/10`);

      // Decide whether to run LLM Meta-Judge based on fast results
      let llmResult = null;
      const shouldRunLLM = this.shouldRunLLMMetaJudge(fastResults, fastScore);
      
      if (shouldRunLLM && this.enableLLMMetaJudge && llmMetaJudge) {
        console.log('🤖 Running LLM Meta-Judge for complex analysis...');
        try {
          llmResult = await llmMetaJudge.analyze(messages);
          llmResult.name = llmMetaJudge.getName();
          llmResult.weight = llmMetaJudge.getWeight();
        } catch (error) {
          console.error('LLM Meta-Judge failed:', error.message);
          llmResult = {
            name: 'LLMMetaJudge',
            weight: llmMetaJudge.getWeight(),
            score: fastScore, // Use fast score as fallback
            reasoning: `LLM Meta-Judge failed: ${error.message}`,
            confidence: 0.3
          };
        }
      }

      // Combine all results
      const allResults = [...fastResults];
      if (llmResult) {
        allResults.push(llmResult);
      }

      // Calculate final weighted score
      const finalScore = this.calculateWeightedScore(allResults, messages);
      
      // Generate comprehensive reasoning
      const reasoning = this.generateReasoning(allResults, finalScore);
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(`✅ Relevance analysis complete: ${finalScore.toFixed(1)}/10 (${duration}ms)`);

      if (this.debug) {
        console.log('📊 Detailed results:', JSON.stringify(allResults, null, 2));
      }

      return {
        score: Math.max(1, Math.min(10, finalScore)),
        reasoning,
        details: {
          heuristicResults: allResults,
          duration,
          llmUsed: llmResult !== null,
          fastScore,
          finalScore
        }
      };

    } catch (error) {
      console.error('Error in RelevanceOrchestrator:', error);
      return { 
        score: 5.0, 
        reasoning: `Analysis failed: ${error.message}` 
      };
    }
  }

  /**
   * Determines whether to run the LLM Meta-Judge based on fast heuristic results
   * @param {Array} fastResults - Results from fast heuristics
   * @param {number} fastScore - Weighted score from fast heuristics
   * @returns {boolean} - Whether to run LLM Meta-Judge
   */
  shouldRunLLMMetaJudge(fastResults, fastScore) {
    // Check if we have a very clear case: name mention + high score from other heuristics
    const nameMentionResult = fastResults.find(r => r.name === 'NameMentionHeuristic');
    const pronounResult = fastResults.find(r => r.name === 'PronounSyntaxHeuristic');
    
    // If name is mentioned directly (score 8+) AND pronoun/syntax suggests question (score 6+)
    // This is likely a very clear case - but still run LLM for final confidence
    if (nameMentionResult && nameMentionResult.score >= 8 && 
        pronounResult && pronounResult.score >= 6) {
      console.log('🎯 Very clear case detected (name + question), running LLM for confirmation');
      return true;
    }

    // Skip LLM for very clear high-confidence cases (save processing time)
    if (fastScore >= 8.5) {
      console.log('🚀 Very high confidence fast score, skipping LLM Meta-Judge');
      return false;
    }

    // Always run LLM for complex cases in middle range (3-8)
    if (fastScore >= 3 && fastScore <= 8) {
      return true;
    }

    // Run LLM if heuristics disagree significantly
    const scores = fastResults.map(r => r.score);
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);
    const disagreement = maxScore - minScore;
    
    if (disagreement > 4) {
      console.log('🤔 Heuristics disagree significantly, running LLM Meta-Judge');
      return true;
    }

    // Run LLM if average confidence is low
    const avgConfidence = fastResults.reduce((sum, r) => sum + (r.confidence || 0.7), 0) / fastResults.length;
    if (avgConfidence < 0.6) {
      console.log('🤷 Low confidence in fast results, running LLM Meta-Judge');
      return true;
    }

    // For very clear cases (score < 2 or > 8.5), skip LLM to save time
    return false;
  }

  /**
   * Calculates weighted score from heuristic results with dynamic weight adjustment
   * @param {Array} results - Array of heuristic results
   * @param {Array} messages - Original messages for conversation length context
   * @returns {number} - Weighted score
   */
  calculateWeightedScore(results, messages = null) {
    let totalScore = 0;
    let totalWeight = 0;

    // Get conversation length for semantic similarity dynamic weighting
    const conversationLength = messages ? messages.length : null;

    // Check for very clear cases: direct name mention + question patterns
    const nameMentionResult = results.find(r => r.name === 'NameMentionHeuristic');
    const pronounResult = results.find(r => r.name === 'PronounSyntaxHeuristic');
    const flowResult = results.find(r => r.name === 'ConversationalFlowAnalyzer');
    const semanticResult = results.find(r => r.name === 'SemanticSimilarityModule');
    
    // Dynamic weight adjustment based on context
    const adjustedResults = results.map(result => {
      let adjustedWeight = result.weight || 0;
      
      // Use dynamic weight for semantic similarity if available
      if (result.name === 'SemanticSimilarityModule' && result.adjustedWeight !== undefined) {
        adjustedWeight = result.adjustedWeight;
        console.log(`📊 Using dynamic semantic similarity weight: ${adjustedWeight.toFixed(3)} (conversation length: ${conversationLength || 'unknown'})`);
      }
      
      // If name mention heuristic scores high but other heuristics score low,
      // this might be talking ABOUT the AI, not TO it - reduce name mention weight
      if (result.name === 'NameMentionHeuristic' && result.score >= 8) {
        const otherScores = results
          .filter(r => r.name !== 'NameMentionHeuristic' && r.name !== 'SemanticSimilarityModule')
          .map(r => r.score || 0);
        const avgOtherScore = otherScores.length > 0 ? 
          otherScores.reduce((sum, score) => sum + score, 0) / otherScores.length : 5;
        
        // If other heuristics suggest low engagement (avg < 4), reduce name weight significantly
        if (avgOtherScore < 4) {
          adjustedWeight = adjustedWeight * 0.3; // Reduce to 30% of original weight
          console.log('⚠️ Reducing name mention weight: likely talking ABOUT AI, not TO AI');
        }
        // If moderate disagreement, reduce somewhat
        else if (avgOtherScore < 6) {
          adjustedWeight = adjustedWeight * 0.7; // Reduce to 70% of original weight
          console.log('🤔 Reducing name mention weight: mixed signals from other heuristics');
        }
      }
      
      return { ...result, adjustedWeight };
    });

    // Special boost for obvious cases: direct name + question/command (only if high confidence)
    let clarityBonus = 0;
    if (nameMentionResult && nameMentionResult.score >= 10 && 
        pronounResult && pronounResult.score >= 6 &&
        nameMentionResult.confidence >= 0.8) {
      clarityBonus = 1.0; // Add 1 point bonus for very clear direct address
      console.log('🎯 Clarity bonus applied: Direct name mention + question detected');
    }

    for (const result of adjustedResults) {
      const weight = result.adjustedWeight;
      const score = result.score || 0;
      const confidence = result.confidence || 1.0;
      
      // Weight by confidence - less confident results have less impact
      const finalWeight = weight * confidence;
      
      totalScore += score * finalWeight;
      totalWeight += finalWeight;
    }

    const baseScore = totalWeight > 0 ? totalScore / totalWeight : 0;
    const finalScore = baseScore + clarityBonus;
    
    return Math.min(10, finalScore); // Cap at 10
  }

  /**
   * Generates comprehensive reasoning from all heuristic results
   * @param {Array} results - Array of heuristic results
   * @param {number} finalScore - Final weighted score
   * @returns {string} - Human-readable reasoning
   */
  generateReasoning(results, finalScore) {
    // Sort results by contribution (weight * score)
    const sortedResults = results
      .map(r => ({
        ...r,
        contribution: (r.weight || 0) * (r.score || 0) * (r.confidence || 1.0)
      }))
      .sort((a, b) => b.contribution - a.contribution);

    // Get top contributing factors
    const topFactors = sortedResults
      .filter(r => r.contribution > 0 && r.reasoning && r.reasoning.trim())
      .slice(0, 3)
      .map(r => {
        const heuristicName = r.name.replace(/([A-Z])/g, ' $1').trim();
        return `${heuristicName}: ${r.reasoning}`;
      });

    // Generate decision explanation
    let decision;
    if (finalScore >= 7) {
      decision = "Strong indication to respond";
    } else if (finalScore >= 4) {
      decision = "Moderate indication to respond";
    } else {
      decision = "Low indication to respond";
    }

    // Combine into final reasoning
    if (topFactors.length > 0) {
      return `${decision}. Key factors: ${topFactors.join('; ')}.`;
    } else {
      return `${decision}. Analysis completed with score ${finalScore.toFixed(1)}/10.`;
    }
  }

  /**
   * Validates that heuristic weights sum to approximately 1.0
   */
  validateWeights() {
    const totalWeight = this.heuristics.reduce((sum, h) => sum + h.getWeight(), 0);
    const tolerance = 0.05; // 5% tolerance
    
    if (Math.abs(totalWeight - 1.0) > tolerance) {
      console.warn(`⚠️ Heuristic weights sum to ${totalWeight.toFixed(3)}, expected ~1.0`);
      console.warn('Weights:', this.heuristics.map(h => `${h.getName()}: ${h.getWeight()}`));
    }
  }

  /**
   * Gets configuration for all heuristics
   * @returns {Object} - Configuration details
   */
  getConfiguration() {
    return {
      aiName: this.aiName,
      enableLLMMetaJudge: this.enableLLMMetaJudge,
      heuristics: this.heuristics.map(h => ({
        name: h.getName(),
        weight: h.getWeight(),
        enabled: h.setEnabled ? h.enabled : true
      }))
    };
  }

  /**
   * Updates the AI name for all relevant heuristics
   * @param {string} aiName - New AI name
   */
  setAiName(aiName) {
    this.aiName = aiName;
    this.heuristics.forEach(h => {
      if (h.setAiName) {
        h.setAiName(aiName);
      }
    });
  }

  /**
   * Enables or disables debug mode
   * @param {boolean} debug - Whether to enable debug mode
   */
  setDebug(debug) {
    this.debug = debug;
  }
}

export default RelevanceOrchestrator;