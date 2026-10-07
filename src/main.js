import { loadState, saveState, makeId } from './store.js';
import { recordEvent } from './audit.js';
import { leadIntelligenceAgent } from './agent.js';
import { actionPolicy, createProposal, approveAction, rejectAction, simulateExecution } from './governance.js';

const app = document.querySelector('#app');
const state = loadState();
let activeView = 'dashboard';
let selectedLeadId = state.leads[0]?.id ?? null;
let showLeadForm = false;
const viewLabels = { dashboard: 'Dashboard', leads: 'Leads', workflows: 'Workflows', agents: 'AI Agents', approvals: 'Approvals', activity: 'Activity log', settings: 'Settings' };

const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const dateTime = (value) => new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
const dateShort = (value) => new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(value));
const initials = (name = '') => name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase();
const leadById = (id) => state.leads.find((lead) => lead.id === id);
const actionById = (id) => state.actions.find((action) => action.id === id);
const eventLabel = (type) => type.toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

function commit() {
  saveState(state);
  render();
}

function eventRow(event) {
  const lead = leadById(event.entityId) ?? state.leads.find((item) => state.actions.some((action) => action.id === event.entityId && action.leadId === item.id));
  return `<div class="event-row"><span class="event-marker ${event.type.includes('APPROV') ? 'marker-amber' : event.type.includes('AI_') ? 'marker-teal' : ''}"></span><div class="event-copy"><strong>${escapeHtml(eventLabel(event.type))}</strong><span>${escapeHtml(lead?.company ?? event.entityType)} · ${escapeHtml(event.actor)}</span></div><time>${escapeHtml(dateTime(event.timestamp))}</time></div>`;
}

function statCard(label, value, note, icon, tone = '') {
  return `<article class="stat-card"><div class="stat-top"><span>${label}</span><span class="stat-icon ${tone}">${icon}</span></div><strong class="stat-value">${value}</strong><span class="stat-note">${note}</span></article>`;
}

function dashboardView() {
  const pending = state.actions.filter((action) => action.approvalStatus === 'PENDING').length;
  const analyzed = state.leads.filter((lead) => lead.analysis).length;
  const executed = state.actions.filter((action) => action.executionStatus !== 'NOT_EXECUTED').length;
  const recent = [...state.events].reverse().slice(0, 5);
  const nextAction = state.actions.find((action) => action.approvalStatus === 'PENDING');
  return `<section class="page-heading"><div><div class="eyebrow">WEDNESDAY, OCTOBER 7, 2026</div><h1>Good morning, Jordan<span class="heading-period">.</span></h1><p>Here’s what’s moving across your workspace today.</p></div><button class="button button-primary" data-view="leads"><span>＋</span> Add a lead</button></section>
    <section class="stats-grid">${statCard('Active leads', state.leads.length, `${analyzed} with completed research`, '◎', 'icon-mint')}${statCard('Awaiting approval', pending, pending ? 'Human review required' : 'Queue is clear', '▣', 'icon-peach')}${statCard('AI analyses', analyzed, 'Structured qualification complete', '✳', 'icon-lilac')}${statCard('Actions executed', executed, 'Mock execution only', '↗', 'icon-yellow')}</section>
    <div class="dashboard-grid"><section class="panel workflow-panel"><div class="panel-heading"><div><span class="eyebrow">LEAD WORKFLOW</span><h2>From signal to approved action</h2></div><button class="text-button" data-view="workflows">View workflow <span>→</span></button></div>
      <div class="workflow-line"><div class="workflow-step done"><span class="step-dot">✓</span><strong>Lead captured</strong><small>${state.leads.length} leads</small></div><div class="workflow-connector"></div><div class="workflow-step ${analyzed ? 'done' : ''}"><span class="step-dot">${analyzed ? '✓' : '2'}</span><strong>AI research</strong><small>${analyzed} analyzed</small></div><div class="workflow-connector"></div><div class="workflow-step ${nextAction ? 'current' : ''}"><span class="step-dot">3</span><strong>Human approval</strong><small>${pending} pending</small></div><div class="workflow-connector"></div><div class="workflow-step"><span class="step-dot">4</span><strong>Execution</strong><small>Always gated</small></div></div>
      <div class="workflow-callout"><span class="callout-icon">✳</span><div><strong>Lead qualification & outreach</strong><p>Research a lead, review the recommendation, then approve any proposed outreach.</p></div><button class="button button-secondary button-small" data-view="leads">Open leads <span>→</span></button></div>
    </section><section class="panel approvals-panel"><div class="panel-heading"><div><span class="eyebrow">NEEDS YOUR ATTENTION</span><h2>Approval queue</h2></div><button class="round-link" data-view="approvals" aria-label="View approvals">→</button></div>
      ${nextAction ? `<div class="queue-item"><div class="queue-top"><span class="status-pill status-pending">Pending review</span><time>${dateShort(nextAction.createdAt)}</time></div><div class="queue-person"><span class="avatar avatar-amber">${initials(leadById(nextAction.leadId)?.name)}</span><div><strong>${escapeHtml(leadById(nextAction.leadId)?.name ?? 'Unknown lead')}</strong><span>${escapeHtml(leadById(nextAction.leadId)?.company ?? '')}</span></div></div><p class="queue-description">${escapeHtml(nextAction.payload.subject)}</p><button class="button button-primary button-full" data-view="approvals">Review proposed action</button></div>` : `<div class="empty-state compact-empty"><span class="empty-icon">✓</span><strong>All caught up</strong><p>New proposed actions will appear here.</p></div>`}
    </section></div>
    <section class="panel activity-panel"><div class="panel-heading"><div><span class="eyebrow">TRACEABILITY</span><h2>Recent activity</h2></div><button class="text-button" data-view="activity">Full audit log <span>→</span></button></div><div class="event-list">${recent.map(eventRow).join('')}</div></section>`;
}

