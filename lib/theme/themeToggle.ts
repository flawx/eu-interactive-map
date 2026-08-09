export function nextThemeFromResolved(
  resolved: "light" | "dark",
): "light" | "dark" {
  return resolved === "light" ? "dark" : "light";
}

export function themeToggleShowsSun(resolved: "light" | "dark"): boolean {
  return resolved === "light";
}
