import LeagueDashboard from "@/components/league-dashboard";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type Player = {
  id: number;
  name: string;
  alias: string | null;
  is_admin: boolean;
};

type CurrentRound = {
  id: number;
  season_id: number;
  number: number;
  start_date: string;
  end_date: string;
  status: string;
};

type Match = {
  id: number;
  scheduledAt: string;
  status: string;
  teamA: {
    forward: { name: string; alias: string | null } | null;
    defense: { name: string; alias: string | null } | null;
  };
  teamB: {
    forward: { name: string; alias: string | null } | null;
    defense: { name: string; alias: string | null } | null;
  };
};

async function getInitialData(): Promise<{
  players: Player[];
  round: CurrentRound | null;
  totalPlayers: number;
  submittedAvailabilities: number;
  matches: Match[];
  error: string | null;
}> {
  try {
    const supabase = getSupabaseAdmin();

    const { data: players, error: playersError } = await supabase
      .from("players")
      .select("id, name, alias, is_admin")
      .eq("active", true)
      .order("name", { ascending: true });

    if (playersError) {
      throw playersError;
    }

    const { data: round, error: roundError } = await supabase
      .from("rounds")
      .select("id, season_id, number, start_date, end_date, status")
      .in("status", ["open", "draft", "generated"])
      .order("number", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (roundError) {
      throw roundError;
    }

    let submittedAvailabilities = 0;
    let matches: Match[] = [];

    if (round) {
      const [{ count: availCount, error: availError }, { data: rawMatches, error: matchesError }] =
        await Promise.all([
          supabase
            .from("player_availability")
            .select("id", { count: "exact", head: true })
            .eq("round_id", round.id),
          supabase
            .from("matches")
            .select(
              "id, scheduled_at, status, team_a_player_1_id, team_a_player_2_id, team_b_player_1_id, team_b_player_2_id",
            )
            .eq("season_id", round.season_id)
            .eq("round_number", round.number)
            .order("scheduled_at", { ascending: true }),
        ]);

      if (availError) {
        throw availError;
      }
      if (matchesError) {
        throw matchesError;
      }

      submittedAvailabilities = availCount ?? 0;

      const playerById = new Map<number, { name: string; alias: string | null }>();
      for (const player of players ?? []) {
        playerById.set(player.id, { name: player.name, alias: player.alias });
      }

      matches = (rawMatches ?? []).map((match) => ({
        id: match.id,
        scheduledAt: match.scheduled_at,
        status: match.status,
        teamA: {
          forward: playerById.get(match.team_a_player_1_id) ?? null,
          defense: playerById.get(match.team_a_player_2_id) ?? null,
        },
        teamB: {
          forward: playerById.get(match.team_b_player_1_id) ?? null,
          defense: playerById.get(match.team_b_player_2_id) ?? null,
        },
      }));
    }

    return {
      players: players ?? [],
      round,
      totalPlayers: (players ?? []).length,
      submittedAvailabilities,
      matches,
      error: null,
    };
  } catch (error) {
    return {
      players: [],
      round: null,
      totalPlayers: 0,
      submittedAvailabilities: 0,
      matches: [],
      error: `No se pudo cargar el estado inicial: ${String(error)}`,
    };
  }
}

export default async function HomePage() {
  const initialData = await getInitialData();
  return <LeagueDashboard initialData={initialData} />;
}
