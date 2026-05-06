# CLI + Agent Framework Refactor — Design

**Date:** 2026-05-07
**Status:** Draft, awaiting user review
**Scope of this spec:** Spec 1 of 2. Covers backend agent framework refactor, new CLI program, AI endpoint configuration, and the bare-minimum frontend changes needed to keep the existing UI compiling against the new graph. **Out of scope:** modernized frontend redesign — that is Spec 2, brainstormed separately and implemented with the `frontend-design` skill.

## Goals

1. Replace the current function-style "graph" (`backend/app/ai/graph.py` — a hard-coded list of 7 functions) with a **proper LangGraph state machine** built from OOP-interface-based components (`Node`, `Graph`, `LlmClient`, `Storage`, `PdfRenderer`).
2. Ship a **CLI program** (`cv …`) that drives the same graph directly (no HTTP round-trip), so the system is fully usable end-to-end without opening a browser.
3. Make the AI endpoint and credentials **explicit configuration** rather than implicit env-var pickup, while keeping env-var compatibility.
4. **Keep the web UI working** by updating only the types and minimal rendering code that touches the new fields.

## Non-goals

- Web UI redesign or modernization (Spec 2).
- PDF-to-master-CV import as a runtime feature. The user will provide a hand-converted `data/master_cv.json` populated from `ref/HaoluMa-CV-2510.pdf` as part of the implementation setup, but no `cv import-pdf` command ships in this spec.
- Resumable interrupted runs (`cv generate --resume <run-id>`). Interrupted runs are persisted for inspection but not resumable.
- Remote/HTTP CLI mode. CLI always imports modules directly.
- Batch generation, config CRUD subcommands, server-launcher subcommand.

## Architecture overview

```
┌───────────────────────────────────────────────────────────┐
│                    backend/app                            │
│                                                           │
│   api/         FastAPI routers (unchanged contracts)      │
│   cli/         NEW Click-based CLI entry point            │
│   ai/                                                     │
│     framework/  NEW OOP interfaces                        │
│       node.py        Node ABC                             │
│       graph.py       GraphRunner ABC + LangGraphRunner    │
│       llm.py         LlmClient Protocol                   │
│       state.py       WorkflowState (extended)             │
│       errors.py      Exception hierarchy                  │
│     nodes/      Existing 7 nodes refactored to classes    │
│     graphs/                                               │
│       cv_generation.py  Builds the StateGraph             │
│   services/    Storage / PdfRenderer / JdLoader           │
│                (extracted behind Protocol interfaces)     │
└───────────────────────────────────────────────────────────┘
```

**Single graph, two front doors.** `api/applications.py` (web) and `cli/commands/generate.py` both call the same compiled graph. Zero duplicated business logic.

**Real LangGraph.** `langgraph.StateGraph[WorkflowState]` with linear edges through the existing pipeline plus a conditional edge from `reviewer` looping back to `writer`, bounded by `settings.max_revision_loops`.

**Interface-first.** Every collaborator a node touches (LLM, storage, renderer) is a Protocol or ABC. Concrete implementations are injected via a `GraphDeps` dataclass. Tests use fakes; production wires real implementations from `Settings`.

**Shared data dir.** CLI writes runs to the same `data/applications/<run-id>/` the web UI uses. Runs from either entry point appear in the Dashboard.

## Agent framework — interfaces and skeletons

```python
# backend/app/ai/framework/node.py
class Node(ABC):
    name: ClassVar[str]            # stable id used in logs/inspect

    @abstractmethod
    def run(self, state: WorkflowState) -> WorkflowState: ...
```

```python
# backend/app/ai/framework/llm.py
class LlmClient(Protocol):
    def generate(
        self, *, system_prompt: str, user_prompt: str,
        output_schema: type[SchemaT],
    ) -> SchemaT: ...
```

```python
# backend/app/ai/framework/graph.py
class GraphRunner(ABC):
    @abstractmethod
    def run(self, initial: WorkflowState) -> WorkflowState: ...

class LangGraphRunner(GraphRunner):
    def __init__(self, compiled: CompiledGraph):
        self.compiled = compiled
    def run(self, initial):
        return self.compiled.invoke(initial)
```

Each existing node becomes a class:

```python
class JdExtractNode(Node):
    name = "jd_extract"
    def __init__(self, llm: LlmClient):
        self.llm = llm
    def run(self, state: WorkflowState) -> WorkflowState:
        ...
```

The graph is built once per process:

