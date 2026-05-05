"use client";

interface HeaderProps {
  title: string;
  onMenuToggle: () => void;
}

export function Header({ title, onMenuToggle }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-zinc-200 bg-white/80 backdrop-blur px-4 py-3 md:px-6">
      <button
        type="button"
        className="rounded-md p-1.5 text-zinc-600 hover:bg-zinc-100 md:hidden"
        onClick={onMenuToggle}
        aria-label="菜单"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      <h2 className="text-sm font-medium text-zinc-700">{title}</h2>
    </header>
  );
}