function leadForm() {
  if (!showLeadForm) return '';
  return `<form class="lead-form" id="lead-form"><div class="form-heading"><div><span class="eyebrow">NEW RECORD</span><h3>Add a lead</h3></div><button type="button" class="icon-button close-form" data-action="close-lead-form" aria-label="Close form">×</button></div><div class="form-grid"><label>Contact name<input name="name" required placeholder="Alex Morgan"></label><label>Role<input name="title" required placeholder="VP of Operations"></label><label>Work email<input name="email" type="email" required placeholder="alex@company.com"></label><label>Company<input name="company" required placeholder="Company name"></label><label>Industry<input name="industry" placeholder="Business software"></label><label>Team size<input name="employees" type="number" min="1" value="50"></label><label class="form-span">Research notes<textarea name="notes" rows="2" placeholder="Context that could help qualify this lead"></textarea></label></div><div class="form-actions"><button type="button" class="button button-quiet" data-action="close-lead-form">Cancel</button><button class="button button-primary" type="submit">Create lead</button></div></form>`;
}

function analysisBlock(lead) {
  if (!lead.analysis) return `<div class="analysis-empty"><span class="agent-orbit">✳</span><div><strong>Research this lead with AI</strong><p>Get a structured qualification, opportunity map, and recommended next step.</p></div><button class="button button-primary" data-action="analyze" data-id="${lead.id}">Analyze lead <span>→</span></button></div>`;
  const analysis = lead.analysis;
  return `<div class="analysis-summary"><div class="score-ring" style="--score:${analysis.score * 3.6}deg"><div><strong>${analysis.score}</strong><span>/ 100</span></div></div><div class="score-copy"><span class="status-pill status-qualified">${escapeHtml(analysis.band)}</span><h3>${escapeHtml(analysis.recommendedAction)}</h3><p>${escapeHtml(analysis.actionReason)}</p><small>Analyzed ${dateTime(analysis.analyzedAt)} · Lead Intelligence Agent</small></div></div><div class="analysis-columns"><div><h4>Why this lead</h4><ul class="reason-list">${analysis.reasoning.map((reason) => `<li>${escapeHtml(reason)}</li>`).join('')}</ul></div><div><h4>Opportunities identified</h4><ul class="opportunity-list">${analysis.opportunities.map((opportunity) => `<li><span>↗</span>${escapeHtml(opportunity)}</li>`).join('')}</ul></div></div>`;
}

