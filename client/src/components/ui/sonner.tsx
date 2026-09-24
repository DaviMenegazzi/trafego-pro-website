import { Toaster as Sonner, type ToasterProps } from "sonner";

// O produto é escuro; o Toaster não depende de next-themes (sem provedor no app).
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      position="bottom-right"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: "!rounded-xl !border-white/10 !bg-zinc-900 !text-zinc-100 !shadow-2xl",
          description: "!text-zinc-400",
          actionButton: "!bg-white/10 !text-white",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
