# cvfit

Herramienta que analiza qué tan bien matchea un CV (PDF o DOCX) contra la descripción de un
puesto: devuelve una estimación de compatibilidad, las keywords que faltan, las que ya están
presentes, y sugerencias concretas de mejora por sección. A partir de ese análisis, también puede
generar una versión optimizada del CV — incorporando las keywords relevantes de forma honesta,
sin inventar experiencia — descargable en DOCX, PDF o Typst.

Sin autenticación ni persistencia: todo se procesa en memoria durante el request.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- `@google/genai` (modelo `gemini-3.7-flash`, salida estructurada vía JSON schema)
- `pdf-parse` / `mammoth` para extraer texto de PDF/DOCX
- `docx` / `pdf-lib` para exportar el CV generado a DOCX/PDF; export a Typst vía templating de
  texto plano (sin librería ni compilación server-side)

## Cómo correrlo localmente

1. Instalá las dependencias:

   ```bash
   npm install
   ```

2. Copiá `.env.example` a `.env.local` y completá tu API key de Gemini:

   ```bash
   cp .env.example .env.local
   ```

   ```
   GEMINI_API_KEY=...
   ```

   Podés generar una key gratis en [Google AI Studio](https://aistudio.google.com/app/apikey).

3. Levantá el servidor de desarrollo:

   ```bash
   npm run dev
   ```

4. Abrí [http://localhost:3000](http://localhost:3000).

Si `GEMINI_API_KEY` no está configurada, la app arranca igual (la landing y el formulario
funcionan) pero `/api/analyze` y `/api/generate` responden con un error claro en vez de romper.

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
    page.tsx                      # Landing + formulario en una sola vista
  domain/
    cv-analysis/                  # Lógica de negocio pura del análisis
      types.ts errors.ts validation.ts sanitize.ts parse-analysis-result.ts
    cv-generation/                # Lógica de negocio pura de la generación
      types.ts errors.ts validation.ts rewrite-cv.ts parse-generation-result.ts
  application/
    analyze-cv-usecase.ts         # Orquesta domain + infrastructure (análisis)
    generate-cv-usecase.ts        # Orquesta domain + infrastructure (generación)
  infrastructure/
    ai/gemini-client.ts           # Wrapper del SDK de Gemini (salida estructurada, con retry)
    ai/prompts/analyze-prompt.ts
    ai/prompts/rewrite-prompt.ts
    parsing/pdf-parser.ts docx-parser.ts cv-parser.ts
    generation/docx-generator.ts pdf-generator.ts typst-generator.ts
  components/
    analyze/                      # UI de formulario y resultados de análisis
    generate/                     # UI de generación, preview y descargas
  lib/                            # Rate limiting en memoria, extracción de IP de cliente
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
- Rate limiting básico por IP (in-memory, ventana deslizante) en los endpoints de análisis y
  generación.
- Los campos de identidad/contacto del CV generado (nombre, dirección, contactos, institución,
  fechas) se extraen del CV original — la IA no tiene margen para inventarlos ni "optimizarlos".

## Qué falta

Autenticación (Supabase Auth), historial de análisis (Postgres propio), y control de costos con
Redis están planeados como fases futuras y no están implementados todavía.
