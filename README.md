# cvfit

cvfit analiza la compatibilidad entre tu CV y una descripción de puesto. Detecta keywords
presentes y faltantes, propone mejoras concretas y puede generar una versión optimizada del CV
sin inventar experiencia, tecnologías ni logros.

La aplicación está construida como un proyecto de portfolio público: prioriza una arquitectura
clara, privacidad por defecto y una integración de IA intercambiable.

## Funcionalidades

- Análisis de CV en PDF o DOCX frente a una descripción de puesto.
- Score estimado de compatibilidad, keywords encontradas y faltantes.
- Sugerencias accionables agrupadas por sección del CV.
- Generación de un CV optimizado respetando el contenido original.
- Exportación a DOCX, PDF y Typst (`.typ`).
- Autenticación con GitHub, Google o email y contraseña mediante Supabase Auth.
- Historial privado de análisis y CV generados, guardado solo cuando el usuario lo solicita.
- Rate limiting distribuido por IP y usuario con Redis, con fallback en memoria.

## Stack

| Área | Tecnología |
| --- | --- |
| Frontend y backend | Next.js App Router, TypeScript |
| UI | Tailwind CSS, shadcn/ui, Base UI |
| IA | OpenCode Go vía API compatible con OpenAI; Gemini como fallback |
| Parseo | `pdf-parse`, `mammoth` |
| Exportación | `docx`, `pdf-lib`, plantillas Typst |
| Auth | Supabase Auth |
| Persistencia | PostgreSQL + Prisma 7 |
| Rate limiting | Redis |
| Deploy | Docker, Dokploy |

## Requisitos

- Node.js 22+
- npm
- Docker y Docker Compose
- Una cuenta de Supabase para habilitar autenticación
- Una API key de OpenCode Go o Gemini

## Inicio rápido

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

Copiá el archivo de ejemplo:

```bash
cp .env.example .env.local
```

Completá las variables necesarias:

```env
OPENCODE_API_KEY=
GEMINI_API_KEY=
DATABASE_URL=postgresql://cvfit:cvfit@localhost:5432/cvfit
REDIS_URL=redis://localhost:6379
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

`OPENCODE_API_KEY` es el proveedor principal. Si no está configurada o el proveedor falla,
cvfit intenta usar `GEMINI_API_KEY` como fallback.

Las variables `NEXT_PUBLIC_SUPABASE_*` se obtienen desde **Supabase → Settings → API**.
Además, hay que habilitar los proveedores de login deseados en **Authentication → Sign In /
Providers** y configurar sus OAuth apps correspondientes.

### 3. Levantar los servicios locales

```bash
docker compose up -d
npm run db:migrate
```

Esto inicia PostgreSQL y Redis. PostgreSQL almacena el historial; Redis coordina el rate limiting
entre instancias.

### 4. Iniciar Next.js

```bash
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000).

## Scripts

| Comando | Uso |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run start` | Servidor de producción |
| `npm test` | Ejecutar tests |
| `npm run lint` | Ejecutar ESLint |
| `npm run db:migrate` | Crear y aplicar migraciones locales |
| `npm run db:deploy` | Aplicar migraciones en producción |
| `npm run db:studio` | Abrir Prisma Studio |

## Privacidad y seguridad

- El archivo subido y el texto extraído se procesan en memoria durante el request.
- El CV original no se guarda en la base de datos.
- El historial solo se persiste mediante una acción explícita del usuario autenticado.
- El historial guarda la descripción del puesto, el análisis derivado y, si existe, el CV generado.
- El contenido del CV y de la descripción se trata como datos no confiables dentro de los prompts.
- Se validan tipo y tamaño de archivo tanto en cliente como en servidor.
- El rate limiting se aplica por IP y por usuario autenticado en los endpoints costosos.
- Si Redis no está disponible, se activa un fallback por proceso para no deshabilitar la protección.
- Las APIs no exponen las claves de los proveedores al navegador.

## Arquitectura

El proyecto sigue una arquitectura hexagonal adaptada a Next.js:

```text
src/
├── app/             # Páginas, layout, callback de auth y route handlers
├── components/      # Componentes de UI organizados por funcionalidad
├── domain/          # Tipos, validaciones y reglas de negocio puras
├── application/     # Casos de uso que coordinan el flujo
├── infrastructure/  # IA, auth, persistencia, parseo y exportación
└── lib/             # Rate limiting y utilidades transversales
```

La capa de IA se accede mediante una interfaz común. Esto permite cambiar el proveedor sin
modificar el dominio ni los casos de uso.

## API principal

| Método | Endpoint | Descripción |
| --- | --- | --- |
| `POST` | `/api/analyze` | Analiza un CV contra una descripción |
| `POST` | `/api/generate` | Genera un CV optimizado |
| `POST` | `/api/generate/export` | Exporta un CV a DOCX, PDF o Typst |
| `GET` | `/api/history` | Lista el historial del usuario autenticado |
| `POST` | `/api/history` | Guarda una entrada explícitamente |
| `DELETE` | `/api/history/:id` | Elimina una entrada propia |

## Producción

El proyecto incluye un `Dockerfile` multi-stage compatible con el output standalone de Next.js.
Para un deploy en Dokploy hay que configurar las variables de entorno de producción, incluyendo:

- `OPENCODE_API_KEY` y/o `GEMINI_API_KEY`.
- `DATABASE_URL` apuntando al PostgreSQL de producción.
- `REDIS_URL` apuntando al Redis de producción.
- Las variables públicas de Supabase como argumentos de build.

Antes de iniciar la aplicación, aplicar las migraciones con:

```bash
npm run db:deploy
```

## Estado del proyecto

- Fase 1: análisis de compatibilidad — completa.
- Fase 2: generación y exportación de CV — completa.
- Fase 3: autenticación e historial — completa.
- Fase 4: rate limiting distribuido — completa.
- BYO API keys y otros controles avanzados de costos — fuera del alcance actual.

## Licencia

El proyecto todavía no declara una licencia. Hasta que se agregue una licencia explícita, el código
no debe asumirse como reutilizable fuera de los términos aplicables del repositorio.

---

[![Invitame un café en cafecito.app](https://cdn.cafecito.app/imgs/buttons/button_5.svg)](https://cafecito.app/simonleybo)
