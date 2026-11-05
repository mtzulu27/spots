---
name: spots-user-testing
description: Run repeatable synthetic-user studies of Spots features using temporary personas, observed browser tasks, optional post-task discussion and evidence-backed comparisons. Use for usability, perception or hybrid tests of Spots; not for ordinary code QA or claims about real users.
---

# Spots User Testing

Run a small synthetic study, not a fictional panel presented as customer research.
Respond in the user's language. Do not change the app or publish fixes as part of
a test unless requested separately.

## Choose the mode

- **Usability / usabilidad:** independent personas attempt browser tasks.
- **Discussion / discusion:** personas review an explicit, immutable material
  packet; results are hypothetical perceptions, not observed usability.
- **Hybrid / hibrido:** independent browser tasks first; seal those results,
  then discuss only the evidence. Discussion never rewrites individual results.

Default to hybrid for an unspecified synthetic-user study. A narrow functional
test can use fewer personas/tasks; eight personas is a starting cohort, not a
mandatory sample size. Reuse a cohort for comparisons unless the user changes it.

## Prepare

Read [protocol.md](references/protocol.md) before executing a study. Use
[personas.json](assets/personas.json) as provisional profiles, not validated Cali
demographics. Tailor goals to the feature; [example-plan.json](assets/example-plan.json)
is a complete discovery example, not a universal test suite.

Confirm target URL/version from current evidence. Prefer the existing local or
staging app. Never silently switch to production or launch a server. Record the
feature, UI version/bundle or commit plus dirty-state fingerprint, task plan,
cohort, viewport, locale, model and actual browser driver. Keep unknowns explicit.
Ask only for a consequential missing choice (scope, budget, writes, credentials).

Initialize a run with the helper, using the skill's actual absolute directory:

```bash
node <skill-directory>/scripts/lab.mjs init --workspace <project> --url <target> --feature <feature> --version <ui-version> --mode hybrid --plan <plan.json> --model <actual-model> --driver <actual-browser-tool>
```

`--cohort student,visitor` selects profiles; omit to use all eight. `--profiles`
selects a custom `{personas:[...]}` JSON cohort without editing the shared defaults.
`--packet`
selects a JSON list of local source files for discussion-only studies; see the
protocol. The helper has no browser driver or model API: it prepares and validates
records; the executing agent must actually use available browser/agent tools.

## Execute independent tasks

Create temporary subagents with fresh context when the runtime supports them.
Give each only its `briefs/<persona>.md`, permitted task/evidence access and the
output contract in the protocol. Do not fork this chat, share source code, reveal
the expected click path, or pass previous findings. Keep evaluator criteria out
of persona briefs. Use subagents, not permanent chats.

Use an available, documented browser tool. Each browser needs verified isolated
storage, not just a new tab. Assign one writer per browser session. If independent
browser sessions are unavailable, either stop and report that limitation or use
one coordinator with sequential persona perspectives, clearly recorded as
`coordinator-perspective` and shared/unverified storage. Never label that fallback
as independent users. Do not install another harness or transfer account tokens
to overcome a missing capability without approval.

Record actions and original screenshots in the run directory. Update the matching
trial JSON using [protocol.md](references/protocol.md). The evaluator checks each
criterion against evidence. A persona's assertion of success is not verification.
Allow blocked, abandoned and not-applicable results. Missing screenshots, model
access, login or device evidence are limitations, never invented observations.

## Seal, discuss and report

```bash
node <skill-directory>/scripts/lab.mjs validate --run <run-directory>
node <skill-directory>/scripts/lab.mjs seal --run <run-directory>
```

For discussion/hybrid, read the discussion phase in the protocol. Give each persona
the same sealed evidence packet, collect individual responses before a bounded
discussion, and fill `discussion.json`, binding its `basis_sha256` to the seal's
returned digest. Cite evidence IDs and retain disagreement.
Do not manufacture social-media propagation, conversion or market statistics.

Close owned agents/browser sessions and stop owned processes. Record their IDs
and actual cleanup in `cleanup.json`; preserve pre-existing user sessions. Then:

```bash
node <skill-directory>/scripts/lab.mjs report --run <run-directory> --final
node <skill-directory>/scripts/lab.mjs compare --left <baseline-run> --right <new-run>
```

`report` without `--final` is a progress report, not completion. Final validation
rejects unexecuted trials, changed sealed evidence, missing discussion or unclosed
owned resources. Compatibility checks must pass before comparing outcomes.

Deliver observed failures first, with severity, task/persona and evidence links;
then separate persona interpretations, discussion hypotheses and proposed fixes.
Report synthetic counts, coverage/driver limitations and real-user validation
needed. Never equate model latency with human task time or infer population
preferences from this cohort. No app edits, form submissions or publication are
authorized by a study alone.
