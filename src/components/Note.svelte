<script lang="ts">
import { getRelativeLocaleUrl } from "astro:i18n";
import { onMount } from "svelte";
import { flip } from "svelte/animate";
import { monolocale } from "$config";
import { tagSlug } from "$utils/slug";
import { canonicalPagePath } from "$utils/canonical-url";

let { locale, notes, series: seriesList, tags: tagList }: { locale: string; notes: any[]; series: string[]; tags: string[] } = $props();

let initial = $state(false);
let series: string | null = $state(null);
let tags: string[] = $state([]);

let filtered: any[] = $derived.by(() => {
  let list: any[] = notes
    .filter(note => {
      const matchSeries = !series || note.data.series === series;
      const matchTags = tags.every(tag => note.data.tags?.includes(tag));
      return matchSeries && matchTags;
    })
    .sort((a, b) => b.data.top - a.data.top || b.data.timestamp.getTime() - a.data.timestamp.getTime());

  if (!initial) return list;

  let params = new URLSearchParams();
  params.set("page", String(page));
  if (series) params.set("series", series);
  for (const tag of tags) params.append("tag", tag);

  const url = `${location.pathname}?${params.toString()}`;
  window.history.replaceState({ url, random: Math.random(), source: "swup" }, "", url);

  return list;
});

const size = 20;
let pages: number = $derived(Math.ceil(filtered.length / size));
let page: number = $state(1);
$effect(() => { page = Math.max(1, Math.min(Math.floor(page), pages)); });

let list: any[] = $derived(filtered.slice((page - 1) * size, page * size));

function switchTag(tag: string, turn?: boolean) {
  const included = tags.includes(tag);
  if (turn === undefined) turn = !included;
  tags = turn ? (included ? tags : [...tags, tag]) : tags.filter(t => t !== tag);
}

function chooseSeries(s: string, turn?: boolean) {
  if (turn === undefined) turn = series !== s;
  series = turn ? s : null;
}

function noteLine(note: any): string {
  if (note.data.series === "Lavande") return "L";
  if (note.data.series) return note.data.series.charAt(0).toUpperCase();
  return String(new Date(note.data.timestamp).getDate()).padStart(2, "0");
}

