import * as Fs from "node:fs";
import * as Path from "node:path";
import { execSync } from "node:child_process";

const TARGET = "target/build";

function shell(cmd) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: "inherit" });
}

function rmrf(dir) {
  Fs.rmSync(dir, { recursive: true, force: true });
}

function mkdirp(dir) {
  Fs.mkdirSync(dir, { recursive: true });
}

function cp(src, dest) {
  mkdirp(Path.dirname(dest));
  Fs.copyFileSync(src, dest);
}

// --- Clean ---
function clean() {
  rmrf("target");
}

// --- Remove MIT Notices from dist ---
function removeNotices(dir) {
  function escape(content) {
    return content
      .split("")
      .map((c) => `\\${c}`)
      .join("");
  }
  function removeNotice(content) {
    const open = escape(
      "/*--------------------------------------------------------------------------",
    );
    const close = escape(
      "---------------------------------------------------------------------------*/",
    );
    const criteria = "Permission is hereby granted, free of charge";
    const pattern = new RegExp(`${open}[\\s\\S]*?${close}`, "gm");
    while (true) {
      const match = pattern.exec(content);
      if (match === null) return content.trimStart();
      if (!match[0].includes(criteria)) continue;
      content = content.replace(match[0], "");
    }
  }
  function processFile(sourcePath) {
    const sourceContent = Fs.readFileSync(sourcePath, "utf-8");
    const targetContent = removeNotice(sourceContent);
    Fs.writeFileSync(sourcePath, targetContent);
  }
  function walk(sourcePath) {
    const stat = Fs.statSync(sourcePath);
    if (stat.isDirectory()) {
      for (const entry of Fs.readdirSync(sourcePath)) {
        walk(Path.join(sourcePath, entry));
      }
    } else if (stat.isFile()) {
      processFile(sourcePath);
    }
  }
  walk(dir);
}

// --- ESM Specifier Rewrite ---
function convertToEsm(dir) {
  function shouldSkipSpecifier(captured) {
    const specifier = captured.slice(1, captured.length - 1);
    return (
      specifier.includes(".mjs") ||
      specifier.startsWith("@alkdev/typebox") ||
      specifier.startsWith("valibot") ||
      specifier.startsWith("zod")
    );
  }
  function replaceInlineImportSpecifiers(content) {
    const pattern = /import\((.*?)\)/g;
    while (true) {
      const match = pattern.exec(content);
      if (match === null) return content;
      const captured = match[1];
      if (shouldSkipSpecifier(captured)) continue;
      const specifier = captured.slice(1, captured.length - 1);
      content = content.replace(captured, `"${specifier}.mjs"`);
    }
  }
  function replaceExportSpecifiers(content) {
    const pattern = /(export|import)(.*) from ('(.*)');/g;
    while (true) {
      const match = pattern.exec(content);
      if (match === null) return content;
      const captured = match[3];
      if (shouldSkipSpecifier(captured)) continue;
      const specifier = captured.slice(1, captured.length - 1);
      content = content.replace(captured, `'${specifier}.mjs'`);
    }
  }
  function replaceSpecifiers(content) {
    return replaceInlineImportSpecifiers(replaceExportSpecifiers(content));
  }
  function newExtension(ext) {
    return ext === ".js" ? ".mjs" : ext === ".ts" ? ".mts" : ext;
  }
  function processFile(sourcePath) {
    const ext = Path.extname(sourcePath);
    if (![".js", ".ts"].includes(ext)) return;
    const dirname = Path.dirname(sourcePath);
    const basename = Path.basename(sourcePath, ext);
    const newExt = newExtension(ext);
    const sourceContent = Fs.readFileSync(sourcePath, "utf-8");
    const targetContent = replaceSpecifiers(sourceContent);
    const targetPath = Path.join(dirname, `${basename}${newExt}`);
    Fs.writeFileSync(sourcePath, targetContent);
    Fs.renameSync(sourcePath, targetPath);
  }
  function walk(sourcePath) {
    const stat = Fs.statSync(sourcePath);
    if (stat.isDirectory()) {
      for (const entry of Fs.readdirSync(sourcePath)) {
        walk(Path.join(sourcePath, entry));
      }
    } else if (stat.isFile()) {
      processFile(sourcePath);
    }
  }
  walk(dir);
}

// --- Build CJS ---
function buildCjs() {
  console.log("building...cjs");
  const target = `${TARGET}/build/cjs`;
  shell(
    `tsc -p ./src/tsconfig.json --outDir ${target} --target ES2020 --module Node16 --moduleResolution Node16 --declaration`,
  );
  removeNotices(target);
}

// --- Build ESM ---
function buildEsm() {
  console.log("building...esm");
  const target = `${TARGET}/build/esm`;
  shell(
    `tsc -p ./src/tsconfig.json --outDir ${target} --target ES2020 --module ESNext --moduleResolution Bundler --declaration`,
  );
  convertToEsm(target);
  removeNotices(target);
}

// --- Build package.json ---
function buildPackageJson() {
  console.log("building...package.json");
  const rootPkg = JSON.parse(Fs.readFileSync("package.json", "utf-8"));
  const pkg = {
    name: rootPkg.name,
    version: rootPkg.version,
    description: rootPkg.description,
    keywords: rootPkg.keywords,
    author: rootPkg.author,
    license: rootPkg.license,
    repository: rootPkg.repository,
    scripts: { test: "echo test" },
    types: "./build/cjs/index.d.ts",
    main: "./build/cjs/index.js",
    module: "./build/esm/index.mjs",
    "esm.sh": { bundle: false },
    exports: {
      ".": {
        require: {
          types: "./build/cjs/index.d.ts",
          default: "./build/cjs/index.js",
        },
        import: {
          types: "./build/esm/index.d.mts",
          default: "./build/esm/index.mjs",
        },
      },
    },
    peerDependencies: rootPkg.peerDependencies,
  };
  Fs.writeFileSync(`${TARGET}/package.json`, JSON.stringify(pkg, null, 2));
}

// --- Test ---
function test(filter = "") {
  shell(
    `tsc -p ./test/tsconfig.json --outDir target/test --target ES2020 --module Node16 --moduleResolution Node16`,
  );
  shell(`mocha target/test/index.js -g "${filter}"`);
}

// --- Main ---
const command = process.argv[2] || "build";

if (command === "clean") {
  clean();
} else if (command === "test") {
  test(process.argv[3] || "");
} else if (command === "build") {
  test();
  clean();
  buildCjs();
  buildEsm();
  buildPackageJson();
  cp("readme.md", `${TARGET}/readme.md`);
  cp("license", `${TARGET}/license`);
  shell(`cd ${TARGET} && npm pack`);
  console.log("done!");
} else {
  console.error(`unknown command: ${command}`);
  process.exit(1);
}
