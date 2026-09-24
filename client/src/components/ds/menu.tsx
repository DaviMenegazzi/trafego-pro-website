import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { ChevronDown, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "./button";
import { Tooltip } from "./tooltip";

const floatingSurface =
  "z-[200] overflow-hidden rounded-xl border border-white/10 bg-zinc-900 text-zinc-100 shadow-2xl shadow-black/60 outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.97] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 duration-150";

export type MenuItem =
  | { type?: "item"; label: React.ReactNode; icon?: React.ReactNode; onSelect: () => void; tone?: "default" | "danger"; disabled?: boolean; hint?: React.ReactNode }
  | { type: "separator" }
  | { type: "label"; label: React.ReactNode };

function MenuItems({ items }: { items: MenuItem[] }) {
  return (
    <>
      {items.map((item, index) => {
        if (item.type === "separator") return <DropdownMenuPrimitive.Separator key={index} className="-mx-1 my-1 h-px bg-white/10" />;
        if (item.type === "label") {
          return (
            <DropdownMenuPrimitive.Label key={index} className="px-2.5 pb-1 pt-2 text-xs font-medium text-zinc-500">
              {item.label}
            </DropdownMenuPrimitive.Label>
          );
        }
        return (
          <DropdownMenuPrimitive.Item
            key={index}
            disabled={item.disabled}
            onSelect={item.onSelect}
            className={cn(
              "flex cursor-pointer select-none items-center gap-2.5 rounded-md px-2.5 py-2 text-sm outline-none data-[disabled]:pointer-events-none data-[highlighted]:bg-white/[0.07] data-[disabled]:opacity-45 [&_svg]:size-4 [&_svg]:shrink-0",
              item.tone === "danger" ? "text-rose-300 data-[highlighted]:text-rose-200 [&_svg]:text-rose-300" : "[&_svg]:text-zinc-400",
            )}
          >
            {item.icon}
            <span className="min-w-0 flex-1">
              {item.label}
              {item.hint && <span className="block text-xs text-zinc-500">{item.hint}</span>}
            </span>
          </DropdownMenuPrimitive.Item>
        );
      })}
    </>
  );
}

/** Menu ancorado a um gatilho qualquer. */
export function Menu({
  trigger,
  items,
  align = "end",
  side = "bottom",
  className,
}: {
  trigger: React.ReactElement;
  items: MenuItem[];
  align?: "start" | "center" | "end";
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
}) {
  return (
    <DropdownMenuPrimitive.Root modal={false}>
      <DropdownMenuPrimitive.Trigger asChild>{trigger}</DropdownMenuPrimitive.Trigger>
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          align={align}
          side={side}
          sideOffset={6}
          collisionPadding={8}
          className={cn(floatingSurface, "min-w-48 origin-(--radix-dropdown-menu-content-transform-origin) p-1", className)}
        >
          <MenuItems items={items} />
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  );
}

/** Menu "⋯" de ações secundárias de uma linha, cartão ou tela. */
export function ActionsMenu({ items, label = "Mais ações", size = "md", align = "end" }: { items: MenuItem[]; label?: string; size?: "sm" | "md"; align?: "start" | "end" }) {
  return (
    <Menu
      align={align}
      items={items}
      trigger={
        <Button aria-label={label} variant="ghost" size={size === "sm" ? "icon-sm" : "icon"}>
          <MoreHorizontal />
        </Button>
      }
    />
  );
}

/** Botão com texto que abre um menu (ex.: "Exportar ⌄"). */
export function MenuButton({ label, icon, items, variant = "secondary", size = "md", align = "end", disabled }: { label: React.ReactNode; icon?: React.ReactNode; items: MenuItem[]; variant?: ButtonProps["variant"]; size?: ButtonProps["size"]; align?: "start" | "end"; disabled?: boolean }) {
  return (
    <Menu
      align={align}
      items={items}
      trigger={
        <Button variant={variant} size={size} disabled={disabled}>
          {icon}
          {label}
          <ChevronDown className="text-zinc-400" />
        </Button>
      }
    />
  );
}

/** Card flutuante ancorado ao gatilho (transform-origin no gatilho). */
export function Popover({
  trigger,
  children,
  open,
  onOpenChange,
  align = "start",
  side = "bottom",
  className,
  tooltip,
}: {
  trigger: React.ReactElement;
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  align?: "start" | "center" | "end";
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
  tooltip?: string;
}) {
  const triggerNode = <PopoverPrimitive.Trigger asChild>{trigger}</PopoverPrimitive.Trigger>;
  return (
    <PopoverPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {tooltip ? <Tooltip content={tooltip}>{triggerNode}</Tooltip> : triggerNode}
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align={align}
          side={side}
          sideOffset={6}
          collisionPadding={8}
          className={cn(floatingSurface, "w-80 max-w-[calc(100vw-1rem)] origin-(--radix-popover-content-transform-origin)", className)}
        >
          {children}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

export const PopoverClose = PopoverPrimitive.Close;