function dateShort(d: Date): string {
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2, "0")}.${String(dt.getMonth() + 1).padStart(2, "0")}`;
}

const STICKER_COLORS = ["ticket", "bordeaux", "municipal", "warning", "ink"];
function stickerColor(tag: string, i: number): string {
  const t = tag.toLowerCase();
  if (t.includes("fiction") || t.includes("nouvelle")) return "ink";
  if (t.includes("recette")) return "ticket";
  if (t.includes("communication")) return "municipal";
  return STICKER_COLORS[i % STICKER_COLORS.length];
}

onMount(() => {
  const params = new URLSearchParams(window.location.search);
  page = Number(params.get("page")) || 1;
  series = params.get("series");
  tags = params.getAll("tag");
  initial = true;
});
</script>

<!-- Tag filter board -->
<div style="
  margin: 0 0 30px;
  padding: 20px 22px;
  border: 1.5px solid var(--primary-color);
  background: color-mix(in srgb, var(--primary-color) 3%, transparent);
">
  <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px; flex-wrap: wrap;">
    <div style="
      font-family: var(--mono-fd); font-size: 11px;
      letter-spacing: 0.18em; text-transform: uppercase; opacity: 0.75;
    ">⌬ filtrer par sticker</div>
    {#if series}
      <button
        onclick={() => chooseSeries(series!)}
        style="
          background: transparent; border: 1px dashed currentColor;
          padding: 2px 8px; font-family: var(--mono-fd); font-size: 10px;
          letter-spacing: 0.1em; cursor: pointer; text-transform: uppercase;
          color: var(--primary-color);
        "
      >× série : {series}</button>
    {/if}
    {#if tags.length > 0}
      <button
        onclick={() => tags = []}
        style="
          background: transparent; border: 1px dashed currentColor;
          padding: 2px 8px; font-family: var(--mono-fd); font-size: 10px;
          letter-spacing: 0.1em; cursor: pointer; text-transform: uppercase;
          color: var(--primary-color);
        "
      >× effacer filtres</button>
    {/if}
  </div>

  <!-- Series filter -->
  {#if seriesList.length > 0}
    <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px;">
      {#each seriesList as s}
        <button
          onclick={() => chooseSeries(s)}
          class="sticker sticker-bordeaux clickable angle-2"
          style="
            opacity: {series === s ? 1 : 0.55};
            outline: {series === s ? '2px solid var(--bordeaux)' : 'none'};
            outline-offset: 2px;
          "
        ><span style="opacity:0.7;font-size:9px;margin-right:1px;">§</span>{s.toLowerCase()}</button>
      {/each}
    </div>
  {/if}

  <!-- Tag filter pills -->
  <div style="display: flex; flex-wrap: wrap; gap: 8px;">
    {#each tagList as tag, i}
      <button
        onclick={() => switchTag(tag)}
        class="sticker sticker-{stickerColor(tag, i)} clickable angle-{(i % 4) + 1}"
        style="
          opacity: {tags.includes(tag) ? 1 : 0.65};
          outline: {tags.includes(tag) ? '2px solid currentColor' : 'none'};
          outline-offset: 2px;
        "
      >
        <span style="opacity:0.7;font-size:9px;margin-right:1px;">#</span>{tag.toLowerCase()}
      </button>
    {/each}
  </div>
</div>

<!-- List header -->
<div style="
  display: flex; align-items: center; gap: 14px; margin-bottom: 16px;
  font-family: var(--mono-fd); font-size: 11px;
  letter-spacing: 0.18em; text-transform: uppercase; opacity: 0.75;
">
  <span>▶ {filtered.length} {filtered.length > 1 ? 'arrêts' : 'arrêt'}</span>
  <div class="route-line-h" style="flex: 1; height: 4px; color: var(--ticket);"></div>
  <span>plus récent ↓</span>
</div>

<!-- Article list -->
{#each list as note (note.id)}
  {@const noteId = monolocale ? note.id : note.id.split("/").slice(1).join("/")}
  {@const href = getRelativeLocaleUrl(locale, canonicalPagePath(`/note/${noteId}`))}
  {@const line = noteLine(note)}
  {@const ds = dateShort(note.data.timestamp)}
  <div
    animate:flip={{ duration: 150 }}
    style="
      display: grid; grid-template-columns: 90px 1fr auto; gap: 18px;
      padding: 14px 0;
      border-bottom: 1px dashed color-mix(in srgb, var(--primary-color) 18%, transparent);
      align-items: baseline;
    "
  >
    <!-- Date -->
    <div>
      <div style="font-family: var(--mono-fd); font-size: 14px; font-weight: 600;">{ds}</div>
      <div style="font-family: var(--mono-fd); font-size: 9px; letter-spacing: 0.14em; opacity: 0.55; text-transform: uppercase; margin-top: 2px;">
        {note.data.timestamp.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }).toUpperCase()}
      </div>
    </div>

    <!-- Title + tags -->
    <div>
      <div style="display: flex; align-items: baseline; gap: 10px; margin-bottom: 4px; flex-wrap: wrap;">
        <span style="
          background: var(--accent-color); color: var(--background-color);
          font-family: var(--bebas); font-size: 14px; padding: 1px 6px;
          letter-spacing: 0.08em; flex-shrink: 0;
        ">L.{line}</span>
        {#if note.data.series}
          <span style="font-family: var(--mono-fd); font-size: 10px; opacity: 0.65; letter-spacing: 0.12em; text-transform: uppercase;">{note.data.series}</span>
        {/if}
        <a href={href} style="
          font-family: var(--serif-display); font-style: italic;
          font-size: 26px; line-height: 1.1; font-weight: 500; margin: 0;
          color: var(--primary-color);
          text-decoration: underline; text-decoration-color: transparent;
          text-underline-offset: 3px; transition: text-decoration-color 0.15s;
        ">{note.data.title}</a>
      </div>
      <div style="display: flex; gap: 5px; flex-wrap: wrap; margin-top: 6px;">
        {#each (note.data.tags ?? []) as tag, ti}
          <a href={getRelativeLocaleUrl(locale, canonicalPagePath(`/tag/${tagSlug(tag)}`))}
             class="sticker sticker-{stickerColor(tag, ti)} angle-{(ti % 4) + 1}"
             style="text-decoration: none;"
          >
            <span style="opacity:0.7;font-size:9px;margin-right:1px;">#</span>{tag.toLowerCase()}
          </a>
        {/each}
      </div>
    </div>

    <!-- CTA -->
    <div style="text-align: right; font-family: var(--mono-fd); font-size: 10px; opacity: 0.6; letter-spacing: 0.1em; white-space: nowrap;">
      <a href={href} style="color: var(--accent-color); text-decoration: none;">▸ LIRE</a>
    </div>
  </div>
{:else}
  <div style="
    padding: 60px 0; text-align: center;
    font-family: var(--mono-fd); font-size: 14px; letter-spacing: 0.16em;
    text-transform: uppercase; opacity: 0.5;
  ">aucun arrêt trouvé</div>
{/each}

<!-- Pagination -->
{#if pages > 1}
  <div style="
    display: flex; align-items: center; justify-content: center; gap: 8px;
    margin-top: 32px;
    font-family: var(--mono-fd); font-size: 12px; letter-spacing: 0.1em;
  ">
    <button
      onclick={() => (page = Math.max(1, page - 1))}
      style="border: 1px solid currentColor; padding: 4px 10px; cursor: pointer; opacity: {page === 1 ? 0.3 : 1};"
    >←</button>
    {#each Array.from({ length: pages }, (_, i) => i + 1) as p}
      <button
        onclick={() => (page = p)}
        style="
          border: 1px solid {p === page ? 'var(--ticket)' : 'transparent'};
          padding: 4px 8px;
          color: {p === page ? 'var(--ticket)' : 'inherit'};
          background: transparent; cursor: pointer;
        "
      >{p}</button>
    {/each}
    <button
      onclick={() => (page = Math.min(pages, page + 1))}
      style="border: 1px solid currentColor; padding: 4px 10px; cursor: pointer; opacity: {page === pages ? 0.3 : 1};"
    >→</button>
  </div>
{/if}