function outreachBlock(lead) {
  if (!lead.analysis) return `<div class="subsection-muted">Run lead research to prepare a relevant outreach draft.</div>`;
  if (!lead.outreach) return `<div class="subsection-muted"><span>Research is ready. Create a draft grounded in the lead context.</span><button class="button button-secondary button-small" data-action="draft" data-id="${lead.id}">Generate draft</button></div>`;
  const hasPending = state.actions.some((action) => action.leadId === lead.id && action.approvalStatus === 'PENDING');
  const hasApproved = state.actions.some((action) => action.leadId === lead.id && action.approvalStatus === 'APPROVED');
  return `<div class="draft-card"><div class="draft-meta"><span class="draft-label">SUBJECT</span><strong>${escapeHtml(lead.outreach.subject)}</strong></div><div class="draft-meta"><span class="draft-label">MESSAGE</span><p>${escapeHtml(lead.outreach.body).replaceAll('\n', '<br>')}</p></div><div class="draft-footer"><span class="draft-status"><i></i> Draft · Not sent</span><div><button class="button button-quiet button-small" data-action="draft" data-id="${lead.id}">Regenerate</button>${hasPending ? '<span class="status-pill status-pending">In approval queue</span>' : hasApproved ? '<span class="status-pill status-approved">Approved</span>' : `<button class="button button-primary button-small" data-action="propose" data-id="${lead.id}">Request approval <span>→</span></button>`}</div></div></div>`;
}

function leadDetail(lead) {
  if (!lead) return `<div class="empty-state"><span class="empty-icon">◎</span><strong>Select a lead to get started</strong><p>Choose a record from the list or add a new lead.</p></div>`;
  return `<div class="lead-detail"><div class="detail-heading"><div class="detail-person"><span class="avatar avatar-large avatar-teal">${initials(lead.name)}</span><div><span class="eyebrow">${escapeHtml(lead.stage)} LEAD</span><h2>${escapeHtml(lead.name)}</h2><p>${escapeHtml(lead.title)} · <a href="mailto:${escapeHtml(lead.email)}">${escapeHtml(lead.email)}</a></p></div></div><button class="button button-secondary button-small" data-action="analyze" data-id="${lead.id}">${lead.analysis ? '↻  Re-analyze' : '✳  Analyze'}</button></div>
    <div class="company-strip"><div><span>COMPANY</span><strong>${escapeHtml(lead.company)}</strong></div><div><span>INDUSTRY</span><strong>${escapeHtml(lead.industry || 'Not specified')}</strong></div><div><span>TEAM SIZE</span><strong>${lead.employees || '—'} people</strong></div><div><span>LOCATION</span><strong>${escapeHtml(lead.location || 'Not specified')}</strong></div></div>
    <div class="detail-notes"><span class="notes-icon">⌁</span><p>${escapeHtml(lead.notes || 'No research notes added yet.')}</p><small>Added ${dateShort(lead.createdAt)} · ${escapeHtml(lead.source || 'Manual entry')}</small></div>
    <section class="detail-section"><div class="section-title"><div><span class="eyebrow">01 · RESEARCH & QUALIFICATION</span><h3>Lead intelligence</h3></div><span class="agent-label"><i></i> ${leadIntelligenceAgent.name}</span></div>${analysisBlock(lead)}</section>
    <section class="detail-section outreach-section"><div class="section-title"><div><span class="eyebrow">02 · RECOMMENDED ACTION</span><h3>Outreach draft</h3></div><span class="not-sent-tag">EXTERNAL ACTION · APPROVAL REQUIRED</span></div>${outreachBlock(lead)}</section></div>`;
}

