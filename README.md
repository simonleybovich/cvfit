# cvfit

Herramienta que analiza qué tan bien matchea un CV (PDF o DOCX) contra la descripción de un
puesto: devuelve una estimación de compatibilidad, las keywords que faltan, las que ya están
presentes, y sugerencias concretas de mejora por sección. A partir de ese análisis, también puede
generar una versión optimizada del CV — incorporando las keywords relevantes de forma honesta,
sin inventar experiencia — descargable en DOCX, PDF o Typst.

El análisis y la generación de CV no requieren cuenta: todo se procesa en memoria durante el
request, sin persistencia. Con login (GitHub o Google) además podés guardar cada análisis —
incluido el CV generado, si lo pediste — en un historial, solo si lo pedís explícitamente
(ver sección Auth abajo).

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui, tema oscuro con identidad propia (acento ámbar + tipografía serif
  para títulos vía Source Serif 4, no el look genérico por defecto de shadcn)
- `@google/genai` (modelo `gemini-3.6-flash`, salida estructurada vía JSON schema)
- `pdf-parse` / `mammoth` para extraer texto de PDF/DOCX
- `docx` / `pdf-lib` para exportar el CV generado a DOCX/PDF; export a Typst vía templating de
  texto plano (sin librería ni compilación server-side)
- `@supabase/ssr` + `@supabase/supabase-js` para login con GitHub o Google OAuth (solo identidad)
- Prisma + Postgres propio (via Docker Compose en local) para el historial de análisis

## Cómo correrlo localmente

1. Instalá las dependencias:

   ```bash
   npm install
   ```

