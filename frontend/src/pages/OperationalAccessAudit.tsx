import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import UserActivityHeatmap from "../components/UserActivityHeatmap";

const API = "/api/v1/admin/access-audit";

interface AccessAuditEntry {
  id?: string;
  created_at?: string;
  actor?: string;
  action?: string;
  role?: string;
  target?: string;
}

interface AccessAuditMember {
  id?: string;
  member?: string;
  address?: string;
  role?: string;
  assigned_at?: string;
  assigned_by?: string;
}

interface AccessAuditSession {
  id?: string;
  user?: string;
  user_id?: string;
  status?: string;
  created_at?: string;
  expires_at?: string;
}

function StatsBar() {
  const { data } = useQuery({
    queryKey: ["access-audit-stats"],
    queryFn: () => fetch(`${API}/stats`).then((r) => r.json()),
    refetchInterval: 60_000,
  });

  const stats = [
    { label: "Total Events", value: data?.total ?? "—" },
    { label: "Top Role", value: data?.byRole?.[0]?.role ?? "—" },
    { label: "Top Action", value: data?.byAction?.[0]?.action ?? "—" },
    { label: "Roles Tracked", value: data?.byRole?.length ?? "—" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 mb-6">
      {stats.map((s) => (
        <div key={s.label} className="rounded-lg border bg-card p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">{s.label}</p>
          <p className="mt-1 text-2xl font-semibold">{s.value}</p>
        </div>
      ))}
    </div>
  );
}

function riskBadge(role?: string) {
  if (!role) return null;
  const map: Record<string, string> = {
    SuperAdmin: "bg-red-100 text-red-800",
    AssetManager: "bg-orange-100 text-orange-800",
    Observer: "bg-blue-100 text-blue-800",
  };
  const cls = map[role] ?? "bg-gray-100 text-gray-700";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {role}
    </span>
  );
}

function AccessChangesTab() {
  const [page, setPage] = useState(1);
  const limit = 50;

  const { data, isLoading } = useQuery({
    queryKey: ["access-audit-entries", page],
    queryFn: () =>
      fetch(`${API}/entries?page=${page}&limit=${limit}`).then((r) => r.json()),
    placeholderData: (prev) => prev,
  });

  const entries: AccessAuditEntry[] = data?.entries ?? [];
  const total: number = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2">Time</th>
              <th className="px-4 py-2">Actor</th>
              <th className="px-4 py-2">Action</th>
              <th className="px-4 py-2">Role</th>
              <th className="px-4 py-2">Target</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && entries.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                  No entries found.
                </td>
              </tr>
            )}
            {entries.map((e, i) => (
              <tr key={e.id ?? i} className="border-t hover:bg-muted/20">
                <td className="px-4 py-2 whitespace-nowrap text-muted-foreground">
                  {e.created_at ? new Date(e.created_at).toLocaleString() : "—"}
                </td>
                <td className="px-4 py-2">{e.actor ?? "—"}</td>
                <td className="px-4 py-2 font-mono text-xs">{e.action ?? "—"}</td>
                <td className="px-4 py-2">{riskBadge(e.role)}</td>
                <td className="px-4 py-2 text-muted-foreground">{e.target ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {page} of {totalPages} ({total} total)
          </span>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded border px-3 py-1 disabled:opacity-40 hover:bg-muted"
            >
              Previous
            </button>
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded border px-3 py-1 disabled:opacity-40 hover:bg-muted"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function RolesTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["access-audit-roles"],
    queryFn: () => fetch(`${API}/roles`).then((r) => r.json()),
  });

  const members: AccessAuditMember[] = data?.members ?? [];

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-2">Member</th>
            <th className="px-4 py-2">Role</th>
            <th className="px-4 py-2">Assigned At</th>
            <th className="px-4 py-2">Assigned By</th>
          </tr>
        </thead>
        <tbody>
          {isLoading && (
            <tr>
              <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                Loading…
              </td>
            </tr>
          )}
          {!isLoading && members.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                No role assignments found.
              </td>
            </tr>
          )}
          {members.map((m, i) => (
            <tr key={m.id ?? i} className="border-t hover:bg-muted/20">
              <td className="px-4 py-2">{m.member ?? m.address ?? "—"}</td>
              <td className="px-4 py-2">{riskBadge(m.role)}</td>
              <td className="px-4 py-2 text-muted-foreground">
                {m.assigned_at ? new Date(m.assigned_at).toLocaleString() : "—"}
              </td>
              <td className="px-4 py-2 text-muted-foreground">{m.assigned_by ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SessionsTab() {
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "expired" | "revoked">("all");

  const { data, isLoading } = useQuery({
    queryKey: ["access-audit-sessions", statusFilter],
    queryFn: () => fetch(`${API}/sessions?status=${statusFilter}`).then((r) => r.json()),
  });

  const sessions: AccessAuditSession[] = data?.sessions ?? [];

  return (
    <div>
      <div className="mb-3 flex gap-2">
        {(["all", "active", "expired", "revoked"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              statusFilter === s
                ? "bg-primary text-primary-foreground"
                : "border hover:bg-muted"
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2">Session ID</th>
              <th className="px-4 py-2">User</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Created</th>
              <th className="px-4 py-2">Expires</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && sessions.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                  No sessions found.
                </td>
              </tr>
            )}
            {sessions.map((s, i) => (
              <tr key={s.id ?? i} className="border-t hover:bg-muted/20">
                <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                  {String(s.id ?? "—").slice(0, 8)}…
                </td>
                <td className="px-4 py-2">{s.user ?? s.user_id ?? "—"}</td>
                <td className="px-4 py-2">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      s.status === "active"
                        ? "bg-green-100 text-green-800"
                        : s.status === "revoked"
                        ? "bg-red-100 text-red-800"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {s.status ?? "unknown"}
                  </span>
                </td>
                <td className="px-4 py-2 text-muted-foreground">
                  {s.created_at ? new Date(s.created_at).toLocaleString() : "—"}
                </td>
                <td className="px-4 py-2 text-muted-foreground">
                  {s.expires_at ? new Date(s.expires_at).toLocaleString() : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const TABS = ["Access Changes", "Roles", "Sessions", "Activity Heatmap"] as const;
type Tab = (typeof TABS)[number];

export default function OperationalAccessAudit() {
  const [tab, setTab] = useState<Tab>("Access Changes");

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Operational Access Audit</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Admin console for reviewing access changes, role assignments, and active sessions.
        </p>
      </div>

      <StatsBar />

      <div className="mb-4 flex gap-1 border-b">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              tab === t
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Access Changes" && <AccessChangesTab />}
      {tab === "Roles" && <RolesTab />}
      {tab === "Sessions" && <SessionsTab />}
      {tab === "Activity Heatmap" && <UserActivityHeatmap />}
    </div>
  );
}
