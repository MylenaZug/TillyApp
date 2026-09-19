"use client";

import type { ComponentType, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { PawPrint } from "lucide-react";
import type { CategoryMeta } from "@/lib/tilly/constants";

export function CatIcon({ cat, size = 16 }: { cat: CategoryMeta; size?: number }) {
  if (cat.emoji) {
    return (
      <span style={{ fontSize: size, lineHeight: 1 }} aria-hidden>
        {cat.emoji}
      </span>
    );
  }
  const Icon = cat.icon;
  return <Icon size={size} className={cat.text} />;
}

// Gemeinsame Props-Form fuer alles, was als "Sterne"-Icon in StarRow/Rating durchgereicht
// werden kann - sowohl echte Lucide-Icons als auch SharkTooth (Emoji statt SVG).
export type StarIconProps = { size?: number | string; className?: string; fill?: string; strokeWidth?: number | string };
export type StarIcon = ComponentType<StarIconProps>;

export function SharkTooth({ size = 22, fill }: StarIconProps) {
  const filled = !!fill && fill !== "transparent";
  return (
    <span style={{ fontSize: size, lineHeight: 1, opacity: filled ? 1 : 0.25, filter: filled ? "none" : "grayscale(1)" }} aria-hidden>
      🦈
    </span>
  );
}

export function PawTrailLoader() {
  return (
    <div className="flex h-full items-center justify-center gap-2 text-gold">
      {[0, 1, 2, 3].map((i) => (
        <PawPrint key={i} size={20} style={{ opacity: 0.3, animation: `tillyPawFade 1.1s ${i * 0.15}s infinite ease-in-out` }} />
      ))}
      <style>{`@keyframes tillyPawFade{0%,100%{opacity:.25;transform:translateY(0)}50%{opacity:1;transform:translateY(-3px)}}`}</style>
    </div>
  );
}

function StarMark({ icon: Icon = PawPrint, colorClass, filled }: { icon?: StarIcon; colorClass: string; filled: boolean }) {
  return <Icon size={22} className={colorClass} fill={filled ? "currentColor" : "transparent"} strokeWidth={1.75} />;
}

// StarRow: fuer Formulare gedacht (kein Screenreader-Radiogroup, dafuer togglebar per
// erneutem Klick auf denselben Wert). Fuer die "Heute"-Karte siehe Rating unten.
export function StarRow({
  value,
  onChange,
  label,
  colorClass = "text-gold",
  icon,
}: {
  value: number;
  onChange: (value: number) => void;
  label: string;
  colorClass?: string;
  icon?: StarIcon;
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-ink-soft">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n === value ? 0 : n)}
            className="p-0.5 transition-transform active:scale-90"
            aria-label={`${n} Sterne`}
          >
            <StarMark icon={icon} colorClass={colorClass} filled={n <= value} />
          </button>
        ))}
      </div>
    </div>
  );
}

// Rating: barrierefreie Variante (role="radiogroup") fuer die geteilten/persoenlichen
// Werte auf der Home-Karte - Aria-Label-Schema wird von Tests abgefragt.
export function Rating({
  label,
  value,
  onChange,
  colorClass = "text-gold",
  icon,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  colorClass?: string;
  icon?: StarIcon;
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-ink-soft">{label}</span>
      <div className="flex gap-1" role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5].map((score) => (
          <button
            key={score}
            onClick={() => onChange(score === value ? 0 : score)}
            className="p-0.5 transition-transform active:scale-90"
            aria-label={`${label}: ${score}`}
            aria-pressed={score <= value}
          >
            <StarMark icon={icon} colorClass={colorClass} filled={score <= value} />
          </button>
        ))}
      </div>
    </div>
  );
}

export function Chip({
  active,
  onClick,
  children,
  colorClass = "text-ink",
  activeBgClass = "bg-ink",
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  colorClass?: string;
  activeBgClass?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? `rounded-full border px-3 py-1.5 text-sm text-white ${activeBgClass} border-transparent`
          : `rounded-full border border-hairline px-3 py-1.5 text-sm ${colorClass}`
      }
    >
      {children}
    </button>
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-ink-soft">{children}</div>;
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border border-hairline bg-bg px-3 py-2.5 text-[15px] text-ink outline-none ${props.className ?? ""}`}
    />
  );
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      rows={2}
      {...props}
      className={`w-full resize-none rounded-xl border border-hairline bg-bg px-3 py-2.5 text-[15px] text-ink outline-none ${props.className ?? ""}`}
    />
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  bgClass = "bg-ink",
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  bgClass?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-xl py-3 font-medium text-white transition-transform active:scale-[0.98] disabled:opacity-40 ${bgClass}`}
    >
      {children}
    </button>
  );
}
