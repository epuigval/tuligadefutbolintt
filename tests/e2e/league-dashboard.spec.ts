import { expect, test, type Page, type Route } from "@playwright/test";

type MockOptions = {
  submittedAvailabilities: number;
  totalPlayers: number;
};

const players = [
  { id: 1, name: "Ada Lovelace", alias: null, is_admin: true },
  { id: 2, name: "Alan Turing", alias: "Turing", is_admin: false },
];

const round = {
  id: 77,
  season_id: 2026,
  number: 9,
  start_date: "2026-10-06",
  end_date: "2026-10-17",
  status: "open",
};

function jsonResponse(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function mockLeagueApi(page: Page, options: MockOptions) {
  let generatedMatches = false;

  await page.route("**/api/players", (route) =>
    jsonResponse(route, { players }),
  );

  await page.route("**/api/rounds/current", (route) =>
    jsonResponse(route, {
      round,
      totalPlayers: options.totalPlayers,
      submittedAvailabilities: options.submittedAvailabilities,
    }),
  );

  await page.route("**/api/availability?*", (route) =>
    jsonResponse(route, { availability: { weekdays: ["monday", "wednesday"] } }),
  );

  await page.route("**/api/availability", async (route) => {
    if (route.request().method() !== "POST") {
      return route.fallback();
    }

    return jsonResponse(route, { ok: true });
  });

  await page.route("**/api/rounds/create-next", async (route) => {
    if (route.request().method() !== "POST") {
      return route.fallback();
    }

    return jsonResponse(route, {
      round: { ...round, number: round.number + 1 },
    });
  });

  await page.route("**/api/rounds/77/generate", async (route) => {
    if (route.request().method() !== "POST") {
      return route.fallback();
    }

    generatedMatches = true;
    return jsonResponse(route, { generatedCount: 2 });
  });

  await page.route("**/api/rounds/77/matches", (route) => {
    if (!generatedMatches) {
      return jsonResponse(route, { matches: [] });
    }

    return jsonResponse(route, {
      matches: [
        {
          id: 1,
          scheduledAt: "2026-10-07T10:00:00.000Z",
          status: "scheduled",
          teamA: {
            forward: { name: "Ada Lovelace", alias: null },
            defense: { name: "Alan Turing", alias: "Turing" },
          },
          teamB: {
            forward: { name: "Grace Hopper", alias: null },
            defense: { name: "Linus Torvalds", alias: "LT" },
          },
        },
      ],
    });
  });
}

test("permite seleccionar jugador y guardar disponibilidad", async ({ page }) => {
  await mockLeagueApi(page, { submittedAvailabilities: 1, totalPlayers: 2 });
  await page.goto("/");

  await page.getByRole("button", { name: "Refrescar" }).click();

  const selectorJugador = page.getByRole("combobox");
  await expect(selectorJugador).toBeVisible();
  await selectorJugador.selectOption("1");

  await expect(page.getByText("Jugador activo: Ada Lovelace")).toBeVisible();

  await page.getByRole("button", { name: "Guardar disponibilidad" }).click();
  await expect(page.getByText("Selecciona al menos un dia de la semana.")).toBeVisible();

  await page.getByLabel("Lunes").check();
  await page.getByRole("button", { name: "Guardar disponibilidad" }).click();

  await expect(page.getByText("Disponibilidad guardada.")).toBeVisible();
});

test("no permite generar enfrentamientos si no han enviado todos", async ({ page }) => {
  await mockLeagueApi(page, { submittedAvailabilities: 1, totalPlayers: 2 });
  await page.goto("/");

  await page.getByRole("button", { name: "Refrescar" }).click();
  const generarBtn = page.getByRole("button", { name: "Generar enfrentamientos" });

  await expect(generarBtn).toBeDisabled();
  await expect(
    page.getByText("Pendiente: faltan jugadores por informar disponibilidad."),
  ).toBeVisible();
});

test("genera enfrentamientos cuando todos han enviado disponibilidad", async ({ page }) => {
  await mockLeagueApi(page, { submittedAvailabilities: 2, totalPlayers: 2 });
  await page.goto("/");

  await page.getByRole("button", { name: "Refrescar" }).click();

  await page
    .getByPlaceholder("ADMIN_ACTION_KEY")
    .fill("admin-secret");

  const generarBtn = page.getByRole("button", { name: "Generar enfrentamientos" });
  await expect(generarBtn).toBeEnabled();
  await generarBtn.click();

  await expect(page.getByText("Generados 2 partidos.")).toBeVisible();
  await expect(page.getByText("Equipo A: Ada Lovelace (Del.) + Turing (Def.)")).toBeVisible();
});
