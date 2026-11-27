# SKILLS-Lenz

Catálogo de skills de Claude Code que aparece en **Lenz › Ajustes › Skills**. Lenz descarga
`index.json` de este repo con el botón **Actualizar catálogo**, y cada skill se instala en
`~/.claude/skills/` o en `.claude/skills/` del proyecto, según elija cada persona.

> Este repo es sensible: lo que se sube aquí son instrucciones (y a veces scripts) que Claude
> ejecuta en el equipo de quien instala la skill. Solo el dueño hace push a `main`.

## Agregar una skill

1. Crea `skills/<nombre>/`, con el nombre en minúsculas, números y guiones. Es el nombre que usa
   Claude Code y debe coincidir con el `name` del `SKILL.md`.
2. Pon dentro el `SKILL.md` (con `name` y `description` en el frontmatter) y sus otros archivos.
3. Agrega `lenz.json`. No se instala; es solo para el catálogo:

   ```json
   {
     "category": "git",
     "license": "MIT",
     "source": "https://github.com/autor/repo/tree/main/skills/nombre"
   }
   ```

   Categorías: `git`, `code`, `testing`, `docs`, `design`, `productivity`, `other`.

4. Haz commit y push a `main`. La GitHub Action valida la skill y actualiza `index.json` sola.
   Quien use Lenz la ve al darle **Actualizar catálogo**.

Para probar antes de subir: `node scripts/build-index.mjs` (necesita Node 18 o más nuevo).

## Reglas (las revisa el script)

- Solo archivos de texto UTF-8: nada de imágenes ni binarios.
- Hasta 256 KB por archivo, 1 MB y 50 archivos por skill.
- Nombres de archivo simples: letras, números, `.`, `_`, `-` y espacios. Sin enlaces simbólicos.

## Antes de subir una skill de la comunidad

- **Léela entera,** incluidos sus scripts.
- **Revisa la licencia.** Al subirla aquí la redistribuyes; tiene que permitirlo (MIT, Apache-2.0,
  CC-BY…). Si trae su archivo `LICENSE`, déjalo dentro de su carpeta y anota la fuente en
  `lenz.json`.

## Actualizar o quitar

- **Actualizar:** cambia sus archivos y haz push. A quien la tenga instalada le aparece "Hay una
  versión nueva", y decide si la actualiza. Nada se actualiza solo.
- **Quitar del catálogo:** borra su carpeta. Quien ya la instaló la conserva.
