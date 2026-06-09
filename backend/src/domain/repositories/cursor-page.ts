export interface CursorPage<T> {
  items: T[];
  nextCursor?: string;
}

export interface CursorPageOptions {
  limit: number;
  cursor?: string;
}
