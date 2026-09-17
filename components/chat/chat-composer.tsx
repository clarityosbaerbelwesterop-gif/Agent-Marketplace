"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { type FormEvent, useState } from "react";

export function ChatComposer({
  disabled,
  busy = false,
  placeholder,
  hint,
  submitLabel = "Senden",
  busyLabel = "Läuft…",
  onSend,
}: {
  disabled: boolean;
  busy?: boolean;
  placeholder?: string;
  hint?: string;
  submitLabel?: string;
  busyLabel?: string;
  onSend?: (message: string, background: boolean) => void | Promise<void>;
}) {
  const [value, setValue] = useState("");
  const [background, setBackground] = useState(false);
  const locked = disabled || busy || !onSend;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const message = value.trim();
    if (!message || locked) {
      return;
    }
    setValue("");
    await onSend?.(message, background);
  }

  return (
    <form className="flex flex-col gap-3" onSubmit={(event) => void onSubmit(event)}>
      <label htmlFor="chat-composer" className="text-sm font-medium">
        Nachricht
      </label>
      <Textarea
        id="chat-composer"
        name="message"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={
          placeholder ??
          (disabled
            ? "Senden ist deaktiviert, bis eine Miete aktiv ist."
            : "Nachricht an den gemieteten Agenten")
        }
        disabled={disabled || busy}
        aria-describedby="chat-composer-hint"
      />
      {onSend ? (
        <label className="flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={background}
            onChange={(event) => setBackground(event.target.checked)}
            disabled={disabled || busy}
          />
          Im Hintergrund fortsetzen (ohne Live-Stream)
        </label>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p id="chat-composer-hint" className="text-xs text-muted">
          {hint ??
            (onSend
              ? "Stream bleibt sichtbar, damit der Chat nicht hängt."
              : "Kein Modellaufruf. UNOROUTER ist in dieser Schicht nicht verbunden.")}
        </p>
        <Button type="submit" disabled={locked || !value.trim()}>
          {busy ? busyLabel : submitLabel}
        </Button>
      </div>
    </form>
  );
}
