# P1 — ReAct

**Status:** Locked  
**Cite:** S. Yao et al., “ReAct: Synergizing Reasoning and Acting in Language Models,” ICLR, 2023. arXiv:2210.03629.

| Field | Content |
|---|---|
| Problem | Reasoning without tools, or actions without a readable trace. |
| Method | Interleaved verbal reasoning traces and task-specific actions against an external environment. |
| Dataset / environment | HotpotQA, FEVER, ALFWorld, WebShop. Not Instagram. |
| Metrics | Exact match on sampled QA/fact sets; success rate on interactive benchmarks. Paper reports absolute gains of 34% (ALFWorld) and 10% (WebShop) over imitation/RL in their prompted setting. |
| Contribution | A portable reason-then-act loop that is easier for a human to follow than a trace-free agent. |
| Limitation | Environments are Wikipedia and household/web shopping — not an operator snapshot, vault of confirmed corrections, version gate, or publish boundary. |

**Slide use:** 5, 10 (context), 12.
