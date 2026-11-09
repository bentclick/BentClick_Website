/** Takes one item from each group in turn, so no single group dominates the result. */
export function interleave<T>(groups: T[][], limit: number): T[] {
  const result: T[] = [];
  for (let round = 0; result.length < limit; round++) {
    const row = groups.filter((g) => round < g.length).map((g) => g[round]!);
    if (row.length === 0) break;
    result.push(...row.slice(0, limit - result.length));
  }
  return result;
}
