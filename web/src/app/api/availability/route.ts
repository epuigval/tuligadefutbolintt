import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { WEEKDAYS } from "@/lib/league";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const weekdaySchema = z.enum(WEEKDAYS);

const postSchema = z.object({
  playerId: z.number().int().positive(),
  roundId: z.number().int().positive(),
  weekdays: z.array(weekdaySchema).min(1).max(5),
});

export async function GET(request: NextRequest) {
  try {
    const playerId = Number(request.nextUrl.searchParams.get("playerId"));
    const roundId = Number(request.nextUrl.searchParams.get("roundId"));

    if (!Number.isFinite(playerId) || !Number.isFinite(roundId)) {
      return NextResponse.json(
        { error: "playerId y roundId son obligatorios." },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("player_availability")
      .select("player_id, round_id, weekdays")
      .eq("player_id", playerId)
      .eq("round_id", roundId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return NextResponse.json({ availability: data ?? null });
  } catch (err) {
    return NextResponse.json(
      { error: `No se pudo cargar disponibilidad: ${String(err)}` },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const parsed = postSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Payload invalido.", detail: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("player_availability")
      .upsert(
        {
          player_id: parsed.data.playerId,
          round_id: parsed.data.roundId,
          weekdays: parsed.data.weekdays,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "round_id,player_id",
        },
      )
      .select("player_id, round_id, weekdays")
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ availability: data });
  } catch (err) {
    return NextResponse.json(
      { error: `No se pudo guardar disponibilidad: ${String(err)}` },
      { status: 500 },
    );
  }
}