<script lang="ts">
  import { getRelativeLocaleUrl } from "astro:i18n";
  import { onMount } from "svelte";
  import config from "$config";
  import { canonicalPagePath } from "$utils/canonical-url";
  import ThemeSwitcher from "./ThemeSwitcher.svelte";

  let { locale, route }: { locale: string; route: string } = $props();

  const homeRoute        = getRelativeLocaleUrl(locale);
  const noteRoute        = getRelativeLocaleUrl(locale, canonicalPagePath("/note"));
  const seriesBaseRoute  = getRelativeLocaleUrl(locale, canonicalPagePath("/series"));
  const feedRoute        = getRelativeLocaleUrl(locale, canonicalPagePath("/feed.xml"));

  function isActive(path: string, exact = false): boolean {
    if (exact) return route === path || route === path + "/";
    if (path === homeRoute) return route === path || route === path + "/";
    return route.startsWith(path);
  }

  let menu = $state(false);
  let navEl: HTMLElement | undefined = $state();

  onMount(() => {
    for (const link of navEl!.getElementsByTagName("a")) {
      link.addEventListener("click", () => (menu = false));
    }
    const updateRoute = () => (route = window.location.pathname);
    if (window.swup) {
      window.swup.hooks.on("page:load", updateRoute);
    } else {
      document.addEventListener("swup:enable", () => window.swup?.hooks.on("page:load", updateRoute));
    }
  });
</script>

<!-- Mobile hamburger -->
<button
  onclick={() => (menu = true)}
  aria-label="Menu"
  class="sm:hidden"
  style="
    position: fixed; top: 14px; right: 16px; z-index: 30;
    font-family: var(--mono-fd); font-size: 18px; letter-spacing: 0.1em;
    color: var(--primary-color); background: var(--background-color);
    border: 1px solid currentColor; padding: 4px 10px;
  "
>≡</button>

<!-- Mobile backdrop -->
<!-- svelte-ignore a11y_consider_explicit_label -->
<button
  onclick={() => (menu = false)}
  class:pointer-events-none={!menu}
  class:opacity-0={!menu}
  style="
    position: fixed; inset: 0; z-index: 20;
    background: rgba(12,16,24,0.8);
    transition: opacity 0.2s;
    pointer-events: {menu ? 'auto' : 'none'};
  "
  class="sm:hidden"
></button>

<!-- Header -->
<header
  bind:this={navEl}
  style="
    position: sticky; top: 0; z-index: 25;
    display: flex; justify-content: space-between; align-items: center;
    padding: 20px 48px;
    border-bottom: 2px solid var(--primary-color);
    background: var(--background-color);
    color: var(--primary-color);
    font-family: var(--mono-fd);
    font-size: 11px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
  "
>
  <!-- Site logo -->
  <a
    href={homeRoute}
    style="font-family: var(--bebas); font-size: 24px; letter-spacing: 0.06em; color: var(--primary-color);"
  >※ ÉDITIONS DU FOU DU BUS ※</a>

  <!-- Desktop nav (always visible on sm+), mobile slide-in -->
  <nav
    style="
      background: var(--background-color);
      {!menu ? 'transform: translateX(100%);' : ''}
    "
    class="
      fixed top-0 end-0 flex flex-col gap-8 p-8 h-full z-25 transition-transform
      sm:!transform-none sm:static sm:flex-row sm:gap-7 sm:p-0 sm:h-auto sm:items-center
    "
  >
    <button onclick={() => (menu = false)} class="sm:hidden self-end mb-2" style="font-size: 1.4rem; color: var(--primary-color);">✕</button>

    {#each [
      { href: homeRoute, label: 'accueil', exact: true },
      { href: noteRoute, label: 'écrits', exact: false, exclude: seriesBaseRoute },
      { href: seriesBaseRoute, label: 'séries', exact: false },
    ] as item}
      {@const active = item.exclude
        ? isActive(item.href, item.exact) && !isActive(item.exclude)
        : isActive(item.href, item.exact)}
      <a
        href={item.href}
        style="
          color: var(--primary-color);
          opacity: {active ? 1 : 0.6};
          padding-bottom: 3px;
          border-bottom: 2px solid {active ? 'var(--ticket)' : 'transparent'};
          transition: border-color 0.15s, opacity 0.15s;
        "
      >{item.label}</a>
    {/each}

    <a
      href={feedRoute}
      target="_blank"
      style="color: var(--primary-color); opacity: 0.6;"
    >flux</a>

    <ThemeSwitcher />
  </nav>
</header>

<style>
  @media (max-width: 639px) {
    header { padding: 12px 16px; }
    /* hide title on mobile when menu open to avoid clutter */
  }
</style>
