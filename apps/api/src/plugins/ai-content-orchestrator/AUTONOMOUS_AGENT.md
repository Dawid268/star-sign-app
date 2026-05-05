# AI Content Orchestrator (AICO) - Autonomous Agent Documentation

## Purpose & Vision

AICO is a fully autonomous media and content orchestration agent designed to manage the end-to-end lifecycle of digital assets for the Star Sign platform. Its mission is to ensure that every piece of content (Horoscopes, Daily Tarot Cards, Articles) is not only generated with high quality but also visually enriched and correctly mapped without human intervention.

## Core Capabilities

1.  **Autonomous Content Lifecycle**: Automatically triggers generation, validation, and publishing based on cron schedules.
2.  **Smart Media Orchestration**:
    - **Library Search**: First, it attempts to map the best existing media from the Strapi Library using semantic matching.
    - **Autonomous Design**: If no suitable media is found, the agent uses an LLM to design a specific visual prompt in English.
    - **On-Demand Generation**: Generates high-fidelity images using models like Flux or DALL-E (via Replicate/OpenAI) based on the per-workflow configuration.
    - **Auto-Persistence**: Automatically uploads generated assets to the cloud (R2) and registers them in the Strapi Media Library for future reuse.
3.  **Self-Healing & Reconciliation**: Detects missing assets in existing content and automatically repairs them.
4.  **Real-Time Monitoring**: Provides a granular "Autonomous Intelligence" dashboard showing every decision made by the agent (Design -> Generate -> Upload -> Map).

## Business Logic

- **Prompting**: All image generation prompts are designed in **English** for maximum compatibility and precision.
- **Security**: API tokens for LLM and Image generation are stored encrypted at rest and decrypted only during runtime for secure execution.
- **Scalability**: Supports multiple workflows with different models and settings, allowing for tailored aesthetics across different content types.

## Technical Architecture

- **Orchestrator Service**: The "brain" that manages the state machine of content generation.
- **Media Selector**: The "curator" that decides whether to pick existing media or generate new ones.
- **Image Designer**: The "creative" that translates content context into visual prompts.
- **Media Generator**: The "producer" that handles API calls to generation engines and file uploads.

## How to Interact with AICO

Agents should use the `orchestrator` service to trigger runs or reconciliation.
The monitoring dashboard provides a `run_id` which contains a `steps` log for debugging autonomous decisions.
