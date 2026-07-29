export function appendDefinedParam(searchParams: URLSearchParams, key: string, value: unknown) {
  if (value !== undefined && value !== null && value !== '') {
    searchParams.set(key, String(value));
  }
}

export async function parseApiError(response: Response): Promise<string> {
  try {
    const payload = await response.json();
    return payload?.error?.message ?? payload?.message ?? '';
  } catch {
    return '';
  }
}