2. Copiá `.env.example` a `.env.local` y completá las variables:

   ```bash
   cp .env.example .env.local
   ```

   ```
   GEMINI_API_KEY=...
   DATABASE_URL=postgresql://cvfit:cvfit@localhost:5432/cvfit
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```

   - `GEMINI_API_KEY`: gratis en [Google AI Studio](https://aistudio.google.com/app/apikey).
   - `DATABASE_URL`: apunta al Postgres local levantado en el paso 3 (valores por defecto del
     `docker-compose.yml` — no son secrets de producción).
   - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`: del dashboard de tu proyecto
     de [Supabase](https://supabase.com) (Settings → API), con los providers de GitHub y/o Google
     habilitados en Authentication → Sign In / Providers (cada uno con su propia OAuth App/Client
     en GitHub o Google Cloud Console, apuntando al callback de Supabase
     `https://<tu-proyecto>.supabase.co/auth/v1/callback`).

3. Levantá el Postgres local (solo para historial — ver sección Auth abajo) y aplicá el schema:

   ```bash
   docker compose up -d
   npm run db:migrate
   ```

4. Levantá el servidor de desarrollo:

   ```bash
   npm run dev
   ```

5. Abrí [http://localhost:3000](http://localhost:3000).

Si `GEMINI_API_KEY` no está configurada, la app arranca igual (la landing y el formulario
funcionan) pero `/api/analyze` y `/api/generate` responden con un error claro en vez de romper.
Análisis y generación de CV no requieren login ni Postgres/Supabase en absoluto — esas variables
solo hacen falta para usar login + historial (fase 3).

## Funcionalidad

### Análisis (feedback)

Subís un CV y pegás una job description. `POST /api/analyze` devuelve un JSON estructurado con
score estimado, keywords presentes/faltantes y sugerencias por sección.

### Generación de CV optimizado

Sobre el resultado del análisis, un botón dispara `POST /api/generate`: reescribe el CV en una
estructura tipada (encabezado/contacto, resumen, experiencia, skills agrupadas, educación,
idiomas), incorporando keywords del JD solo donde hay evidencia real en el CV original — nunca
inventa experiencia, empresas ni tecnologías. Si una keyword del JD no tiene sustento en el CV,
se reporta como "no incorporada" en vez de agregarse a ciegas.

El resultado se puede descargar en tres formatos vía `POST /api/generate/export`:

- **DOCX** — vía `docx`.
- **PDF** — vía `pdf-lib` (sin dependencia de binarios externos como LibreOffice).
- **Typst** — código fuente `.typ` listo para compilar con tu propio toolchain de Typst; usa el
  template personal `@preview/silver-dev-cv`.

Ninguno de los dos endpoints de generación vuelve a llamar a la IA para exportar: el cliente
reenvía la estructura ya generada, y cada exportador es una transformación determinística.

### Auth + historial

Login con GitHub o Google vía Supabase Auth — usado **solo para identidad** (sesión/JWT), no
para datos: el historial vive en el Postgres propio de la app, no en la base hosteada de
Supabase (ver nota de arquitectura en `spec.md` sección 6 si trabajás sobre este repo). No hay
sync de tablas de usuarios entre ambos sistemas; la tabla `AnalysisHistory` solo guarda el
`userId` (UUID del JWT de Supabase) como referencia plana.

Con sesión iniciada, el resultado de un análisis muestra un botón "Guardar en mi historial" —
acción explícita, nunca automática — que persiste la JD y el **análisis completo** (score,
keywords, sugerencias) vía `POST /api/history`, y también el **CV generado** si ya lo pediste
antes de guardar (secciones, cambios, keywords no incorporadas). Guardar el detalle completo
evita tener que re-llamar a Gemini (y gastar tokens de nuevo) solo para revisar un análisis o
CV pasado — es una decisión consciente que amplía lo mínimo que preveía el spec original
("JD, score, fecha"), documentada como tal en `spec.md`.

`/historial` deja ver el análisis completo y, si existe, re-descargar el CV generado
(DOCX/PDF/Typst) desde los datos guardados — sin volver a llamar a la IA — y reutilizar la JD de
una entrada vieja en un nuevo análisis sin tener que pegarla de nuevo. También se puede borrar
una entrada. `GET`/`POST`/`DELETE /api/history[/id]` devuelven u operan solo sobre las entradas
del usuario autenticado, filtradas en código de aplicación (no hay RLS de Supabase acá: esos
datos no están en la base de Supabase, así que Postgres/PostgREST RLS no aplica — la
verificación es "JWT válido → `userId` verificado → filtro de Prisma por ese `userId`").

## Arquitectura

Estructura de carpetas inspirada en arquitectura hexagonal, adaptada a Next.js — la lógica de
negocio no depende de detalles de infraestructura (SDK de Gemini, parsers de archivos, librerías
de exportación, Next.js mismo):

```
src/
  app/
    api/analyze/route.ts          # POST: CV + JD -> feedback estructurado
    api/generate/route.ts         # POST: CV + JD -> CV reescrito (estructura tipada)
    api/generate/export/route.ts  # POST: estructura ya generada -> DOCX/PDF/Typst
    api/history/route.ts          # POST/GET: guardar/listar historial (requiere sesión)
    api/history/[id]/route.ts     # DELETE: borrar una entrada propia del historial
    auth/callback/route.ts        # GET: exchange del code de OAuth por sesión
    historial/page.tsx            # Vista de historial del usuario logueado
    page.tsx                      # Landing + formulario en una sola vista
  domain/
    cv-analysis/                  # Lógica de negocio pura del análisis
      types.ts errors.ts validation.ts sanitize.ts parse-analysis-result.ts
    cv-generation/                # Lógica de negocio pura de la generación
      types.ts errors.ts validation.ts rewrite-cv.ts parse-generation-result.ts
    history/                      # Lógica de negocio pura del historial
      types.ts errors.ts validation.ts
  application/
    analyze-cv-usecase.ts             # Orquesta domain + infrastructure (análisis)
    generate-cv-usecase.ts            # Orquesta domain + infrastructure (generación)
    save-analysis-history-usecase.ts  # Verifica sesión + persiste una entrada
    list-analysis-history-usecase.ts  # Verifica sesión + lista entradas propias
    delete-analysis-history-usecase.ts # Verifica sesión + borra una entrada propia
  infrastructure/
    ai/gemini-client.ts           # Wrapper del SDK de Gemini (salida estructurada, con retry)
    ai/prompts/analyze-prompt.ts
    ai/prompts/rewrite-prompt.ts
    parsing/pdf-parser.ts docx-parser.ts cv-parser.ts
    generation/docx-generator.ts pdf-generator.ts typst-generator.ts
    auth/supabase-browser-client.ts supabase-server-client.ts
    persistence/postgres/prisma-client.ts analysis-history-repository.ts
  components/
    analyze/                      # UI de formulario y resultados de análisis
    generate/                     # UI de generación, preview y descargas
    auth/                         # Botones de sign-in/sign-out (Supabase)
    layout/site-header.tsx        # Header server-side: estado de sesión sin flash
  lib/                            # Rate limiting en memoria, extracción de IP de cliente
prisma/schema.prisma              # Modelo AnalysisHistory (Postgres propio, no Supabase)
docker-compose.yml                # Postgres local para historial
middleware.ts                     # Refresca la sesión de Supabase en cada request
```

## Seguridad y privacidad

- El CV y la job description se procesan enteramente en memoria durante el request; no se
  persiste el archivo, el texto extraído, ni ningún resultado en ningún lado.
- El texto extraído se sanitiza y se envuelve en secciones claramente delimitadas dentro de los
  prompts, con instrucciones explícitas al modelo de tratar ese contenido como datos, nunca como
  instrucciones — mitigación básica de prompt injection. El exportador de Typst aplica su propio
  escapado de caracteres especiales del lenguaje sobre contenido no confiable.
- Validación de tipo de archivo (PDF/DOCX) y tamaño máximo (5MB) tanto en el cliente como en el
  servidor.
- Rate limiting básico por IP (in-memory, ventana deslizante) en los endpoints de análisis,
  generación, y guardado de historial.
- Los campos de identidad/contacto del CV generado (nombre, dirección, contactos, institución,
  fechas) se extraen del CV original — la IA no tiene margen para inventarlos ni "optimizarlos".
- El historial nunca guarda el CV subido ni su texto extraído — solo la JD, el análisis derivado
  de ella, y (si se generó) el CV reescrito, que es contenido derivado por la IA, no el archivo
  original — y solo se escribe si el usuario logueado lo pide explícitamente con el botón
  "Guardar en mi historial", nunca automáticamente al analizar.
- Las consultas de historial se filtran server-side por el `userId` verificado desde el JWT de
  Supabase (`getUser()`, no `getSession()` — revalida contra Supabase Auth en vez de confiar en
  el cookie sin más) — no hay Row Level Security porque esta tabla no vive en la base de datos
  de Supabase.

## Qué falta

Control de costos con Redis (rate limiting por usuario, no solo por IP) está planeado para fase 4
y no está implementado todavía.

---

[![Invitame un café en cafecito.app](https://cdn.cafecito.app/imgs/buttons/button_5.svg)](https://cafecito.app/simonleybo)