function leadsView() {
  const selected = leadById(selectedLeadId);
  return `<section class="page-heading compact-heading"><div><div class="eyebrow">PIPELINE</div><h1>Leads</h1><p>Research, qualify, and prepare the next best action.</p></div><div class="heading-actions"><button class="button button-secondary" data-action="import-csv"><span>↑</span> Import CSV</button><button class="button button-primary" data-action="open-lead-form"><span>＋</span> Add lead</button></div></section>
    ${leadForm()}<div class="leads-layout"><aside class="panel lead-list-panel"><div class="list-toolbar"><div><strong>All leads</strong><span>${state.leads.length} records</span></div><button class="icon-button" title="Filter leads" aria-label="Filter leads">☷</button></div><div class="lead-list">${state.leads.map((lead) => `<button class="lead-list-item ${lead.id === selectedLeadId ? 'selected' : ''}" data-action="select-lead" data-id="${lead.id}"><span class="avatar ${lead.analysis ? 'avatar-teal' : 'avatar-gray'}">${initials(lead.name)}</span><span class="lead-list-copy"><strong>${escapeHtml(lead.name)}</strong><small>${escapeHtml(lead.title)} · ${escapeHtml(lead.company)}</small><span class="lead-list-bottom"><span class="lead-stage-dot ${lead.analysis ? 'dot-qualified' : ''}"></span>${lead.analysis ? `${lead.analysis.score} qualification score` : escapeHtml(lead.stage)}<time>${dateShort(lead.createdAt)}</time></span></span></button>`).join('')}</div><div class="list-footnote"><span>✳</span> AI research is always reviewable</div></aside><section class="panel lead-detail-panel">${leadDetail(selected)}</section></div>`;
}

function approvalsView() {
  const actions = [...state.actions].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const pending = actions.filter((action) => action.approvalStatus === 'PENDING');
  const history = actions.filter((action) => action.approvalStatus !== 'PENDING');
  const actionCard = (action, review = false) => {
    const lead = leadById(action.leadId);
    return `<article class="approval-card"><div class="approval-card-head"><span class="action-type-icon">✉</span><div class="approval-action-title"><span class="eyebrow">${escapeHtml(action.actionType.replaceAll('_', ' '))}</span><h3>${escapeHtml(action.payload.subject)}</h3></div><span class="status-pill ${action.approvalStatus === 'PENDING' ? 'status-pending' : action.approvalStatus === 'APPROVED' ? 'status-approved' : 'status-rejected'}">${escapeHtml(action.approvalStatus.toLowerCase())}</span></div><div class="approval-target"><span class="avatar avatar-amber">${initials(lead?.name)}</span><div><strong>${escapeHtml(lead?.name ?? 'Unknown lead')} · ${escapeHtml(lead?.company ?? '')}</strong><span>To ${escapeHtml(action.target)} · Proposed by ${escapeHtml(action.originatingAgent)}</span></div></div><div class="approval-reason"><span>RATIONALE</span><p>${escapeHtml(action.reason)}</p></div><details class="approval-draft"><summary>Review outreach draft</summary><div><strong>${escapeHtml(action.payload.subject)}</strong><p>${escapeHtml(action.payload.body).replaceAll('\n', '<br>')}</p></div></details><div class="approval-footer"><span>Proposed ${dateTime(action.createdAt)}<br><span class="execution-note">Execution: ${escapeHtml(action.executionStatus.toLowerCase().replaceAll('_', ' '))}</span></span>${review ? `<div class="approval-buttons"><button class="button button-quiet button-small" data-action="reject" data-id="${action.id}">Reject</button><button class="button button-primary button-small" data-action="approve" data-id="${action.id}">Approve action</button></div>` : action.approvalStatus === 'APPROVED' && action.executionStatus === 'NOT_EXECUTED' ? `<button class="button button-secondary button-small" data-action="execute" data-id="${action.id}">Simulate execution</button>` : action.executionStatus === 'MOCK_EXECUTED' ? '<span class="mock-note">✓ Mocked · not sent</span>' : ''}</div></article>`;
  };
  return `<section class="page-heading compact-heading"><div><div class="eyebrow">GOVERNANCE</div><h1>Approvals</h1><p>Human review is required before any external action.</p></div><span class="policy-chip"><span class="policy-dot"></span> Approval policy active</span></section><section class="approvals-view"><div class="approval-section-heading"><div><h2>Waiting for review <span>${pending.length}</span></h2><p>AI proposals stay drafts until a person decides.</p></div></div>${pending.length ? `<div class="approval-grid">${pending.map((action) => actionCard(action, true)).join('')}</div>` : '<div class="panel empty-approvals"><span class="empty-icon">✓</span><strong>No pending approvals</strong><p>When an agent proposes an action, it will appear here.</p></div>'}<div class="approval-section-heading history-heading"><div><h2>Decision history <span>${history.length}</span></h2><p>Approved actions remain unexecuted until explicitly run.</p></div></div>${history.length ? `<div class="approval-grid">${history.map((action) => actionCard(action)).join('')}</div>` : ''}</section>`;
}

