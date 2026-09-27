# P3 — MemGPT

**Status:** PREPRINT (arXiv:2310.08560, 2023) — confirm proceedings before removing preprint label.  
**Cite:** C. Packer, S. Wooders, K. Lin, V. Fang, S. G. Patil, I. Stoica, and J. E. Gonzalez, “MemGPT: Towards LLMs as Operating Systems,” arXiv:2310.08560, 2023.

| Field | Content |
|---|---|
| Problem | Fixed context windows block long conversations and large-document analysis. |
| Method | Virtual context management: hierarchical memory tiers; LLM function calls to page, edit, and retrieve between main context and external storage. |
| Dataset / environment | Document analysis beyond the model context window; multi-session chat agents that remember across sessions. |
| Metrics | Qualitative / task capability on those two domains as reported in the preprint. Do not invent a recall percentage. |
| Contribution | Shows an agent can keep tiered long-term memory and evolve across sessions — academic shape of Zeref’s planned vault. |
| Limitation | Memory is not an immutable Instagram snapshot; no fixture/stale/live label; memory writes are not held behind operator confirm; evolving in session is not promoting a version only after a write-safety eval. |

**Slide use:** 6, 10, 11, 12.
