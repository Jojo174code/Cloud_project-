const getApiBaseUrl = () => {
  const envBaseUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  return envBaseUrl && envBaseUrl.length > 0 ? envBaseUrl : 'http://localhost:4000';
};

export const api = async <T = any>(
  endpoint: string,
  {
    method = 'GET',
    body,
    token,
  }: { method?: string; body?: any; token?: string | null } = {}
): Promise<T> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const auth = token ?? (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
  if (auth) headers['Authorization'] = `Bearer ${auth}`;

  const url = `${getApiBaseUrl()}${endpoint}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    throw new Error(`Unable to reach LeasePilot backend at ${url}. Make sure the server is running on http://localhost:4000.`);
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `Request to ${url} failed with status ${res.status}.`);
  }
  return res.json() as Promise<T>;
};