```python
# backend/app/ai/graphs/cv_generation.py
@dataclass
class GraphDeps:
    llm: LlmClient
    storage: Storage
    renderer: PdfRenderer
    settings: Settings

def build_cv_graph(deps: GraphDeps) -> GraphRunner:
    g = StateGraph(WorkflowState)
    g.add_node("jd_extract",       JdExtractNode(deps.llm).run)
    g.add_node("company_research", CompanyResearchNode(deps.llm).run)
    g.add_node("jd_analysis",      JdAnalysisNode(deps.llm).run)
    g.add_node("positioning",      PositioningNode(deps.llm).run)
    g.add_node("gap_questions",    GapQuestionsNode(deps.llm).run)
    g.add_node("writer",           WriterNode(deps.llm).run)
    g.add_node("reviewer",         ReviewerNode(deps.llm).run)
    g.add_edge(START, "jd_extract")
    g.add_edge("jd_extract", "company_research")
    g.add_edge("company_research", "jd_analysis")
    g.add_edge("jd_analysis", "positioning")
    g.add_edge("positioning", "gap_questions")
    g.add_edge("gap_questions", "writer")
    g.add_edge("writer", "reviewer")
    g.add_conditional_edges(
        "reviewer",
        _needs_revision,    # checks revision_count < max_loops AND reviewer.requires_revision
        {"revise": "writer", "done": END},
    )
    return LangGraphRunner(
        g.compile(interrupt_before=["writer"])  # interactive gap-prompt hook
    )
```

`WorkflowState` extensions (added to `app/ai/state.py`):
- `revision_count: int`
- `reviewer_notes: list[ReviewerNote]`
- `gap_answers: dict[str, str]`
- `node_artifacts: dict[str, Any]` — per-node outputs for `cv inspect` and the web "Run trace" tab.

## CLI surface

Stack: **Click** (subcommands, helpful error messages, easy testing via `CliRunner`) plus **Rich** for tables and prompts. Installed as `cv` via `[project.scripts]` in `backend/pyproject.toml`.

```
cv generate <jd-path> [--master PATH] [--out-dir PATH]
                      [--non-interactive] [--max-loops N]
                      [--model NAME] [--verbose]
    Run the full graph. JD path can be SEEK JSON or plain text.
    Default master:  data/master_cv.json
    Default out-dir: data/applications/<run-id>/
    Interactive gap prompts when stdin is a TTY, unless
    --non-interactive is set.

cv list [--limit N] [--json]
    Show recent runs from data/applications/, newest first.
    Columns: run-id, date, JD title, company, status.

cv show <run-id>
    Pretty-printed summary: JD overview, positioning, gap
    questions + answers, reviewer notes, output paths.

cv inspect <run-id> [--node NAME] [--json]
    Dump intermediate node artifacts. --node filters to one
    node; --json emits raw JSON.

cv export <run-id> --format {pdf|json|md} [--out PATH]
    Re-render output from the stored run without re-running
    the graph.

cv version
    Print package version, AI endpoint, model.
```

CLI layout under `backend/app/cli/`:

```
__init__.py
main.py            Click root group. Loads Settings, builds GraphDeps.
commands/
  generate.py
  list.py
  show.py
  inspect.py
  export.py
io/
  jd_loader.py     SEEK JSON / plaintext / file path detection.
  prompts.py       Interactive gap-question prompts via Rich.
  formatters.py    Table / JSON / human-readable helpers.
```

**Exit codes:**
- `0` success
- `1` user error (bad path, malformed args)
- `2` validation error (master CV / JD schema)
- `3` AI / network error
- `4` interrupted

## Data flow — one full `cv generate` run

```
1. CLI parses args, loads Settings.
2. Storage.load_master_cv(path) -> MasterCv (Pydantic-validated).
3. JdLoader.load(jd_path) -> JobDescription
       (auto-detects SEEK JSON vs plaintext).
4. Storage.create_run() -> run_id; ApplicationRun stub on disk.
5. GraphDeps assembled (llm, storage, renderer, settings).
6. graph = build_cv_graph(deps); runner.run(initial_state)
       initial_state = {
         master_cv, application,
         revision_count: 0, gap_answers: {}, node_artifacts: {},
       }

   Inside the graph:
     jd_extract -> company_research -> jd_analysis
       -> positioning -> gap_questions
       -> [INTERRUPT before writer]
       -> writer -> reviewer
                       |
            +----------+----------+
            | revision_count < N  |  count >= N OR no revision
            v                     v
          writer                 END

7. PdfRenderer.render(final_cv) -> cv.pdf.
8. Storage.persist_run() ->
       data/applications/<run-id>/
         run.json    (ApplicationRun + node_artifacts)
         cv.json     (final structured CV)
         cv.pdf      (rendered)
         jd.json     (normalised JD copy)
9. CLI prints summary + paths; exits 0.
```

