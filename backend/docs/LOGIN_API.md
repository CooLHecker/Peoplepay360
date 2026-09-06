# Login API Contract

Base path: `/api/v1/auth`
(Full URL in dev: `http://localhost:8000/api/v1/auth/...`, matches `VITE_API_BASE_URL` in the frontend's `.env.example`.)

This covers only the **Login screen** slice of the backend. User
Management (creating users/assigning roles) is a separate, not-yet-built
screen — for now, create the first Admin via `python -m app.db.seed`
(see backend README).

---

## POST `/auth/login`

Request body:
```json
{
  "email": "employee@company.com",
  "password": "string"
}
```

Success — `200 OK`:
```json
{
  "user": {
    "id": 102,
    "email": "employee@company.com",
    "employee_id": 25,
    "full_name": "Aaron Mehta",
    "is_active": true
  },
  "roles": ["employee"],
  "access_token": "eyJ...",
  "refresh_token": "opaque-random-string",
  "token_type": "bearer",
  "expires_in": 3600
}
```

Failure — `401 Unauthorized` (used for *every* failure case — wrong
password, unknown email, inactive account, no roles assigned, no
employee link — so the client can never tell which one happened):
```json
{ "detail": "Unable to sign in. Please check your email and password." }
```

**Roles** is the fixed set: `employee`, `hr_manager`, `hr_payroll_user`,
`hr_payroll_admin`, `admin`. A user can hold more than one.

---

## POST `/auth/refresh`

Call this when `access_token` is close to/past `expires_in`, using the
`refresh_token` from login. Refresh tokens rotate — the old one is
invalidated the moment a new pair is issued, so always overwrite your
stored `refresh_token` with the new one in the response.

Request:
```json
{ "refresh_token": "opaque-random-string" }
```

Success — `200 OK`:
```json
{
  "access_token": "eyJ...",
  "refresh_token": "new-opaque-random-string",
  "token_type": "bearer",
  "expires_in": 3600
}
```

Failure — `401 Unauthorized`: refresh token invalid, revoked, or expired.
→ Treat this as "session gone": clear local auth state and send the user
back to `/login`.

---

## GET `/auth/me`

Requires header: `Authorization: Bearer <access_token>`

Success — `200 OK`:
```json
{
  "user": {
    "id": 102,
    "email": "employee@company.com",
    "employee_id": 25,
    "full_name": "Aaron Mehta",
    "is_active": true
  },
  "roles": ["employee"]
}
```

Use this on app boot (when online) to confirm a cached session is
still valid server-side, and to get the latest roles rather than
trusting whatever was cached from login.

Failure — `401 Unauthorized`: token missing/invalid/expired → same as above, treat as logged out.

---

## POST `/auth/logout`

Requires header: `Authorization: Bearer <access_token>`

Request body (either field optional):
```json
{
  "refresh_token": "opaque-random-string",
  "all_sessions": false
}
```
- Send `refresh_token` to revoke just this device's session.
- Send `all_sessions: true` to revoke every session for the user ("log out everywhere").

Success: `204 No Content`.

**Important:** this only invalidates the refresh token server-side. The
access token is a stateless JWT and stays cryptographically valid until
it naturally expires (≤ 1 hour by default) — the frontend must discard
both tokens from storage immediately on logout, and must do this even
while offline (login flow spec, section 22): clear local auth state
first, call `/auth/logout` in the background if online, don't block on it.

---

## Client-side session/offline notes (nothing to call for these)

- **Is my session still valid while offline?** Decode the stored
  `access_token` JWT locally and check its `exp` claim — no network
  call. If expired, require an online login (login flow spec, section 13).
- **Connectivity indicator** (`● Online` / `● Offline` on the login
  screen): purely a frontend concern (e.g. `navigator.onLine` / the
  existing `useOnlineStatus` hook) — the backend has no endpoint for this.
- Never trust a role shown in the UI as authorization — every other
  endpoint that needs a specific role enforces it server-side
  independently (see `require_roles` in `app/api/deps.py`), regardless
  of what the frontend displays or caches.
