# Seminar 1 — Zeref research presentation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce the 7th-semester Seminar 1 deck for Zeref. It keeps every section the college brief requires, shows the command center that is already running, and puts the original deferred roadmap on the table as an eight-month build.

**Architecture:** The college flash (Track A) was a cut, not the product. About four-fifths of that cut is done, and live Instagram collect plus competitor discovery already sit past it. Seminar 1 is the full system: what runs today, what the literature still does not do, and what will be finished before the remaining eight months end (target window October 2026–May 2027). Pitch craft stays: one idea per slide, cyan on void, spoken line, no invented metrics.

**Tech Stack:** Markdown literature cards, IEEE references, HTML pitch deck. Do not overwrite `docs/submission/slides.html` (Track A demo outline). Product truth for what already runs: `docs/submission/ABSTRACT.md`, `docs/CURRENT_STATE.md`, `docs/cloud/MASTERPLAN.md`, `docs/governance/phase-11-contract.md`, `docs/governance/phase-12-contract.md`.

**Source brief:** `C:\Users\Owner\Downloads\PW seminar 1 structure.docx` (7th semester 2026–27). Empty “Suggested Improvements” heading is ignored. Compulsory rule: every surveyed paper is on the references slide, and every reference is spoken.

**Project lock:** Title stays **ZEREF — An Autonomous JARVIS Command Center for Instagram Growth**. Publish is in the eight-month scope. It stays behind conversational confirm and an audit row. Meta App Review is a submission, not a result we can promise.

---

## Council (3 stages, applied to the argument)

### Stage 1 — Propose

| Wedge | What the panel would hear | Verdict |
|---|---|---|
| A. College-flash only | “We propose a fixture command center. We will not publish, remember semantically, or identify the operator.” | Rejected. That was the cut for an early demo. Eight months are still left, and the original contracts already named the rest. |
| B. Pretend the rest is shipped | “Publish, auth, and vector memory are done.” | Rejected. They are the blocked `TRACK-B-DEFER` row. Embed exists. Agent vector recall, login, and Content Publishing do not. |
| **C. Full roadmap, status-honest** | “The room already runs. The next eight months finish the pieces the college cut left out, plus the operator features we already specified.” | **Selected.** |

### Stage 2 — Review (claims that must not reach a slide)

- Do not say “no existing system exists.” Name dashboards, engagement papers, and tool-using agents, then name our own unfinished phases.
- Do not put Tricomi et al. 94% F1 beside any other paper’s score.
- Do not say App Review has been granted, or that Zeref already publishes.
- Do not say vector memory is done. The embed job and pgvector image exist. Phase 11.x agent recall was explicitly deferred.
- Do not say competitor intel is still unstarted. Business Discovery and reel ideas are built (CLOUD-B3/B4). Hashtag search is not.
- Do not cite the non-indexed LSTM campus-Instagram article.
- Label preprint surveys as preprints until a proceedings page is open.
- Separate three tenses on every status slide: **running**, **specified and not built**, **stretch**.

### Stage 3 — Synthesize (the line the deck serves)

The college flash proved the command center: one snapshot, honest badges, a voice agent that cannot write without a confirm. September’s pace finishes the deferred contract around March 2027: semantic recall, charts, streamed speech, a login, and publish that still waits for a human. March through May is the second chapter the papers now have to justify: a memory vault, and a new Jarvis version cut only from confirmed corrections, promoted only if the safety check still holds. The seminar asks the panel to judge that full scope, not the early cut.

---

## Pace from the last month (measured)

The useful window is **11–17 September 2026**, seven days. From 22 August to 10 September the repo has one commit, a portfolio README. Treating “the last month” as thirty even days would understate the sprint and overstate the idle time.

| Signal | Measured |
|---|---|
| Commits in those seven days | 70 |
| Merged pull requests | #2 through #17 |
| Feature commits | 11 |
| Fix commits | 2 |
| Doc and queue commits | 39, plus merge commits |
| Diff | about 11,900 lines added, about 1,000 deleted, 345 file touches |
| Product slices that landed | A0 fixtures, 6.2 HUD, A2 surfaces, A3 outliers and weekly brief, A4 streamed voice lite, A5 submission pack, B1 live Graph ops, B3 competitor discovery and reel ideas, B4 competitor UAT, B5 bulk collect plus voice and report hotfixes |

**Speed.** That week closed the college flash track and the live-data track that the flash had postponed. The base underneath it (phases 0–12) was already approved in the summer, so this pace is “finish a specified slice,” not “invent a platform from nothing.” A slice the size of A3 or B3 took about a day of focused work once the contract existed.

