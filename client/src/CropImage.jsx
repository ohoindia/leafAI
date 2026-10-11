import { cropDetails } from "./crops";

export function CropImage({ name }) {
  const { image } = cropDetails(name);
  return (
    <svg className="crop-image" viewBox="0 0 100 100" role="img" aria-label={`${name} crop illustration`}>
      <rect width="100" height="100" rx="18" fill="#eaf2df" />
      {image === "maize" ? <>
        <path d="M48 88C17 71 17 42 29 36L50 62L73 32C87 61 70 83 48 88Z" fill="#65933f" />
        <rect x="35" y="17" width="30" height="59" rx="15" fill="#edbb36" stroke="#c18b27" strokeWidth="2" />
        {[0, 1, 2].map((x) => [0, 1, 2, 3, 4, 5].map((y) => <rect key={`${x}-${y}`} x={39 + x * 8} y={23 + y * 8} width="6" height="6" rx="2" fill="#ffe17b" />))}
        <path d="M48 85Q19 63 25 44Q42 53 48 85M52 85Q79 57 76 43Q60 53 52 85" fill="#79a951" />
      </> : image === "jowar" ? <>
        <path d="M50 89V36M50 74Q29 54 23 63M50 80Q75 55 80 63" stroke="#648748" strokeWidth="4" fill="none" />
        {[0, 1, 2, 3, 4, 5].map((row) => Array.from({ length: row < 3 ? row + 2 : 7 - row }, (_, col) => <circle key={`${row}-${col}`} cx={50 + (col - ((row < 3 ? row + 2 : 7 - row) - 1) / 2) * 8} cy={20 + row * 8} r="5" fill={row % 2 ? "#c89657" : "#e8cb8e"} stroke="#b58951" />))}
      </> : image === "ragi" ? <>
        <path d="M49 90V51M49 73L28 63" stroke="#718349" strokeWidth="4" />
        {[[-28, 35], [-14, 29], [0, 25], [14, 29], [28, 35]].map(([angle, y]) => <g key={angle} transform={`rotate(${angle} 49 57)`}><rect x="45" y={y} width="8" height={57 - y} rx="4" fill="#a46143" />{[0, 1, 2, 3, 4].map((i) => <path key={i} d={`M44 ${y + i * 5}h10`} stroke="#d8a681" strokeWidth="2" />)}</g>)}
      </> : image === "bajra" ? <>
        <path d="M50 89V28M50 79Q28 56 22 59M50 70Q73 53 81 53" stroke="#60843d" strokeWidth="4" fill="none" />
        <rect x="40" y="15" width="20" height="51" rx="10" fill="#a5a77b" />
        {[0, 1, 2, 3, 4, 5, 6].map((y) => <g key={y}><circle cx="45" cy={21 + y * 6} r="2.5" fill="#d5d3a2" /><circle cx="54" cy={24 + y * 6} r="2.5" fill="#737d50" /></g>)}
      </> : image === "sunflower" ? <>
        <path d="M50 89V46" stroke="#528039" strokeWidth="5" />
        <path d="M50 76Q21 76 24 57Q45 57 50 76" fill="#709d42" />
        {Array.from({ length: 12 }, (_, i) => <ellipse key={i} cx="50" cy="20" rx="6" ry="12" transform={`rotate(${i * 30} 50 40)`} fill="#f2c442" />)}
        <circle cx="50" cy="40" r="17" fill="#68452d" />
        {[[43, 34], [54, 33], [40, 43], [51, 44], [58, 42], [49, 52]].map(([cx, cy]) => <circle key={cx} cx={cx} cy={cy} r="2" fill="#bc975b" />)}
      </> : image === "sesame" || image === "niger" || image === "soybean" || image === "tur" || image === "urad" ? <>
        <ellipse cx="50" cy="72" rx="33" ry="14" fill="#d9e3c6" />
        {Array.from({ length: 18 }, (_, i) => {
          const cx = 25 + (i % 6) * 10 + (Math.floor(i / 6) % 2) * 3;
          const cy = 47 + Math.floor(i / 6) * 12;
          const fill = { sesame: "#ead7a6", niger: "#343b30", soybean: "#dfc779", tur: "#e3ac42", urad: "#454334" }[image];
          return <ellipse key={i} cx={cx} cy={cy} rx={image === "sesame" || image === "niger" ? 3 : 5} ry={image === "sesame" || image === "niger" ? 6 : 5} transform={`rotate(${i * 23} ${cx} ${cy})`} fill={fill} stroke="#ffffff" strokeWidth=".6" />;
        })}
        <path d="M39 33Q27 9 41 15Q55 17 54 35Q64 9 76 17Q76 33 54 37" fill="#719b44" />
      </> : image === "cotton" ? <>
        <path d="M50 86V50M50 72L30 61M50 66L73 48" stroke="#708349" strokeWidth="5" fill="none" />
        <path d="M32 53L50 70L68 53" fill="#9b744e" />
        {[[36, 43], [61, 42], [49, 30], [49, 51]].map(([cx, cy]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="17" fill="#fff" stroke="#d5ddcf" strokeWidth="2" />)}
      </> : image === "rice" ? <>
        <path d="M30 85Q36 60 50 26Q65 15 80 40M40 83Q45 53 66 37" stroke="#749348" strokeWidth="3" fill="none" />
        {[[48, 31], [58, 24], [69, 27], [77, 36], [43, 43], [54, 39], [63, 46], [72, 50]].map(([cx, cy]) => <ellipse key={`${cx}-${cy}`} cx={cx} cy={cy} rx="3.5" ry="7" transform={`rotate(-25 ${cx} ${cy})`} fill="#d8b762" />)}
        <path d="M23 67H77L69 83H31Z" fill="#fff" stroke="#9aaa86" strokeWidth="2" />
        {[[34, 64], [43, 61], [53, 63], [62, 61], [69, 65], [47, 66]].map(([cx, cy]) => <ellipse key={cx} cx={cx} cy={cy} rx="5" ry="2.5" fill="#fffdf0" stroke="#dedbc5" />)}
      </> : image === "pulse" ? <>
        <path d="M20 57Q38 15 78 25Q77 60 36 68Q24 68 20 57Z" fill="#71a448" stroke="#4c7c33" strokeWidth="2" />
        <path d="M28 57Q44 34 70 30" stroke="#b7d984" strokeWidth="3" fill="none" />
        {[[35, 52], [49, 41], [63, 33]].map(([cx, cy]) => <circle key={cx} cx={cx} cy={cy} r="7" fill="#c5df88" />)}
        {[[41, 80, "#ddb34f"], [57, 76, "#bc744d"], [73, 77, "#73984a"], [26, 78, "#e4c97b"]].map(([cx, cy, fill]) => <ellipse key={cx} cx={cx} cy={cy} rx="6" ry="4.5" fill={fill} />)}
      </> : image === "grain" ? <>
        <path d="M45 88L55 19M60 85L72 35" stroke="#648844" strokeWidth="3" />
        {[28, 40, 52, 64].map((y) => <g key={y}><ellipse cx="44" cy={y} rx="6" ry="10" transform={`rotate(-35 44 ${y})`} fill="#d9af43" /><ellipse cx="60" cy={y - 4} rx="6" ry="10" transform={`rotate(35 60 ${y - 4})`} fill="#efcb66" /></g>)}
      </> : image === "chilli" ? <>
        <path d="M67 25C80 45 60 78 24 81C49 61 43 35 67 25Z" fill="#dc4932" />
        <path d="M65 29Q59 17 73 13" stroke="#497c36" strokeWidth="7" fill="none" />
        <path d="M58 40Q60 57 44 68" stroke="#f98361" strokeWidth="4" fill="none" />
      </> : image === "tomato" || image === "fruit" ? <>
        <circle cx="50" cy="57" r="29" fill={image === "tomato" ? "#e25b3b" : "#edb440"} />
        <path d="M50 34L32 29L42 42L58 42L70 30Z" fill="#4f883e" />
        <path d="M50 35Q46 23 54 18" stroke="#4f883e" strokeWidth="5" fill="none" />
        <ellipse cx="36" cy="52" rx="5" ry="10" fill="#fff" opacity=".3" />
      </> : ["seed", "pulse", "groundnut"].includes(image) ? <>
        {[[32, 36, -25], [64, 31, 30], [48, 60, -35], [72, 68, 25], [25, 73, 15]].map(([cx, cy, angle]) => <ellipse key={cx} cx={cx} cy={cy} rx={image === "groundnut" ? 11 : 9} ry="15" transform={`rotate(${angle} ${cx} ${cy})`} fill={image === "pulse" ? "#75a34d" : image === "groundnut" ? "#c79962" : "#d5b46e"} stroke={image === "pulse" ? "#557e33" : "#ac874c"} strokeWidth="2" />)}
      </> : <>
        <path d="M50 85V35" stroke="#4d7d35" strokeWidth="5" />
        <path d="M49 64C18 64 18 35 22 29C43 30 52 46 49 64Z" fill="#74a64b" />
        <path d="M51 51C78 52 87 27 80 19C57 20 47 35 51 51Z" fill="#4f893b" />
      </>}
    </svg>
  );
}
