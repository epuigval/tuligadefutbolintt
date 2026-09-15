import {
  firstDateForWeekday,
  WEEKDAYS,
  type Weekday,
} from "@/lib/league";

type PairUsage = Map<string, { count: number; orientations: Set<string> }>;

export type GeneratedMatch = {
  scheduledDate: string;
  teamAForwardId: number;
  teamADefenseId: number;
  teamBForwardId: number;
  teamBDefenseId: number;
};

export function registerHistoricalPair(
  usage: PairUsage,
  forwardId: number | null,
  defenseId: number | null,
) {
  if (!forwardId || !defenseId) {
    return;
  }

  const key = pairKey(forwardId, defenseId);
  const orientation = orientationKey(forwardId, defenseId);

  const current = usage.get(key) ?? { count: 0, orientations: new Set<string>() };
  current.count += 1;
  current.orientations.add(orientation);
  usage.set(key, current);
}

export function createPairUsageMap() {
  return new Map<string, { count: number; orientations: Set<string> }>();
}

export function generateRoundMatches(input: {
  playerIds: number[];
  availabilityByPlayer: Map<number, Weekday[]>;
  roundStartDate: string;
  roundEndDate: string;
  historicalPairUsage: PairUsage;
}) {
  const remaining = shuffle([...input.playerIds]);
  const generatedMatches: GeneratedMatch[] = [];
  const unmatchedPlayers: number[] = [];

  while (remaining.length >= 4) {
    const candidate = findFeasibleQuartet({
      playerIds: remaining,
      availabilityByPlayer: input.availabilityByPlayer,
      roundStartDate: input.roundStartDate,
      roundEndDate: input.roundEndDate,
      usage: input.historicalPairUsage,
    });

    if (!candidate) {
      unmatchedPlayers.push(remaining.shift()!);
      continue;
    }

    generatedMatches.push(candidate.match);
    for (const playerId of candidate.usedPlayerIds) {
      const idx = remaining.indexOf(playerId);
      if (idx >= 0) {
        remaining.splice(idx, 1);
      }
    }
  }

  unmatchedPlayers.push(...remaining);

  return {
    generatedMatches,
    unmatchedPlayers,
  };
}

function findFeasibleQuartet(input: {
  playerIds: number[];
  availabilityByPlayer: Map<number, Weekday[]>;
  roundStartDate: string;
  roundEndDate: string;
  usage: PairUsage;
}) {
  const ids = input.playerIds;

  for (let i = 0; i < ids.length - 3; i += 1) {
    for (let j = i + 1; j < ids.length - 2; j += 1) {
      for (let k = j + 1; k < ids.length - 1; k += 1) {
        for (let l = k + 1; l < ids.length; l += 1) {
          const quartet: [number, number, number, number] = [
            ids[i],
            ids[j],
            ids[k],
            ids[l],
          ];

          const candidate = tryQuartet(quartet, input);
          if (candidate) {
            return candidate;
          }
        }
      }
    }
  }

  return null;
}

function tryQuartet(
  quartet: [number, number, number, number],
  input: {
    availabilityByPlayer: Map<number, Weekday[]>;
    roundStartDate: string;
    roundEndDate: string;
    usage: PairUsage;
  },
) {
  const [a, b, c, d] = quartet;
  const splits: [[number, number], [number, number]][] = [
    [
      [a, b],
      [c, d],
    ],
    [
      [a, c],
      [b, d],
    ],
    [
      [a, d],
      [b, c],
    ],
  ];

  for (const [team1, team2] of shuffle(splits)) {
    const teamA = chooseTeamOrientation(team1[0], team1[1], input.usage);
    const teamB = chooseTeamOrientation(team2[0], team2[1], input.usage);

    if (!teamA || !teamB) {
      continue;
    }

    const commonWeekday = getCommonWeekday(
      [teamA.forward, teamA.defense, teamB.forward, teamB.defense],
      input.availabilityByPlayer,
    );

    if (!commonWeekday) {
      continue;
    }

    const scheduledDate = firstDateForWeekday(
      input.roundStartDate,
      input.roundEndDate,
      commonWeekday,
    );

    if (!scheduledDate) {
      continue;
    }

    registerHistoricalPair(input.usage, teamA.forward, teamA.defense);
    registerHistoricalPair(input.usage, teamB.forward, teamB.defense);

    return {
      usedPlayerIds: quartet,
      match: {
        scheduledDate,
        teamAForwardId: teamA.forward,
        teamADefenseId: teamA.defense,
        teamBForwardId: teamB.forward,
        teamBDefenseId: teamB.defense,
      } satisfies GeneratedMatch,
    };
  }

  return null;
}

function chooseTeamOrientation(
  p1: number,
  p2: number,
  usage: PairUsage,
): { forward: number; defense: number } | null {
  const options = shuffle([
    { forward: p1, defense: p2 },
    { forward: p2, defense: p1 },
  ]);

  for (const option of options) {
    if (canUsePair(option.forward, option.defense, usage)) {
      return option;
    }
  }

  return null;
}

function canUsePair(forward: number, defense: number, usage: PairUsage) {
  const key = pairKey(forward, defense);
  const orientation = orientationKey(forward, defense);
  const current = usage.get(key);

  if (!current) {
    return true;
  }

  if (current.count >= 2) {
    return false;
  }

  if (current.count === 1 && current.orientations.has(orientation)) {
    return false;
  }

  return true;
}

function getCommonWeekday(
  players: number[],
  availabilityByPlayer: Map<number, Weekday[]>,
): Weekday | null {
  for (const weekday of WEEKDAYS) {
    const allAvailable = players.every((playerId) => {
      const playerWeekdays = availabilityByPlayer.get(playerId) ?? [];
      return playerWeekdays.includes(weekday);
    });

    if (allAvailable) {
      return weekday;
    }
  }

  return null;
}

function pairKey(playerA: number, playerB: number): string {
  const ordered = [playerA, playerB].sort((a, b) => a - b);
  return `${ordered[0]}:${ordered[1]}`;
}

function orientationKey(forward: number, defense: number): string {
  return `${forward}:${defense}`;
}

function shuffle<T>(arr: T[]): T[] {
  const clone = [...arr];
  for (let i = clone.length - 1; i > 0; i -= 1) {
    const randomIdx = Math.floor(Math.random() * (i + 1));
    const temp = clone[i];
    clone[i] = clone[randomIdx];
    clone[randomIdx] = temp;
  }
  return clone;
}