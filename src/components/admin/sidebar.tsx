"use client";

import {
  Activity, BarChart3, Bug, ChevronDown, ChevronsUpDown, Database, ExternalLink, FolderKanban, FolderTree, Gauge, History, Images, Inbox, LayoutDashboard, LogOut, Menu, Newspaper, Settings, UserCog, UserRound, Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { signOut } from "@/app/admin/auth-actions";
import { UserAvatar } from "@/components/admin/user-avatar";
import { usePref } from "@/lib/admin/use-pref";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { owner } from "@/content/site";
import { cn } from "cn";

export type Me = { name: string; email: string; avatar: string | null };

type Item = { href: string; label: string; icon: typeof BarChart3; exact?: boolean; dataTools?: boolean };
const sections: { label?: string; icon?: typeof BarChart3; items: Item[] }[] = [
  { items: [{ href: "/admin", label: "Overview", icon: BarChart3, exact: true }, { href: "/admin/inbox", label: "Inbox", icon: Inbox }] },
  { label: "Content", icon: Newspaper, items: [
    { href: "/admin/posts", label: "Blog posts", icon: Newspaper },
    { href: "/admin/projects", label: "Projects", icon: FolderKanban },
    { href: "/admin/categories", label: "Categories", icon: FolderTree },
  ] },
  { label: "Site", icon: UserRound, items: [
    { href: "/admin/profile", label: "Profile", icon: UserRound },
    { href: "/admin/about", label: "About page", icon: UserCog },
  ] },
  { label: "Insights", icon: Gauge, items: [
    { href: "/admin/activity", label: "Activity", icon: Activity },
    { href: "/admin/performance", label: "Performance", icon: Gauge },
    { href: "/admin/errors", label: "Errors", icon: Bug },
  ] },
  // Raw Supabase: stored files and database tables. Hidden with the data tools.
  { label: "Supabase", icon: Database, items: [
    { href: "/admin/data", label: "Data", icon: Database, dataTools: true },
    { href: "/admin/media", label: "Media", icon: Images, dataTools: true },
  ] },
  { label: "Admin", icon: Settings, items: [
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/admin/history", label: "History", icon: History },
    { href: "/admin/settings", label: "Settings", icon: Settings },
  ] },
];

/** Logo tile, site name and a small "Admin" line, as in the reference. Spans only, so it can sit inside a heading. */
export function Brand({ className }: { className?: string }) {
  return (
    <span className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-lg bg-foreground text-background"><LayoutDashboard className="size-4" /></span>
      <span className="flex min-w-0 flex-col text-left leading-tight">
        <span className="truncate text-sm font-semibold">{owner.name}</span>
        <span className="truncate text-xs font-normal text-muted-foreground">Admin</span>
      </span>
    </span>
  );
}

const NONE: string[] = []; // a stable fallback for usePref

export function AdminNav({ dataTools, unread = 0, onNavigate }: { dataTools: boolean; unread?: number; onNavigate?: () => void }) {
  const path = usePathname();
  const [closed, setClosed] = usePref("admin-nav-closed", NONE);
  const toggle = (label: string) => setClosed(closed.includes(label) ? closed.filter((l) => l !== label) : [...closed, label]);
  return (
    <nav aria-label="Admin" className="flex flex-col gap-5">
      {sections.map((section, i) => ({ ...section, items: section.items.filter((it) => !it.dataTools || dataTools), i })).filter((s) => s.items.length).map((section) => {
        const shut = Boolean(section.label && closed.includes(section.label));
        const here = section.items.some((it) => (it.exact ? path === it.href : path.startsWith(it.href)));
        return (
        <div key={section.label ?? section.i} className="flex flex-col gap-0.5">
          {section.label && (
            <button type="button" onClick={() => toggle(section.label!)} aria-expanded={!shut} aria-controls={`nav-${section.label}`}
              className={cn("group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground", shut && here ? "text-foreground" : "text-foreground/80")}>
              {section.icon && <section.icon aria-hidden className="size-4 text-muted-foreground" />}
              {section.label}
              <ChevronDown aria-hidden className={cn("ml-auto size-4 text-muted-foreground transition-transform duration-200", shut && "-rotate-90")} />
            </button>
          )}
          {/* grid-rows 1fr -> 0fr animates to the content's own height, which a plain height transition cannot. */}
          <div id={section.label ? `nav-${section.label}` : undefined} inert={shut || undefined}
            className={cn("grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none", shut ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100")}>
            <div className={cn("flex min-h-0 flex-col gap-0.5 overflow-hidden", section.label && "ml-[1.15rem] border-l border-border pl-2")}>
              {section.items.map(({ href, label, icon: Icon, exact }) => {
                const active = exact ? path === href : path.startsWith(href);
                return (
                  <Link key={href} href={href} onClick={onNavigate} aria-current={active ? "page" : undefined}
                    className={cn("flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted", active ? "bg-muted text-foreground" : "text-foreground/80 hover:text-foreground")}>
                    {/* Icons sit on the collapsible titles; the links inside a group are text only. */}
                    {!section.label && <Icon aria-hidden className={cn("size-4", !active && "text-muted-foreground")} />} {label}
                    {href === "/admin/inbox" && unread > 0 && <span aria-label={`${unread} unread`} className="ml-auto rounded-full bg-brand-ink px-1.5 text-xs font-semibold tabular-nums text-background">{unread}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
        );
      })}
    </nav>
  );
}

/** The phone and tablet navigation: the same links in a side panel. */
export function MobileNav({ dataTools, unread = 0 }: { dataTools: boolean; unread?: number }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="ghost" size="icon" aria-label="Open menu" />}><Menu /></SheetTrigger>
      <SheetContent side="left" className="w-72 overflow-y-auto">
        <SheetHeader>
          <SheetTitle><Brand /></SheetTitle>
          <SheetDescription className="sr-only">Sections of the admin</SheetDescription>
        </SheetHeader>
        <div className="px-3 pb-4"><AdminNav dataTools={dataTools} unread={unread} onNavigate={() => setOpen(false)} /></div>
      </SheetContent>
    </Sheet>
  );
}

/** Who is signed in, with the way to their account and out. */
export function UserMenu({ me, compact }: { me: Me; compact?: boolean }) {
  const [, start] = useTransition();
  const label = me.name || me.email;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" aria-label="Account menu" className={cn(compact ? "size-10 p-0" : "h-12 min-w-0 flex-1 shrink justify-start gap-2.5 overflow-hidden px-2")} />}>
        <UserAvatar name={me.name} email={me.email} src={me.avatar} className="shrink-0" />
        {!compact && (
          <>
            <span className="flex min-w-0 flex-1 flex-col text-left leading-tight">
              <span className="truncate text-sm font-medium">{label}</span>
              {me.name && <span className="truncate text-xs font-normal text-muted-foreground">{me.email}</span>}
            </span>
            <ChevronsUpDown aria-hidden className="size-4 text-muted-foreground" />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent side={compact ? "bottom" : "top"} align={compact ? "end" : "start"} className="min-w-56">
        <DropdownMenuGroup><DropdownMenuLabel className="truncate font-normal text-muted-foreground">{me.email}</DropdownMenuLabel></DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/admin/account" />}><UserRound /> My account</DropdownMenuItem>
        <DropdownMenuItem render={<a href="/" target="_blank" rel="noopener" />}><ExternalLink /> View site</DropdownMenuItem>
        <DropdownMenuItem onClick={() => start(() => signOut())}><LogOut /> Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
