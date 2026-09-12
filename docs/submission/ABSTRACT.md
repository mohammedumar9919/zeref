# Flash abstract

**Title:** ZEREF — An Autonomous JARVIS Command Center for Instagram Growth

Creators already have dashboards, schedulers, and chatbots. They do not have a single **command center** that can see Instagram ops data, speak like an operator, and still refuse to act without a human. Zeref is that room: a Luke-style JARVIS HUD over a typed, immutable research pipeline.

Zeref collects an Instagram snapshot once, then normalizes, embeds, analyzes, and reports from that snapshot — never by silently re-scraping. The Next.js cockpit is the operator surface: Studio drafts, Calendar content slots, narrative Reports, and Research intel. JARVIS is a portable ReAct agent with MCP-style tools. Read tools summarize the cockpit, reports, pipeline, and research. Write tools (enqueue a job, schedule a slot, update a draft) require conversational confirmation and an audit row. The browser talks only to a BFF; CI and college demos run on mocks and fixtures.

Track A flash is the HUD, the four product surfaces, own-account outlier detection (posts at or above 5× median from `metric_facts`), a grounded weekly brief, and cascaded voice (LLM tokens → sentence buffer → TTS chunks, with barge-in). Data-age badges say `fixture`, `stale`, or `live`. Telemetry that is stubbed is labeled **SIMULATED**. Fixture demo mode (`ZEREF_BFF_FIXTURE=1` / `.\scripts\demo-start.ps1`) is the reliable college path.

Zeref is autonomous **inside the command center** — it watches, briefs, and proposes. It is not an autopilot that publishes to Instagram. Meta publish and App Review are Track B and are not part of this submission.

**One line:** A JARVIS command center for Instagram growth ops — honest data, human approval, no fake live publish.
