# Idea
- AI conversation relevance detector. 

# Problem
AI companions generally require a wakeword / activation button, think siri, google, even chatgpt's ai, always responding following input. But humans don't do that. We know when someone is monologuing, speaking to themself, talking about us
to someone else, when someone is talking to you and expecting a response, and know
generally when to reply even when a response is not expected. Architecting Mirai, 
I realise if I'm looking to build a real-time conversational companion, the experience needs to be seamless and as-close to human-like as possible. Hence
the need for a relevance detector, providing a general metric towards indicating if xyz is being spoken to and a response is expected. 

# Diagram
Speech-to-Text
       ↓
[Text Stream] → Heuristic & LLM Relevance Modules:
       ├── Name Mention Heuristic
       ├── Pronoun & Syntax Heuristic
       ├── Conversational Flow Analyzer
       ├── Semantic Similarity Module (to last AI message)
       ├── Emotion / Tone Classifier (optional)
       └── LLM Meta-Judge ("Are they talking to me?")
       ↓
Score Fusion (weighted sum or ensemble)
       ↓
Decision Logic:
  - score > 0.7 → respond
  - score 0.4–0.7 → maybe confirm / softly respond
  - score < 0.4 → ignore / continue listening
       ↓
If respond → Main Conversational LLM generates response

# For Demo
1) Take the form of a fe application you can dump a conversation history, with the latest message the latest heard statement by the ai from the human. 
2) Ai will output as above

# Use guide
1) Make sure to have docker desktop version 4.47 installed
2) usign docker model llama
3) docker model run ai/llama3.2:1B-Q8_0