**Accuracy.** Process accuracy was high: a phase marked done had a merged PR. Live accuracy was not clean on the first pass. The same week’s operator session found ElevenLabs quota failure, a report that could not find its analysis id, a double voice cue, and multi-turn replies that dropped the previous offer. Those were fixed in the B5 hotfix commit before the week ended. The honest seminar line is: first live pass catches integration faults; the fix cycle is days, not months. No new precision@k number was measured this month. Do not invent one.

**What that predicts.** One September-sized week can land one major phase plus its UAT fixes. A sustainable college pace is one such week every two weeks, not seven days on and zero days off forever. At that pace the deferred contract (vector recall, charts, streaming polish, login, publish path, Next 16) is about **eight to ten build-weeks**, which is **four to five months** including the live-fix passes. Calendar landing: **late January to early March 2027**. Meta’s review can still be open after the code is done. That leaves **March through May 2027** for the second horizon below. If work drops back to one sprint a month, the contract slips toward April and the second horizon shrinks to a vault prototype only.

## Two clocks

| Clock | What it is | What the slide may say |
|---|---|---|
| College flash (Track A) | HUD, four surfaces, research-lite, cascaded voice, fixture demo, submission pack | About 80% of this cut is done. Laptop leftovers are the screenshot, the short video, and optional mic timing. |
| Work already past the cut | Live Graph collect, data-age badges, Facebook Business Discovery, reel ideas, bulk refresh of recent media, multi-turn voice, Windows speech fallback | Say “running on the operator laptop.” Do not say “in the college video.” The graded video stays on the fixture script. |
| Eight-month build | October 2026 through May 2027 | Say “we will build.” Dates below are the plan, not a claim of completion. |

---

## What was left out of the college cut, and what the eight months cover

These names come from the phase contracts, not from a new wish list.

| ID | Original deferral | Where it was written | Eight-month decision |
|---|---|---|---|
| P13 | Competitor intel | Phase 12 non-goals | **Partly running.** Discovery + reel ideas stay. Remaining: scheduled competitor refresh, and Hashtag Search only after App Review allows it. |
| P14 | Professional reports and charts | Phase 12 non-goals | **Build.** Narrative report exists. This phase is the charted, operator-grade report. |
| P15 | Streaming TTS | Phase 11 non-goals; college A4 was the lite cut | **Build.** `agent.step` was shaped so this is not a rewrite. Measure first audio on the laptop. Do not print a latency number until that measurement exists. |
| P16-publish | Meta Content Publishing + App Review | Phase 12 non-goals; Track A slide 10 | **Build the path. Submit the review.** Publish stays confirm-gated. Approval is Meta’s clock. If review slips, the system still refuses to post and the seminar says so. |
| P16-auth | Operator auth, then a tenant boundary | Phase 11 Q1; REQUIREMENTS out-of-scope v1 | **Build login and one workspace boundary.** A public multi-tenant SaaS with billing is stretch, not this window. |
| 11.x / G5 | Vector memory | Phase 11 non-goals | **Build.** Semantic recall over posts and the four memory tiers, on the pgvector database already in the stack. |
| 7.1 | LLM semantic contradiction | GAP ZR-032 | **Build**, beside vector memory. Rule-based contradiction already runs. |
| Next 16 | Framework upgrade | TRACK-B-DEFER; kill list said “not mid-demo” | **Build in the last month**, after features, so the final demo is not mid-upgrade. |
| Discussed, fits the window | Typed ask in the HUD | Demo script: there is no typed composer | **Build.** Voice stays primary. Typing is the fail-safe the panel already asked about. |
| Discussed, fits the window | Collect from the cockpit | Phase 11 non-goal “new Instagram collect UI”; collect is CLI and scheduled | **Build** a confirm-gated collect action. The 6-hour schedule already exists. |
| G6 | Model-tier settings screen | Phase 11: port-ready only | **Stretch.** Ports stay. A settings UI only if P14–P16 are already demonstrable. |
| — | Public deployment hardening | REQUIREMENTS out of scope v1 | **Stretch.** Not required to finish the academic scope. |

### Eight-month sequence

