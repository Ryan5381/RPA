import logo from "@/assets/logo.png";
import { useTheme } from "@/hooks/useTheme";
import { Sun, Moon } from "lucide-react";

export const Navbar = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur pt-2 pb-1">
      <div className="flex min-h-16 items-center justify-between gap-4 px-4 md:gap-6 md:px-6 w-full">
        <a className="flex items-center gap-2" href="/">
          <img src={logo} alt="logo" className="w-25 h-auto object-contain" />
          <p className="text-xl font-bold tracking-wider bg-linear-to-r from-slate-900 via-cyan-700 to-cyan-600 dark:from-slate-50 dark:via-cyan-100 dark:to-cyan-300 bg-clip-text text-transparent transition-all">
            智慧預約與購票自動化系統
          </p>
        </a>

        {/* 快速切換深色/淺色模式按鈕 */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            title={theme === "dark" ? "切換至淺色模式" : "切換至深色模式"}
            className="w-10 h-10 rounded-xl bg-secondary/80 hover:bg-secondary border border-border flex items-center justify-center text-foreground hover:text-primary shadow-sm cursor-pointer group"
          >
            {theme === "dark" ? (
              <Sun className="w-5 h-5 text-amber-400 group-hover:rotate-45 transition-transform duration-200" />
            ) : (
              <Moon className="w-5 h-5 text-cyan-600 group-hover:-rotate-12 transition-transform duration-200" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

