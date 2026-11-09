import type {
  Activity,
  ActivityList,
  NewActivityInput,
  SessionPlan,
  StepPatch,
  Summary,
  UpdateActivityInput,
  User,
} from "./types";

const TOKEN_KEY = "op.token";

export const tokenStore = {
  get(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token: string | null) {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* sin almacenamiento: la sesión dura solo mientras la pestaña esté abierta */
    }
  },
};

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details: { field: string; message: string }[] = [],
  ) {
    super(message);
  }
}

// Se avisa a la app cuando el token ya no sirve (vencido o cuenta borrada) para volver al login.
let onUnauthorized: () => void = () => {};
export const setUnauthorizedHandler = (fn: () => void) => {
  onUnauthorized = fn;
};

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  let res: Response;
  try {
    res = await fetch(`/api${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new ApiError(0, "No se pudo conectar con el servidor. ¿Está corriendo el back?");
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = data?.error;
    // Un 401 con token guardado es sesión vencida; sin token es un login fallido y se muestra tal cual.
    if (res.status === 401 && token) onUnauthorized();
    throw new ApiError(res.status, err?.message ?? "Error inesperado", err?.details ?? []);
  }
  return data as T;
}

export interface ListFilters {
  course?: string;
  status?: string;
  urgency?: string;
  limit?: number;
  offset?: number;
}

const qs = (params: Record<string, string | number | undefined>) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : "";
};

export const api = {
  register: (input: { name: string; email: string; password: string }) =>
    request<{ user: User }>("POST", "/auth/register", input),
  login: (input: { email: string; password: string }) =>
    request<{ token: string; user: User }>("POST", "/auth/login", input),
  me: () => request<{ user: User }>("GET", "/auth/me"),
  users: () => request<{ users: User[]; total: number }>("GET", "/users"),

  listActivities: (f: ListFilters = {}) => request<ActivityList>("GET", `/activities${qs({ ...f })}`),
  getActivity: (id: string) => request<{ activity: Activity }>("GET", `/activities/${id}`),
  createActivity: (input: NewActivityInput) => request<{ activity: Activity }>("POST", "/activities", input),
  updateActivity: (id: string, input: UpdateActivityInput) =>
    request<{ activity: Activity }>("PATCH", `/activities/${id}`, input),
  deleteActivity: (id: string) => request<null>("DELETE", `/activities/${id}`),

  setStep: (activityId: string, stepId: string, done: boolean) =>
    request<{ activity: Activity }>("PATCH", `/activities/${activityId}/steps/${stepId}`, { done }),
  updateStep: (activityId: string, stepId: string, patch: StepPatch) =>
    request<{ activity: Activity }>("PATCH", `/activities/${activityId}/steps/${stepId}`, patch),
  addStep: (activityId: string, step: { text: string; estimateMin?: number }) =>
    request<{ activity: Activity }>("POST", `/activities/${activityId}/steps`, step),
  deleteStep: (activityId: string, stepId: string) =>
    request<{ activity: Activity }>("DELETE", `/activities/${activityId}/steps/${stepId}`),

  plan: (minutes: number) => request<SessionPlan>("GET", `/plan${qs({ minutes })}`),
  summary: () => request<Summary>("GET", "/summary"),
};
