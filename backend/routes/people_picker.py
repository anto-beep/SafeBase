"""
People Picker — unified person/people resolver used by every register and
form across SafeBase (Risk Register, CAPA, Incidents, Inspections, Toolbox
Talks, SWMS, Lone Worker, Aged Care, etc.).

GET /api/users/picker?q=&include_me=true&limit=20
  Returns: [{user_id, worker_id, display_name, email, role, source_type}, ...]
  - "Me" pinned first when include_me=true.
  - Searches both `users` (account members with login) and `workers`
    (non-login WHS roster) within the caller's account.
  - Ranked by: exact name > email match > role match > recency.

Form values stored in any register should ALWAYS use the returned object
shape — never a plain string. The component on the frontend enforces this
contract; this module provides the data + rank.
"""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, Query


def register_people_picker_routes(api_router: APIRouter, *, db,
                                   get_current_user_dep, account_id_for_fn):

    def _score(row: dict, q: str) -> int:
        """Higher = better. Ranking per spec:
        exact name > email match > role match > recency boost.
        """
        if not q:
            return 0
        ql = q.lower().strip()
        name = (row.get("display_name") or "").lower()
        email = (row.get("email") or "").lower()
        role = (row.get("role") or "").lower()
        score = 0
        if name == ql:
            score += 1000
        elif name.startswith(ql):
            score += 600
        elif ql in name:
            score += 300
        if email == ql:
            score += 800
        elif ql in email:
            score += 200
        if ql in role:
            score += 100
        return score

    @api_router.get("/users/picker")
    async def picker(
        q: Optional[str] = Query(None),
        include_me: bool = Query(True),
        limit: int = Query(20, ge=1, le=100),
        current_user=Depends(get_current_user_dep),
    ):
        account_id = account_id_for_fn(current_user)
        ql = (q or "").strip().lower()

        # --- Pull account users (login accounts in this tenant) ---
        users_q = {"account_id": account_id}
        users = await db.users.find(users_q, {"_id": 0}).to_list(500)
        if not users:
            # Backwards-compat tenants without account_id: fall back to caller.
            users = await db.users.find(
                {"user_id": current_user.user_id}, {"_id": 0}
            ).to_list(50)

        # --- Pull workers (WHS roster, may not have login) ---
        worker_q = {"account_id": account_id}
        workers = await db.workers.find(worker_q, {"_id": 0}).to_list(1000)
        if not workers:
            workers = await db.workers.find(
                {"user_id": current_user.user_id}, {"_id": 0}
            ).to_list(1000)

        rows: list[dict] = []
        seen_emails: set[str] = set()

        # 1) Account users
        for u in users:
            email = (u.get("email") or "").lower()
            rows.append({
                "user_id": u.get("user_id"),
                "worker_id": None,
                "display_name": u.get("name") or email or "User",
                "email": u.get("email") or "",
                "role": u.get("role") or u.get("role_title") or "user",
                "source_type": "user",
                "_recency": u.get("last_login_at") or u.get("created_at") or "",
            })
            if email:
                seen_emails.add(email)

        # 2) Workers — dedupe by email if a user already exists with that email
        for w in workers:
            email = (w.get("email") or "").lower()
            if email and email in seen_emails:
                # Promote the user row to also carry worker_id
                for r in rows:
                    if r["email"].lower() == email and r["worker_id"] is None:
                        r["worker_id"] = w.get("worker_id")
                continue
            rows.append({
                "user_id": None,
                "worker_id": w.get("worker_id"),
                "display_name": w.get("name") or "Worker",
                "email": w.get("email") or "",
                "role": w.get("role") or w.get("trade") or "worker",
                "source_type": "worker",
                "_recency": w.get("created_at") or "",
            })

        # 3) Optional text filter
        if ql:
            rows = [
                r for r in rows
                if ql in (r["display_name"] or "").lower()
                or ql in (r["email"] or "").lower()
                or ql in (r["role"] or "").lower()
            ]

        # 4) Rank
        rows.sort(key=lambda r: (-_score(r, q or ""), -(len(r.get("_recency") or "")), r["display_name"]))

        # 5) "Me" pinned first
        results: list[dict] = []
        if include_me:
            me = {
                "user_id": getattr(current_user, "user_id", None),
                "worker_id": None,
                "display_name": f"Me ({getattr(current_user, 'name', '') or getattr(current_user, 'email', 'User')})",
                "email": getattr(current_user, "email", "") or "",
                "role": getattr(current_user, "role", "owner") or "owner",
                "source_type": "me",
            }
            # Strip me from the body to avoid duplicate listings
            rows = [r for r in rows if r.get("user_id") != me["user_id"]]
            results.append(me)

        # Trim _recency before returning
        for r in rows:
            r.pop("_recency", None)
        results.extend(rows[: max(0, limit - len(results))])
        return results
