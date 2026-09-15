# Liga Interna de Futbolin NTT DATA

## 1) Objetivo del proyecto
Crear una web app interna para gestionar una liga de futbolin entre companeros de oficina, con acceso desde movil y escritorio, para:
- Consultar calendario y horarios.
- Registrar resultados de partidos.
- Ver clasificacion, estadisticas y ranking.
- Facilitar la organizacion sin hojas de calculo manuales.

La aplicacion se desplegara en Vercel.

## 2) Alcance funcional (MVP)

### Funcionalidades para jugadores
- Pantalla inicial de seleccion de identidad: "Quien eres?".
- Seleccion de jugador desde un listado definido por admin.
- Perfil de jugador (nombre, alias, disponibilidad opcional).
- Vista de calendario de jornadas y partidos.
- Detalle de partido: fecha, hora, mesa, jugadores/equipos.
- Registro de resultado del partido.
- Clasificacion general (puntos, victorias, derrotas, goles a favor/en contra).

### Funcionalidades para administradores
- Crear y editar temporada.
- Alta/baja de jugadores.
- Generar calendario automatico (round robin) o manual.
- Validar o corregir resultados reportados.
- Cerrar jornada y publicar clasificacion.

### Reglas de negocio base sugeridas
- Victoria: 3 puntos.
- Empate: 1 punto.
- Derrota: 0 puntos.
- Desempates por: diferencia de goles, goles a favor, enfrentamiento directo.

## 3) Requisitos no funcionales
- Seguridad: sin autenticacion, con controles de integridad y auditoria.
- Trazabilidad: guardar quien reporta y cuando.
- Disponibilidad: alta en horario de tarde (post-jornada laboral).
- Usabilidad: interfaz simple, rapida y responsive.
- Rendimiento: paginas clave con tiempos de carga bajos.
- Escalabilidad: suficiente para 20-200 usuarios sin rediseno.

## 4) Roles y permisos
- Admin (gestionado por una clave interna simple o modo mantenimiento local):
	- Gestiona temporada, calendario, jugadores y validaciones.
- Jugador seleccionado:
	- Consulta calendario y clasificacion.
	- Reporta resultados de sus partidos en nombre del jugador elegido.
- Visitante:
	- Debe elegir identidad para operar.

## 5) Arquitectura recomendada (Vercel)

### Stack recomendado
- Frontend + backend: Next.js (App Router) en Vercel.
- API: Route Handlers de Next.js.
- Base de datos: PostgreSQL gestionado (Vercel Postgres o Neon/Supabase).
- ORM: Prisma o Drizzle.
- Sin autenticacion de usuarios: seleccion de identidad (guest mode) persistida en cookie/localStorage.
- Cache y revalidacion: ISR + cache de consultas para clasificacion/calendario.

### Por que esta arquitectura
- Reduce complejidad al tener frontend y backend en el mismo proyecto.
- Evita friccion de acceso para uso hobby interno.
- Facil despliegue continuo con Git + Vercel.
- Escala bien para una app interna sin sobrecostes iniciales.
- Permite evolucionar rapido al MVP y luego crecer.

## 6) Modelo de datos minimo
- users
	- id, name, alias, is_admin, created_at
- seasons
	- id, name, start_date, end_date, status
- teams (si jugais por parejas fijas)
	- id, name
- matches
	- id, season_id, round, home_id, away_id, match_date, status
- results
	- id, match_id, home_score, away_score, reported_by_player_id, validated_by_player_id, validated_at
- identity_sessions (opcional, si quieres trazabilidad adicional)
	- id, player_id, session_token, created_at, expires_at
- standings (materializada o calculada)
	- team_or_user_id, played, won, drawn, lost, gf, ga, gd, points

Nota: si los equipos cambian cada partido, se modela por jugadores en cada match en vez de equipo fijo.

## 7) Flujos principales
1. Admin crea temporada.
2. Admin registra jugadores.
3. Sistema genera calendario.
4. Jugadores consultan sus partidos.
5. Tras cada partido, uno de los jugadores reporta resultado tras elegir identidad.
6. Admin valida (o autoconsenso entre ambos jugadores, en fase 2).
7. Se actualiza clasificacion automaticamente.

## 8) Infraestructura necesaria en Vercel

### Entornos
- Development: local.
- Preview: por rama/PR (automatico en Vercel).
- Production: rama principal.

### Variables de entorno minimas
- DATABASE_URL
- ADMIN_ACTION_KEY (clave interna para operaciones de administracion)

### Observabilidad
- Vercel Analytics para rendimiento.
- Logs de funciones para errores API.
- Alertas basicas (fallos 5xx, fallos login).

### Backups y datos
- Activar backups automaticos del proveedor PostgreSQL.
- Definir politica de retencion (por ejemplo 30-90 dias en logs).

## 9) Seguridad y cumplimiento interno
- Como no hay login, asumir riesgo de suplantacion y mitigarlo por diseno.
- Validar que el jugador seleccionado pertenezca al partido para reportar resultado.
- Requerir confirmacion del rival o validacion admin para cerrar resultados.
- Mantener historial de cambios de resultados (auditoria).
- Evitar exponer datos personales no necesarios.

## 10) Coste estimado inicial
- Vercel Hobby puede servir para piloto interno pequeno.
- Para uso real en oficina, valorar Vercel Pro por:
	- Mejor cuota de ejecuciones.
	- Mejor colaboracion y observabilidad.
- Base de datos gestionada: plan gratuito o bajo coste para MVP.

## 11) Roadmap sugerido

### Fase 1 (1-2 semanas): MVP operativo
- Pantalla inicial "Quien eres?" y seleccion de jugador.
- Gestion de jugadores y temporada.
- Calendario.
- Registro y validacion de resultados.
- Clasificacion automatica.

### Fase 2 (1 semana): Calidad y automatizacion
- Notificaciones (email/Slack/Teams) de partidos pendientes.
- Dashboard de estadisticas.
- Export CSV de resultados.

### Fase 3 (opcional)
- Sistema de sanciones/no-show.
- Elo rating adicional.
- Mini app movil (PWA mejorada).

## 12) Riesgos y mitigaciones
- Riesgo: resultados mal introducidos.
	- Mitigacion: validacion admin + registro de auditoria.
- Riesgo: suplantacion de identidad (al no haber login).
	- Mitigacion: confirmacion por rival/admin, PIN opcional por jugador, historial de acciones.
- Riesgo: baja participacion.
	- Mitigacion: recordatorios y ranking visible.
- Riesgo: cambios de reglas a mitad de temporada.
	- Mitigacion: versionar reglas por temporada.

## 13) Checklist de arranque tecnico
- Definir reglas exactas de competicion.
- Confirmar modo de juego: individual o parejas fijas/rotativas.
- Definir flujo de identidad sin login (selector + PIN opcional por jugador).
- Crear proyecto Next.js y conectarlo a Vercel.
- Provisionar PostgreSQL y migraciones iniciales.
- Implementar RBAC (admin/jugador).
- Publicar MVP y recoger feedback de 10-15 usuarios.

## 14) Siguiente paso recomendado
Con este analisis ya puedes iniciar implementacion. Lo mas efectivo es arrancar con un MVP pequeno en Next.js + PostgreSQL sobre Vercel, con flujo "Quien eres?", validar durante 2-3 jornadas reales y ajustar reglas antes de escalar funcionalidades.