"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { useState } from "react";

export function ChatComposer({ disabled }: { disabled: boolean }) {
  const [value, setValue] = useState("");

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => event.preventDefault()}
    >
      <label htmlFor="chat-composer" className="text-sm font-medium">
        Nachricht
      </label>
      <Textarea
        id="chat-composer"
        name="message"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={
          disabled
            ? "Senden ist deaktiviert, bis eine Miete aktiv ist."
            : "Nachricht an den gemieteten Agenten"
        }
        disabled={disabled}
        aria-describedby="chat-composer-hint"
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p id="chat-composer-hint" className="text-xs text-muted">
          Kein Modellaufruf. UNOROUTER ist in dieser Schicht nicht verbunden.
        </p>
        <Button type="submit" disabled>
          Senden — nicht verbunden
        </Button>
      </div>
    </form>
  );
}
