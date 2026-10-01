import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const injectedUtilsPath = path.join(
  projectRoot,
  'node_modules',
  'whatsapp-web.js',
  'src',
  'util',
  'Injected',
  'Utils.js',
);

if (!fs.existsSync(injectedUtilsPath)) {
  console.warn('[patch-whatsapp-web-media] whatsapp-web.js source not found; skipping patch.');
  process.exit(0);
}

const patchLine = '        delete message.__x_id;';
let source = fs.readFileSync(injectedUtilsPath, 'utf8');

if (source.includes(patchLine)) {
  console.log('[patch-whatsapp-web-media] Media ID collision patch already applied.');
  process.exit(0);
}

const insertionPoint = "        // Bot's won't reply if canonicalUrl is set (linking)";
if (!source.includes(insertionPoint)) {
  console.warn(
    '[patch-whatsapp-web-media] whatsapp-web.js source layout changed; patch was not applied.',
  );
  process.exit(0);
}

source = source.replace(
  insertionPoint,
  `${patchLine}\n\n${insertionPoint}`,
);
fs.writeFileSync(injectedUtilsPath, source);
console.log('[patch-whatsapp-web-media] Applied media ID collision patch.');
