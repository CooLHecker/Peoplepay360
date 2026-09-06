const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";

interface RequestOptions extends RequestInit {
  auth?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const accessToken = localStorage.getItem("peoplepay_access_token");
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options.headers
    },
    ...options
  });

  if (!res.ok) {
    // FastAPI error responses are usually {"detail": "..."}, but 422
    // validation errors return {"detail": [{loc, msg, type}, ...]}
    // instead — handle both shapes so the real reason surfaces.
    let detail: string | undefined;
    try {
      const body = await res.clone().json();
      if (body && typeof body.detail === "string") {
        detail = body.detail;
      } else if (body && Array.isArray(body.detail)) {
        detail = body.detail
          .map((item: { loc?: unknown[]; msg?: string }) => {
            const field = Array.isArray(item.loc) ? item.loc.filter((part) => part !== "body").join(".") : undefined;
            return field ? `${field}: ${item.msg ?? "invalid value"}` : item.msg;
          })
          .filter(Boolean)
          .join("; ");
      }
    } catch {
      /* not JSON, fall back to status text below */
    }
    throw new Error(detail || `Request failed: ${res.status} ${res.statusText}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" })
};

// For endpoints that return a file (reports, exports) rather than JSON.
// Fetches the file as a blob with the same auth header as apiClient,
// then triggers a normal browser download without navigating away.
export async function downloadFile(path: string, filename: string): Promise<void> {
  const accessToken = localStorage.getItem("peoplepay_access_token");
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {}
  });

  if (!res.ok) {
    let detail: string | undefined;
    try {
      const body = await res.clone().json();
      if (body && typeof body.detail === "string") detail = body.detail;
    } catch {
      /* not JSON, fall back to status text below */
    }
    throw new Error(detail || `Request failed: ${res.status} ${res.statusText}`);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function getApiOr<T>(path: string, fallback: T): Promise<T> {
  try {
    const result = await apiClient.get<T>(path);
    if (result && typeof result === "object" && "status" in result && (result as { status?: string }).status === "not_implemented") return fallback;
    return result;
  } catch {
    return fallback;
  }
}
