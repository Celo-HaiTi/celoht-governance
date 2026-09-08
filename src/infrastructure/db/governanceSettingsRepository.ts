import type { GovernanceSettings } from '../../domain/types.js';
import type { GovernanceSettingsRepository } from '../../application/ports.js';
import { getSupabaseClient } from './supabaseClient.js';

export class SupabaseGovernanceSettingsRepository implements GovernanceSettingsRepository {
  constructor(private readonly client = getSupabaseClient()) {}

  async getCurrent(): Promise<GovernanceSettings | null> {
    const { data, error } = await this.client.from('governance_settings').select('*').order('updated_at', { ascending: false }).limit(1).maybeSingle();
    if (error) throw error;
    return (data as GovernanceSettings | null) ?? null;
  }

  async update(settings: GovernanceSettings): Promise<GovernanceSettings> {
    const { data, error } = await this.client.from('governance_settings').upsert(settings, { onConflict: 'version' }).select().single();
    if (error) throw error;
    return data as GovernanceSettings;
  }
}
