export const leadIntelligenceAgent = {
  id: 'lead-intelligence',
  name: 'Lead Intelligence Agent',
  version: '0.1.0',
  description: 'Researches, qualifies, and prepares a contextual next step for a lead.',

  analyze(lead) {
    const teamFit = lead.employees >= 100 ? 38 : lead.employees >= 30 ? 29 : 20;
    const contextFit = /operations|workflow|handoff|ai|automation/i.test(`${lead.notes} ${lead.industry}`) ? 37 : 28;
    const roleFit = /vp|director|founder|chief|head/i.test(lead.title) ? 20 : 14;
    const score = Math.min(99, teamFit + contextFit + roleFit);
    const opportunities = [
      `Map repeatable workflows across ${lead.company}`,
      'Introduce human approval gates for AI-assisted work',
      'Reduce manual research and operational handoffs'
    ];
    return {
      score,
      band: score >= 75 ? 'High fit' : score >= 55 ? 'Potential fit' : 'Early fit',
      reasoning: [
        `${lead.industry} is a relevant operating environment for workflow coordination.`,
        `${lead.employees} employees indicates ${lead.employees >= 100 ? 'multiple teams and meaningful handoff complexity' : 'an opportunity to establish repeatable processes early'}.`,
        `${lead.title} is a relevant contact for evaluating operational change.`
      ],
      opportunities,
      recommendedAction: 'Send a tailored discovery invitation',
      actionReason: `${lead.name} is ${lead.title} at ${lead.company}; the available context points to a relevant operational challenge.`,
      analyzedAt: new Date().toISOString()
    };
  },

  generateOutreach(lead, analysis) {
    const firstName = lead.name.trim().split(/\s+/)[0];
    const subject = `A more connected operations workflow at ${lead.company}`;
    const body = `Hi ${firstName},\n\n${lead.notes || `I came across ${lead.company} and your work in ${lead.industry}.`} We are helping teams connect research, recommendations, and human approvals in one clear workflow.\n\nWould you be open to a short conversation about where coordination is taking the most time today?\n\nBest,\nJordan`;
    return { subject, body, createdAt: new Date().toISOString(), basis: analysis.recommendedAction };
  }
};