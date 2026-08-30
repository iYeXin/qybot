import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';

/** 项目根目录 */
export const ROOT_DIR = resolve(fileURLToPath(new URL('../../', import.meta.url)));

/** 插件目录 */
export const PLUGINS_DIR = join(ROOT_DIR, 'plugins');
