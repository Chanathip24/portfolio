"use client";


// Enter/exit run for route changes, including browser history navigation.
export default function Template({ children }: { children: React.ReactNode }) {
  return (
      <div className="flex flex-1 flex-col bg-background">{children}</div>
  );
}
