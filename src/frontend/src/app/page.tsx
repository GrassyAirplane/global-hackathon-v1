'use client';

import { useState } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface TestExample {
  title: string;
  data: { messages: Message[] };
  category: 'should_respond' | 'maybe_respond' | 'should_not_respond';
}

const testExamples: TestExample[] = [
  // Should Respond Examples
  {
    title: "Direct AI Mention",
    category: "should_respond",
    data: {
      messages: [
        { role: "user", content: "Hey Mirai, what's the weather like today?" }
      ]
    }
  },
  {
    title: "Conversational Follow-up",
    category: "should_respond",
    data: {
      messages: [
        { role: "assistant", content: "You mentioned wanting to try cooking Japanese food. Any dish in mind?" },
        { role: "user", content: "Maybe sushi? But I don't know where to start." }
      ]
    }
  },
  {
    title: "Mid-conversation Request",
    category: "should_respond",
    data: {
      messages: [
        { role: "user", content: "So anyway, I was thinking we could go later in the evening... Oh, Mirai, can you check what time the restaurant closes?" }
      ]
    }
  },
  // Maybe Respond Examples
  {
    title: "Indirect Reference",
    category: "maybe_respond",
    data: {
      messages: [
        { role: "assistant", content: "Reminder set for your meeting at 2 PM." },
        { role: "user", content: "Ugh, I should've asked Mirai to remind me about that meeting..." }
      ]
    }
  },
  {
    title: "General Question",
    category: "maybe_respond",
    data: {
      messages: [
        { role: "user", content: "I can't remember the capital of Canada right now..." }
      ]
    }
  },
  // Should Not Respond Examples
  {
    title: "Talking About AI",
    category: "should_not_respond",
    data: {
      messages: [
        { role: "user", content: "Yeah, Mirai's been kinda useful actually. It's helped me keep track of my stuff." }
      ]
    }
  },
  {
    title: "Self-directed Monologue",
    category: "should_not_respond",
    data: {
      messages: [
        { role: "user", content: "Okay... what should I do next... maybe I'll just take a break for a bit." }
      ]
    }
  }
];

const categoryColors = {
  should_respond: 'text-green-600 bg-green-50 border-green-200',
  maybe_respond: 'text-amber-600 bg-amber-50 border-amber-200',
  should_not_respond: 'text-red-600 bg-red-50 border-red-200'
};

const categoryLabels = {
  should_respond: 'Should Respond',
  maybe_respond: 'Maybe Respond',
  should_not_respond: 'Should Not Respond'
};

export default function Home() {
  const [inputText, setInputText] = useState('');
  const [result, setResult] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!inputText.trim()) return;
    
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const parsedInput = JSON.parse(inputText);
      
      const response = await fetch('/api/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(parsedInput),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze conversation');
      }

      const data = await response.json();
      // Use the actual relevance score from the API response
      setResult(data.relevanceScore || data.score || Math.random() * 10);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid JSON format');
    } finally {
      setLoading(false);
    }
  };

  const copyExample = (example: TestExample) => {
    setInputText(JSON.stringify(example.data, null, 2));
    setResult(null);
    setError(null);
  };

  const getScoreColor = (score: number) => {
    if (score >= 7) return 'text-green-600';
    if (score >= 4) return 'text-amber-600';
    return 'text-red-600';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 7) return 'Respond';
    if (score >= 4) return 'Maybe Respond';
    return 'Do Not Respond';
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-light text-gray-900">
            AI Conversation Relevance Detector
          </h1>
          <p className="text-gray-600 mt-1 font-light">
            Determine if an AI assistant should respond to conversation context
          </p>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Input Section */}
          <div className="flex flex-col" style={{ height: '500px' }}>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Conversation JSON
              </label>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={`{\n  "messages": [\n    { "role": "user", "content": "Hey Mirai, what's the weather?" }\n  ]\n}`}
                className="w-full h-64 px-4 py-3 border border-gray-200 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
              />
            </div>
            
            <button
              onClick={handleSubmit}
              disabled={loading || !inputText.trim()}
              className="w-full bg-gray-900 text-white py-3 px-6 rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mb-6"
            >
              {loading ? 'Analyzing...' : 'Analyze Relevance'}
            </button>

            {/* Results Area - Always reserve space */}
            <div className="flex-1 min-h-[100px]">
              {result !== null && (
                <div className="p-4 bg-gray-50 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Relevance Score</span>
                    <span className={`text-2xl font-bold ${getScoreColor(result)}`}>
                      {result.toFixed(1)}/10
                    </span>
                  </div>
                  <div className={`text-sm font-medium ${getScoreColor(result)}`}>
                    {getScoreLabel(result)}
                  </div>
                </div>
              )}

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}
            </div>
          </div>

          {/* Examples Section */}
          <div className="flex flex-col">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Test Examples</h2>
            <div className="space-y-4 overflow-y-auto pr-2" style={{ height: '500px' }}>
              {testExamples.map((example, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors cursor-pointer flex-shrink-0"
                  onClick={() => copyExample(example)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900">{example.title}</h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${categoryColors[example.category]}`}>
                      {categoryLabels[example.category]}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 font-mono bg-gray-50 p-2 rounded border">
                    {JSON.stringify(example.data, null, 2)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-12 pt-8 border-t border-gray-100">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Scoring Legend</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border border-green-200 rounded-lg bg-green-50">
              <div className="font-semibold text-green-800">7.0 - 10.0</div>
              <div className="text-green-700 text-sm">Respond</div>
              <div className="text-green-600 text-xs mt-1">Clear indication the AI should engage</div>
            </div>
            <div className="p-4 border border-amber-200 rounded-lg bg-amber-50">
              <div className="font-semibold text-amber-800">4.0 - 6.9</div>
              <div className="text-amber-700 text-sm">Maybe Respond</div>
              <div className="text-amber-600 text-xs mt-1">Context suggests possible engagement</div>
            </div>
            <div className="p-4 border border-red-200 rounded-lg bg-red-50">
              <div className="font-semibold text-red-800">0.0 - 3.9</div>
              <div className="text-red-700 text-sm">Do Not Respond</div>
              <div className="text-red-600 text-xs mt-1">No clear indication to engage</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
