# VoxShield

## AI-Powered Real-Time Detection and Prevention of Voice Cloning Impersonation Attacks

VoxShield is a real-time voice security system designed to detect AI-generated or cloned voices during live calls and audio analysis.

It combines:

- CNN-based acoustic voice spoof detection
- Real-time microphone streaming
- Semantic transcript risk analysis
- Multilingual intent detection
- Continuous risk scoring
- Risk-based alerts
- Prevention recommendations
- Live-call audit history
- Voice profile monitoring
- REST APIs for integration

---

## 1. Problem

Voice cloning and AI-generated speech can be used for impersonation, social engineering, credential theft, payment fraud, and other sensitive actions.

VoxShield analyzes both:

1. **How the voice sounds**
2. **What the caller is saying**

The system continuously combines these signals to generate a live risk score and recommend an appropriate security action.

---

## 2. System Architecture

```text
                    ┌─────────────────────┐
                    │     React Frontend  │
                    │                     │
                    │ Overview            │
                    │ Live Calls          │
                    │ Investigations      │
                    │ Voice Profiles      │
                    │ Analyze Audio       │
                    └──────────┬──────────┘
                               │
                    REST API / WebSocket
                               │
                               ▼
                    ┌─────────────────────┐
                    │    FastAPI Backend  │
                    └──────────┬──────────┘
                               │
              ┌────────────────┴────────────────┐
              │                                 │
              ▼                                 ▼
     ┌──────────────────┐              ┌──────────────────┐
     │ Audio Analysis   │              │ Transcript       │
     │                  │              │ Analysis         │
     │ 64-Mel Features  │              │                  │
     │ CNN Classifier   │              │ Keywords         │
     │ Spoof Score      │              │ Semantic Model   │
     └────────┬─────────┘              │ Intent Detection │
              │                        └────────┬─────────┘
              │                                 │
              └────────────────┬────────────────┘
                               ▼
                    ┌─────────────────────┐
                    │   Risk Engine       │
                    │                     │
                    │ Audio Risk          │
                    │ Transcript Risk     │
                    │ Combined Risk       │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Alert & Prevention  │
                    │                     │
                    │ Continue            │
                    │ Verify Caller       │
                    │ Secondary Verify    │
                    │ Pause Sensitive     │
                    │ Action              │
                    └─────────────────────┘
