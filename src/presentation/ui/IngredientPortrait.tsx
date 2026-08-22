import { getItemDefinition } from "../../core/data";
import type { ItemLevel } from "../../core/types";

const PALETTE = {
  fire: ["#ffb24b", "#c83f2f", "#6d2526"],
  poison: ["#c7ec6b", "#668f3d", "#382c4c"],
  guard: ["#eaf7ef", "#69cedc", "#486c83"],
  frost: ["#e4fbff", "#82d4e9", "#5275a2"],
  echo: ["#efd8ff", "#a879d8", "#554071"],
} as const;

function IngredientShape({ itemId, colors }: { itemId: string; colors: readonly [string, string, string] }) {
  const [light, base, dark] = colors;
  if (itemId === "chili" || itemId === "cinder-berry") return <><path d="M23 12c15 3 20 15 14 27-5 9-14 12-25 10 12-5 17-11 17-20 0-7-3-12-6-17Z" fill={base} stroke={dark} strokeWidth="3"/><path d="M23 13c-2-5 1-9 6-10" fill="none" stroke="#73924e" strokeWidth="4" strokeLinecap="round"/><path d="M25 18c7 4 8 10 5 16" fill="none" stroke={light} strokeWidth="3" strokeLinecap="round" opacity=".72"/>{itemId === "cinder-berry" && <circle cx="43" cy="43" r="7" fill={light} stroke={dark} strokeWidth="2"/>}</>;
  if (itemId === "dragon-tooth") return <><path d="M14 50 31 7c11 19 13 33 7 45Z" fill="#eee2bf" stroke={dark} strokeWidth="3"/><path d="M17 49h23" stroke={base} strokeWidth="5" strokeLinecap="round"/><path d="m27 15-6 24" stroke="#fff8df" strokeWidth="3" opacity=".7"/></>;
  if (itemId === "ember-core") return <><path d="m32 6 19 15-7 28-25 4L9 27Z" fill={dark} stroke={base} strokeWidth="3"/><path d="m32 15 10 11-5 17-14-3-2-16Z" fill={light}/><path d="m32 15 5 25M21 24l21 2" stroke={base} strokeWidth="2"/></>;
  if (itemId === "slime-shroom") return <><path d="M25 30h14l5 24H20Z" fill="#d2c392" stroke={dark} strokeWidth="3"/><path d="M9 30C11 12 23 7 33 8c12 0 21 8 23 22Z" fill={base} stroke={dark} strokeWidth="3"/><circle cx="24" cy="18" r="4" fill={light}/><circle cx="42" cy="23" r="3" fill={light}/></>;
  if (itemId === "nightwing") return <><path d="m31 20-20-9 5 17-9 9 21 5Z" fill={base} stroke={dark} strokeWidth="3"/><path d="m33 20 20-9-5 17 9 9-21 5Z" fill={base} stroke={dark} strokeWidth="3"/><ellipse cx="32" cy="33" rx="7" ry="19" fill={dark}/><circle cx="32" cy="20" r="3" fill={light}/></>;
  if (itemId === "witch-eye") return <><path d="M6 32c13-20 39-20 52 0-13 20-39 20-52 0Z" fill="#e8ddb8" stroke={dark} strokeWidth="3"/><circle cx="32" cy="32" r="13" fill={base}/><circle cx="32" cy="32" r="6" fill={dark}/><circle cx="28" cy="27" r="3" fill={light}/></>;
  if (itemId === "venom-bulb" || itemId === "healing-tuber") return <><path d="M31 15c15 4 20 16 13 31-5 10-22 10-28 1-9-14 0-28 15-32Z" fill={itemId === "healing-tuber" ? "#caa06d" : base} stroke={dark} strokeWidth="3"/><path d="m22 17-5-11M31 15V4m9 15 7-10" stroke={itemId === "healing-tuber" ? "#7fa75d" : light} strokeWidth="5" strokeLinecap="round"/><circle cx="27" cy="30" r="4" fill={light} opacity=".65"/></>;
  if (itemId === "egg-shell") return <><path d="M10 25h44c-2 20-10 30-22 30S12 45 10 25Z" fill="#e8e3cd" stroke={dark} strokeWidth="3"/><path d="m10 25 8-8 7 7 8-10 8 10 7-7 6 8" fill="none" stroke={base} strokeWidth="4"/><path d="M18 37h28" stroke={light} strokeWidth="3" opacity=".7"/></>;
  if (itemId === "gold-spoon") return <><ellipse cx="39" cy="18" rx="13" ry="16" fill={light} stroke={dark} strokeWidth="3"/><path d="m32 29-19 27" stroke={base} strokeWidth="8" strokeLinecap="round"/><path d="m35 27-19 28" stroke={light} strokeWidth="3" strokeLinecap="round"/></>;
  if (itemId === "moon-salt") return <><path d="m8 49 12-23 10 12 8-27 18 38Z" fill={base} stroke={dark} strokeWidth="3"/><path d="m38 11 2 30M20 26l4 19" stroke={light} strokeWidth="3" opacity=".78"/></>;
  if (itemId === "frost-shard" || itemId === "mirror-shard") return <><path d="M32 4 49 31 36 58 15 42Z" fill={base} stroke={dark} strokeWidth="3"/><path d="m32 4 2 44M17 41l30-10" stroke={light} strokeWidth="3" opacity=".82"/><path d="m49 31-15 17-19-6" fill="none" stroke="#fff" strokeWidth="2" opacity=".58"/></>;
  if (itemId === "ice-bell" || itemId === "echo-bell") return <><path d="M14 44c7-5 7-13 8-22 1-8 19-8 20 0 1 9 1 17 8 22Z" fill={base} stroke={dark} strokeWidth="3"/><path d="M12 45h40" stroke={light} strokeWidth="5" strokeLinecap="round"/><circle cx="32" cy="51" r="5" fill={light}/><path d="M28 11c0-6 8-6 8 0" fill="none" stroke={dark} strokeWidth="4"/></>;
  if (itemId === "winter-bloom") return <>{Array.from({length:6},(_,index)=>{const a=index*Math.PI/3;return <ellipse key={index} cx={32+Math.cos(a)*14} cy={32+Math.sin(a)*14} rx="8" ry="16" fill={index%2?light:base} stroke={dark} strokeWidth="2" transform={`rotate(${index*60+90} ${32+Math.cos(a)*14} ${32+Math.sin(a)*14})`}/>})}<circle cx="32" cy="32" r="8" fill="#fff1a9" stroke={dark} strokeWidth="2"/></>;
  if (itemId === "rime-clock") return <><circle cx="32" cy="32" r="24" fill={dark} stroke={base} strokeWidth="6"/><circle cx="32" cy="32" r="17" fill="#effbff" opacity=".75"/><path d="M32 18v15l10 7" fill="none" stroke={base} strokeWidth="4" strokeLinecap="round"/><circle cx="32" cy="32" r="4" fill={light}/></>;
  if (itemId === "rune-cup") return <><path d="M15 10h34l-5 28c-2 9-22 9-24 0Z" fill={base} stroke={dark} strokeWidth="3"/><path d="M48 18c12 0 10 17-2 17" fill="none" stroke={light} strokeWidth="5"/><path d="M25 52h14M32 44v8" stroke={dark} strokeWidth="5" strokeLinecap="round"/><path d="M23 21h18" stroke={light} strokeWidth="3"/></>;
  return <><path d="M14 45c8-32 30-32 36-12 4 14-15 24-27 15-9-7 0-22 10-16 7 4 1 12-5 9" fill="none" stroke={base} strokeWidth="7" strokeLinecap="round"/><circle cx="14" cy="45" r="5" fill={light}/><circle cx="50" cy="33" r="5" fill={light}/></>;
}

export function IngredientPortrait({ itemId, level = 1 }: { itemId: string; level?: ItemLevel }) {
  const family = getItemDefinition(itemId).family;
  const colors = PALETTE[family];
  return (
    <span className={`ingredient-portrait family-${family} level-${level}`} aria-hidden="true">
      <svg viewBox="0 0 64 64" focusable="false"><IngredientShape colors={colors} itemId={itemId} /></svg>
      <b>{"◆".repeat(level)}</b>
    </span>
  );
}