| Window | Build | Done when |
|---|---|---|
| Oct–Nov 2026 | Vector memory (11.x) and semantic contradiction (7.1) | A spoken question retrieves a prior post or memory by meaning, and a contradiction is flagged beyond the same-key rule. |
| Nov–Dec 2026 | Typed HUD composer; cockpit collect with confirm | A typed “weekly brief” uses the same agent path as push-to-talk. Collect from the cockpit enqueues only after confirm. |
| Dec 2026–Jan 2027 | Phase 14 professional reports and charts | A report opens as narrative plus charts, each chart labeled fixture, stale, or live. |
| Jan–Feb 2027 | Phase 15 streaming speech | Sentence-chunked playback is the default live path. First-audio time is written down from a laptop run, or it is not claimed. |
| Feb–Mar 2027 | Operator auth and a workspace boundary | A second local user cannot read the first user’s snapshot. |
| Mar–Apr 2027 | Publish path + App Review packet | A confirmed publish either posts under a permitted token or stops with an honest “review pending” state. No silent post. |
| Apr 2027 | Phase 13 remainder | Competitor set refreshes on a schedule. Hashtag search appears only if the Meta app is allowed to call it. |
| May 2027 | Next 16 upgrade, then a full fixture-and-live rehearsal | `verify` chain green on the upgraded framework. Seminar story still matches the screens. |

The table above is the **outer** calendar the college still has. The September pace says the same rows can finish earlier. Slide 16 shows both: a contract track aimed at **March 2027**, and a second track that starts only after publish is confirm-gated and a second user is isolated.

### Second horizon (March–May 2027) — only if the contract track is demonstrable

This is the time the September pace frees. It is a planned chapter, spoken as **next if the first track holds**, not as already built.

**Memory vault.** A private store of the operator’s confirmed turns, rejected actions, corrected briefs, and pinned posts. Jarvis reads it on later turns. The operator can open it, pin a memory, or delete one. Nothing enters the vault from an unconfirmed write. This is Phase 11.x made visible, not a second database brand.

**Versions of Jarvis, earned from that vault.** A version is a named pack: persona instructions, retrieved memories, and the tool rules. v1 is today’s agent. A new version is cut only from confirmed corrections (“that brief was wrong because the post was a fixture”). It goes live only if the existing eval still shows no unsafe write. The operator can roll back to the previous version. Weight training is the last step, not the first: a small local adapter is allowed only after the vault has enough confirmed pairs and the eval gate stays green. An unconfirmed turn never updates weights. Jarvis does not retrain itself in the background.

**Ideas taken from current AI products, pointed at this cockpit:**

| Idea | Where it comes from | What it is here | Fits after |
|---|---|---|---|
| Cited answers | Search-style assistants | Every number Jarvis speaks carries the snapshot id and the fixture / stale / live badge | Vault |
| Morning brief | Always-on assistants | A scheduled read-only brief waiting in the cockpit. It never publishes | Contract track |
| Fast and deep | Ack-then-think products | Fast path stays the voice ack. Deep path re-reads the vault and the report before a recommendation | Vault |
| Specialist seats | Multi-agent products, including the way Grok Bot was used to ship this repo | Three seats inside one turn: Analyst reads the snapshot, Editor drafts, Critic can veto a write. The Critic uses the same confirm rule | Vault |
| Vision on our own media | Engagement models that read the image | Hook notes on thumbnails already stored for the operator’s posts. No scrape of other accounts | Charts |
| Watchlist | Competitor products | Alert when a discovered competitor post beats this account’s own median. Read-only | Phase 13 remainder |
| Sticky corrections | Memory products | “Do not treat fixture numbers as live” becomes a vault rule the next turn must follow | Vault |
| Replay | Voice products | Open a past turn from the vault and hear what was confirmed | Streaming polish |
| Draft from a pin | Creative tools | “Write the next caption more like the post I pinned” | Vault plus Studio |

**Not in either horizon:** unattended self-training, a publish that skips confirm, scraping accounts outside the Graph token, or a claim of parity with a commercial assistant.

---

## Operator facts (Slide 1, before freeze)

| Field | Known | Still required |
|---|---|---|
| Title | ZEREF — An Autonomous JARVIS Command Center for Instagram Growth | — |
| Student | Mohammed Umar Salam | Confirm spelling; add teammates if this seminar is a group |
| Roll number(s) | — | Exact string |
| Guide | — | Name and title |
| Department | Computer Science Engineering, unless the college uses another official line | Official string |
| Institution | — | College name |
| Semester | 7th semester, 2026–27 | — |
| Date | — | Day of the seminar |
| Horizon | Eight months from this plan, through May 2027 | — |

---

## Research program

The survey changed with the scope. The first set of papers could only support “a command center the papers do not build.” The vault and the versioned Jarvis need their own papers, or those slides would be a product idea with no literature behind them.

Eight papers, four clusters. Every card has the brief’s six fields: problem, method, dataset or environment, metrics, contribution, limitation. The limitation sentence is the only line Slide 11 may take from that paper. Metrics stay inside the paper’s own dataset. The comparison slide uses capabilities, not one accuracy column.

