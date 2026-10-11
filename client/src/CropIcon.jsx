import { cropDetails } from "./crops";

export function CropSymbol({ name }) {
  return <span className="crop-symbol" role="img" aria-label={`${name} crop icon`}><CropIcon name={name} /></span>;
}

// Crop-specific shapes include distinct millet types.
export function CropIcon({ name, className = "" }) {
  const { image } = cropDetails(name);
  let shape;
  if (image === "maize") shape = <><path d="M8 17C3 14 3 9 5 8L12 19L19 8C22 12 18 19 12 21" fill="#659547" /><rect x="8" y="3" width="8" height="15" rx="4" fill="#eac14c" />{[7, 10, 13].map((y) => <path key={y} d={`M9 ${y}h6`} stroke="#fff0a3" strokeWidth="1.5" />)}<path d="M12 4v12" stroke="#bd8f30" /></>;
  else if (image === "cotton") shape = <><path d="M12 21v-8M8 15l4 3 4-3" stroke="#789450" strokeWidth="2" /><path d="M6 12l6 5 6-5" fill="#9b784a" />{[[8, 10], [12, 6], [16, 10], [12, 12]].map(([cx, cy]) => <circle key={cx + cy} cx={cx} cy={cy} r="4" fill="#faf9f4" stroke="#9bafa0" />)}</>;
  else if (image === "ragi") shape = <><path d="M12 21V11" stroke="#78914e" strokeWidth="2" />{[-6, -3, 0, 3, 6].map((x) => <path key={x} d={`M12 14Q${12 + x} 10 ${12 + x} ${Math.abs(x) / 2 + 4}`} stroke="#a06743" strokeWidth="2.5" strokeLinecap="round" fill="none" />)}</>;
  else if (image === "jowar") shape = <><path d="M12 21V9" stroke="#74944b" strokeWidth="2" />{[[12, 3], [9, 6], [15, 6], [6, 9], [12, 9], [18, 9], [8, 12], [16, 12], [12, 14]].map(([cx, cy]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="2" fill="#c2a169" />)}</>;
  else if (image === "bajra") shape = <><path d="M12 21V8M12 18L6 15" stroke="#6c914e" strokeWidth="2" /><rect x="9" y="3" width="6" height="12" rx="3" fill="#acae78" /><path d="M10 6h4M10 9h4M10 12h4" stroke="#e0dcb4" /></>;
  else if (image === "rice" || image === "grain") shape = <><path d="M8 21L13 4Q18 3 20 10" fill="none" stroke="#79934e" strokeWidth="1.5" />{[[12, 7], [16, 6], [19, 9], [10, 11], [14, 11], [9, 15]].map(([cx, cy]) => <ellipse key={`${cx}-${cy}`} cx={cx} cy={cy} rx="1.6" ry="3" transform={`rotate(-25 ${cx} ${cy})`} fill="#d8bc73" />)}</>;
  else if (image === "sunflower" || image === "niger") shape = <><path d="M12 22V11" stroke="#679244" strokeWidth="2" />{Array.from({ length: 8 }, (_, i) => <ellipse key={i} cx="12" cy="4" rx="2" ry="4" fill="#edc34b" transform={`rotate(${i * 45} 12 9)`} />)}<circle cx="12" cy="9" r={image === "niger" ? 3 : 4} fill="#76562e" /></>;
  else if (image === "chilli") shape = <><path d="M17 6C21 12 13 19 4 21C11 15 9 8 17 6Z" fill="#cd4438" /><path d="M17 7Q15 3 20 2" stroke="#6a944e" strokeWidth="2" fill="none" /></>;
  else if (image === "tomato") shape = <><circle cx="12" cy="14" r="8" fill="#dc5c45" /><path d="M12 5L7 7L10 10L14 10L18 6L13 7V3" fill="#699644" /></>;
  else if (image === "fruit") shape = <><path d="M16 6C6 3 2 17 8 21C15 24 24 9 16 6Z" fill="#edb648" /><path d="M15 6Q15 1 21 3Q20 7 15 6" fill="#779b4c" /></>;
  else if (image === "groundnut") shape = <><path d="M7 3C1 6 6 11 5 13C1 22 11 24 14 17C15 14 13 12 16 9C20 1 11 0 7 3Z" transform="translate(3 0)" fill="#d5ac7c" stroke="#b68f62" /><path d="M10 6l3 3M8 16l4 3" stroke="#a67f52" /></>;
  else if (["soybean", "pulse", "tur", "urad", "sesame", "seed"].includes(image)) {
    const color = { soybean: "#d8c580", pulse: "#7a9e44", tur: "#97a960", urad: "#41483c", sesame: "#ddc99b", seed: "#a16e42" }[image];
    shape = <>{[[7, 7], [17, 7], [12, 13], [6, 18], [18, 18]].map(([cx, cy]) => <ellipse key={`${cx}-${cy}`} cx={cx} cy={cy} rx={image === "sesame" ? 2 : 3} ry={image === "sesame" ? 4 : 3.5} transform={`rotate(-25 ${cx} ${cy})`} fill={color} />)}</>;
  } else shape = <><path d="M12 21V9" stroke="#72944f" strokeWidth="2" /><path d="M12 14C4 15 3 8 4 5C10 5 13 9 12 14M12 10C18 11 22 6 20 2C14 3 11 5 12 10" fill="#7eaa57" /></>;
  return <svg className={`crop-icon ${className}`} viewBox="0 0 24 24" aria-hidden="true" focusable="false">{shape}</svg>;
}
