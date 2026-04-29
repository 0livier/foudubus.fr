<script lang="ts">
  import { onMount } from "svelte";
  let progress = $state(0);

  onMount(() => {
    const update = () => {
      const el = document.documentElement;
      const total = el.scrollHeight - el.clientHeight;
      progress = total > 0 ? (el.scrollTop / total) * 100 : 0;
    };
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  });
</script>

<div style="
  position: fixed; top: 0; left: 0; right: 0; height: 3px;
  background: rgba(255,255,255,0.05); z-index: 100;
  pointer-events: none;
">
  <div class="reading-bar" style="width: {progress}%;"></div>
</div>