### Domain (Slide 3)

**Topic:** An operator command center for Instagram growth. It collects a snapshot, analyzes it, speaks over it, stores confirmed work in a vault, and can publish only after a person confirms. A later version of the agent is cut from those confirmations, and it goes live only if the safety check still passes.

**Pipeline already running:** collect → normalize → embed → analyze → report.

| Term | Slide meaning |
|---|---|
| Snapshot | One collected copy. Later stages do not silently re-scrape. |
| Data-age | `fixture`, `stale`, or `live`. |
| ReAct | Reason, tool, observation (Yao et al., 2023). Already the loop in the product. |
| Vault | Confirmed turns, rejections, corrections, and pins. The operator can delete them. Not built yet. |
| Version | A named pack of instructions, vault memories, and tool rules. v1 is today’s Jarvis. |
| Promotion | A new version replaces the live one only when the eval still has no unsafe write. Rollback stays. |
| Publish | A future write. Same confirm rule. Meta App Review is a submission, not a result. |

**Diagram:** `account → snapshot → pipeline → vault → cockpit → voice or typed ask → confirm → audit → version gate → (later) publish`

### Real-world need (Slide 4)

**Who:** a creator planning the next posts from their own numbers and from competitors, without a data team.

**Flow:** `split tools → predictors, chatbots, schedulers → unlabeled numbers and an assistant that forgets corrections → one room that remembers what the operator confirmed and still will not post without a yes`

**Example:** “What did I correct you about last week, and should this draft go out?” A dashboard cannot answer. A chatbot that does not keep the correction will repeat it. Zeref’s brief from the snapshot already runs. The vault, the version, and the publish step are the remaining build.

### Cluster I — The agent that already runs

**P1.** Shunyu Yao, Jeffrey Zhao, Dian Yu, Nan Du, Izhak Shafran, Karthik Narasimhan, and Yuan Cao, “ReAct: Synergizing Reasoning and Acting in Language Models,” ICLR 2023. arXiv:2210.03629.

| Field | Card |
|---|---|
| Problem | Reasoning without tools, or actions without a readable trace. |
| Method | Interleaved reason and act against an external environment. |
| Environment | HotpotQA, FEVER, ALFWorld, WebShop. Not Instagram. |
| Metrics | Exact match on the QA sets they sample; success rate on the interactive sets. Their reported gains stay attributed to that prompted setting. |
| Contribution | The loop Zeref already runs. |
| Limitation | No operator snapshot, no vault of confirmed corrections, no version gate, no publish boundary. |

**P2.** Lei Wang, Chen Ma, Xueyang Feng, et al., “A survey on large language model based autonomous agents,” *Frontiers of Computer Science*, vol. 18, art. 186345, 2024. DOI: 10.1007/s11704-024-40231-1.

| Field | Card |
|---|---|
| Problem | Agent papers split construction, applications, and evaluation. |
| Method | Survey. Parts they unify: profile, memory, planning, action. |
| Environment | The literature. |
| Metrics | Their evaluation categories only. No score of ours. |
| Contribution | Memory is a required part of an agent, which is why a command center that forgets the operator is unfinished. |
| Limitation | The survey does not specify a creator snapshot, a freshness badge, or a rule that a new agent version must pass a write-safety check. |

### Cluster II — Memory vault and a better version (new)

**P3.** Charles Packer, Sarah Wooders, Kevin Lin, Vivian Fang, Shishir G. Patil, Ion Stoica, and Joseph E. Gonzalez, “MemGPT: Towards LLMs as Operating Systems,” arXiv:2310.08560, 2023. Mark **PREPRINT** until a proceedings version is confirmed from the PDF.

| Field | Card |
|---|---|
| Problem | A fixed context window cannot hold a long conversation or a large store. |
| Method | Virtual context: the model pages information between the prompt and external storage, and it can edit that store with tool calls. |
| Environment | Document analysis beyond the context window, and multi-session chat. |
| Metrics | Use only figures copied from the PDF during execution. Do not invent a recall score. |
| Contribution | An agent can keep a tiered memory and carry a conversation across sessions. That is the academic shape of the vault. |
| Limitation | The memory is not an immutable Instagram snapshot, it does not label fixture / stale / live, and a memory write is not held behind the operator’s confirm. Evolving across sessions is not the same as promoting a version only after a safety eval. |

