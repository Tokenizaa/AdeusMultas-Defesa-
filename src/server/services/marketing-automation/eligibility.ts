export interface CampaignEligibilityLead {
  id: string;
  lead_type?: string | null;
  audience?: string | null;
  qualification_status?: string | null;
  phone_normalized?: string | null;
  city?: string | null;
  opt_out_at?: string | null;
}

export interface CampaignEligibilityRules {
  lead_type: string;
  audience: string;
  target_cities?: unknown;
}

export function isEligibleLeadForCampaign(
  lead: CampaignEligibilityLead,
  campaign: CampaignEligibilityRules,
  existingLeadIds: ReadonlySet<string>,
): boolean {
  if (!lead.id || existingLeadIds.has(lead.id)) return false;
  if (lead.lead_type !== campaign.lead_type || lead.audience !== campaign.audience) return false;
  if (lead.qualification_status !== 'qualified') return false;
  if (!lead.phone_normalized?.trim() || lead.opt_out_at) return false;

  if (campaign.audience === 'B2B') {
    const city = typeof lead.city === 'string' ? lead.city.trim().toLocaleLowerCase('pt-BR') : '';
    const targetCities = Array.isArray(campaign.target_cities)
      ? campaign.target_cities
          .filter((value): value is string => typeof value === 'string')
          .map((value) => value.trim().toLocaleLowerCase('pt-BR'))
          .filter(Boolean)
      : [];
    if (!city || !targetCities.includes(city)) return false;
  }

  return true;
}
