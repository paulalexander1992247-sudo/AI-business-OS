import { makeId } from './store.js';

export function recordEvent(state, { type, actor = 'Jordan Davis', entityType, entityId, details = {} }) {
  const event = { id: makeId('evt'), type, timestamp: new Date().toISOString(), actor, entityType, entityId, details };
  state.events.push(event);
  return event;
}