import { describe, expect, it } from 'vitest';
import { isEligibleLeadForCampaign, type CampaignEligibilityLead } from './eligibility';

const campaign = {
  lead_type: 'despachante',
  audience: 'B2B',
  target_cities: ['Porto Alegre', 'Canoas'],
};

const baseLead: CampaignEligibilityLead = {
  id: 'lead-1',
  lead_type: 'despachante',
  audience: 'B2B',
  qualification_status: 'qualified',
  phone_normalized: '51999999999',
  city: 'Porto Alegre',
  opt_out_at: null,
};

describe('isEligibleLeadForCampaign', () => {
  it('accepts explicitly qualified lead matching audience, type, phone and target city', () => {
    expect(isEligibleLeadForCampaign(baseLead, campaign, new Set())).toBe(true);
  });

  it('rejects pending or disqualified leads', () => {
    expect(isEligibleLeadForCampaign({ ...baseLead, qualification_status: 'pending' }, campaign, new Set())).toBe(false);
    expect(isEligibleLeadForCampaign({ ...baseLead, qualification_status: 'disqualified' }, campaign, new Set())).toBe(false);
  });

  it('rejects opted-out leads and missing phone numbers', () => {
    expect(isEligibleLeadForCampaign({ ...baseLead, opt_out_at: '2026-10-16T00:00:00.000Z' }, campaign, new Set())).toBe(false);
    expect(isEligibleLeadForCampaign({ ...baseLead, phone_normalized: null }, campaign, new Set())).toBe(false);
  });

  it('rejects leads outside the target cities, regardless of case', () => {
    expect(isEligibleLeadForCampaign({ ...baseLead, city: 'Caxias do Sul' }, campaign, new Set())).toBe(false);
    expect(isEligibleLeadForCampaign({ ...baseLead, city: 'porto alegre' }, campaign, new Set())).toBe(true);
  });

  it('rejects duplicate campaign links and audience/type mismatches', () => {
    expect(isEligibleLeadForCampaign(baseLead, campaign, new Set(['lead-1']))).toBe(false);
    expect(isEligibleLeadForCampaign({ ...baseLead, audience: 'B2C' }, campaign, new Set())).toBe(false);
    expect(isEligibleLeadForCampaign({ ...baseLead, lead_type: 'advogado_transito' }, campaign, new Set())).toBe(false);
  });
});
