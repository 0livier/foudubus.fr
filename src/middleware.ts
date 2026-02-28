import { defineMiddleware } from "astro:middleware";
import { pathNeedsRedirect, canonicalPath } from "$utils/canonical-url";

/** In dev, Astro serves endpoints at path/ (trailingSlash: "always"). Rewrite feed paths so links to /feed.xml work locally. */
const FEED_PATH_NO_SLASH = /^\/([a-z]{2}\/)?(feed\.(xml|xsl))$/i;
const FEED_PATH_WITH_SLASH = /^\/([a-z]{2}\/)?(feed\.(xml|xsl))\/$/i;

export const onRequest = defineMiddleware((context, next) => {
	const pathname = context.url.pathname;
	if (import.meta.env.DEV && FEED_PATH_NO_SLASH.test(pathname)) {
		const url = new URL(context.url);
		url.pathname = pathname + "/";
		return context.rewrite(url);
	}
	// In dev, don't redirect /feed.xml/ -> /feed.xml or we loop (rewrite sends us to /feed.xml/).
	if (import.meta.env.DEV && FEED_PATH_WITH_SLASH.test(pathname)) {
		return next();
	}
	if (pathNeedsRedirect(pathname)) {
		const destination = canonicalPath(pathname);
		return context.redirect(destination, 301);
	}
	return next();
});
