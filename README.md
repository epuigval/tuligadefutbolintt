# Liga Futbolin NTT DATA - Iteracion 1

Primera version funcional con:
- Seleccion de identidad sin login: "Quien eres?"
- Disponibilidad de oficina para jornada de 2 semanas
- Regla de bloqueo: no se generan partidos hasta que todos actualizan disponibilidad
- Generador de emparejamientos aleatorio por parejas
- Restriccion por pareja: maximo 2 partidos juntos alternando posicion (delantero/defensa)

## Requisitos
- Node.js 20+
- Proyecto Supabase configurado
- Tablas base ya creadas: players, seasons, matches, results, audit_log

## Paso 1: aplicar SQL de iteracion
Ejecuta en Supabase SQL Editor:

- supabase/iteration1.sql

Ese script crea:
- rounds
- player_availability

## Paso 2: variables de entorno
Copia .env.example a .env.local y rellena valores reales:

- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- NEXT_PUBLIC_SUPABASE_URL
- ADMIN_ACTION_KEY

Importante:
- SUPABASE_SERVICE_ROLE_KEY solo en servidor.
- No exponer la service role key en cliente.

## Paso 3: arrancar en local
```bash
npm install
npm run dev
```

Abrir http://localhost:3000

## Flujo de uso
1. Elegir jugador en "Quien eres?"
2. Marcar disponibilidad (L-V)
3. El admin crea la siguiente jornada (2 semanas)
4. Cuando todos han enviado disponibilidad, el admin pulsa "Generar enfrentamientos"

## Rutas API principales
- GET /api/players
- GET|POST /api/availability
- GET /api/rounds/current
- POST /api/rounds/create-next
- POST /api/rounds/:roundId/generate
- GET /api/rounds/:roundId/matches

## Notas de esta iteracion
- La liga puntua de forma individual, pero los partidos son en parejas.
- Esta version se centra en disponibilidad y generacion de partidos.
- Siguiente iteracion recomendada: registro/validacion de resultados y clasificacion automatica.