function activityView() {
  const events = [...state.events].reverse();
  return `<section class="page-heading compact-heading"><div><div class="eyebrow">GOVERNANCE & TRACEABILITY</div><h1>Activity log</h1><p>A chronological record of meaningful workspace events.</p></div><span class="policy-chip">${events.length} events recorded</span></section><section class="panel audit-panel"><div class="audit-toolbar"><div><strong>Audit events</strong><span>Append-only in this browser workspace</span></div><span class="audit-lock">◈ Local demo storage</span></div><div class="audit-table-wrap"><table class="audit-table"><thead><tr><th>EVENT</th><th>ENTITY</th><th>ACTOR</th><th>DETAILS</th><th>TIMESTAMP</th></tr></thead><tbody>${events.map((event) => { const lead = leadById(event.entityId) ?? state.leads.find((item) => state.actions.some((action) => action.id === event.entityId && action.leadId === item.id)); const detail = Object.entries(event.details ?? {}).map(([key, value]) => `${eventLabel(key)}: ${value}`).join(' · '); return `<tr><td><span class="audit-event"><i class="event-marker ${event.type.includes('APPROV') ? 'marker-amber' : event.type.includes('AI_') ? 'marker-teal' : ''}"></i>${escapeHtml(eventLabel(event.type))}</span></td><td><strong>${escapeHtml(lead?.company ?? event.entityType)}</strong><small>${escapeHtml(event.entityType)} · ${escapeHtml(event.entityId)}</small></td><td>${escapeHtml(event.actor)}</td><td class="audit-detail">${escapeHtml(detail || '—')}</td><td class="audit-time">${escapeHtml(dateTime(event.timestamp))}</td></tr>`; }).join('')}</tbody></table></div><p class="audit-disclaimer">This demo preserves event history in local browser storage. Production audit immutability requires server-side append-only storage and access controls.</p></section>`;
}

function workflowsView() {
  const latest = [...state.events].reverse().slice(0, 6);
  return `<section class="page-heading compact-heading"><div><div class="eyebrow">ORCHESTRATION</div><h1>Workflows</h1><p>See how work moves from intake to a governed action.</p></div><span class="status-pill status-active">● 1 active workflow</span></section><section class="panel workflow-detail-panel"><div class="workflow-detail-head"><div class="workflow-symbol">⌘</div><div><span class="eyebrow">LEAD OPERATIONS</span><h2>Lead qualification & outreach</h2><p>Version 0.1 · Triggered manually · ${state.leads.length} lead records</p></div><span class="workflow-active-pill"><i></i> Active</span></div><div class="workflow-steps-list">${[['01', 'Lead captured', 'Contact and company context are stored in the workspace.', 'Complete'], ['02', 'AI research & qualification', 'Lead Intelligence Agent returns a score, reasoning, and opportunities.', `${state.leads.filter((lead) => lead.analysis).length} complete`], ['03', 'Outreach draft prepared', 'Personalized message generated from lead context. No message is sent.', `${state.leads.filter((lead) => lead.outreach).length} complete`], ['04', 'Human approval', 'A person reviews and approves or rejects the proposed action.', `${state.actions.filter((action) => action.approvalStatus === 'PENDING').length} awaiting`], ['05', 'Execution', 'Explicitly initiated mock execution after approval. No external integration.', `${state.actions.filter((action) => action.executionStatus !== 'NOT_EXECUTED').length} simulated`]].map(([number, title, description, status], index) => `<div class="workflow-list-step"><span class="workflow-number ${index < 3 ? 'number-done' : ''}">${number}</span><div><strong>${title}</strong><p>${description}</p></div><span class="workflow-step-status">${status}</span></div>`).join('')}</div><div class="workflow-detail-foot"><span>Recent workflow events</span><div>${latest.map(eventRow).join('')}</div></div></section>`;
}

