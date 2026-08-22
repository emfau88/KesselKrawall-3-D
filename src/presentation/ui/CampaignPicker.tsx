import type { CampaignId, LegacyFamily, PlayerProgress } from "../../core/types";
import type { CSSProperties } from "react";
import { GRAND_TOURNAMENT_OPPONENTS } from "../../core/data";
import { FAMILY_COPY, opponentName } from "../content/gameText";
import { getOpponentPresentation } from "../content/opponentPresentation";

export function CampaignPicker({
  progress,
  onClose,
  onStart,
}: {
  progress: PlayerProgress;
  onClose: () => void;
  onStart: (campaign: CampaignId, legacyFamily?: LegacyFamily) => void;
}) {
  return (
    <section className="campaign-picker" role="dialog" aria-modal="true" aria-label="Kampagne wählen">
      <button className="campaign-close" aria-label="Kampagnenwahl schließen" onClick={onClose} type="button">×</button>
      <p>NEUER LAUF</p>
      <h2>Welche Werkstatt ruft?</h2>
      <div className="campaign-options">
        <article>
          <span>Kapitel I · {progress.campaigns["grand-tournament"]?.wins ?? 0} Siege</span>
          <strong>Das große Kesselturnier</strong>
          <p>Feuer, Gift und Schutz gegen acht eigenwillige Meisterkessel.</p>
          <div className="campaign-families">
            {(["fire", "poison", "guard"] as const).map((family) => (
              <i key={family} style={{ "--family-color": FAMILY_COPY[family].color } as CSSProperties}>{FAMILY_COPY[family].symbol}</i>
            ))}
          </div>
          <div className="campaign-roster" aria-label="Acht Gegner des großen Kesselturniers">
            {GRAND_TOURNAMENT_OPPONENTS.map((opponent, index) => {
              const presentation = getOpponentPresentation(opponent.id);
              return (
                <span key={opponent.id} style={{ "--roster-color": presentation.glow } as CSSProperties} title={`${opponentName(opponent.id)} · ${presentation.title}`}>
                  <i>{index + 1}</i>
                  <b>{opponentName(opponent.id)}</b>
                </span>
              );
            })}
          </div>
          <button onClick={() => onStart("grand-tournament")} type="button">Turnier beginnen</button>
        </article>
        <article>
          <span>Kapitel II · {progress.campaigns["frostbound-vault"]?.wins ?? 0} Siege</span>
          <strong>Das frostgebundene Archiv</strong>
          <p>Frost und Echo treffen auf eine gewählte klassische Familie.</p>
          <div className="legacy-family-buttons" aria-label="Dritte Familie wählen">
            {(["fire", "poison", "guard"] as const).map((family) => (
              <button key={family} onClick={() => onStart("frostbound-vault", family)} type="button">
                <i style={{ "--family-color": FAMILY_COPY[family].color } as CSSProperties}>{FAMILY_COPY[family].symbol}</i>
                + {FAMILY_COPY[family].name}
              </button>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
