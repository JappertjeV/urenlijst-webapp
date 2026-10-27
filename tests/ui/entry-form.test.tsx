// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Regressie: bij een fout uit saveEntryAction (bijv. overlap) resette React 19
// het formulier na de form-action. De tijd-selects toonden daarna 00:00,
// terwijl state en hidden inputs 09:00–17:00 hielden — een tweede klik sloeg
// dus iets anders op dan de gebruiker zag.
const OVERLAP = "Dit urenblok overlapt met een bestaand blok op deze dag.";
const saveEntryAction = vi.fn();
vi.mock("@/app/actions", () => ({
  saveEntryAction: (...args: unknown[]) => saveEntryAction(...args),
  deleteEntryAction: vi.fn(),
}));

import { EntryForm } from "@/ui/entries/EntryForm";
import type { LocationDTO } from "@/types";

const locations: LocationDTO[] = [
  { id: "loc1", name: "Kantoor", color: "blue", archived: false },
];

function hidden(name: string) {
  return document.querySelector<HTMLInputElement>(`input[name="${name}"]`)!
    .value;
}
function select(label: string) {
  return screen.getByLabelText<HTMLSelectElement>(label);
}

afterEach(() => {
  cleanup();
  saveEntryAction.mockReset();
});

describe("EntryForm na een fout bij opslaan", () => {
  it("houdt de zichtbare tijden gelijk aan wat verstuurd wordt", async () => {
    saveEntryAction.mockResolvedValue({ error: OVERLAP });
    const onDone = vi.fn();
    const user = userEvent.setup();
    render(
      <EntryForm defaultDate="2026-09-29" locations={locations} onDone={onDone} />,
    );

    await user.selectOptions(select("Begintijd — minuten"), "30");
    await user.type(screen.getByLabelText("Notitie (optioneel)"), "avond");
    await user.click(screen.getByRole("button", { name: "Uren opslaan" }));

    await screen.findByText(OVERLAP);
    expect(onDone).not.toHaveBeenCalled();
    expect(saveEntryAction).toHaveBeenCalledTimes(1);
    const sent = saveEntryAction.mock.calls[0]![1] as FormData;
    expect(sent.get("startMinutes")).toBe("570");
    expect(sent.get("endMinutes")).toBe("1020");

    // Zichtbare pickers == hidden inputs == wat er verstuurd is.
    expect(select("Begintijd — uur").value).toBe("9");
    expect(select("Begintijd — minuten").value).toBe("30");
    expect(select("Eindtijd — uur").value).toBe("17");
    expect(select("Eindtijd — minuten").value).toBe("0");
    expect(hidden("startMinutes")).toBe("570");
    expect(hidden("endMinutes")).toBe("1020");
    // Ook de ongecontroleerde velden blijven staan.
    expect(
      screen.getByLabelText<HTMLInputElement>("Notitie (optioneel)").value,
    ).toBe("avond");

    // Opnieuw versturen stuurt precies wat er te zien is.
    await user.click(screen.getByRole("button", { name: "Uren opslaan" }));
    await vi.waitFor(() => expect(saveEntryAction).toHaveBeenCalledTimes(2));
    const resent = saveEntryAction.mock.calls[1]![1] as FormData;
    expect(resent.get("startMinutes")).toBe("570");
    expect(resent.get("endMinutes")).toBe("1020");
    expect(resent.get("note")).toBe("avond");
  });

  it("sluit na succes via onDone", async () => {
    saveEntryAction.mockResolvedValue({ ok: true });
    const onDone = vi.fn();
    const user = userEvent.setup();
    render(
      <EntryForm defaultDate="2026-09-29" locations={locations} onDone={onDone} />,
    );
    await user.click(screen.getByRole("button", { name: "Uren opslaan" }));
    await vi.waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
  });
});
