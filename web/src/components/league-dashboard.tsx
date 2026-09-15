"use client";

import { useMemo, useState } from "react";
import { WEEKDAYS, WEEKDAY_LABELS, type Weekday } from "@/lib/league";

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

type InitialData = {
  players: Player[];
  round: CurrentRound | null;
  totalPlayers: number;
  submittedAvailabilities: number;
  matches: Match[];
  error: string | null;
};

type Props = {
  initialData: InitialData;
};

const IDENTITY_KEY = "liga_player_id";

export default function LeagueDashboard({ initialData }: Props) {
  const [players, setPlayers] = useState<Player[]>(initialData.players);
  const [round, setRound] = useState<CurrentRound | null>(initialData.round);
  const [totalPlayers, setTotalPlayers] = useState(initialData.totalPlayers);
  const [submittedAvailabilities, setSubmittedAvailabilities] = useState(
    initialData.submittedAvailabilities,
  );
  const [availabilityDays, setAvailabilityDays] = useState<Set<Weekday>>(new Set());
  const [matches, setMatches] = useState<Match[]>(initialData.matches);
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }

    const stored = Number(window.localStorage.getItem(IDENTITY_KEY));
    return Number.isFinite(stored) && stored > 0 ? stored : null;
  });
  const [adminKey, setAdminKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(initialData.error);

  const allSubmitted = totalPlayers > 0 && submittedAvailabilities >= totalPlayers;
  const selectedPlayer = useMemo(
    () => players.find((p) => p.id === selectedPlayerId) ?? null,
    [players, selectedPlayerId],
  );

  async function refreshAll(identityId: number | null = selectedPlayerId) {
    setError(null);
    const [playersRes, roundRes] = await Promise.all([
      fetch("/api/players", { cache: "no-store" }),
      fetch("/api/rounds/current", { cache: "no-store" }),
    ]);

    const playersJson = await playersRes.json();
    const roundJson = await roundRes.json();

    if (!playersRes.ok) {
      setError(playersJson.error ?? "Error cargando jugadores.");
      return;
    }
    if (!roundRes.ok) {
      setError(roundJson.error ?? "Error cargando jornada.");
      return;
    }

    setPlayers(playersJson.players ?? []);
    setRound(roundJson.round ?? null);
    setTotalPlayers(roundJson.totalPlayers ?? 0);
    setSubmittedAvailabilities(roundJson.submittedAvailabilities ?? 0);

    if (roundJson.round) {
      await loadMatches(roundJson.round.id);
      if (identityId) {
        await loadAvailability(identityId, roundJson.round.id);
      }
    } else {
      setMatches([]);
      setAvailabilityDays(new Set());
    }
  }

  async function loadAvailability(playerId: number, roundId: number) {
    const response = await fetch(
      `/api/availability?playerId=${playerId}&roundId=${roundId}`,
      { cache: "no-store" },
    );
    const json = await response.json();
    if (!response.ok) {
      setError(json.error ?? "Error cargando disponibilidad.");
      return;
    }

    const days: Weekday[] = json.availability?.weekdays ?? [];
    setAvailabilityDays(new Set(days));
  }

  async function loadMatches(roundId: number) {
    const response = await fetch(`/api/rounds/${roundId}/matches`, {
      cache: "no-store",
    });
    const json = await response.json();

    if (!response.ok) {
      setError(json.error ?? "Error cargando partidos.");
      return;
    }

    setMatches(json.matches ?? []);
  }

  function toggleDay(day: Weekday) {
    const updated = new Set(availabilityDays);
    if (updated.has(day)) {
      updated.delete(day);
    } else {
      updated.add(day);
    }
    setAvailabilityDays(updated);
  }

  async function submitAvailability() {
    if (!selectedPlayerId || !round) {
      setError("Selecciona jugador y asegurate de tener jornada activa.");
      return;
    }

    if (availabilityDays.size === 0) {
      setError("Selecciona al menos un dia de la semana.");
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: selectedPlayerId,
          roundId: round.id,
          weekdays: Array.from(availabilityDays),
        }),
      });
      const json = await response.json();
      if (!response.ok) {
        setError(json.error ?? "No se pudo guardar disponibilidad.");
        return;
      }

      setMessage("Disponibilidad guardada.");
      await refreshAll(selectedPlayerId);
    } finally {
      setLoading(false);
    }
  }

  async function createNextRound() {
    if (!adminKey) {
      setError("Introduce ADMIN_ACTION_KEY para crear jornada.");
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/rounds/create-next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminKey }),
      });
      const json = await response.json();

      if (!response.ok) {
        setError(json.error ?? "No se pudo crear jornada.");
        return;
      }

      setMessage(`Jornada ${json.round.number} creada.`);
      await refreshAll(selectedPlayerId);
    } finally {
      setLoading(false);
    }
  }

  async function generateMatches() {
    if (!round) {
      setError("No hay jornada activa para generar.");
      return;
    }

    if (!adminKey) {
      setError("Introduce ADMIN_ACTION_KEY para generar enfrentamientos.");
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/rounds/${round.id}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminKey }),
      });
      const json = await response.json();

      if (!response.ok) {
        setError(json.error ?? "No se pudo generar jornada.");
        return;
      }

      setMessage(`Generados ${json.generatedCount} partidos.`);
      await refreshAll(selectedPlayerId);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="table-bg min-h-screen px-4 py-10">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="card p-6">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-[#0b8a61]">
            Liga Interna
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Futbolin NTT DATA
          </h1>
          <p className="mt-3 text-sm text-[#2c4a3d]">
            Seleccion de identidad sin login, disponibilidad quincenal y
            generacion de enfrentamientos por posiciones (delantero/defensa).
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-2">
          <article className="card p-5">
            <h2 className="text-xl font-semibold">Quien eres?</h2>
            <p className="mt-1 text-sm text-[#416456]">
              Elige tu nombre para operar en la app.
            </p>

            <select
              className="mt-4 w-full rounded-lg border border-[#bdd4c8] bg-white p-2.5"
              value={selectedPlayerId ?? ""}
              onChange={(event) => {
                const value = Number(event.target.value);
                setSelectedPlayerId(value);
                window.localStorage.setItem(IDENTITY_KEY, String(value));
                if (round) {
                  void loadAvailability(value, round.id);
                }
              }}
            >
              <option value="" disabled>
                Selecciona un jugador
              </option>
              {players.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.alias ? `${player.alias} (${player.name})` : player.name}
                </option>
              ))}
            </select>

            <p className="mt-3 text-sm text-[#416456]">
              Jugador activo: {selectedPlayer?.alias ?? selectedPlayer?.name ?? "-"}
            </p>
          </article>

          <article className="card p-5">
            <h2 className="text-xl font-semibold">Jornada Actual</h2>
            {round ? (
              <div className="mt-2 text-sm text-[#2c4a3d]">
                <p>
                  Jornada {round.number}: {round.start_date} a {round.end_date}
                </p>
                <p className="mt-1">
                  Disponibilidades: {submittedAvailabilities}/{totalPlayers}
                </p>
                <p className="mt-1 font-medium">
                  {allSubmitted
                    ? "Todos listos: ya se pueden generar partidos."
                    : "Pendiente: faltan jugadores por informar disponibilidad."}
                </p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-[#2c4a3d]">
                No hay jornada activa. Crea la siguiente desde el panel admin.
              </p>
            )}
          </article>
        </section>

        <section className="card p-5">
          <h2 className="text-xl font-semibold">Disponibilidad (2 semanas)</h2>
          <p className="mt-1 text-sm text-[#416456]">
            Marca los dias que bajas a la oficina para esta jornada.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
            {WEEKDAYS.map((day) => (
              <label
                key={day}
                className="flex items-center gap-2 rounded-lg border border-[#c2d8cd] bg-white p-2"
              >
                <input
                  type="checkbox"
                  checked={availabilityDays.has(day)}
                  onChange={() => toggleDay(day)}
                />
                <span>{WEEKDAY_LABELS[day]}</span>
              </label>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              className="btn btn-primary"
              disabled={loading}
              onClick={() => {
                void submitAvailability();
              }}
            >
              Guardar disponibilidad
            </button>
            <button
              className="btn btn-secondary"
              disabled={loading}
              onClick={() => {
                void refreshAll(selectedPlayerId);
              }}
            >
              Refrescar
            </button>
          </div>
        </section>

        <section className="card p-5">
          <h2 className="text-xl font-semibold">Panel Admin (sin login)</h2>
          <p className="mt-1 text-sm text-[#416456]">
            Usa la clave ADMIN_ACTION_KEY para crear jornada y generar emparejamientos.
          </p>

          <input
            className="mt-3 w-full rounded-lg border border-[#bdd4c8] bg-white p-2.5 font-mono text-sm"
            type="password"
            value={adminKey}
            onChange={(event) => setAdminKey(event.target.value)}
            placeholder="ADMIN_ACTION_KEY"
          />

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              className="btn btn-secondary"
              disabled={loading}
              onClick={() => {
                void createNextRound();
              }}
            >
              Crear siguiente jornada
            </button>
            <button
              className="btn btn-primary"
              disabled={loading || !allSubmitted || !round}
              onClick={() => {
                void generateMatches();
              }}
            >
              Generar enfrentamientos
            </button>
          </div>
        </section>

        <section className="card p-5">
          <h2 className="text-xl font-semibold">Partidos de la jornada</h2>
          {matches.length === 0 ? (
            <p className="mt-2 text-sm text-[#416456]">Sin partidos generados todavia.</p>
          ) : (
            <ul className="mt-3 grid gap-3">
              {matches.map((match) => (
                <li key={match.id} className="rounded-xl border border-[#c2d8cd] bg-white p-3">
                  <p className="text-xs font-mono text-[#45695b]">
                    {new Date(match.scheduledAt).toLocaleString("es-ES")} · {match.status}
                  </p>
                  <p className="mt-1 text-sm">
                    Equipo A: {formatPlayer(match.teamA.forward)} (Del.) + {formatPlayer(match.teamA.defense)} (Def.)
                  </p>
                  <p className="text-sm">
                    Equipo B: {formatPlayer(match.teamB.forward)} (Del.) + {formatPlayer(match.teamB.defense)} (Def.)
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {message ? (
          <p className="card border-l-4 border-l-[#0b8a61] p-3 text-sm">{message}</p>
        ) : null}
        {error ? (
          <p className="card border-l-4 border-l-[#ba3939] p-3 text-sm text-[#7a2020]">{error}</p>
        ) : null}
      </section>
    </main>
  );
}

function formatPlayer(player: { name: string; alias: string | null } | null): string {
  if (!player) {
    return "Pendiente";
  }

  return player.alias ?? player.name;
}
