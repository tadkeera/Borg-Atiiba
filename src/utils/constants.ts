export const svgLogo = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
  <circle cx="200" cy="200" r="190" fill="white" stroke="#1d509a" stroke-width="12" />
  <g transform="translate(180, 110)">
    <path d="M -10,0 L -10,100 L -30,100 L -30,30 Z" fill="#878e93" />
    <path d="M -40,40 L -40,100 L -60,100 L -60,70 Z" fill="#878e93" />
    <path d="M 10,-20 L 10,100 L 30,100 L 30,10 Z" fill="#16519b" />
    <path d="M 40,30 L 40,100 L 60,100 L 60,50 Z" fill="#16519b" />
  </g>
  <path d="M 100,230 C 100,310 300,310 300,230 C 300,280 100,280 100,230 Z" fill="#cc1a22" />
  <path d="M 110,240 C 110,325 290,325 290,240 C 290,295 110,295 110,240 Z" fill="#878e93" />
  <text x="200" y="310" font-family="Arial, sans-serif" font-weight="bold" font-size="44" fill="#16519b" text-anchor="middle">برج الأطباء</text>
  <text x="200" y="350" font-family="Arial, sans-serif" font-weight="bold" font-size="28" fill="#16519b" text-anchor="middle">BORG ALATIBA</text>
</svg>`;

export const HOSPITAL_LOGO = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgLogo)));
