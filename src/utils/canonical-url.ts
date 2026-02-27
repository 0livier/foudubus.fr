/** Paths that are static assets (no trailing slash). Excludes xml/xsl so feed endpoints match Astro trailingSlash: "always". */
const STATIC_EXT = /\.(json|ico|png|svg|webmanifest|css|js|txt|webp)$/i;

/**
 * Canonical URL policy: hyphens in slugs, trailing slash always (except root).
 * Static assets (images, css, js, etc.) never get trailing slash.
 * Use for redirect targets and for <link rel="canonical"> / og:url.
 */
export function canonicalPath(pathname: string): string {
	const normalized = pathname === "/" ? "/" : pathname.replace(/\/+$/, "") || "/";
	const withHyphens = normalized.replace(/_/g, "-");
	if (withHyphens === "/") return "/";
	if (STATIC_EXT.test(withHyphens)) return withHyphens;
	return `${withHyphens}/`;
}

/**
 * Returns true if the pathname differs from the canonical form (needs redirect).
 */
export function pathNeedsRedirect(pathname: string): boolean {
	const canonical = canonicalPath(pathname);
	return pathname !== canonical;
}

/**
 * Returns the canonical path for internal links (trailing slash for pages).
 * Use with getRelativeLocaleUrl(locale, canonicalPagePath("/note")).
 */
export function canonicalPagePath(path: string): string {
	if (path === "/" || path.endsWith("/")) return path;
	if (STATIC_EXT.test(path)) return path;
	return `${path}/`;
}
