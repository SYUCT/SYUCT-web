import { access, copyFile, cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const packageRoot = path.join(projectRoot, "node_modules", "pdfjs-dist");
const targetRoot = path.join(projectRoot, "assets", "pdfjs");
const expectedVersion = "6.2.108";

async function exists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

async function firstExisting(candidates) {
  for (const candidate of candidates) {
    if (await exists(candidate)) return candidate;
  }
  return null;
}

async function requireSource(label, candidates) {
  const source = await firstExisting(candidates);
  if (!source) {
    throw new Error(`Cannot find ${label} in pdfjs-dist. Checked: ${candidates.join(", ")}`);
  }
  return source;
}

const packageInfo = JSON.parse(await readFile(path.join(packageRoot, "package.json"), "utf8"));
if (packageInfo.version !== expectedVersion) {
  throw new Error(`Expected pdfjs-dist ${expectedVersion}, but npm installed ${packageInfo.version}.`);
}

await rm(targetRoot, { recursive: true, force: true });
await mkdir(targetRoot, { recursive: true });

const pdfModule = await requireSource("pdf.min.mjs", [
  path.join(packageRoot, "legacy", "build", "pdf.min.mjs"),
  path.join(packageRoot, "build", "pdf.min.mjs"),
]);
const workerModule = await requireSource("pdf.worker.min.mjs", [
  path.join(packageRoot, "legacy", "build", "pdf.worker.min.mjs"),
  path.join(packageRoot, "build", "pdf.worker.min.mjs"),
]);

// Keep the original .mjs files, and also publish identical ES modules with a
// .js extension. Some static hosts/CDN configurations handle .js MIME types
// more consistently than .mjs. Both files remain JavaScript ES modules.
await copyFile(pdfModule, path.join(targetRoot, "pdf.min.mjs"));
await copyFile(workerModule, path.join(targetRoot, "pdf.worker.min.mjs"));
await copyFile(pdfModule, path.join(targetRoot, "pdf.min.js"));
await copyFile(workerModule, path.join(targetRoot, "pdf.worker.min.js"));

const resourceGroups = {
  cmaps: [path.join(packageRoot, "cmaps"), path.join(packageRoot, "web", "cmaps")],
  iccs: [path.join(packageRoot, "iccs"), path.join(packageRoot, "web", "iccs")],
  standard_fonts: [path.join(packageRoot, "standard_fonts"), path.join(packageRoot, "web", "standard_fonts")],
  wasm: [path.join(packageRoot, "wasm"), path.join(packageRoot, "web", "wasm")],
};

for (const [name, candidates] of Object.entries(resourceGroups)) {
  const source = await requireSource(name, candidates);
  await cp(source, path.join(targetRoot, name), { recursive: true });
}

const license = await requireSource("LICENSE", [path.join(packageRoot, "LICENSE")]);
await copyFile(license, path.join(targetRoot, "LICENSE"));

const manifest = {
  package: "pdfjs-dist",
  version: packageInfo.version,
  build: pdfModule.includes(`${path.sep}legacy${path.sep}`) ? "legacy" : "modern",
  runtimeFiles: [
    "pdf.min.mjs",
    "pdf.worker.min.mjs",
    "pdf.min.js",
    "pdf.worker.min.js",
    "cmaps/",
    "iccs/",
    "standard_fonts/",
    "wasm/",
  ],
};
await writeFile(path.join(targetRoot, "vendor-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
await writeFile(path.join(targetRoot, "VERSION.txt"), `${packageInfo.version}\n`, "utf8");

// Remove the obsolete image-sprite preview system from v1.3.
await rm(path.join(projectRoot, "assets", "pdf-previews"), { recursive: true, force: true });
await rm(path.join(projectRoot, "assets", "pdf-preview-manifest.json"), { force: true });

console.log(`Vendored pdfjs-dist ${packageInfo.version} into assets/pdfjs.`);
