export interface HeaderWriter {
  setHeader(name: string, value: string): void;
}

export function applyStaticAssetCacheHeaders(
  res: HeaderWriter,
  filePath: string,
): void {
  if (filePath.toLowerCase().endsWith('.html')) {
    res.setHeader('Cache-Control', 'no-cache');
  }
}
