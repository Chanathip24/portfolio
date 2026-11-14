import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "cn";

/** The admin's initials from their name, or the start of their email. */
export const initialsOf = (name: string, email: string) => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[words.length - 1][0] : (words[0] ?? email).slice(0, 2)).toUpperCase();
};

/** A person's picture, or their initials. Used wherever the admin shows a user: the menu, the account page, the users list, the activity feed. */
export function UserAvatar({ name = "", email = "", src, className }: { name?: string; email?: string; src?: string | null; className?: string }) {
  return (
    <Avatar className={cn("size-8", className)}>
      {src && <AvatarImage src={src} alt="" />}
      <AvatarFallback className="bg-brand-ink/10 text-xs font-medium text-brand-ink">{initialsOf(name, email)}</AvatarFallback>
    </Avatar>
  );
}