function agentsView() {
  const analyzed = state.leads.filter((lead) => lead.analysis).length;
  return `<section class="page-heading compact-heading"><div><div class="eyebrow">INTELLIGENCE LAYER</div><h1>AI Agents</h1><p>Specialized agents produce structured outputs and proposed actions.</p></div><span class="agent-count-pill"><i></i> 1 agent configured</span></section><section class="agent-grid"><article class="panel agent-card"><div class="agent-card-top"><span class="agent-large-icon">✳</span><span class="agent-live"><i></i> Available</span></div><span class="eyebrow">SALES OPERATIONS</span><h2>Lead Intelligence Agent</h2><p>Analyzes lead context, identifies opportunities, recommends a next step, and drafts personalized outreach.</p><div class="agent-capabilities"><span>Qualification</span><span>Opportunity mapping</span><span>Outreach drafts</span></div><div class="agent-metrics"><div><strong>${analyzed}</strong><span>Leads analyzed</span></div><div><strong>${state.actions.filter((action) => action.originatingAgent === 'lead-intelligence').length}</strong><span>Actions proposed</span></div><div><strong>v0.1.0</strong><span>Agent version</span></div></div><div class="agent-card-footer"><span>Structured output · Human approval required</span><button class="button button-secondary button-small" data-view="leads">Run on a lead <span>→</span></button></div></article><aside class="panel agent-principles"><span class="eyebrow">OPERATING BOUNDARIES</span><h3>Designed to recommend, not act.</h3><div class="principle"><span>01</span><p>Analysis is stored separately from proposals.</p></div><div class="principle"><span>02</span><p>External actions require human approval.</p></div><div class="principle"><span>03</span><p>Execution is a separate, explicit step.</p></div><div class="principle"><span>04</span><p>Every transition is recorded in the audit log.</p></div></aside></section>`;
}

function settingsView() {
  return `<section class="page-heading compact-heading"><div><div class="eyebrow">WORKSPACE CONFIGURATION</div><h1>Settings</h1><p>Review the current workspace identity and action controls.</p></div></section><div class="settings-layout"><section class="panel settings-panel"><div class="settings-section-head"><div><span class="eyebrow">WORKSPACE</span><h2>Workspace profile</h2></div></div><div class="settings-row"><div><strong>Workspace name</strong><small>Shown to workspace members</small></div><span class="settings-value">Acme Studio</span></div><div class="settings-row"><div><strong>Current user</strong><small>Approval actions are attributed to this user</small></div><span class="settings-value">Jordan Davis · Admin</span></div><div class="settings-row"><div><strong>Storage</strong><small>Demo data is scoped to this browser</small></div><span class="settings-value">Local browser storage</span></div><div class="settings-section-head policy-head"><div><span class="eyebrow">GOVERNANCE</span><h2>Action policy</h2></div><span class="policy-chip"><span class="policy-dot"></span> Enforced</span></div><div class="policy-row"><span class="policy-icon allow-icon">✓</span><div><strong>Allowed actions</strong><small>${actionPolicy.allowed.map((item) => item.replaceAll('_', ' ')).join(', ')}</small></div><span class="policy-tag">1 action type</span></div><div class="policy-row"><span class="policy-icon approval-icon">⌛</span><div><strong>Approval required</strong><small>All external actions must be approved by a person</small></div><span class="policy-tag policy-required">Required</span></div><div class="policy-row"><span class="policy-icon prohibit-icon">⊘</span><div><strong>Prohibited actions</strong><small>None configured in this local demo</small></div><span class="policy-tag">0 action types</span></div><p class="settings-note">Role-based policies and organization-level permissions are future work. This local demo uses one workspace administrator.</p></section><aside class="panel settings-side"><span class="eyebrow">PROOF OF CONCEPT</span><h3>Built for a governed next step.</h3><p>This workspace demonstrates one lead-to-outreach path with mock company data and no connected business systems.</p><div class="settings-side-rule"></div><strong>Not production-ready</strong><small>Local storage is editable by the browser user and is not an immutable audit store.</small></aside></div>`;
}

