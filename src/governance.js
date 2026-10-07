import { makeId } from './store.js';

export const actionPolicy = {
  version: '0.1',
  approvalRequired: ['SEND_EMAIL'],
  prohibited: [],
  allowed: ['SEND_EMAIL']
};

export function createProposal(state, lead, draft) {
  if (!actionPolicy.allowed.includes('SEND_EMAIL') || actionPolicy.prohibited.includes('SEND_EMAIL')) {
    throw new Error('This action is not permitted by the current workspace policy.');
  }
  const action = {
    id: makeId('action'), leadId: lead.id, actionType: 'SEND_EMAIL', target: lead.email,
    reason: lead.analysis?.actionReason ?? 'Personalized outreach based on lead context.',
    originatingAgent: 'lead-intelligence', createdAt: new Date().toISOString(), status: 'PENDING_APPROVAL',
    approvalStatus: 'PENDING', executionStatus: 'NOT_EXECUTED',
    payload: { subject: draft.subject, body: draft.body }
  };
  state.actions.push(action);
  return action;
}

export function approveAction(action) {
  if (action.approvalStatus !== 'PENDING') throw new Error('Only pending actions can be approved.');
  action.approvalStatus = 'APPROVED';
  action.status = 'APPROVED';
  action.approvedAt = new Date().toISOString();
  action.approvedBy = 'Jordan Davis';
}

export function rejectAction(action) {
  if (action.approvalStatus !== 'PENDING') throw new Error('Only pending actions can be rejected.');
  action.approvalStatus = 'REJECTED';
  action.status = 'REJECTED';
  action.rejectedAt = new Date().toISOString();
  action.rejectedBy = 'Jordan Davis';
}

export function simulateExecution(action) {
  if (action.approvalStatus !== 'APPROVED') throw new Error('An action must be approved before execution.');
  if (action.executionStatus !== 'NOT_EXECUTED') throw new Error('This action has already been executed.');
  action.executionStatus = 'MOCK_EXECUTED';
  action.status = 'EXECUTED';
  action.executedAt = new Date().toISOString();
  action.executionNote = 'Simulated locally. No email was sent.';
}