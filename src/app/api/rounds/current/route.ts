import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

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

    if (!round) {
      return NextResponse.json({
        round: null,
        totalPlayers: 0,
        submittedAvailabilities: 0,
        allSubmitted: false,
      });
    }

    const [{ count: playerCount, error: playersError }, { count: availCount, error: availError }] =
      await Promise.all([
        supabase
          .from("players")
          .select("id", { count: "exact", head: true })
          .eq("active", true),
        supabase
          .from("player_availability")
          .select("id", { count: "exact", head: true })
          .eq("round_id", round.id),
      ]);

    if (playersError) {
      throw playersError;
    }

    if (availError) {
      throw availError;
    }

    const totalPlayers = playerCount ?? 0;
    const submittedAvailabilities = availCount ?? 0;

    return NextResponse.json({
      round,
      totalPlayers,
      submittedAvailabilities,
      allSubmitted:
        totalPlayers > 0 && submittedAvailabilities >= totalPlayers,
    });
  } catch (err) {
    return NextResponse.json(
      { error: `No se pudo cargar la jornada actual: ${String(err)}` },
      { status: 500 },
    );
  }
}