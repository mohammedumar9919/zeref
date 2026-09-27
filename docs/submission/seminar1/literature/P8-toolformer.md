# P8 — Toolformer

**Status:** Locked — NeurIPS 2023 proceedings  
**Cite:** T. Schick, J. Dwivedi-Yu, R. Dessì, R. Raileanu, M. Lomeli, E. Hambro, L. Zettlemoyer, N. Cancedda, and T. Scialom, “Toolformer: Language Models Can Teach Themselves to Use Tools,” in *Advances in Neural Information Processing Systems*, vol. 36, pp. 68539–68551, 2023.  
**URL:** https://proceedings.neurips.cc/paper_files/paper/2023/hash/d842425e4bf79ba039352da0f658a906-Abstract.html

| Field | Content |
|---|---|
| Problem | LMs struggle at basic tool use (arithmetic, lookup) where small specialized systems excel. |
| Method | Self-supervised learning of when/which API to call and how to insert results into next-token prediction, from few demonstrations per API. |
| Dataset / environment | Tools: calculator, Q&A system, search engine, translation system, calendar. Downstream zero-shot tasks as in the paper. |
| Metrics | Improved zero-shot performance across their downstream tasks, often competitive with much larger models (as reported). Name the paper’s tasks when quoting. |
| Contribution | Shows models can learn tool APIs — related to Zeref’s MCP-style tools. |
| Limitation | A model that teaches itself a tool is not a model that waits for a human before a public post, and it is not a version the operator can roll back after a failed safety eval. |

**Slide use:** 8, 9, 12.
