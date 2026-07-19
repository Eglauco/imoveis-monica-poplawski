/* ============================================================
   Hero — vídeo controlado pelo scroll (scroll scrubbing)
   A posição do scroll dentro do "track" mapeia para video.currentTime.
   Suavização por lerp em rAF para evitar travadas ao buscar frames.
   ============================================================ */
(function () {
  "use strict";

  const video = document.getElementById("heroVideo");
  const track = document.getElementById("heroTrack");
  const content = document.getElementById("heroContent");
  const scrollCue = document.getElementById("scrollCue");
  const progressBar = document.getElementById("progressBar");
  const loader = document.getElementById("heroLoader");
  const nav = document.getElementById("nav");
  const reveals = Array.prototype.slice.call(
    document.querySelectorAll(".reveal")
  );

  const prefersReduced = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  /* Ajustes finos do scrubbing:
     SCRUB_EASE  -> 0–1. Maior = vídeo segue o scroll mais "colado";
                    menor = mais suave/arrastado (com inércia). */
  const SCRUB_EASE = 0.16;
  const SEEK_MIN_DELTA = 0.006; // s: só busca se a diferença for perceptível

  /* Janela de scroll (0–1) em que as informações aparecem em sequência.
     Cada uma das 5 infos ocupa uma fatia igual entre START e END, aparecendo
     e sumindo dentro da sua fatia (uma some antes da próxima aparecer). */
  const REVEAL_START = 0.16;
  const REVEAL_END = 0.98;
  const REVEAL_FADE = 0.28; // fração da fatia usada para o fade-in e o fade-out

  // opacidade (0–1) de uma info dentro da sua janela [start, end]
  function windowOpacity(p, start, end, fadeFrac) {
    if (p <= start || p >= end) return 0;
    const local = (p - start) / (end - start); // 0..1 dentro da janela
    if (local < fadeFrac) return local / fadeFrac; // fade-in
    if (local > 1 - fadeFrac) return (1 - local) / fadeFrac; // fade-out
    return 1; // totalmente visível (hold)
  }

  let duration = 0; // duração do vídeo (s)
  let targetTime = 0; // tempo-alvo derivado do scroll
  let displayTime = 0; // tempo suavizado aplicado ao vídeo
  let rafId = null;
  let seeking = false;
  let ready = false;

  /* ---------- NAV: alterna estado ao rolar ---------- */
  function updateNav() {
    if (window.scrollY > 40) nav.classList.add("is-scrolled");
    else nav.classList.remove("is-scrolled");
  }

  /* ---------- Progresso do scroll dentro do track (0 → 1) ---------- */
  function getProgress() {
    const rect = track.getBoundingClientRect();
    const scrollable = track.offsetHeight - window.innerHeight;
    if (scrollable <= 0) return 0;
    // rect.top vai de 0 (topo do track no topo da tela) a -scrollable
    const p = -rect.top / scrollable;
    return Math.min(1, Math.max(0, p));
  }

  /* ---------- Atualiza alvo + overlays a cada scroll ---------- */
  function onScroll() {
    updateNav();
    if (!ready) return;

    const p = getProgress();
    targetTime = p * duration;

    // Fade do intro (título): some cedo, antes das infos começarem
    const contentFade = Math.min(1, p / 0.1);
    content.style.opacity = String(1 - contentFade);
    content.style.transform = `translateY(${-contentFade * 40}px)`;
    content.style.pointerEvents = contentFade > 0.6 ? "none" : "auto";

    // Informações sequenciais: cada uma aparece e some na sua fatia
    const n = reveals.length;
    if (n) {
      const slice = (REVEAL_END - REVEAL_START) / n;
      for (let i = 0; i < n; i++) {
        const start = REVEAL_START + i * slice;
        const end = start + slice;
        const op = windowOpacity(p, start, end, REVEAL_FADE);
        const local = Math.min(1, Math.max(0, (p - start) / slice));
        reveals[i].style.opacity = op.toFixed(3);
        // leve deriva vertical (entra de baixo, sai por cima)
        reveals[i].style.transform = `translateY(${((0.5 - local) * 46).toFixed(1)}px)`;
      }
    }

    // Indicador de scroll some rapidinho
    scrollCue.style.opacity = String(Math.max(0, 1 - p * 6));

    // Barra de progresso
    progressBar.style.width = (p * 100).toFixed(2) + "%";
  }

  /* ---------- Loop de renderização: suaviza o currentTime ---------- */
  function render() {
    // aproxima displayTime do targetTime (quanto maior o fator, mais responsivo)
    const diff = targetTime - displayTime;
    displayTime += diff * SCRUB_EASE;

    // só busca se a mudança for perceptível e o vídeo não estiver ocupado
    if (Math.abs(diff) > SEEK_MIN_DELTA && !seeking && video.readyState >= 2) {
      seeking = true;
      try {
        video.currentTime = displayTime;
      } catch (e) {
        seeking = false;
      }
    }
    rafId = requestAnimationFrame(render);
  }

  /* ---------- Vídeo terminou de buscar o frame ---------- */
  video.addEventListener("seeked", function () {
    seeking = false;
  });

  /* ---------- Metadados carregados: temos a duração ---------- */
  function onMeta() {
    duration = video.duration || 0;
    ready = true;
    onScroll(); // posiciona no frame inicial correto
  }
  if (video.readyState >= 1) onMeta();
  else video.addEventListener("loadedmetadata", onMeta);

  /* ---------- Esconde o loader quando dá pra reproduzir ---------- */
  function hideLoader() {
    loader.classList.add("is-hidden");
  }
  if (video.readyState >= 3) hideLoader();
  else video.addEventListener("canplay", hideLoader, { once: true });
  // Rede de segurança: nunca deixa o loader travado
  setTimeout(hideLoader, 6000);

  /* ---------- Desbloqueio iOS: alguns Safari só bufferizam após um play() ---------- */
  function unlock() {
    const pr = video.play();
    if (pr && typeof pr.then === "function") {
      pr.then(function () {
        video.pause();
        video.currentTime = displayTime || 0;
      }).catch(function () {});
    }
    window.removeEventListener("touchstart", unlock);
    window.removeEventListener("click", unlock);
  }
  window.addEventListener("touchstart", unlock, { once: true, passive: true });
  window.addEventListener("click", unlock, { once: true });

  /* ---------- Modo movimento reduzido: sem scrubbing ---------- */
  if (prefersReduced) {
    video.setAttribute("poster", ""); // mantém primeiro frame
    hideLoader();
    window.addEventListener("scroll", updateNav, { passive: true });
    // posiciona num frame representativo e para
    video.addEventListener("loadeddata", function () {
      try {
        video.currentTime = Math.min(1, (video.duration || 2) * 0.15);
      } catch (e) {}
    });
    return; // não inicia o loop de scrubbing
  }

  /* ---------- Liga tudo ---------- */
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  updateNav();
  video.load(); // garante buffering para permitir seeking
  render();
})();