**P4.** Long Ouyang, Jeffrey Wu, Xu Jiang, Diogo Almeida, Carroll Wainwright, Pamela Mishkin, Chong Zhang, Sandhini Agarwal, Katarina Slama, Alex Ray, John Schulman, Jacob Hilton, Fraser Kelton, Luke Miller, Maddie Simens, Amanda Askell, Peter Welinder, Paul Christiano, Jan Leike, and Ryan Lowe, “Training language models to follow instructions with human feedback,” NeurIPS 2022.

| Field | Card |
|---|---|
| Problem | A larger model is not automatically better at following a person. |
| Method | Demonstrations, then rankings, then reinforcement learning from that human feedback (InstructGPT). |
| Environment | Labeler prompts and API prompts. Not an operator cockpit. |
| Metrics | On their prompt distribution, human raters preferred the 1.3B InstructGPT outputs to 175B GPT-3. Say “their raters, their prompts.” |
| Contribution | Confirmed human feedback can produce a better version of a model. That is the academic hook for cutting v2 from the vault. |
| Limitation | Their loop updates weights using hired raters. It has no operator delete, no rollback in a product, and no gate that blocks promotion when a write would be unsafe. Zeref takes the lesson and refuses unattended weight updates. A small local adapter is allowed only after the vault has confirmed pairs and the eval stays green. |

### Cluster III — Instagram evidence (unchanged domain)

**P5.** Pier Paolo Tricomi, Marco Chilese, Mauro Conti, and Ahmad-Reza Sadeghi, “Follow Us and Become Famous! Insights and Guidelines From Instagram Engagement Mechanisms,” WebSci ’23. DOI: 10.1145/3578503.3583623.

| Field | Card |
|---|---|
| Problem | Like-only scores, narrow data, black-box models, feedback only after the post exists. |
| Method | Interpretable classifiers plus a hot-topic finder. |
| Dataset | About 10 million posts, about 34,000 influencers. |
| Metrics | Up to 94% F1 on their best category setting. Say “on their dataset.” |
| Contribution | Comments matter, and the reason can be shown. |
| Limitation | Predicts a public post. Does not run an operator’s week, store that operator’s corrections, or publish under review. |

**P6.** Hyunsang Son and Young Eun Park, “Predicting user engagement with textual, visual, and social media features for online travel agencies’ Instagram post,” *Current Issues in Tourism*, vol. 27, no. 22, pp. 3608–3622, 2023. DOI: 10.1080/13683500.2023.2278087.

Dataset size, algorithms, and metrics are copied from the PDF only. If the PDF is closed, replace P6 with the first IEEE or ACM Instagram engagement paper from 2023–2026 whose proceedings page opens. Do not guess numbers.

### Cluster IV — Speech and tools

**P7.** “Recent Advances in Speech Language Models: A Survey,” arXiv:2410.03751, 2024. Copy the author list from the PDF first page. Mark **PREPRINT**.

Use it for the cascade that already runs, and for Phase 15 as polish. Their latency numbers stay theirs. The limitation to record: speech models do not carry an audit row or a memory vault.

**P8.** Timo Schick et al., “Toolformer: Language Models Can Teach Themselves to Use Tools,” NeurIPS 2023. This seat stays only if the proceedings page opens. It is the published paper that keeps the list from being preprint-heavy, because P3 and P7 are preprints.

| Field | What to extract |
|---|---|
| Problem | Models call tools only when shown, or they do not call them. |
| Method | Self-supervised tool-use training. Record the actual tool list from the PDF. |
| Metrics | The paper’s own scores, with the paper’s tasks named. |
| Limitation | A model that teaches itself a tool is not a model that waits for a human before a public post, and it is not a version the operator can roll back. |

If NeurIPS does not resolve, record the URL in `RESERVES.md` and put a published ICASSP or Interspeech spoken-dialogue paper in this seat instead.

### Do not cite

Vendor blogs, Grok product pages, or OWASP drafts as papers. They may inspire the product table. They are not references. Laptop Graph logs are status, used on the traction slide only. The non-indexed LSTM campus article stays out.

### Existing systems, then our status

**External.** Spreadsheets and native insights. Engagement predictors (P5, P6). Tool-using agents (P1, P8). Tiered agent memory (P3). Feedback-tuned models (P4). Cascaded and end-to-end speech (P7). Each row gets a strength and a limit. No claim that the market is empty.

**Ours, September 2026.**

