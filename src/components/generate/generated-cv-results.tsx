import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import type { ChangeLogEntry, GeneratedCv } from "@/domain/cv-generation/types";

interface GeneratedCvResultsProps {
  result: GeneratedCv;
}

const CHANGE_TYPE_LABEL: Record<ChangeLogEntry["type"], string> = {
  added: "Agregado",
  reworded: "Reformulado",
  reordered: "Reordenado",
};

export function GeneratedCvResults({ result }: GeneratedCvResultsProps) {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Qué se cambió</CardTitle>
          <CardDescription>
            Diff simple: cada cambio está justificado por contenido real de tu CV original.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {result.changes.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {result.changes.map((change, index) => (
                <li key={index} className="flex flex-col gap-1 rounded-md border p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{CHANGE_TYPE_LABEL[change.type]}</Badge>
                    <span className="font-medium">{change.section}</span>
                    {change.keyword && <Badge variant="outline">{change.keyword}</Badge>}
                  </div>
                  <p className="text-muted-foreground">{change.description}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No se registraron cambios.</p>
          )}
        </CardContent>
      </Card>

      {result.keywordsSkipped.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Keywords no agregadas</CardTitle>
            <CardDescription>
              No se incorporaron al CV porque no encontramos evidencia real de esa experiencia en el
              original. Agregarlas a ciegas sería inventar información.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2">
              {result.keywordsSkipped.map((skipped, index) => (
                <li key={index} className="text-sm">
                  <Badge variant="outline" className="mr-2">
                    {skipped.keyword}
                  </Badge>
                  <span className="text-muted-foreground">{skipped.reason}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>CV optimizado</CardTitle>
          <CardDescription>Vista previa del contenido. Descargalo en DOCX, PDF o Typst para editarlo.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div>
            <h3 className="text-base font-semibold">{result.header.name}</h3>
            {result.header.address && <p className="text-sm text-muted-foreground">{result.header.address}</p>}
            {result.header.contacts.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {result.header.contacts.map((contact) => `${contact.text}: ${contact.link}`).join("  ·  ")}
              </p>
            )}
          </div>

          <div>
            <h3 className="mb-1.5 text-sm font-semibold">Sobre mí</h3>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{result.summary}</p>
          </div>

          {result.experience.length > 0 && (
            <div>
              <h3 className="mb-1.5 text-sm font-semibold">Experiencia</h3>
              <div className="flex flex-col gap-3">
                {result.experience.map((job, index) => (
                  <div key={index}>
                    <p className="text-sm font-medium">{job.position}</p>
                    <p className="text-xs text-muted-foreground">
                      {[job.institution, job.location, job.date].filter(Boolean).join(" — ")}
                    </p>
                    <ul className="mt-1 list-disc pl-5 text-sm text-muted-foreground">
                      {job.bullets.map((bullet, bulletIndex) => (
                        <li key={bulletIndex}>{bullet}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.skills.length > 0 && (
            <div>
              <h3 className="mb-1.5 text-sm font-semibold">Habilidades</h3>
              <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                {result.skills.map((group, index) => (
                  <p key={index}>
                    <span className="font-medium text-foreground">{group.title}:</span> {group.items.join(", ")}
                  </p>
                ))}
              </div>
            </div>
          )}

          {result.education.length > 0 && (
            <div>
              <h3 className="mb-1.5 text-sm font-semibold">Educación</h3>
              <div className="flex flex-col gap-2">
                {result.education.map((entry, index) => (
                  <div key={index}>
                    <p className="text-sm font-medium">{entry.institution}</p>
                    <p className="text-sm text-muted-foreground">{entry.major}</p>
                    <p className="text-xs text-muted-foreground">
                      {[entry.location, entry.date].filter(Boolean).join(" — ")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.languages.length > 0 && (
            <div>
              <h3 className="mb-1.5 text-sm font-semibold">Idiomas</h3>
              <p className="text-sm text-muted-foreground">
                {result.languages.map((language) => `${language.title}: ${language.level}`).join("  ·  ")}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
