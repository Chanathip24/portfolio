"use client";

import {
  Activity, BarChart3, ChevronsUpDown, Database, ExternalLink, FolderKanban, FolderTree, Gauge, History, Images, Inbox, LogOut, Menu, Newspaper, Settings, UserCog, UserRound, Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { signOut } from "@/app/admin/auth-actions";
import { UserAvatar } from "@/components/admin/user-avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "cn";

export type Me = { name: string; email: string; avatar: string | null };

type Item = { href: string; label: string; icon: typeof BarChart3; exact?: boolean; dataTools?: boolean };
const sections: { label?: string; items: Item[] }[] = [
  { items: [{ href: "/admin", label: "Overview", icon: BarChart3, exact: true }, { href: "/admin/inbox", label: "Inbox", icon: Inbox }] },
  { label: "Content", items: [
    { href: "/admin/posts", label: "Blog posts", icon: Newspaper },
    { href: "/admin/projects", label: "Projects", icon: FolderKanban },
    { href: "/admin/categories", label: "Categories", icon: FolderTree },
  ] },
  { label: "Site", items: [
    { href: "/admin/profile", label: "Profile", icon: UserRound },
    { href: "/admin/about", label: "About page", icon: UserCog },
  ] },
  { label: "Manage", items: [
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/admin/activity", label: "Activity", icon: Activity },
    { href: "/admin/history", label: "History", icon: History },
    { href: "/admin/performance", label: "Performance", icon: Gauge },
    { href: "/admin/data", label: "Data", icon: Database, dataTools: true },
    { href: "/admin/media", label: "Media", icon: Images, dataTools: true },
    { href: "/admin/settings", label: "Settings", icon: Settings },
  ] },
];

export function AdminNav({ dataTools, unread = 0, onNavigate }: { dataTools: boolean; unread?: number; onNavigate?: () => void }) {
  const path = usePathname();
  return (
    <nav aria-label="Admin" className="flex flex-col gap-5">
      {sections.map((section, i) => (
        <div key={section.label ?? i} className="flex flex-col gap-0.5">
          {section.label && <p className="px-3 pb-1 text-xs font-medium text-muted-foreground">{section.label}</p>}
          {section.items.filter((it) => !it.dataTools || dataTools).map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? path === href : path.startsWith(href);
            return (
              <Link key={href} href={href} onClick={onNavigate} aria-current={active ? "page" : undefined}
                className={cn("flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-muted", active ? "bg-muted text-foreground" : "text-muted-foreground")}>
                <Icon aria-hidden className="size-4" /> {label}
                {href === "/admin/inbox" && unread > 0 && <span aria-label={`${unread} unread`} className="ml-auto rounded-full bg-brand-ink px-1.5 text-xs font-semibold tabular-nums text-background">{unread}</span>}
              </Link>
            );
          })}
        </div>
      ))}
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
          <SheetTitle>Admin</SheetTitle>
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
      <DropdownMenuTrigger render={<Button variant="ghost" aria-label="Account menu" className={cn(compact ? "size-10 p-0" : "h-12 flex-1 justify-start gap-2.5 px-2")} />}>
        <UserAvatar name={me.name} email={me.email} src={me.avatar} />
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
