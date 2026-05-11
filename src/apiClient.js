// apiClient.js
// Camada única de comunicação com o backend.
// - Injeta `Authorization: Bearer <token>` automaticamente quando logado.
// - Trata 401 limpando o token e devolvendo uma exceção tipada.
// - Centraliza a base URL (hoje hardcoded; Onda 3 troca por variável de build).
//
// Expõe em window.api:
//   api.baseUrl                  → ex. "http://localhost:3000"
//   api.getToken() / setToken(t) / clearToken()
//   api.isLogged()               → boolean
//   api.fetch(path, opts)        → Promise<json>      (lança em 4xx/5xx)
//   api.fetchRaw(path, opts)     → Promise<Response>  (sem parse, sem throw)

(function () {
  const TOKEN_KEY = "jm_auth_token";
  const DEFAULT_TIMEOUT_MS = 10000;

  // Vite injeta `import.meta.env.VITE_API_BASE_URL` no build/dev a partir
  // do .env.development ou .env.production.
  const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY); }
    catch (_) { return null; }
  }

  function setToken(token) {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    } catch (_) { /* localStorage indisponível */ }
  }

  function clearToken() { setToken(null); }

  function isLogged() { return !!getToken(); }

  function buildHeaders(opts) {
    const headers = Object.assign({}, opts.headers || {});
    if (opts.body && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }
    const token = getToken();
    if (token && !headers["Authorization"]) {
      headers["Authorization"] = "Bearer " + token;
    }
    return headers;
  }

  // Fetch cru — devolve Response, não joga em status != 2xx.
  // Aplica timeout via AbortController.
  async function fetchRaw(path, opts) {
    opts = opts || {};
    const url = path.startsWith("http") ? path : (BASE_URL + path);
    const controller = new AbortController();
    const timeoutMs = opts.timeoutMs || DEFAULT_TIMEOUT_MS;
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method: opts.method || "GET",
        headers: buildHeaders(opts),
        body: opts.body,
        signal: controller.signal,
      });
      // Token expirado/inválido → limpa para forçar novo login na próxima ação.
      if (res.status === 401) {
        clearToken();
      }
      return res;
    } finally {
      clearTimeout(timer);
    }
  }

  // Versão com parse JSON + throw em status != 2xx.
  async function apiFetch(path, opts) {
    const res = await fetchRaw(path, opts);
    let body = null;
    try { body = await res.json(); } catch (_) { /* sem corpo / não-JSON */ }
    if (!res.ok) {
      const err = new Error(
        (body && body.error) ||
        `Falha na requisição (HTTP ${res.status})`
      );
      err.status = res.status;
      err.body = body;
      throw err;
    }
    return body;
  }

  window.api = {
    baseUrl: BASE_URL,
    getToken,
    setToken,
    clearToken,
    isLogged,
    fetch: apiFetch,
    fetchRaw,
  };
})();