**Interactive gaps live in the CLI driver, not in a node.** The graph is compiled with `interrupt_before=["writer"]`. When the runner hits that interrupt, control returns to the CLI driver, which inspects `state["gap_questions"]`. If the TTY-and-interactive condition holds, it prompts the user via Rich, writes answers into `state["gap_answers"]`, then resumes the graph. In non-interactive mode (or when no gaps exist), it resumes immediately without prompting. This keeps nodes pure (no I/O) and lets FastAPI use the same graph by simply not honouring the interrupt — gap questions are returned to the web client in the run payload exactly as today.

## AI endpoint configuration

`backend/app/config.py`:

```python
class Settings(BaseSettings):
    # ...existing fields...
    ai_base_url: str = Field(default="")               # CV_BUILDER_AI_BASE_URL
    ai_api_key: SecretStr | None = Field(default=None) # CV_BUILDER_AI_API_KEY
    ai_request_timeout_s: int = Field(default=60)
```

`backend/app/ai/client.py`:

```python
class OpenAiStructuredClient(LlmClient):
    def __init__(self, settings: Settings, chat_model: object | None = None):
        self.settings = settings
        self.chat_model = chat_model or ChatOpenAI(
            model=settings.ai_model,
            base_url=settings.ai_base_url or None,
            api_key=(
                settings.ai_api_key.get_secret_value()
                if settings.ai_api_key else None
            ),
            timeout=settings.ai_request_timeout_s,
            streaming=False,  # structured output works better non-streaming
        )
```

**Credential resolution order** (highest priority first):
1. Explicit `Settings` field (from `CV_BUILDER_AI_API_KEY`, possibly via `.env`).
2. Standard `OPENAI_API_KEY` / `OPENAI_BASE_URL` env vars (langchain falls back automatically when args are `None`).
3. Convenience fallback: parse `ref/ai.txt` if it exists and earlier sources are unset. The user has confirmed the key in `ref/ai.txt` is local-only and safe to leave in the repo.

`SecretStr` is used purely for hygiene (redacts in logs / `repr`). `cv version` and the Settings UI display the endpoint only, never the key.

## Frontend (adapter-level only)

| Change | Where | Why |
|---|---|---|
| Sync `ApplicationRun` type with new backend fields (`revision_count`, `gap_answers`, `node_artifacts`) | `frontend/src/types/application.ts` | Keep TypeScript compiling against new API shape. |
| Render new fields with placeholder UI (collapsible JSON dump is acceptable) | `frontend/src/pages/GeneratedDocuments.tsx` | Information not lost; polish deferred. |
| Settings: expose `ai_base_url` (read-only) and `max_revision_loops` (editable) | `frontend/src/pages/Settings.tsx` | Mirror new settings fields. |

Anything beyond this — navigation rework, page restructure, design tokens, mobile, accessibility — is **out of scope and owned by Spec 2**.

## Error handling

Custom exception hierarchy in `backend/app/ai/framework/errors.py`. Both CLI and API catch the same types.

| Failure | Where it surfaces | Strategy |
|---|---|---|
| Master CV missing / invalid JSON / Pydantic validation failure | `Storage.load_master_cv` | `MasterCvLoadError` with field path. CLI exit 2; API 422. |
| JD missing / unrecognised format | `JdLoader.load` | `JdLoadError`. CLI exit 2 with format suggestion. |
| AI endpoint unreachable / 5xx / timeout | `OpenAiStructuredClient.generate` | `AiClientError`. **Single retry** for 5xx and timeouts (no exponential backoff). 401 fails immediately with "check `ai_api_key`". CLI exit 3. |
| Structured output parse failure | `OpenAiStructuredClient.generate` | Single retry with stricter prompt suffix. On second failure, `AiSchemaError` carrying raw response, recorded in `node_artifacts.errors`. |
| Reviewer loop never converges | conditional edge | Not an error. Final state notes `reviewer_unresolved: true`. CLI prints warning, exits 0. Output is still usable. |
| PDF render failure | `PdfRenderer.render` | `PdfRenderError`. `run.json`/`cv.json` already persisted, so `cv export <run-id> --format pdf` recovers. CLI exit 4. |
| Ctrl-C during gap prompt | CLI driver | Persist current state with `status: "interrupted"`, exit 4. Resume is out of scope. |
| Concurrent same-`run-id` writes | `Storage.create_run` | Run IDs are timestamp + short uuid; collisions effectively impossible. No locking. |

