"use client";

import { Ban, Check, Copy, KeyRound, Loader2, MoreHorizontal, Plus, ShieldCheck, ShieldOff, ShieldQuestion, Trash2, UserPlus } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { bulkUsers, createUser, deleteUser, resetMfa, setAdmin, setBanned, setPassword, type Result } from "@/app/admin/user-actions";
import { type BulkAction, type Column, DataTable, type Sort } from "@/components/admin/data-table";
import { EmptyState, SearchInput } from "@/components/admin/shared";
import { OptionSelect } from "@/components/admin/option-select";
import { UserAvatar } from "@/components/admin/user-avatar";
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { formatDate } from "@/lib/format";
import type { UserRow } from "@/lib/admin/users";
import { cn } from "cn";

type Action =
  | { kind: "create" }
  | { kind: "password"; user: UserRow }
  | { kind: "confirm"; user: UserRow; what: "demote" | "mfa" | "block" | "delete" };

const FILTERS = [{ value: "all", label: "Everyone" }, { value: "admin", label: "Admins" }, { value: "blocked", label: "Blocked" }, { value: "no2fa", label: "Without 2-step" }];
const ago = (iso: string | null) => (iso ? formatDate(iso) : "Never");
const when = (iso: string | null) => (iso ? new Date(iso).getTime() : 0);
const USER_SORT: Sort = { id: "role", dir: "asc" };

const BULK: BulkAction[] = [
  { id: "unblock", label: "Unblock", icon: Check, run: (ids) => bulkUsers("unblock", ids) },
  { id: "block", label: "Block", icon: Ban, run: (ids) => bulkUsers("block", ids),
    confirm: { title: (n) => `Block ${n} ${n === 1 ? "user" : "users"}?`, body: "They can't sign in until you unblock them.", go: "Block" } },
  { id: "admin", label: "Make admin", icon: ShieldCheck, run: (ids) => bulkUsers("admin", ids) },
  { id: "unadmin", label: "Remove admin access", icon: ShieldOff, run: (ids) => bulkUsers("unadmin", ids),
    confirm: { title: (n) => `Remove admin access from ${n} ${n === 1 ? "user" : "users"}?`, body: "They stay users but can no longer change anything on the site.", go: "Remove access" } },
  { id: "delete", label: "Delete", icon: Trash2, destructive: true, run: (ids) => bulkUsers("delete", ids),
    confirm: { title: (n) => `Delete ${n} ${n === 1 ? "user" : "users"}?`, body: "Their accounts are removed for good. This can't be undone. Your own account and the last admin are skipped.", go: "Delete" } },
];

/** A strong random password that passes the rules (12+ characters, upper, lower, digit, symbol). */
function generatePassword() {
  const sets = ["abcdefghijkmnopqrstuvwxyz", "ABCDEFGHJKLMNPQRSTUVWXYZ", "23456789", "!@#$%^&*-_=+"];
  const all = sets.join("");
  const pick = (chars: string) => chars[crypto.getRandomValues(new Uint32Array(1))[0] % chars.length];
  const out = [...sets.map(pick), ...Array.from({ length: 14 }, () => pick(all))];
  for (let i = out.length - 1; i > 0; i--) { const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1); [out[i], out[j]] = [out[j], out[i]]; }
  return out.join("");
}

const copy = (text: string) => navigator.clipboard?.writeText(text).catch(() => {});

