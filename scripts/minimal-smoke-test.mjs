import fs from "fs";
import path from "path";

const repoRoot = process.cwd();

const requiredFiles = [
  "excalidraw-app/index.html",
  "excalidraw-app/index.tsx",
  "excalidraw-app/App.tsx",
  "packages/excalidraw/index.tsx",
];

const forbiddenTerms = [
  "collaboration",
  "collab",
  "socket",
  "firebase",
  "sentry",
  "analytics",
  "service worker",
  "pwa",
  "telemetry",
  "tracking",
];

const scanExtensions = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".json",
  ".css",
  ".scss",
  ".html",
  ".md",
]);

const ignoredDirs = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  "dev-dist",
]);

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const read = (relativePath) =>
  fs.readFileSync(path.join(repoRoot, relativePath), "utf8");

const exists = (relativePath) =>
  fs.existsSync(path.join(repoRoot, relativePath));

const walkFiles = (dir, files = []) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (ignoredDirs.has(entry.name)) {
        continue;
      }
      walkFiles(path.join(dir, entry.name), files);
      continue;
    }
    const filePath = path.join(dir, entry.name);
    if (scanExtensions.has(path.extname(entry.name))) {
      files.push(filePath);
    }
  }
  return files;
};

const checkEntryPoints = () => {
  for (const file of requiredFiles) {
    assert(exists(file), `Missing required file: ${file}`);
  }

  const indexHtml = read("excalidraw-app/index.html");
  assert(
    /id=["']root["']/.test(indexHtml),
    "index.html must contain a root element",
  );

  const indexTsx = read("excalidraw-app/index.tsx");
  assert(
    /createRoot\(/.test(indexTsx),
    "index.tsx must use createRoot",
  );
  assert(/<App\s*\/>/.test(indexTsx), "index.tsx must render <App />");

  const appTsx = read("excalidraw-app/App.tsx");
  assert(
    /<Excalidraw[\s>]/.test(appTsx),
    "App.tsx must render <Excalidraw />",
  );
};

const checkForbiddenTerms = () => {
  const files = walkFiles(repoRoot);
  const lowerTerms = forbiddenTerms.map((term) => term.toLowerCase());
  const hits = [];

  for (const filePath of files) {
    const contents = fs.readFileSync(filePath, "utf8").toLowerCase();
    for (const term of lowerTerms) {
      if (contents.includes(term)) {
        hits.push(`${path.relative(repoRoot, filePath)} -> ${term}`);
      }
    }
  }

  assert(
    hits.length === 0,
    `Forbidden terms found:\n${hits.join("\n")}`,
  );
};

try {
  checkEntryPoints();
  checkForbiddenTerms();
  process.stdout.write("Minimal smoke test passed.\n");
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
