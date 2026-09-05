/**
 * 生成 qybot.d.ts
 *
 * 以 PluginContext / MessageContext 为入口，把它们在框架内的全部依赖类型
 * （消息、事件、OpenAPI 客户端等）打包进一个独立的声明文件，供插件直接引用：
 *
 *   import type { PluginContext } from '../../qybot';
 *
 * 用法：npm run build:types
 */
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const TMP_DIR = join(ROOT, '.tmp-types');
const OUTPUT = join(ROOT, 'qybot.d.ts');

/** 入口类型 */
const ROOT_TYPES = ['PluginContext', 'MessageContext'];

/** 1. 用 tsc 生成声明文件 */
rmSync(TMP_DIR, { recursive: true, force: true });
execFileSync(process.execPath, [join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc'), '-p', 'tsconfig.types.json'], {
  stdio: 'inherit',
  cwd: ROOT,
});

/** 收集所有生成的 .d.ts 文件 */
function collect(dir) {
  const result = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) result.push(...collect(full));
    else if (entry.name.endsWith('.d.ts')) result.push(full);
  }
  return result;
}

const files = collect(TMP_DIR);

/** 名称 -> 声明信息 */
const declarations = new Map();

/**
 * 切分顶层声明：从 (export declare)? (class|interface|type|const|function) 开始，
 * 按括号深度找到结束位置（type 以分号结束，其余以匹配的 } 结束）
 */
function splitDeclarations(source) {
  const header =
    /^(?:export\s+)?(?:declare\s+)?(?:abstract\s+)?(class|interface|type|const|function|enum)\s+([A-Za-z_$][\w$]*)/gm;

  const out = [];
  let match;

  while ((match = header.exec(source)) !== null) {
    const kind = match[1];
    const name = match[2];
    const start = match.index;

    let depth = 0;
    let end = source.length;

    for (let i = start; i < source.length; i++) {
      const char = source[i];

      if (char === '{' || char === '(' || char === '[') depth++;
      else if (char === '}' || char === ')' || char === ']') {
        depth--;
        if (depth <= 0 && kind !== 'type') {
          end = i + 1;
          break;
        }
      } else if (char === ';' && depth === 0) {
        end = i + 1;
        break;
      }
    }

    out.push({ kind, name, text: source.slice(start, end).trim() });
    header.lastIndex = end;
  }

  return out;
}

/** 注册文件中的所有声明 */
for (const file of files) {
  const source = readFileSync(file, 'utf8');

  // 去掉 import / export {} 语句后再切分，避免误判
  const body = source
    .replace(/^\s*import\s+(?:type\s+)?[^;]+;\s*$/gm, '')
    .replace(/^\s*export\s*\{[^}]*\}\s*;\s*$/gm, '');

  for (const declaration of splitDeclarations(body)) {
    if (declarations.has(declaration.name)) continue;
    declarations.set(declaration.name, { ...declaration, file });
  }
}

/** 2. 从入口类型做依赖闭包 */
const ordered = [];
const visited = new Set();
const visiting = new Set();

function visit(name) {
  if (visited.has(name) || !declarations.has(name)) return;
  if (visiting.has(name)) return; // 循环引用：跳过，TS 允许前向引用
  visiting.add(name);

  const declaration = declarations.get(name);

  // 扫描声明体中引用到的其他类型名
  const referenced = new Set();
  const identifier = /[A-Za-z_$][\w$]*/g;
  let token;
  while ((token = identifier.exec(declaration.text)) !== null) {
    if (token[0] !== declaration.name && declarations.has(token[0])) referenced.add(token[0]);
  }

  for (const dependency of referenced) visit(dependency);

  visiting.delete(name);
  visited.add(name);
  ordered.push(declaration);
}

for (const name of ROOT_TYPES) visit(name);

/** 3. 输出 */
const header = `/**
 * QYbot 插件类型声明（自动生成，请勿手改）
 *
 * 由 scripts/build-types.mjs 从 src/ 生成，入口类型为 PluginContext 与 MessageContext。
 *
 * 使用：
 *   import type { PluginContext, MessageContext } from '../../qybot.js';
 *
 * 重新生成：npm run build:types
 */

/// <reference types="node" />

`;

const body = ordered
  .map((declaration) => {
    // 统一加 export，并去掉原有的 declare（.d.ts 中 export declare 亦可，这里做归一化）
    const text = declaration.text
      .replace(/^export\s+/, '')
      .replace(/^declare\s+/, '')
      .trim();
    return `export ${text}`;
  })
  .join('\n\n');

writeFileSync(OUTPUT, `${header}${body}\n`, 'utf8');

console.log(`已生成 ${OUTPUT}`);
console.log(`包含 ${ordered.length} 个类型声明`);
for (const declaration of ordered) console.log(`  - ${declaration.kind} ${declaration.name}`);
