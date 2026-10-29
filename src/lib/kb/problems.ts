// The problems inside one merged ticket, counted the desk's way: causes.ts places every report by
// tenant and channel. A report the desk read as a one-day move (desk-notes.json) is a problem of its
// own, but stays counted where it is filed, as CauseTable does; `alsoIn` says where.
import { causeOf, uniqueById, type Report, type Tenant } from '#lib/kb/causes';

export type Problem = 'parser' | 'hint' | 'one-day' | 'unplaced';

export type ProblemGroup = {
  problem: Problem;
  reports: Report[];
  tenants: number;
  firstSeen: string;
  lastSeen: string;
  // For one-day: the causes its reports are also counted under.
  alsoIn: Problem[];
};

export function splitTicket(
  all: Report[],
  ticket: number,
  tenantOf: (r: Report) => Tenant | undefined,
  oneDayMove: readonly string[],
): { merged: Report[]; groups: ProblemGroup[] } {
  const merged = uniqueById(all).filter((r) => r.mergedInto === ticket);
  const byProblem = new Map<Problem, Report[]>();
  const add = (p: Problem, r: Report) => byProblem.set(p, [...(byProblem.get(p) ?? []), r]);
  for (const r of merged) {
    add(causeOf(r, tenantOf(r)) ?? 'unplaced', r);
    if (oneDayMove.includes(r.id)) add('one-day', r);
  }
  const groups = [...byProblem.entries()]
    .map(([problem, rs]) => {
      const days = rs.map((r) => r.receivedAt.slice(0, 10)).sort();
      return {
        problem,
        reports: rs,
        tenants: new Set(rs.map((r) => r.tenant)).size,
        firstSeen: days[0],
        lastSeen: days[days.length - 1],
        alsoIn:
          problem === 'one-day'
            ? [...new Set(rs.map((r) => (causeOf(r, tenantOf(r)) ?? 'unplaced') as Problem))]
            : [],
      };
    })
    .sort((a, b) => b.reports.length - a.reports.length);
  return { merged, groups };
}
