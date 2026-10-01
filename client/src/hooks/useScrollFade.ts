import { useCallback, useEffect, useState, type CSSProperties } from "react";

/**
 * Rolagem vertical sem barra: o topo e o pé esmaecem quando há conteúdo escondido ali.
 * Use junto com a classe `scrollbar-none` no mesmo elemento. O ref é de callback, então
 * funciona em listas que montam e desmontam (troca de aba, conversa selecionada).
 */
export function useScrollFade(size = 32) {
  const [node, setNode] = useState<HTMLElement | null>(null);
  const [edges, setEdges] = useState({ top: false, bottom: false });

  const update = useCallback(() => {
    if (!node) return;
    const top = node.scrollTop > 1;
    const bottom = node.scrollTop + node.clientHeight < node.scrollHeight - 1;
    setEdges((current) => (current.top === top && current.bottom === bottom ? current : { top, bottom }));
  }, [node]);

  useEffect(() => {
    if (!node) return;
    update();
    const resize = new ResizeObserver(update);
    resize.observe(node);
    // Itens entrando ou saindo mudam a altura do conteúdo sem mudar a da lista.
    const mutations = new MutationObserver(update);
    mutations.observe(node, { childList: true, subtree: true });
    return () => { resize.disconnect(); mutations.disconnect(); };
  }, [node, update]);

  const mask = edges.top || edges.bottom
    ? `linear-gradient(to bottom, ${edges.top ? `transparent, #000 ${size}px` : "#000"}, ${edges.bottom ? `#000 calc(100% - ${size}px), transparent` : "#000"})`
    : undefined;
  const style: CSSProperties | undefined = mask ? { maskImage: mask, WebkitMaskImage: mask } : undefined;

  return { ref: setNode, onScroll: update, style };
}
