const BASE_URL = import.meta.env.VITE_API_URL || '';

export interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
}

export class ApiClientError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, headers, ...restOptions } = options;
  const token = localStorage.getItem('centavo_auth_token');

  let url = `${BASE_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...restOptions,
    headers: {
      ...defaultHeaders,
      ...headers,
    },
  });

  if (!response.ok) {
    let errorPayload: unknown;
    try {
      errorPayload = await response.json();
    } catch {
      errorPayload = await response.text();
    }
    const message =
      typeof errorPayload === 'object' && errorPayload && 'message' in errorPayload
        ? String((errorPayload as { message: unknown }).message)
        : `Error en la solicitud: ${response.status} ${response.statusText}`;
    throw new ApiClientError(response.status, message, errorPayload);
  }

  return response.json() as Promise<T>;
}
