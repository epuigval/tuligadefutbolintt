import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type Params = {
  params: Promise<{ roundId: string }>;
};

export async function GET(_request: Request, { params }: Params) {
  try {
    const { roundId } = await params;
    const parsedRoundId = Number(roundId);
    if (!Number.isFinite(parsedRoundId)) {
      return NextResponse.json(
        { error: "roundId invalido." },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdmin();

    const { data: round, error: roundError } = await supabase
      .from("rounds")
      .select("id, season_id, number")
      .eq("id", parsedRoundId)
      .single();

    if (roundError) {
      throw roundError;
    }

    const { data: matches, error: matchesError } = await supabase
      .from("matches")
      .select(
        "id, scheduled_at, status, team_a_player_1_id, team_a_player_2_id, team_b_player_1_id, team_b_player_2_id",
      )
      .eq("season_id", round.season_id)
      .eq("round_number", round.number)
      .order("scheduled_at", { ascending: true });

    if (matchesError) {
      throw matchesError;
    }

    const ids = new Set<number>();
    for (const match of matches ?? []) {
      if (match.team_a_player_1_id) ids.add(match.team_a_player_1_id);
      if (match.team_a_player_2_id) ids.add(match.team_a_player_2_id);
      if (match.team_b_player_1_id) ids.add(match.team_b_player_1_id);
      if (match.team_b_player_2_id) ids.add(match.team_b_player_2_id);
    }

    const { data: players, error: playersError } = await supabase
      .from("players")
      .select("id, name, alias")
      .in("id", Array.from(ids));

    if (playersError) {
      throw playersError;
    }

    const playersById = new Map<number, { name: string; alias: string | null }>();
    for (const player of players ?? []) {
      playersById.set(player.id, { name: player.name, alias: player.alias });
    }

    const enriched = (matches ?? []).map((match) => ({
      id: match.id,
      scheduledAt: match.scheduled_at,
      status: match.status,
      teamA: {
        forward: playersById.get(match.team_a_player_1_id) ?? null,
        defense: playersById.get(match.team_a_player_2_id) ?? null,
      },
      teamB: {
        forward: playersById.get(match.team_b_player_1_id) ?? null,
        defense: playersById.get(match.team_b_player_2_id) ?? null,
      },
    }));

    return NextResponse.json({ matches: enriched });
  } catch (err) {
    return NextResponse.json(
      { error: `No se pudieron cargar los partidos: ${String(err)}` },
      { status: 500 },
    );
  }
}