**Logging:** structured logging at INFO per node start/finish (name, duration, token cost when available). DEBUG includes prompts/responses and is off by default; enable with `--verbose` or `LOG_LEVEL=DEBUG`. Logs go to stderr; CLI human output goes to stdout.

## Testing strategy

**Unit (no network, no Playwright):**
- `backend/tests/ai/framework/` — `Node` contract, `LangGraphRunner` with fake LLM, conditional-edge logic (revisions exhausted → END; reviewer says done → END; reviewer asks revise + budget remaining → loop).
- `backend/tests/ai/nodes/` — one test per node class, fake `LlmClient` returning canned structured outputs. Asserts state mutations, not LLM behaviour.
- `backend/tests/cli/` — Click `CliRunner` per subcommand. Stub `GraphDeps`. Cover TTY vs non-TTY, exit codes per error path, `cv inspect --node` filter, `cv export` re-render.
- `backend/tests/services/` — `Storage`, `JdLoader` (SEEK JSON + plaintext detection), `OpenAiStructuredClient` retry/error paths with mocked httpx.

**Integration (real graph, fake LLM):**
- `backend/tests/integration/test_cv_generation_graph.py` — real `LangGraph` with deterministic fake `LlmClient` returning scripted outputs per node. Run end-to-end with one of the real JDs from `ref/jobs/`. Assert all nodes ran, `node_artifacts` populated, reviewer loop respected `max_revision_loops`, output validates as `MasterCv`-shaped.
- `backend/tests/integration/test_cli_generate_e2e.py` — `cv generate` against a real JD, fake LLM, real Playwright PDF render. Assert files land in `data/applications/<run-id>/`, `cv list` finds it, `cv show` prints, `cv inspect` dumps artifacts.
- Existing `test_e2e_smoke.py` extended for the new graph path (no break to FastAPI behaviour).

**Live AI smoke (manual, opt-in):**
- `backend/tests/live/test_ai_endpoint_smoke.py` — gated by `RUN_LIVE_AI=1`. Hits `http://10.20.3.110:8080/v1` with a 1-token completion. Confirms credentials + connectivity. Not in CI default.

**Frontend:**
- Existing Vitest tests stay green. Adapter changes get one new test each: type compiles, new fields render without crash.

**Coverage target:** every `Node` subclass, every CLI command, every error path in the table above has at least one test.

## Manual verification checklist

1. `cv generate ref/jobs/<some-jd>.json` runs end-to-end, prints summary, exits 0.
2. `data/applications/<run-id>/` contains `run.json`, `cv.json`, `cv.pdf`, `jd.json`.
3. The web UI Dashboard lists the new run.
4. `cv inspect <run-id>` shows per-node artifacts.
5. `cv generate --non-interactive` skips gap prompts.
6. Bad master path → exit 2 with helpful message naming the bad field.
7. Wrong API key → exit 3 with "check `ai_api_key`" hint.
8. PDF render failure path: temporarily break Playwright, run generate, confirm `cv.json` persisted; fix, run `cv export <run-id> --format pdf`, confirm recovery.
9. Reviewer loop: with `max_revision_loops=2` and a fake LLM that always asks for revision, run terminates after 2 loops with `reviewer_unresolved: true`.
10. Web UI: open a CLI-generated run in the browser, confirm new fields render (placeholder UI is fine).

## Implementation prerequisites (setup, not features)

1. Hand-convert `ref/HaoluMa-CV-2510.pdf` into `data/master_cv.json` once, before the CLI is exercised against real data. This is one-shot setup, not a runtime feature.
2. Ensure `.env` (or shell env) has `CV_BUILDER_AI_BASE_URL=http://10.20.3.110:8080/v1` and `CV_BUILDER_AI_API_KEY=...` set, OR rely on the `ref/ai.txt` fallback.

## Git workflow

- Branch from `master`: `feature/cli-agent-framework` (use a worktree).
- One commit per task in the implementation plan; each commit must keep `pytest` and `vitest` green.
- Use the standard subagent-driven-development flow: implementer → spec compliance review → code quality review → land.
- PR back to `master` only after the manual verification checklist above is fully satisfied.

## Spec 2 — what comes after this

Once Spec 1 is approved by the user and handed to `writing-plans`, run a fresh brainstorming pass for the modernized frontend redesign. That spec terminates in invoking the `frontend-design` skill during implementation. Spec 2 inherits a stable backend + CLI to design against, and the user will have used `cv generate` enough by then to know what the web UI should make easier.
