---
name: commits-en-espanol
description: Escribe mensajes de commit en español con Conventional Commits (feat, fix, chore…), en una sola línea corta. Úsala cuando vayas a hacer un commit o te pidan un mensaje de commit.
---

# Commits en español

Al escribir un mensaje de commit:

1. Mira los cambios preparados (`git diff --staged`); si no hay, los del árbol (`git diff`).
2. Elige el tipo de Conventional Commits:
   - `feat`: algo nuevo para quien usa el programa.
   - `fix`: corrige un error.
   - `refactor`: cambia el código sin cambiar lo que hace.
   - `docs`, `test`, `chore`, `style`, `perf`, `build`, `ci` según corresponda.
3. Escribe **una sola línea** en español, en minúscula después de los dos puntos, sin punto
   final y de menos de 72 caracteres: `tipo: qué cambia`. Ejemplo: `feat: cerrar pestañas con
   clic medio`.
4. Describe qué cambia para la persona, no cómo está hecho por dentro.
5. Si los cambios son de cosas distintas, propón separarlos en varios commits.

No agregues cuerpo ni listas salvo que te lo pidan.
