import { cropDetails } from "./crops";

import { cropIconSlots } from "../../common/crop-icons.js";

export function CropSymbol({ name }) {
  return (
    <span className="crop-symbol" role="img" aria-label={`${name} crop icon`}>
      <CropIcon name={name} />
    </span>
  );
}

export function CropIcon({ name, className = "" }) {
  const { image } = cropDetails(name);
  const slot = cropIconSlots[image] ?? cropIconSlots.plant;
  if (slot >= 21) {
    return (
      <svg className={`crop-icon ${className}`} aria-hidden="true" focusable="false"
        viewBox="0 0 256 256">
        <image href={`/crop-icons/v1/${image}.png`} width="256" height="256" />
      </svg>
    );
  }
  const columns = [0, 251, 502, 752, 1003, 1254];
  const rows = [0, 350, 670, 925, 1254];
  const column = slot % 5;
  const row = Math.floor(slot / 5);
  return (
    <svg
      className={`crop-icon ${className}`}
      aria-hidden="true"
      focusable="false"
      viewBox={`${columns[column]} ${rows[row]} ${columns[column + 1] - columns[column]} ${rows[row + 1] - rows[row]}`}
    >
      <image
        href="/crop-icons/realistic-crops-v1.png"
        width="1254"
        height="1254"
      />
    </svg>
  );
}
