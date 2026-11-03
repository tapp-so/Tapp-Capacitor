import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.env.CAPACITOR_ROOT_DIR || process.cwd();
const prefix = '[ensure-jitpack]';
const warn = (message) => console.warn(`${prefix} ${message}`);

// Tokenize enough Groovy to find balanced blocks without counting braces or
// repository names inside comments and quoted strings as Gradle structure.
function tokenize(source) {
  const pattern =
    /\/\/[^\r\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[A-Za-z_]\w*|[{}]/g;
  return [...source.matchAll(pattern)]
    .filter(([value]) => !value.startsWith('//') && !value.startsWith('/*'))
    .map((match) => ({ value: match[0], index: match.index }));
}

function childBlock(tokens, from, to, name) {
  let depth = 0;
  for (let i = from; i < to; i++) {
    const value = tokens[i].value;
    if (depth === 0 && value === name && tokens[i + 1]?.value === '{') {
      let balance = 1;
      for (let j = i + 2; j < to; j++) {
        if (tokens[j].value === '{') balance++;
        if (tokens[j].value === '}') balance--;
        if (balance === 0) return { open: i + 1, close: j };
      }
      return undefined;
    }
    if (value === '{') depth++;
    if (value === '}') depth--;
  }
  return undefined;
}

function ensureJitpack() {
  const path = resolve(root, 'android/build.gradle');
  try {
    const source = readFileSync(path, 'utf8');
    const tokens = tokenize(source);
    const projects = childBlock(tokens, 0, tokens.length, 'allprojects');
    const repositories =
      projects && childBlock(tokens, projects.open + 1, projects.close, 'repositories');
    if (!repositories) {
      warn(`${path}: allprojects { repositories { ... } } block missing; skipped.`);
      return;
    }

    const repositoryTokens = tokens.slice(repositories.open + 1, repositories.close);
    if (repositoryTokens.some(({ value }) => /^['"]https:\/\/jitpack\.io\/?['"]$/.test(value))) {
      console.log(`${prefix} JitPack already present in allprojects.repositories; unchanged.`);
      return;
    }

    const openIndex = tokens[repositories.open].index;
    const closeIndex = tokens[repositories.close].index;
    const block = source.slice(openIndex + 1, closeIndex);
    const newline = source.includes('\r\n') ? '\r\n' : '\n';
    const blockLine = source.slice(source.lastIndexOf('\n', openIndex) + 1, openIndex);
    const parentIndent = blockLine.match(/^\s*/)?.[0] ?? '';
    const indent = block.match(/\r?\n([\t ]+)\S/)?.[1] ?? `${parentIndent}    `;
    const central = repositoryTokens.find(
      ({ value, index }) =>
        value === 'mavenCentral' && /^mavenCentral\s*\(\s*\)/.test(source.slice(index)),
    );
    const centralCall =
      central && source.slice(central.index).match(/^mavenCentral\s*\(\s*\)/)?.[0];
    const insertion = central && centralCall ? central.index + centralCall.length : openIndex + 1;
    let addition = `${newline}${indent}maven { url 'https://jitpack.io' }`;
    // Keep existing inline content (or a closing brace) on a separate line.
    if (!/^[\t ]*\r?\n/.test(source.slice(insertion))) addition += `${newline}${parentIndent}`;
    writeFileSync(path, source.slice(0, insertion) + addition + source.slice(insertion));
    console.log(`${prefix} Added JitPack to ${path}${central ? ' after mavenCentral().' : '.'}`);
  } catch (error) {
    warn(`${path}: ${error.message}; skipped. Sync can continue.`);
  }
}

function checkMinSdk() {
  const path = resolve(root, 'android/variables.gradle');
  try {
    const source = readFileSync(path, 'utf8');
    const tokens = tokenize(source);
    const variable = tokens.find(({ value }) => value === 'minSdkVersion');
    const match = variable && source.slice(variable.index).match(/^minSdkVersion\s*=\s*(\d+)\b/);
    if (match && Number(match[1]) < 24) {
      warn(
        `${path}: minSdkVersion is ${match[1]}; Tapp requires 24 or higher. Update it manually.`,
      );
    }
  } catch (error) {
    warn(`${path}: ${error.message}; minSdkVersion check skipped.`);
  }
}

ensureJitpack();
checkMinSdk();
