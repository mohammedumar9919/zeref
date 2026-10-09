# CLOUD-C20a — CI split

- Worker split `.github/workflows/ci.yml` into 5 parallel jobs + aggregate `Phase 0–9 gate`; added `ZEREF_SKIP_PRIOR_CHAIN` to every chaining verify script.
- Lead added phase card + log, reviewed logs of run 37998589845: all jobs green in ~4 min, Playwright passes in each UI job, skips are only chained prior gates covered by sibling jobs.
