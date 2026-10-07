# AI Business OS

A small, dependency-free proof of concept for a governed lead-to-outreach workflow. It demonstrates the operating pattern, not the long-term platform: lead capture, structured AI-style qualification, outreach drafting, human approval, explicit mock execution, and an event trail.

## Run it

Open `index.html` in a modern browser, or serve the workspace with any static file server (for example, `npx serve .`). There is no build step or package installation. The first visit seeds a sample workspace with a lead awaiting approval. Workspace data is saved in browser `localStorage`.

To import leads, choose a CSV with a header row. Required columns are `name`, `company`, and `email`; optional columns are `title`, `industry`, `employees`, `location`, `domain`, and `notes`.

## Vertical slice

1. Create a lead manually or import a CSV.
2. Run the Lead Intelligence Agent to get a score, qualification reasoning, opportunities, and recommended action.
3. Generate or regenerate a personalized outreach draft.
4. Request approval. The proposal records its type, target, reason, originating agent, timestamp, approval state, and execution state.
5. Approve or reject it in Approvals. Approved actions can be explicitly mock-executed; the demo does not send email.
6. Inspect the event history in Activity log.

## Architecture

- `src/agent.js` defines the Lead Intelligence Agent contract and returns structured qualification and draft data. Its deterministic implementation is a stand-in for a model-backed provider.
- `src/governance.js` owns the action policy and proposal, approval, rejection, and execution state transitions. Execution cannot happen before approval.
- `src/audit.js` appends timestamped actor, entity, and detail records; UI flows record meaningful state transitions separately from agent analysis.
- `src/store.js` seeds and persists the versioned workspace state. `src/main.js` composes the workflow and renders the interface.
- `styles.css` and `index.html` provide the responsive, no-build client.

The boundaries are intentional: agent reasoning is stored on a lead, proposed actions live in a separate queue, human decisions update approval state, execution is a distinct transition, and audit events capture each step. There is no external system adapter yet; the mock execution is the replaceable integration boundary.

## Decisions and known debt

- **No framework or backend:** the workspace is static and immediately runnable. As a result, data is browser-local, single-user, and not shared across devices.
- **Deterministic agent:** output is structured and predictable for the proof of concept, but is not live research or an LLM response. A production agent needs source attribution, model/provider configuration, input validation, and evaluation.
- **Approval gate:** every external action requires a human decision. The current policy is a small in-memory action model, not a complete role or organization policy engine.
- **Audit trail:** the interface only appends events, but `localStorage` is user-editable and does not provide immutability, access control, or reliable retention. Production governance needs a server-owned append-only event store and authenticated actors.
- **Mock execution:** approving an action does not send email. The separately labeled simulation records `ACTION_EXECUTED` only after approval and states that nothing was sent.
- **Import limitations:** CSV supports simple comma-separated rows and quoted fields; multiline quoted cells and large-file streaming are not implemented.

CRM, email, calendar, accounting, marketing, support, documents, orchestration, multi-tenancy, organization roles, and model routing are deliberately out of scope. Add adapters behind the agent and execution boundaries rather than connecting those systems directly to UI handlers.