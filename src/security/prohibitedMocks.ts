const FORBIDDEN_IMPORT_PATTERNS = [
  /from\s+['"][^'"]*(?:tests?\/fakes|mock|fixtures?|seed|demo|sample|fake|placeholder)[^'"]*['"]/i,
  /import\s+.*from\s+['"][^'"]*(?:tests?\/fakes|mock|fixtures?|seed|demo|sample|fake|placeholder)[^'"]*['"]/i,
  /(?:^|\s)(?:import|require)\s*\(\s*['"][^'"]*(?:tests?\/fakes|mock|fixtures?|seed|demo|sample|fake|placeholder)[^'"]*['"]\s*\)/i,
];

export function findForbiddenMockImports(lines: string[]): string[] {
  const matches: string[] = [];

  for (const line of lines) {
    for (const pattern of FORBIDDEN_IMPORT_PATTERNS) {
      if (pattern.test(line)) {
        const captured = line.match(/['"]([^'"]+)['"]/g)?.map((value) => value.slice(1, -1)) ?? [];
        for (const value of captured) {
          if (/(?:tests\/fakes|mock|fixtures?|seed|demo|sample|fake|placeholder)/i.test(value)) {
            matches.push(value);
          }
        }
        break;
      }
    }
  }

  return [...new Set(matches)];
}
