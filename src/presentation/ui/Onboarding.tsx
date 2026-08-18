const STEPS = [
  {
    eyebrow: "1 · Zutaten wählen",
    title: "Dein Kessel braucht eine Mischung",
    copy: "Kaufe unten eine Zutat. Die Farbe zeigt ihre Familie; jede Familie hat eine eigene Kampfrolle.",
  },
  {
    eyebrow: "2 · Verschmelzen",
    title: "Gleiches wird stärker",
    copy: "Mische den Laden kostenlos neu und kaufe dieselbe Zutat erneut. Zwei Kopien verschmelzen automatisch.",
  },
  {
    eyebrow: "3 · Anordnen",
    title: "Die Reihenfolge zählt",
    copy: "Wähle einen belegten Platz und danach einen zweiten. So aktivierst du Nachbarschaftseffekte und Synergien.",
  },
  {
    eyebrow: "4 · Kessel an",
    title: "Der Kampf läuft automatisch",
    copy: "Starte den Kampf. Schaden, Gift, Schild und Heilung werden aus deiner Mischung deterministisch abgespielt.",
  },
] as const;

export function Onboarding({
  step,
  onNext,
  onSkip,
}: {
  step: number;
  onNext: () => void;
  onSkip: () => void;
}) {
  const content = STEPS[Math.min(step, STEPS.length - 1)];
  if (!content) return null;
  const last = step >= STEPS.length - 1;
  return (
    <aside className="onboarding" aria-label="Kurzeinführung" aria-live="polite">
      <div className="onboarding-progress" aria-hidden="true">
        {STEPS.map((_, index) => <i className={index <= step ? "is-active" : undefined} key={index} />)}
      </div>
      <span>{content.eyebrow}</span>
      <strong>{content.title}</strong>
      <p>{content.copy}</p>
      <div>
        <button className="onboarding-skip" onClick={onSkip} type="button">Überspringen</button>
        <button className="onboarding-next" onClick={onNext} type="button">{last ? "Verstanden" : "Weiter"}</button>
      </div>
    </aside>
  );
}

export const ONBOARDING_STEP_COUNT = STEPS.length;
