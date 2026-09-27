# P4 — InstructGPT / RLHF

**Status:** Locked (NeurIPS 2022)  
**Cite:** L. Ouyang et al., “Training language models to follow instructions with human feedback,” in *Advances in Neural Information Processing Systems*, 2022.

| Field | Content |
|---|---|
| Problem | A larger model is not automatically better at following a user’s intent. |
| Method | Supervised fine-tuning on demonstrations, then reinforcement learning from human preference rankings (InstructGPT). |
| Dataset / environment | Labeler-written prompts and API prompts. Not an operator cockpit. |
| Metrics | On their prompt distribution, human raters preferred 1.3B InstructGPT outputs to 175B GPT-3. Say: “their raters, their prompts.” |
| Contribution | Confirmed human feedback can produce a better model version — hook for cutting Jarvis v2 from vault corrections. |
| Limitation | Updates weights with hired raters; no operator delete; no product rollback; no gate that blocks promotion when a write would be unsafe. Zeref stores corrections first and refuses unattended weight updates. |

**Slide use:** 6, 10, 11, 12.