| Capability | Status | Speaker may point at |
|---|---|---|
| Snapshot pipeline, cockpit, voice, confirm + audit, data-age badges | Running | Phases 0–12, Track A |
| Live collect, bulk refresh, competitor discovery, reel ideas | Running on the operator laptop | CLOUD-B1 through B5 |
| Vector recall, charts, streamed-speech measurement, login, publish | Specified, not built | Contract track, through about March 2027 |
| Memory vault, version promotion, cited speech, Critic seat, morning brief, watchlist | Planned second horizon | March–May 2027, only after the contract track is demonstrable |

### Comparison

Columns are P3 MemGPT, P4 InstructGPT, P5 Tricomi, Zeref today, Zeref at the end of the window. Speak the last column as **planned**.

| Parameter | P3 | P4 | P5 | Today | End of window |
|---|---|---|---|---|---|
| What it remembers | Paged chat and documents | Weight update from raters | Nothing about one operator | Snapshot and audit | Vault of confirmed corrections |
| Freshness label | No | No | No | Yes | Yes |
| Confirm before a write | No | n/a | n/a | Draft, calendar, enqueue | Those, plus publish |
| New version from feedback | Evolves in session | Yes, by training weights | No | No | Yes, pack first; weights only after the gate |
| Operator rollback | No | No | No | No | Yes |
| Unsafe-write gate before promotion | No | No | No | Eval exists for today’s tools | Required |
| Own-account Instagram snapshot | No | No | Public influencer corpus | Yes | Yes |

Do not place 94% F1, InstructGPT preference rates, and any Zeref number in one accuracy row.

### Gap

| Observed limit | Evidence | Gap type | Response |
|---|---|---|---|
| Tool use is proven off an operator snapshot | P1, P8 | Integration | **Already running** for reads and for confirm-gated drafts |
| Memory can be paged, but it is not this account’s snapshot and it is not deletable by the operator | P3 | Integration | **Vault**, second horizon, after vector recall exists |
| Human feedback can make a better model, by updating weights in a lab | P4 | Explainability and security | **Version packs** from confirmed corrections. Promotion only if no unsafe write. No background training |
| Engagement models score posts and then stop | P5, P6 | Deployment | Weekly brief is running. Charts and a watchlist are the rest |
| Speech does not carry the audit or the vault | P7 | Real-time | Phase 15 polish, then replay from the vault |
| Nothing in the set publishes to Instagram under a human yes, and neither do we | All eight limitations | Security | Confirm-gated publish. Review-pending stays visible |

Spoken gap paragraph:

A model can call tools, page its own memory, and become better when people rank its answers. Instagram engagement can be explained on large public sets. None of that is a creator’s room where the snapshot is already real, the corrections wait in a vault the operator can delete, and a new version of the assistant goes live only if it still cannot write without a yes. The room is running. The vault and the version gate are how the remaining months make the assistant smarter without letting it train itself unsupervised.

### Motivation

1. **Problem:** the assistant that can see the account still forgets corrections and cannot yet act on a post safely.
2. **Why the papers are not enough:** each one covers tools, or memory, or feedback, or engagement, or speech.
3. **Who:** this operator now, and a second local user after login.
4. **Expected improvement:** by about March 2027 the contract track is demonstrable. By May the vault can cut a version. App Review may still be open. That is reported, not hidden.

### Problem statement (freeze)

Existing dashboards, engagement models, tool-using agents, paged-memory agents, and feedback-tuned models do not give a creator one system that analyzes an Instagram account, keeps the operator’s confirmed corrections, and acts only with a human yes. Zeref already collects an immutable snapshot, labels data age, briefs the operator, and blocks draft, calendar, and enqueue writes until a person confirms. Inside the months the September pace supports, this project will add semantic recall, charted reports, polished streaming speech, a login that isolates a second local user, and a publish path that either waits for confirmation or stops in a visible review-pending state. If that track is demonstrable, the same project will add a memory vault of confirmed turns and corrections, and a versioned Jarvis that replaces the live agent only when the evaluation still shows no unsafe write, with rollback to the previous version. Weight updates are not part of the first vault release. The measurable tests are: meaning-based recall of an earlier post; a second user who cannot read the first user’s snapshot; a publish attempt that cannot look successful while review is pending; and a candidate Jarvis version that stays offline when the safety check fails.

### Objectives

**Already met**

1. **Implemented** the snapshot pipeline and the four cockpit surfaces.
2. **Implemented** confirm-gated writes for enqueue, calendar, and studio draft, with an audit row.
3. **Implemented** data-age badges and live collect for the operator account.
4. **Implemented** competitor discovery and reel-idea suggestions.

**Contract track, paced to about March 2027**

