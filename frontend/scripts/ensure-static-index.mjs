import { copyFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const browserDist = join(process.cwd(), 'dist', 'frontend', 'browser');
const staticIndex = join(browserDist, 'index.html');
const csrIndex = join(browserDist, 'index.csr.html');

// ponytail: static CloudFront hosting expects index.html; Angular SSR emits index.csr.html.
if (!existsSync(staticIndex) && existsSync(csrIndex)) {
  copyFileSync(csrIndex, staticIndex);
}
