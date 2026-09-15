import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("players")
      .select("id, name, alias, is_admin, active")
      .eq("active", true)
      .order("name", { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json({ players: data ?? [] });
  } catch (err) {
    return NextResponse.json(
      { error: `No se pudieron cargar jugadores: ${String(err)}` },
      { status: 500 },
    );
  }
}