5. **Implement** vector recall and **extend** contradiction detection beyond the same-key rule.
6. **Design and implement** report charts that keep the fixture / stale / live label.
7. **Optimise** speech to the streaming path and **evaluate** first-audio time only by measuring it.
8. **Implement** a typed ask on the same agent path, and a cockpit collect that still requires confirm.
9. **Implement** login and **validate** isolation of a second local user.
10. **Implement** confirm-gated publish and **prepare** the App Review packet. **Evaluate** the review-pending state.
11. **Validate** the Next 16 upgrade on the existing verify chain after the above is demonstrable.

**Second horizon, March–May 2027, after objective 11**

12. **Implement** the vault: confirmed turns, rejections, corrections, pins, and delete.
13. **Design** a version pack cut only from those corrections, and **validate** that it cannot replace the live agent when the eval reports an unsafe write. Rollback is part of the test.
14. **Implement** cited speech, a fast path and a deep path, and a Critic seat that can veto a write.
15. **Implement** a read-only morning brief and a watchlist against this account’s own median.

### Conclusion

1. The command center is already a large, running CSE system.
2. The new literature says agents can remember and can be improved by human feedback, and it also says how those methods fail a creator: no snapshot, no delete, no rollback, no write gate.
3. The contract track is the original deferred product. The vault is the use of the time that track’s pace frees.
4. A version that fails the safety check does not go live. A post does not go out without a yes.

---

## Deck map

Nineteen slides. The brief’s sections are all present. Literature slides 6 is the new cluster.

| # | Role | Idea | Visual |
|---|---|---|---|
| 1 | Title | ZEREF, names, guide, institution, date | Brand only |
| 2 | Outline | Brief sections, plus completed work and two-horizon scope | One list |
| 3 | Domain | Snapshot, vault, version gate, reviewed publish | Flow |
| 4 | Need | Four boxes from the brief | Four boxes |
| 5 | Literature | P1 ReAct, P2 agent survey | Two rows |
| 6 | Literature | P3 MemGPT, P4 InstructGPT | Two rows |
| 7 | Literature | P5 Tricomi, P6 second Instagram paper | Two rows |
| 8 | Literature | P7 speech survey, P8 Toolformer | Two rows |
| 9 | Existing systems | External strength and limit | Table |
| 10 | Comparison | P3, P4, P5, today, end of window | Capability table |
| 11 | Gap | Spoken paragraph above | Four lines |
| 12 | Gap map | The gap table | Four to six rows, split if small |
| 13 | Motivation | Four answers | Four lines |
| 14 | Problem | Frozen paragraph, running then remaining | Two blocks |
| 15 | Traction | Running rows only, plus the September pace in one line | Table |
| 16 | Scope | Contract track to about March, vault from March to May | Two bands |
| 17 | Objectives | Fifteen, grouped | Three groups |
| 18 | Conclusion | Four beats | Four lines |
| 19 | References | Eight IEEE entries | Split if needed |

**Last line:** “It already runs. It will remember what you confirm. A smarter version goes live only if it still cannot act without you.”

Pitch beats stay on slides 3, 4, 5–8, 9, 10, 11–12, 13, 14, 15, 16, 17, 18, 19. Visual system: 16:9, `#05080c`, `#3de7ff`, `#e8f4f8`, body at least 28 px, no purple gradients, no unlabeled charts. Footer: `Seminar 1 · 7th semester · contract track, then the vault`.

---

## File map

| File | Responsibility |
|---|---|
| `docs/submission/seminar1/BRIEF_LOCK.md` | Frozen problem statement, fifteen objectives, identity |
| `docs/submission/seminar1/literature/P1-react.md` | Card |
| `docs/submission/seminar1/literature/P2-agent-survey.md` | Card |
| `docs/submission/seminar1/literature/P3-memgpt.md` | Card, marked preprint until proceedings exist |
| `docs/submission/seminar1/literature/P4-instructgpt.md` | Card |
| `docs/submission/seminar1/literature/P5-tricomi.md` | Card |
| `docs/submission/seminar1/literature/P6-instagram-2.md` | Card, metrics only from the PDF |
| `docs/submission/seminar1/literature/P7-speech-survey.md` | Card, preprint |
| `docs/submission/seminar1/literature/P8-toolformer.md` | Card, or the published replacement |
| `docs/submission/seminar1/literature/RESERVES.md` | Failed URLs |
| `docs/submission/seminar1/SCOPE_8_MONTH.md` | Both horizons, checkbox per window |
| `docs/submission/seminar1/references.bib.md` | IEEE |
| `docs/submission/seminar1/SLIDE_SPEC.md` | Nineteen sections |
| `docs/submission/seminar1/slides.html` | Seminar deck |
| `docs/submission/seminar1/SPEAKER.md` | Script and question bank |
| `docs/submission/slides.html` | Forbidden |

