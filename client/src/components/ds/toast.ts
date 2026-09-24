import { toast } from "sonner";

// Retorno ao usuário sem bloquear a tela (substitui alert()).
export { toast };

/** Ação reversível: avisa e oferece "Desfazer" em vez de pedir confirmação antes. */
export function toastWithUndo(message: string, onUndo: () => void | Promise<void>, description?: string) {
  toast.success(message, {
    description,
    duration: 6000,
    action: { label: "Desfazer", onClick: () => void onUndo() },
  });
}