export function UsersManager({ users, meId }: { users: UserRow[]; meId: string }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [action, setAction] = useState<Action | null>(null);
  const [notice, setNotice] = useState("");

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return users.filter((u) =>
      (filter === "all" || (filter === "admin" && u.is_admin) || (filter === "blocked" && u.banned) || (filter === "no2fa" && !u.mfa)) &&
      (!needle || u.email.toLowerCase().includes(needle) || u.name.toLowerCase().includes(needle)));
  }, [users, q, filter]);

  const done = (r: Result) => { if (r.ok) { setAction(null); setNotice(r.message ?? "Done."); } return r; };

  const menu = (u: UserRow) => (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label={`Actions for ${u.email}`} />}><MoreHorizontal /></DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        {u.is_admin
          ? <DropdownMenuItem disabled={u.id === meId} onClick={() => setAction({ kind: "confirm", user: u, what: "demote" })}><ShieldOff /> Remove admin access</DropdownMenuItem>
          : <DropdownMenuItem onClick={() => void setAdmin(u.id, true).then((r) => setNotice(r.ok ? `${u.email} is now an admin.` : r.error))}><ShieldCheck /> Make admin</DropdownMenuItem>}
        <DropdownMenuItem onClick={() => setAction({ kind: "password", user: u })}><KeyRound /> Set a new password</DropdownMenuItem>
        <DropdownMenuItem disabled={!u.mfa} onClick={() => setAction({ kind: "confirm", user: u, what: "mfa" })}><ShieldQuestion /> Reset authenticator</DropdownMenuItem>
        <DropdownMenuSeparator />
        {u.banned
          ? <DropdownMenuItem onClick={() => void setBanned(u.id, false).then((r) => setNotice(r.ok ? `${u.email} can sign in again.` : r.error))}><Check /> Unblock</DropdownMenuItem>
          : <DropdownMenuItem disabled={u.id === meId} onClick={() => setAction({ kind: "confirm", user: u, what: "block" })}><Ban /> Block sign-in</DropdownMenuItem>}
        <DropdownMenuItem disabled={u.id === meId} className="text-destructive focus:text-destructive" onClick={() => setAction({ kind: "confirm", user: u, what: "delete" })}><Trash2 /> Delete user</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const badges = (u: UserRow) => (
    <span className="flex flex-wrap items-center gap-1.5">
      {u.is_admin && <Badge>Admin</Badge>}
      {u.id === meId && <Badge variant="secondary">You</Badge>}
      {u.banned && <Badge variant="destructive">Blocked</Badge>}
      <Badge variant="outline" className={cn("gap-1.5 font-normal", !u.mfa && u.is_admin && "border-amber-500/50 text-amber-700 dark:text-amber-400")}>
        <span aria-hidden className={cn("size-1.5 rounded-full", u.mfa ? "bg-emerald-500" : "bg-muted-foreground/50")} />{u.mfa ? "2-step on" : "No 2-step"}
      </Badge>
    </span>
  );

  const columns: Column<UserRow>[] = [
    { id: "user", header: "User", required: true, sort: (u) => u.email,
      cell: (u) => (
        <span className="flex items-center gap-3">
          <UserAvatar name={u.name} email={u.email} src={u.avatar} className="size-9" />
          <span className="min-w-0"><span className="block truncate font-medium">{u.name || u.email}</span>{u.name && <span className="block truncate text-xs text-muted-foreground">{u.email}</span>}</span>
          {u.id === meId && <Badge variant="secondary">You</Badge>}
        </span>
      ) },
    { id: "role", header: "Role", sort: (u) => (u.is_admin ? 0 : 1), cell: (u) => (u.is_admin ? <Badge>Admin</Badge> : <span className="text-muted-foreground">User</span>) },
    { id: "mfa", header: "Two-step", sort: (u) => (u.mfa ? 0 : 1),
      cell: (u) => (
        <Badge variant="outline" className={cn("gap-1.5 font-normal", !u.mfa && u.is_admin && "border-amber-500/50 text-amber-700 dark:text-amber-400")}>
          <span aria-hidden className={cn("size-1.5 rounded-full", u.mfa ? "bg-emerald-500" : "bg-muted-foreground/50")} />{u.mfa ? "On" : "Off"}
        </Badge>
      ) },
    { id: "status", header: "Status", sort: (u) => (u.banned ? 1 : 0), cell: (u) => (u.banned ? <Badge variant="destructive">Blocked</Badge> : <span className="text-muted-foreground">Active</span>) },
    { id: "last", header: "Last sign-in", className: "whitespace-nowrap", sort: (u) => when(u.last_sign_in_at), cell: (u) => ago(u.last_sign_in_at) },
    { id: "joined", header: "Joined", defaultHidden: true, className: "whitespace-nowrap", sort: (u) => when(u.created_at), cell: (u) => formatDate(u.created_at) },
  ];

  return (
    <div className="flex flex-col gap-4">
      {notice && <p role="status" className="rounded-xl bg-muted px-4 py-2.5 text-sm">{notice}</p>}
      <DataTable<UserRow>
        name="users"
        noun="user"
        rows={rows}
        getId={(u) => u.id}
        label={(u) => u.email}
        columns={columns}
        initialSort={USER_SORT}
        bulk={BULK}
        selectable={(u) => u.id !== meId}
        rowActions={menu}
        toolbar={
          <>
            <SearchInput label="Search users" placeholder="Search by name or email" value={q} onChange={setQ} />
            <OptionSelect label="Filter users" value={filter} onChange={setFilter} options={FILTERS} className="w-44" />
            <p role="status" className="text-sm tabular-nums text-muted-foreground">{rows.length} of {users.length}</p>
            <Button className="ml-auto sm:ml-0" onClick={() => setAction({ kind: "create" })}><UserPlus /> Add user</Button>
          </>
        }
        card={(u) => (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <UserAvatar name={u.name} email={u.email} src={u.avatar} className="size-10" />
            <div className="min-w-0 flex-1 basis-40">
              <p className="truncate font-medium">{u.name || u.email}</p>
              {u.name && <p className="truncate text-sm text-muted-foreground">{u.email}</p>}
              <p className="mt-0.5 text-xs text-muted-foreground">Last sign-in: {ago(u.last_sign_in_at)} · Joined {formatDate(u.created_at)}</p>
            </div>
            {menu(u)}
            <div className="basis-full">{badges(u)}</div>
          </div>
        )}
        empty={<EmptyState action={<Button variant="outline" size="sm" onClick={() => { setQ(""); setFilter("all"); }}>Clear filters</Button>}>No users match that.</EmptyState>}
      />

      <CreateDialog open={action?.kind === "create"} onClose={() => setAction(null)} onDone={done} />
      <PasswordDialog user={action?.kind === "password" ? action.user : null} onClose={() => setAction(null)} onDone={done} />
      <ConfirmDialog target={action?.kind === "confirm" ? action : null} onClose={() => setAction(null)} onDone={done} />
    </div>
  );
}

