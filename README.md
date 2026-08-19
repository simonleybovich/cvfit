# cvfit

Herramienta que analiza qué tan bien matchea un CV (PDF o DOCX) contra la descripción de un
puesto: devuelve una estimación de compatibilidad, las keywords que faltan, las que ya están
presentes, y sugerencias concretas de mejora por sección.

Este es el MVP (Fase 1 del [spec](./spec.md)): solo feedback, sin autenticación, sin
persistencia. No genera un CV nuevo todavía — eso queda para una fase posterior.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- `@google/genai` (modelo `gemini-3.7-flash`, salida estructurada vía JSON schema)
- `pdf-parse` / `mammoth` para extraer texto de PDF/DOCX

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
funcionan) pero `/api/analyze` responde con un error claro en vez de romper.

## Arquitectura

Estructura de carpetas inspirada en arquitectura hexagonal, adaptada a Next.js — la lógica de
negocio no depende de detalles de infraestructura (SDK de Gemini, parsers de archivos, Next.js
mismo):

```
src/
  app/                      # Next.js App Router: páginas y route handlers
    api/analyze/route.ts    # POST: valida input, delega al caso de uso, mapea errores a HTTP
    page.tsx                # Landing + formulario en una sola vista
  domain/cv-analysis/       # Lógica de negocio pura, sin dependencias externas
    types.ts                # AnalysisResult, Suggestion
    errors.ts                # Taxonomía de errores del dominio
    validation.ts            # Reglas de validación de archivo/JD (compartidas cliente + servidor)
    sanitize.ts               # Sanitización de texto antes de mandarlo al prompt
    parse-analysis-result.ts  # Re-validación defensiva de la respuesta de la IA
  application/
    analyze-cv-usecase.ts    # Orquesta domain + infrastructure
  infrastructure/
    ai/gemini-client.ts       # Wrapper del SDK de Gemini (salida estructurada)
    ai/prompts/analyze-prompt.ts
    parsing/pdf-parser.ts
    parsing/docx-parser.ts
  components/analyze/         # UI de formulario y resultados
  lib/                          # Rate limiting en memoria, extracción de IP de cliente
```

## Seguridad y privacidad (Fase 1)

- El CV y la descripción del puesto se procesan enteramente en memoria durante el request; no se
  persiste el archivo, el texto extraído, ni el resultado en ningún lado.
- El texto extraído se sanitiza (se eliminan caracteres de control) y se envuelve en secciones
  claramente delimitadas dentro del prompt, con instrucciones explícitas al modelo de tratar ese
  contenido como datos, nunca como instrucciones — mitigación básica de prompt injection.
- Validación de tipo de archivo (PDF/DOCX) y tamaño máximo (5MB) tanto en el cliente como en el
  servidor.
- Rate limiting básico por IP (in-memory, ventana deslizante) en `/api/analyze`.

## Qué falta (fuera de alcance de esta fase)

Generación de CV optimizado, autenticación, historial, y control de costos con Redis están
documentados en [spec.md](./spec.md) como fases futuras y no están implementados acá.