function render() {
  const views = { dashboard: dashboardView, leads: leadsView, workflows: workflowsView, agents: agentsView, approvals: approvalsView, activity: activityView, settings: settingsView };
  app.innerHTML = views[activeView]();
  document.querySelector('#crumb-current').textContent = viewLabels[activeView];
  document.querySelectorAll('.nav-item[data-view]').forEach((item) => item.classList.toggle('active', item.dataset.view === activeView));
  document.querySelector('#lead-count').textContent = state.leads.length;
  const pending = state.actions.filter((action) => action.approvalStatus === 'PENDING').length;
  document.querySelector('#approval-count').textContent = pending;
  document.querySelector('#approval-count').classList.toggle('hidden', pending === 0);
}

function navigate(view) {
  activeView = view;
  showLeadForm = false;
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.addEventListener('click', (event) => {
  const viewButton = event.target.closest('[data-view]');
  if (viewButton) { navigate(viewButton.dataset.view); return; }
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const { action, id } = button.dataset;
  try {
    if (action === 'open-lead-form') { showLeadForm = true; render(); app.querySelector('#lead-form input')?.focus(); }
    if (action === 'close-lead-form') { showLeadForm = false; render(); }
    if (action === 'import-csv') document.querySelector('#csv-input').click();
    if (action === 'select-lead') { selectedLeadId = id; render(); }
    if (action === 'analyze') {
      const lead = leadById(id);
      recordEvent(state, { type: 'AI_ANALYSIS_STARTED', actor: 'Jordan Davis', entityType: 'lead', entityId: id, details: { agent: leadIntelligenceAgent.id } });
      lead.analysis = leadIntelligenceAgent.analyze(lead);
      lead.stage = lead.analysis.score >= 75 ? 'Qualified' : 'Researching';
      recordEvent(state, { type: 'AI_ANALYSIS_COMPLETED', actor: leadIntelligenceAgent.name, entityType: 'lead', entityId: id, details: { score: lead.analysis.score, opportunities: lead.analysis.opportunities.length, recommendedAction: lead.analysis.recommendedAction } });
      commit();
    }
    if (action === 'draft') {
      const lead = leadById(id);
      if (!lead.analysis) throw new Error('Analyze the lead before generating outreach.');
      lead.outreach = leadIntelligenceAgent.generateOutreach(lead, lead.analysis);
      recordEvent(state, { type: 'OUTREACH_DRAFTED', actor: leadIntelligenceAgent.name, entityType: 'lead', entityId: id, details: { recipient: lead.email, subject: lead.outreach.subject } });
      commit();
    }
    if (action === 'propose') {
      const lead = leadById(id);
      const proposal = createProposal(state, lead, lead.outreach);
      recordEvent(state, { type: 'ACTION_PROPOSED', actor: leadIntelligenceAgent.name, entityType: 'action', entityId: proposal.id, details: { actionType: proposal.actionType, target: proposal.target, reason: proposal.reason } });
      recordEvent(state, { type: 'APPROVAL_REQUESTED', actor: 'Jordan Davis', entityType: 'action', entityId: proposal.id, details: { status: proposal.approvalStatus, leadId: proposal.leadId } });
      navigate('approvals');
      commit();
    }
    if (action === 'approve') {
      const proposal = actionById(id);
      approveAction(proposal);
      recordEvent(state, { type: 'ACTION_APPROVED', actor: 'Jordan Davis', entityType: 'action', entityId: id, details: { approvalStatus: proposal.approvalStatus, target: proposal.target } });
      commit();
    }
    if (action === 'reject') {
      const proposal = actionById(id);
      rejectAction(proposal);
      recordEvent(state, { type: 'ACTION_REJECTED', actor: 'Jordan Davis', entityType: 'action', entityId: id, details: { approvalStatus: proposal.approvalStatus, target: proposal.target } });
      commit();
    }
    if (action === 'execute') {
      const proposal = actionById(id);
      simulateExecution(proposal);
      recordEvent(state, { type: 'ACTION_EXECUTED', actor: 'Jordan Davis', entityType: 'action', entityId: id, details: { executionStatus: proposal.executionStatus, note: proposal.executionNote } });
      commit();
    }
  } catch (error) {
    window.alert(error.message);
  }
});

app.addEventListener('submit', (event) => {
  if (event.target.id !== 'lead-form') return;
  event.preventDefault();
  const form = new FormData(event.target);
  const company = String(form.get('company')).trim();
  const lead = {
    id: makeId('lead'), name: String(form.get('name')).trim(), title: String(form.get('title')).trim(),
    email: String(form.get('email')).trim(), company, domain: company.toLowerCase().replace(/[^a-z0-9]+/g, '') + '.com',
    industry: String(form.get('industry')).trim() || 'Not specified', employees: Number(form.get('employees')) || 1,
    location: '', source: 'Manual entry', notes: String(form.get('notes')).trim(), stage: 'New', createdAt: new Date().toISOString(), analysis: null, outreach: null
  };
  state.leads.unshift(lead);
  selectedLeadId = lead.id;
  recordEvent(state, { type: 'LEAD_CREATED', actor: 'Jordan Davis', entityType: 'lead', entityId: lead.id, details: { company: lead.company, source: lead.source } });
  showLeadForm = false;
  commit();
});

document.querySelector('#csv-input').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const rows = (await file.text()).split(/\r?\n/).filter(Boolean);
  const parseRow = (row) => row.match(/("(?:[^"]|"")*"|[^,]*)(,|$)/g)?.map((cell) => cell.replace(/,$/, '').replace(/^"|"$/g, '').replaceAll('""', '"')) ?? [];
  const headers = parseRow(rows.shift() ?? '').map((header) => header.trim().toLowerCase().replaceAll(' ', '_'));
  const imported = [];
  rows.forEach((row) => {
    const values = parseRow(row);
    const record = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
    if (!record.name || !record.company || !record.email) return;
    const lead = { id: makeId('lead'), name: record.name, title: record.title || 'Not specified', email: record.email, company: record.company, domain: record.domain || `${record.company.toLowerCase().replace(/[^a-z0-9]+/g, '')}.com`, industry: record.industry || 'Not specified', employees: Number(record.employees) || 1, location: record.location || '', source: 'CSV import', notes: record.notes || '', stage: 'New', createdAt: new Date().toISOString(), analysis: null, outreach: null };
    imported.push(lead);
  });
  state.leads.unshift(...imported);
  imported.forEach((lead) => recordEvent(state, { type: 'LEAD_CREATED', actor: 'Jordan Davis', entityType: 'lead', entityId: lead.id, details: { company: lead.company, source: 'CSV import' } }));
  event.target.value = '';
  if (imported.length) { selectedLeadId = imported[0].id; activeView = 'leads'; commit(); }
  else window.alert('No leads imported. Include name, company, and email columns in the CSV.');
});

render();