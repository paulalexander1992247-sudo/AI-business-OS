const STORAGE_KEY = 'northstar-ai-business-os-v1';

const iso = (value) => new Date(value).toISOString();

function createInitialState() {
  const now = Date.now();
  const leads = [
    {
      id: 'lead-aurora', name: 'Maya Chen', title: 'VP of Operations', email: 'maya@aurorapay.com',
      company: 'Aurora Pay', domain: 'aurorapay.com', industry: 'Financial technology', employees: 240,
      location: 'Austin, TX', source: 'Product-led inbound', notes: 'Evaluating ways to reduce manual handoffs across their growing operations team.',
      stage: 'Qualified', createdAt: iso(now - 1000 * 60 * 60 * 3), analysis: {
        score: 91, band: 'High fit', reasoning: ['Strong match for workflow automation use cases.', 'Team size suggests meaningful coordination overhead.', 'Recent hiring signals a near-term need to standardize operations.'],
        opportunities: ['Automate finance-to-ops handoffs', 'Create a governed AI approval workflow', 'Reduce repetitive vendor research'],
        recommendedAction: 'Send a tailored discovery invitation', actionReason: 'Maya owns operations and has described a workflow coordination challenge.', analyzedAt: iso(now - 1000 * 60 * 42)
      },
      outreach: {
        subject: 'A more connected operations workflow at Aurora Pay',
        body: 'Hi Maya,\n\nI saw that Aurora Pay is growing its operations team while looking to reduce manual handoffs. We are helping teams connect research, recommendations, and human approvals in one clear workflow.\n\nWould you be open to a short conversation about where coordination is taking the most time today?\n\nBest,\nJordan',
        createdAt: iso(now - 1000 * 60 * 35)
      }
    },
    {
      id: 'lead-fieldnote', name: 'Elliot Park', title: 'Founder', email: 'elliot@fieldnote.co',
      company: 'Fieldnote', domain: 'fieldnote.co', industry: 'Business software', employees: 38,
      location: 'Brooklyn, NY', source: 'Partner referral', notes: 'Referral from the Launch Collective founder network.', stage: 'New',
      createdAt: iso(now - 1000 * 60 * 60 * 20), analysis: null, outreach: null
    },
    {
      id: 'lead-summit', name: 'Priya Nair', title: 'Director of Customer Experience', email: 'priya@summithealth.io',
      company: 'Summit Health', domain: 'summithealth.io', industry: 'Healthcare technology', employees: 510,
      location: 'Denver, CO', source: 'Website request', notes: 'Asked about responsible AI workflows for customer support operations.', stage: 'Researching',
      createdAt: iso(now - 1000 * 60 * 60 * 27), analysis: null, outreach: null
    }
  ];
  const proposal = {
    id: 'action-aurora', leadId: 'lead-aurora', actionType: 'SEND_EMAIL', target: 'maya@aurorapay.com',
    reason: leads[0].analysis.actionReason, originatingAgent: 'lead-intelligence', createdAt: iso(now - 1000 * 60 * 30),
    status: 'PENDING_APPROVAL', approvalStatus: 'PENDING', executionStatus: 'NOT_EXECUTED',
    payload: { subject: leads[0].outreach.subject, body: leads[0].outreach.body }
  };
  const events = [
    { id: 'evt-1', type: 'LEAD_CREATED', timestamp: iso(now - 1000 * 60 * 60 * 3), actor: 'Jordan Davis', entityType: 'lead', entityId: 'lead-aurora', details: { company: 'Aurora Pay', source: 'Product-led inbound' } },
    { id: 'evt-2', type: 'AI_ANALYSIS_STARTED', timestamp: iso(now - 1000 * 60 * 47), actor: 'Jordan Davis', entityType: 'lead', entityId: 'lead-aurora', details: { agent: 'lead-intelligence' } },
    { id: 'evt-3', type: 'AI_ANALYSIS_COMPLETED', timestamp: iso(now - 1000 * 60 * 42), actor: 'Lead Intelligence Agent', entityType: 'lead', entityId: 'lead-aurora', details: { score: 91, opportunities: 3 } },
    { id: 'evt-4', type: 'OUTREACH_DRAFTED', timestamp: iso(now - 1000 * 60 * 35), actor: 'Lead Intelligence Agent', entityType: 'lead', entityId: 'lead-aurora', details: { recipient: 'maya@aurorapay.com' } },
    { id: 'evt-5', type: 'ACTION_PROPOSED', timestamp: iso(now - 1000 * 60 * 30), actor: 'Lead Intelligence Agent', entityType: 'action', entityId: proposal.id, details: { actionType: proposal.actionType, target: proposal.target, reason: proposal.reason } },
    { id: 'evt-6', type: 'APPROVAL_REQUESTED', timestamp: iso(now - 1000 * 60 * 30), actor: 'Jordan Davis', entityType: 'action', entityId: proposal.id, details: { status: 'PENDING', leadId: proposal.leadId } }
  ];
  return { version: 1, leads, actions: [proposal], events };
}

export function loadState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const state = JSON.parse(stored);
      if (state.version === 1 && Array.isArray(state.leads) && Array.isArray(state.actions) && Array.isArray(state.events)) return state;
    }
  } catch (error) {
    console.warn('Could not load saved workspace; starting with demo data.', error);
  }
  const state = createInitialState();
  saveState(state);
  return state;
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function makeId(prefix) {
  return `${prefix}-${crypto.randomUUID()}`;
}