function PasswordField({ value, onChange, id }: { value: string; onChange: (v: string) => void; id: string }) {
  return (
    <div className="flex gap-2">
      <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder="At least 12 characters, mixed" autoComplete="new-password" spellCheck={false} className="font-mono" />
      <Button type="button" variant="outline" onClick={() => onChange(generatePassword())}>Generate</Button>
      <Button type="button" variant="outline" size="icon" aria-label="Copy password" disabled={!value} onClick={() => copy(value)}><Copy /></Button>
    </div>
  );
}

function CreateDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: (r: Result) => Result }) {
  const [email, setEmail] = useState(""); const [name, setName] = useState(""); const [pw, setPw] = useState(""); const [admin, setAdmin] = useState(false);
  const [error, setError] = useState(""); const [pending, start] = useTransition();
  const submit = (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    start(async () => {
      const r = onDone(await createUser({ email, password: pw, admin, name }));
      if (r.ok) { setEmail(""); setName(""); setPw(""); setAdmin(false); } else setError(r.error);
    });
  };
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full gap-0 sm:max-w-md">
        <SheetHeader><SheetTitle>Add a user</SheetTitle><SheetDescription>They can sign in straight away with this password. Admins set up their authenticator at the first sign-in.</SheetDescription></SheetHeader>
        <form onSubmit={submit} className="flex flex-col gap-4 px-4" noValidate>
          <div className="flex flex-col gap-1.5"><Label htmlFor="nu-email">Email</Label><Input id="nu-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" autoComplete="off" /></div>
          <div className="flex flex-col gap-1.5"><Label htmlFor="nu-name">Name (optional)</Label><Input id="nu-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Their name" /></div>
          <div className="flex flex-col gap-1.5"><Label htmlFor="nu-pw">Password</Label><PasswordField id="nu-pw" value={pw} onChange={setPw} /></div>
          <div className="flex items-center gap-3"><Switch id="nu-admin" checked={admin} onCheckedChange={setAdmin} /><Label htmlFor="nu-admin">Make them an admin</Label></div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <SheetFooter><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={pending}>{pending ? <Loader2 className="animate-spin" /> : <Plus />} Add user</Button></SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function PasswordDialog({ user, onClose, onDone }: { user: UserRow | null; onClose: () => void; onDone: (r: Result) => Result }) {
  const [pw, setPw] = useState(""); const [error, setError] = useState(""); const [pending, start] = useTransition();
  return (
    <Sheet open={user !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full gap-0 sm:max-w-md">
        <SheetHeader><SheetTitle>New password for {user?.email}</SheetTitle><SheetDescription>Copy it and pass it on safely. They can change it from their account page.</SheetDescription></SheetHeader>
        <form noValidate className="flex flex-col gap-4 px-4" onSubmit={(e) => { e.preventDefault(); setError(""); start(async () => { const r = onDone(await setPassword(user!.id, pw)); if (r.ok) setPw(""); else setError(r.error); }); }}>
          <div className="flex flex-col gap-1.5"><Label htmlFor="np-pw">Password</Label><PasswordField id="np-pw" value={pw} onChange={setPw} /></div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <SheetFooter><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={pending}>{pending && <Loader2 className="animate-spin" />} Change password</Button></SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

const COPY = {
  demote: { title: (e: string) => `Remove admin access from ${e}?`, body: "They stay a user but can no longer change anything on the site.", go: "Remove access" },
  mfa: { title: (e: string) => `Reset the authenticator of ${e}?`, body: "Their current authenticator stops working. They set up a new one at their next sign-in. Use this when they lose their phone.", go: "Reset authenticator" },
  block: { title: (e: string) => `Block ${e}?`, body: "They can't sign in until you unblock them.", go: "Block" },
  delete: { title: (e: string) => `Delete ${e}?`, body: "Their account is removed for good. This can't be undone.", go: "Delete user" },
} as const;

function ConfirmDialog({ target, onClose, onDone }: { target: Extract<Action, { kind: "confirm" }> | null; onClose: () => void; onDone: (r: Result) => Result }) {
  const [error, setError] = useState(""); const [pending, start] = useTransition();
  const copyText = target ? COPY[target.what] : null;
  const run = () => start(async () => {
    if (!target) return;
    setError("");
    const { user, what } = target;
    const r = await (what === "demote" ? setAdmin(user.id, false) : what === "mfa" ? resetMfa(user.id) : what === "block" ? setBanned(user.id, true) : deleteUser(user.id));
    if (r.ok) onDone({ ok: true, message: r.message ?? `${what === "delete" ? "Deleted" : "Done:"} ${user.email}.` }); else setError(r.error);
  });
  return (
    <AlertDialog open={target !== null} onOpenChange={(o) => { if (!o) { setError(""); onClose(); } }}>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>{copyText?.title(target!.user.email)}</AlertDialogTitle><AlertDialogDescription>{copyText?.body}</AlertDialogDescription></AlertDialogHeader>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button variant="destructive" disabled={pending} onClick={run}>{pending && <Loader2 className="animate-spin" />} {copyText?.go}</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
