export function parseQueryParams(searchStr: string): Record<string, string> {
  const query = searchStr.startsWith('?') ? searchStr.slice(1) : searchStr;
  if (!query) return {};

  const params: Record<string, string> = {};
  for (const [key, value] of new URLSearchParams(query)) {
    params[key] = value;
  }

  return params;
}