---

## Tasks

### Task 1: Freeze the thesis

**Files:** Create `docs/submission/seminar1/BRIEF_LOCK.md` and `SCOPE_8_MONTH.md`.

- [ ] **Step 1:** Copy the problem statement and all fifteen objectives unchanged.
- [ ] **Step 2:** Copy both horizons with a checkbox per window.
- [ ] **Step 3:** Fill roll number, guide, institution, teammates, and the seminar date. Unknown cells stay `REQUIRED`.
- [ ] **Step 4:** Read back. Publish is confirm-gated or review-pending. The vault is not described as already built. Weight training is not described as automatic.

### Task 2: Literature cards for the new set

**Files:** The eight card paths above, plus `RESERVES.md`.

- [ ] **Step 1:** Open the publisher or arXiv page for P1, P2, P4, and P5. Paste authors, year, venue, and DOI. Add one limitation sentence with a section or page.
- [ ] **Step 2:** Open arXiv:2310.08560 for P3 and arXiv:2410.03751 for P7. Copy authors from the PDF. Mark both `PREPRINT` if no proceedings page exists.
- [ ] **Step 3:** Fill P6 only from its PDF. On failure, swap in a verified ACM or IEEE paper and log the closed URL.
- [ ] **Step 4:** Open the NeurIPS 2023 page for Toolformer. On failure, replace P8 with a published ICASSP or Interspeech paper and log the URL.
- [ ] **Step 5:** Acceptance: eight cards, six fields, every metric names its dataset, P3’s limitation mentions the missing confirm and the missing version gate, P4’s limitation mentions lab weight updates.

### Task 3: References

**Files:** Create `docs/submission/seminar1/references.bib.md`.

- [ ] **Step 1:** One IEEE entry per card. P3 and P7 say “preprint” in the entry if that is still true.
- [ ] **Step 2:** Map each id to slides 5–8 and to slide 12.
- [ ] **Step 3:** Acceptance: eight references, each spoken, no product blogs.

### Task 4: Slide spec

**Files:** Create `docs/submission/seminar1/SLIDE_SPEC.md`.

- [ ] **Step 1:** Nineteen sections. Each has the college purpose, at most 40 on-slide words, the visual, a speaker line of at most 40 words, and the paper ids used.
- [ ] **Step 2:** Slide 6 cites only P3 and P4. Slide 10 uses the comparison table in this plan. Slide 14 matches Task 1.
- [ ] **Step 3:** Acceptance: no cross-paper accuracy column. Slide 16 labels March–May as the vault only after the contract track.

### Task 5: Deck and script

**Files:** Create `docs/submission/seminar1/slides.html` and `SPEAKER.md`.

- [ ] **Step 1:** Build the nineteen slides in the visual system. Keys ← → and `F`.
- [ ] **Step 2:** Script a pause before the gap paragraph. On slide 6, say MemGPT’s limit and InstructGPT’s limit before any Zeref promise.
- [ ] **Step 3:** Walk slides 6, 10, 14, 16, and 19. Tables must not overflow.
- [ ] **Step 4:** Acceptance: `docs/submission/slides.html` is unmodified.

### Task 6: Question bank

**Files:** Append to `SPEAKER.md`.

- [ ] **Step 1:** Answer: “How much is done?” “Where is publish?” “Is the vault built?” “Does Jarvis train itself?” “Why cite a 2022 feedback paper?” “Why not compare the 94%?” “What if the pace slows?” “What if App Review slips?”
- [ ] **Step 2:** The training answer must say: corrections are stored; a version is promoted only after the safety check; weights do not update in the background. Delete any answer that claims an unmeasured latency or an approved publish.

---

## Self-review

| Requirement | Where |
|---|---|
| College sections, including literature, gap, problem, objectives, references | Deck map |
| Literature matches the vault and the version gate | Cluster II, slides 6, 11, 12 |
| 7–10 papers, each with a limitation | Eight cards |
| Gap leads into the frozen problem statement | Same holes: vault, version gate, publish, identity |
| September pace sizes the calendar | Pace section and slide 16 |
| Deferred college work still included | Objectives 5–11 |
| Extra ideas sit in the freed months | Objectives 12–15 |
| No unattended self-training, no fake App Review | Stage 2 and Task 6 |
| Demo deck untouched | Forbidden path |

P6 metrics and the P8 proceedings check stay behind a page-open gate so they are not invented. Identity cells marked `REQUIRED` are facts only the student can supply.
