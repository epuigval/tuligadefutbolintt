import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { type Weekday } from "@/lib/league";
import {
  createPairUsageMap,
  generateRoundMatches,
  registerHistoricalPair,
} from "@/lib/scheduler";
import { assertAdminKey, getSupabaseAdmin } from "@/lib/supabase-admin";

const schema = z.object({
  adminKey: z.string().min(1),
});

type Params = {
  params: Promise<{ roundId: string }>;
};

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { roundId } = await params;
    const parsedRoundId = Number(roundId);

    if (!Number.isFinite(parsedRoundId)) {
      return NextResponse.json(
        { error: "roundId invalido." },
        { status: 400 },
      );
    }

    const body = await request.json();
    const parsedBody = schema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: "Payload invalido." },
        { status: 400 },
      );
    }

    assertAdminKey(parsedBody.data.adminKey);

    const supabase = getSupabaseAdmin();
    const { data: round, error: roundError } = await supabase
      .from("rounds")
      .select("id, season_id, number, start_date, end_date, status")
      .eq("id", parsedRoundId)
      .single();

    if (roundError) {
      throw roundError;
    }

    const [{ data: players, error: playersError }, { data: availabilities, error: availabilityError }] =
      await Promise.all([
        supabase
          .from("players")
          .select("id, name, alias")
          .eq("active", true)
          .order("name", { ascending: true }),
        supabase
          .from("player_availability")
          .select("player_id, weekdays")
          .eq("round_id", round.id),
      ]);

    if (playersError) {
      throw playersError;
    }

    if (availabilityError) {
      throw availabilityError;
    }

    const playerList = players ?? [];
    const availabilityList = availabilities ?? [];

    const availabilityMap = new Map<number, Weekday[]>();
    for (const row of availabilityList) {
      availabilityMap.set(row.player_id, (row.weekdays ?? []) as Weekday[]);
    }

    const missingPlayers = playerList.filter(
      (player) => !availabilityMap.has(player.id),
    );

    if (missingPlayers.length > 0) {
      return NextResponse.json(
        {
          error:
            "No se puede generar la jornada hasta que todos los jugadores indiquen disponibilidad.",
          missingPlayers: missingPlayers.map((p) => p.alias ?? p.name),
        },
        { status: 400 },
      );
    }

    const { data: seasonMatches, error: seasonMatchesError } = await supabase
      .from("matches")
      .select(
        "team_a_player_1_id, team_a_player_2_id, team_b_player_1_id, team_b_player_2_id",
      )
      .eq("season_id", round.season_id)
      .neq("status", "cancelled");

    if (seasonMatchesError) {
      throw seasonMatchesError;
    }

    const usage = createPairUsageMap();
    for (const match of seasonMatches ?? []) {
      registerHistoricalPair(
        usage,
        match.team_a_player_1_id,
        match.team_a_player_2_id,
      );
      registerHistoricalPair(
        usage,
        match.team_b_player_1_id,
        match.team_b_player_2_id,
      );
    }

    const generated = generateRoundMatches({
      playerIds: playerList.map((p) => p.id),
      availabilityByPlayer: availabilityMap,
      roundStartDate: round.start_date,
      roundEndDate: round.end_date,
      historicalPairUsage: usage,
    });

    if (generated.generatedMatches.length === 0) {
      return NextResponse.json(
        {
          error:
            "No se pudieron crear partidos con las restricciones actuales. Ajusta disponibilidades o numero de jugadores.",
        },
        { status: 400 },
      );
    }

    const rowsToInsert = generated.generatedMatches.map((m) => ({
      season_id: round.season_id,
      round_number: round.number,
      scheduled_at: `${m.scheduledDate}T19:00:00+02:00`,
      team_a_player_1_id: m.teamAForwardId,
      team_a_player_2_id: m.teamADefenseId,
      team_b_player_1_id: m.teamBForwardId,
      team_b_player_2_id: m.teamBDefenseId,
      status: "scheduled",
    }));

    const { data: insertedMatches, error: insertError } = await supabase
      .from("matches")
      .insert(rowsToInsert)
      .select("id, season_id, round_number, scheduled_at, status");

    if (insertError) {
      throw insertError;
    }

    const { error: roundStatusError } = await supabase
      .from("rounds")
      .update({ status: "generated" })
      .eq("id", round.id);

    if (roundStatusError) {
      throw roundStatusError;
    }

    return NextResponse.json({
      roundId: round.id,
      generatedCount: insertedMatches?.length ?? 0,
      unmatchedPlayers: generated.unmatchedPlayers,
      matches: insertedMatches ?? [],
    });
  } catch (err) {
    return NextResponse.json(
      { error: `No se pudo generar la jornada: ${String(err)}` },
      { status: 500 },
    );
  }
}