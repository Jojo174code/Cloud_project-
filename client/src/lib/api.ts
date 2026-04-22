export const api = async (
  endpoint: string,
  {
    method = 'GET',
    body,
    token,
  }: { method?: string; body?: any; token?: string | null } = {}
) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const auth = token ?? (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
  if (auth) headers['Authorization'] = `Bearer ${auth}`;

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'API error');
  }
  return res.json();
};
