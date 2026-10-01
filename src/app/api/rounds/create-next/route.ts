import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { addDays, formatIsoDate } from "@/lib/league";
import { assertAdminKey, getSupabaseAdmin } from "@/lib/supabase-admin";

const schema = z.object({
  adminKey: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Payload invalido." },
        { status: 400 },
      );
    }

    assertAdminKey(parsed.data.adminKey);

    const supabase = getSupabaseAdmin();

    const seasonQuery = await supabase
      .from("seasons")
      .select("id, name, status")
      .eq("status", "active")
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (seasonQuery.error) {
      throw seasonQuery.error;
    }

    let activeSeason = seasonQuery.data;

    if (!activeSeason) {
      const now = new Date();
      const endDate = addDays(now, 180);
      const { data: createdSeason, error: createSeasonError } = await supabase
        .from("seasons")
        .insert({
          name: `Liga ${now.getFullYear()}`,
          start_date: formatIsoDate(now),
          end_date: formatIsoDate(endDate),
          status: "active",
        })
        .select("id, name, status")
        .single();

      if (createSeasonError) {
        throw createSeasonError;
      }

      activeSeason = createdSeason;
    }

    const { data: lastRound, error: lastRoundError } = await supabase
      .from("rounds")
      .select("number, end_date")
      .eq("season_id", activeSeason.id)
      .order("number", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastRoundError) {
      throw lastRoundError;
    }

    const start = lastRound
      ? addDays(new Date(`${lastRound.end_date}T00:00:00`), 1)
      : new Date();
    const end = addDays(start, 13);

    const nextRoundNumber = (lastRound?.number ?? 0) + 1;

    const { data: newRound, error: createRoundError } = await supabase
      .from("rounds")
      .insert({
        season_id: activeSeason.id,
        number: nextRoundNumber,
        start_date: formatIsoDate(start),
        end_date: formatIsoDate(end),
        status: "open",
      })
      .select("id, season_id, number, start_date, end_date, status")
      .single();

    if (createRoundError) {
      throw createRoundError;
    }

    return NextResponse.json({ round: newRound });
  } catch (err) {
    return NextResponse.json(
      {
        error: `No se pudo crear la jornada: ${String(err)}`,
        hint: "Asegurate de haber creado las tablas de rounds y player_availability.",
      },
      { status: 500 },
    );
  }
}