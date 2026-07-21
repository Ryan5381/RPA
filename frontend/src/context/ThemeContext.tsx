import React, { createContext, useEffect, useState } from "react";

type Theme = "dark" | "light";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = "rpa_ui_theme";

const disableTransitionsTemporarily = () => {
  if (typeof document === "undefined") return;
  const id = "theme-transition-disable";
  if (!document.getElementById(id)) {
    const css = document.createElement("style");
    css.id = id;
    css.appendChild(
      document.createTextNode(
        `*, *::before, *::after {
          -webkit-transition: none !important;
          -moz-transition: none !important;
          -o-transition: none !important;
          -ms-transition: none !important;
          transition: none !important;
        }`
      )
    );
    document.head.appendChild(css);
  }

  // 強制瀏覽器重繪 (force reflow) 以確保 0ms 立即呈現新顏色
  (() => window.getComputedStyle(document.body))();

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const el = document.getElementById(id);
      if (el && el.parentNode) {
        el.parentNode.removeChild(el);
      }
    });
  });
};

const applyThemeToDOM = (t: Theme, skipDisableTransition = false) => {
  if (typeof document === "undefined") return;
  if (!skipDisableTransition) {
    disableTransitionsTemporarily();
  }
  const root = document.documentElement;
  if (t === "dark") {
    root.classList.add("dark");
    root.classList.remove("light");
  } else {
    root.classList.add("light");
    root.classList.remove("dark");
  }
  localStorage.setItem(THEME_STORAGE_KEY, t);
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as Theme;
    const initialTheme = savedTheme === "light" || savedTheme === "dark" ? savedTheme : "dark";
    applyThemeToDOM(initialTheme, true);
    return initialTheme;
  });

  const setTheme = (newTheme: Theme) => {
    if (newTheme === theme) return;
    applyThemeToDOM(newTheme);
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    setThemeState((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      applyThemeToDOM(next);
      return next;
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
