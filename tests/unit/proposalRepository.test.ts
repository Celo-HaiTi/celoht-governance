import { describe, expect, it, vi } from 'vitest';
import { SupabaseProposalRepository } from '../../src/infrastructure/db/proposalRepository.js';
import type { SupabaseClient } from '../../src/infrastructure/db/supabaseClient.js';

describe('SupabaseProposalRepository', () => {
  it('orders cursor-based proposal pages by id ascending', async () => {
    const query = {
      select: vi.fn(),
      order: vi.fn(),
      limit: vi.fn(),
      gt: vi.fn(),
      then: vi.fn(),
    };
    query.select.mockReturnValue(query);
    query.order.mockReturnValue(query);
    query.limit.mockReturnValue(query);
    query.gt.mockReturnValue(query);
    query.then.mockImplementation((resolve: (result: { data: never[]; error: null }) => void) => {
      resolve({ data: [], error: null });
    });

    const client = {
      from: vi.fn(() => query),
    } as unknown as SupabaseClient;

    await new SupabaseProposalRepository(client).list({ limit: 10, cursor: 'proposal-1' });

    expect(query.order).toHaveBeenCalledWith('id', { ascending: true });
    expect(query.gt).toHaveBeenCalledWith('id', 'proposal-1');
  });
});