import { describe, expect, it } from 'vitest';
import { findForbiddenMockImports } from '../../src/security/prohibitedMocks.js';

describe('mock import guard', () => {
  it('flags forbidden mock-data imports in source files', () => {
    const results = findForbiddenMockImports([
      "import { makeMember } from '../tests/fakes.js';",
      "import { demoBalances } from './mockData.js';",
      "import { safeParse } from './parser.js';",
    ]);

    expect(results).toEqual([
      "../tests/fakes.js",
      "./mockData.js",
    ]);
  });

  it('allows normal production imports', () => {
    const results = findForbiddenMockImports([
      "import { z } from 'zod';",
      "import { ProposalService } from '../application/proposalService.js';",
    ]);

    expect(results).toEqual([]);
  });
});
