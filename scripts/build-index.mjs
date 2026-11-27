#!/usr/bin/env node
// Arma `index.json`: el catálogo que Lenz descarga con "Actualizar catálogo".
// Valida cada skill y falla (código 1) si alguna no cumple las reglas del README.
//
//   node scripts/build-index.mjs           escribe index.json
//   node scripts/build-index.mjs --check   solo valida y avisa si index.json está desactualizado

import { createHash } from "node:crypto";
import { lstat, readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SKILLS_DIR = join(ROOT, "skills");
const INDEX = join(ROOT, "index.json");

/** Debe coincidir con lo que acepta Lenz (`apps/desktop/src/skills/`). */
const CATEGORIES = ["git", "code", "testing", "docs", "design", "productivity", "other"];
const VALID_ID = /^[a-z0-9][a-z0-9-]{0,63}$/;
/** Cada parte de una ruta: sin `..`, sin ocultos raros, sin caracteres que Windows no acepta. */
const VALID_PART = /^(?!\.\.?$)[A-Za-z0-9._ -]{1,100}$/;
const MAX_FILE = 256 * 1024;
const MAX_SKILL = 1024 * 1024;
const MAX_FILES = 50;
const META = "lenz.json";

const errors = [];
const fail = (where, message) => errors.push(`${where}: ${message}`);

const sha256 = (data) => createHash("sha256").update(data).digest("hex");

function frontmatter(text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!match) return {};
  const out = {};
  const lines = match[1].split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const field = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(lines[i]);
    if (!field) continue;
    let value = field[2].trim();
    if ([">", "|", ">-", "|-"].includes(value)) {
      const block = [];
      while (i + 1 < lines.length && /^\s+\S/.test(lines[i + 1])) block.push(lines[++i].trim());
      value = block.join(value.startsWith(">") ? " " : "\n");
    }
    out[field[1]] = value.replace(/^(["'])(.*)\1$/, "$2");
  }
  return out;
}

async function walk(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    const stat = await lstat(path);
    if (stat.isSymbolicLink()) throw new Error(`enlace simbólico no permitido: ${path}`);
    if (stat.isDirectory()) files.push(...(await walk(path)));
    else files.push(path);
  }
  return files;
}

async function buildSkill(id) {
  const dir = join(SKILLS_DIR, id);
  if (!VALID_ID.test(id)) {
    fail(id, "el nombre de la carpeta debe ir en minúsculas, números y guiones");
    return null;
  }
  let paths;
  try {
    paths = await walk(dir);
  } catch (error) {
    fail(id, error.message);
    return null;
  }

  let meta = {};
  const files = [];
  let total = 0;
  for (const path of paths.sort()) {
    const rel = relative(dir, path).split(sep);
    const shown = rel.join("/");
    if (!rel.every((part) => VALID_PART.test(part))) {
      fail(id, `nombre de archivo no permitido: ${shown}`);
      continue;
    }
    const bytes = await readFile(path);
    let text;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      fail(id, `${shown} no es texto UTF-8 (solo se aceptan archivos de texto)`);
      continue;
    }
    if (text.includes("\0")) fail(id, `${shown} parece binario`);
    if (bytes.length > MAX_FILE) fail(id, `${shown} pesa más de ${MAX_FILE / 1024} KB`);
    if (shown === META) {
      try {
        meta = JSON.parse(text);
      } catch {
        fail(id, `${META} no es JSON válido`);
      }
      continue; // lenz.json es del catálogo: no se instala.
    }
    total += bytes.length;
    files.push({ path: shown, size: bytes.length, sha256: sha256(bytes) });
  }

  const skillMd = files.find((f) => f.path === "SKILL.md");
  if (!skillMd) fail(id, "falta SKILL.md");
  if (files.length > MAX_FILES) fail(id, `tiene más de ${MAX_FILES} archivos`);
  if (total > MAX_SKILL) fail(id, `pesa más de ${MAX_SKILL / 1024} KB en total`);

  const front = skillMd ? frontmatter(await readFile(join(dir, "SKILL.md"), "utf8")) : {};
  if (front.name && front.name !== id) fail(id, `el name del SKILL.md (${front.name}) no coincide con la carpeta`);
  if (!front.description) fail(id, "el SKILL.md no tiene description");
  if (meta.category !== undefined && !CATEGORIES.includes(meta.category)) {
    fail(id, `categoría desconocida "${meta.category}" (usa: ${CATEGORIES.join(", ")})`);
  }
  if (!meta.license) console.warn(`aviso: ${id} no indica licencia en ${META}`);

  // Huella de la versión: cambia si cambia cualquier archivo que se instala.
  const hash = sha256(files.map((f) => `${f.path}\0${f.sha256}`).join("\n"));
  return {
    id,
    name: front.name || id,
    description: front.description ?? "",
    category: CATEGORIES.includes(meta.category) ? meta.category : "other",
    license: typeof meta.license === "string" && meta.license ? meta.license : null,
    source: typeof meta.source === "string" && meta.source ? meta.source : null,
    hash,
    files,
  };
}

// Sin skills todavía, la carpeta puede no existir (git no guarda carpetas vacías).
const ids = (await readdir(SKILLS_DIR, { withFileTypes: true }).catch(() => []))
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .sort();
const skills = (await Promise.all(ids.map(buildSkill))).filter(Boolean);

if (errors.length > 0) {
  console.error(`El catálogo tiene ${errors.length} error(es):\n- ${errors.join("\n- ")}`);
  process.exit(1);
}

// Sin fecha: así index.json solo cambia cuando cambia una skill.
const index = `${JSON.stringify({ version: 1, skills }, null, 2)}\n`;

if (process.argv.includes("--check")) {
  const current = await readFile(INDEX, "utf8").catch(() => "");
  if (current.replace(/\r\n/g, "\n") !== index) {
    console.error("index.json está desactualizado: corre node scripts/build-index.mjs");
    process.exit(1);
  }
  console.log(`index.json al día (${skills.length} skills).`);
} else {
  await writeFile(INDEX, index);
  console.log(`index.json listo: ${skills.length} skills.`);
}
