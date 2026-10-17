import type { GameState, Item } from './game.ts';

const leaves = (x: number, y: number, flip = 1) => `<g transform="translate(${x} ${y}) scale(${flip} 1)" fill="#475c40" stroke="#182c25" stroke-width="2"><path d="M0 80 Q-4 25 -20 0 M0 72 Q24 36 48 12 M0 60 Q-36 38 -48 20 M-2 40 Q9 7 18-15" fill="none"/><path d="M-20 0Q-58-23-47 9Q-30 28-20 0M48 12Q67-20 34-5Q17 8 48 12M-48 20Q-73 15-63 37Q-38 50-48 20M18-15Q42-39 42-9Q32 11 18-15M-2 40Q-18 12-27 34Q-21 54-2 40M10 56Q38 29 40 52Q24 74 10 56"/></g>`;

export function roomArt(s: GameState): string {
  const h = s.clockSolved ? 4 : s.hour, m = s.clockSolved ? 45 : s.minute;
  return `<svg class="room-art" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 700" aria-hidden="true">
  <defs>
    <linearGradient id="wall" x2=".9" y2="1"><stop stop-color="#707567"/><stop offset=".5" stop-color="#515e50"/><stop offset="1" stop-color="#263d34"/></linearGradient>
    <linearGradient id="wood" x2="0" y2="1"><stop stop-color="#7a6445"/><stop offset="1" stop-color="#3b382b"/></linearGradient>
    <linearGradient id="floor" x2="0" y2="1"><stop stop-color="#655943"/><stop offset="1" stop-color="#222f27"/></linearGradient>
    <linearGradient id="night" x2="0" y2="1"><stop stop-color="#192f31"/><stop offset="1" stop-color="#799084"/></linearGradient>
    <radialGradient id="light"><stop stop-color="#e9c479" stop-opacity=".48"/><stop offset="1" stop-color="#e9c479" stop-opacity="0"/></radialGradient>
    <radialGradient id="shade"><stop offset=".45" stop-color="#071d17" stop-opacity="0"/><stop offset="1" stop-color="#061510" stop-opacity=".64"/></radialGradient>
    <linearGradient id="glass" x2="1" y2="1"><stop stop-color="#84918a"/><stop offset=".4" stop-color="#3a5047"/><stop offset=".46" stop-color="#66766b"/><stop offset="1" stop-color="#243f35"/></linearGradient>
    <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".72" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope=".065"/></feComponentTransfer><feBlend in="SourceGraphic" mode="soft-light"/></filter>
    <filter id="glow"><feGaussianBlur stdDeviation="7"/></filter>
    <pattern id="wallpaper" width="58" height="75" patternUnits="userSpaceOnUse"><path d="M29 11Q16 25 29 39Q42 25 29 11M29 39V57M20 50Q29 46 38 50" fill="none" stroke="#c4bd91" stroke-width=".7" opacity=".19"/><circle cx="0" cy="69" r="1.5" fill="#c4bd91" opacity=".3"/></pattern>
    <clipPath id="windowClip"><path d="M382 352V196a100 100 0 0 1 200 0V352Z"/></clipPath>
  </defs>
  <g filter="url(#grain)">
  <path fill="url(#wall)" d="M0 0H1000V548H0Z"/>
  <path fill="url(#wallpaper)" d="M0 0H1000V541H0Z"/>
  <path fill="#455345" d="M0 0H1000V28H0Z"/><path d="M0 31H1000M0 39H1000" stroke="#1c3229" stroke-width="3"/><path d="M0 33H1000" stroke="#959578" stroke-width="2" opacity=".5"/>
  <path d="M0 537H1000V700H0Z" fill="url(#floor)"/>
  <path d="M0 535H1000V549H0Z" fill="#333d2f"/><path d="M0 535H1000" stroke="#a49d75" stroke-width="3" opacity=".6"/>
  ${[0,110,220,330,440,550,660,770,880,1000].map((x,i)=>`<path d="M${400+(x-400)*.55} 549L${x} 700" stroke="#17291f" opacity=".7" stroke-width="2"/>${i%2===0?`<path d="M${x} 623h90" stroke="#182a21" opacity=".5"/>`:''}`).join('')}
  <path d="M0 590H1000M0 652H1000" stroke="#1c3025" opacity=".7" stroke-width="2"/>
  <path d="M65 700L254 549M524 700L491 549M910 700L720 549" stroke="#b1a17a" opacity=".12"/>
  <g opacity=".5" fill="none" stroke="#263c30" stroke-width="2"><path d="M306 42l-8 66 9 26-13 52 4 48M302 132l23 15 7 30M787 45l-5 55 8 24-12 44M51 451l9 24-4 43"/><path d="M293 225l9 14M783 167l-2 28"/></g>
  <ellipse cx="458" cy="639" rx="285" ry="41" fill="#142a22" opacity=".5"/>
  <path d="M174 603Q446 551 720 609L672 668Q439 631 217 671Z" fill="#6e5b43" stroke="#2e382a" stroke-width="3"/>
  <path d="M195 608Q446 565 700 613L665 652Q438 621 224 655Z" fill="none" stroke="#a28a5a" stroke-width="2"/>
  <path d="M216 614Q448 581 677 618M228 639Q438 606 669 638" fill="none" stroke="#8a7550" stroke-width="1"/>
  ${Array.from({length:17},(_,i)=>`<path d="M${231+i*25} ${606+Math.abs(i-8)*1.3}l7 11-8 10-7-11Z" fill="none" stroke="#ad8c55" opacity=".45"/>`).join('')}
  <path d="M213 670l-3 10m15-11-2 10m431-13 5 10m7-10 5 9" stroke="#8c7d57" stroke-width="3"/>
  <path d="M363 365V191a119 119 0 0 1 238 0v174Z" fill="#1f322a" stroke="#26372c" stroke-width="7"/>
  <path d="M373 359V196a109 109 0 0 1 218 0v163Z" fill="#9a987b" stroke="#252f26" stroke-width="2"/>
  <g clip-path="url(#windowClip)">
    <path d="M382 83H582V354H382Z" fill="url(#night)"/>
    <circle cx="530" cy="155" r="27" fill="#c2c4a5" opacity=".74"/><circle cx="541" cy="147" r="26" fill="#354a46"/>
    <path d="M380 313l20-66 19 63 19-106 28 112 29-91 22 87 24-139 22 137 25-98 23 110v42H380Z" fill="#2a4941"/>
    <path d="M381 351l26-58 20 58 25-75 17 77 21-64 21 61 31-84 27 87 17-55 20 53" fill="#233e34"/>
    ${Array.from({length:30},(_,i)=>`<path class="rain rain-${i%3}" d="M${389+(i*43)%185} ${103+(i*59)%220}l-7 30" stroke="#c1d0bb" opacity="${.12+(i%4)*.05}" stroke-width="1"/>`).join('')}
  </g>
  <g fill="#7a7b62" stroke="#26362b" stroke-width="2"><path d="M476 91h12v267h-12Z"/><path d="M382 235h200v12H382Z"/></g>
  <path d="M379 358h209v16H379Z" fill="#8f8c6b" stroke="#26362b" stroke-width="3"/>
  <path d="M353 375h260v12H353Z" fill="#535d47" stroke="#24382b" stroke-width="2"/>
  <path d="M359 83q-25 140-9 301l44-1q-20-155 7-292Z" fill="#5f6a52" stroke="#314735" stroke-width="2"/>
  <path d="M365 100q-13 133-3 268m11-267q-9 112 3 266" fill="none" stroke="#9b9d76" opacity=".4"/>
  <path d="M606 83q24 140 8 301l-37-1q15-155-10-292Z" fill="#5f6a52" stroke="#314735" stroke-width="2"/>
  <path d="M600 100q13 133 3 268m-11-267q9 112-3 266" fill="none" stroke="#9b9d76" opacity=".4"/>
  <path d="M347 82h275" stroke="#263a2b" stroke-width="8" stroke-linecap="round"/>
  <path d="M350 78h270" stroke="#9b9876" stroke-width="2"/>
  <path d="M384 387l62 148h188L572 387Z" fill="#a8b199" opacity=".08"/>
  <g transform="translate(196 165)">
    <path d="M-57 0l7 113q50 22 100 0L57 0Z" fill="#514833" stroke="#243126" stroke-width="3"/>
    <path d="M-40 54h80v48h-80Z" fill="#34382b" stroke="#847752" stroke-width="2"/>
    <path d="M0 40v40" stroke="#978358" stroke-width="2"/><circle cy="85" r="12" fill="#a18a55" stroke="#333c2b" stroke-width="2"/>
    <circle r="69" fill="#322f25" stroke="#172b21" stroke-width="4"/>
    <circle r="61" fill="#9b9270" stroke="#b1a27a" stroke-width="2"/>
    <circle r="55" fill="#c3b892" stroke="#665f45" stroke-width="1"/>
    ${Array.from({length:12},(_,i)=>`<path d="M0-48v${i%3===0?8:4}" transform="rotate(${i*30})" stroke="#504c36" stroke-width="${i%3===0?2:1}"/>`).join('')}
    <g fill="#484b37" font-family="Georgia,serif" font-size="11" text-anchor="middle"><text y="-33">XII</text><text x="38" y="4">III</text><text y="43">VI</text></g>
    <path d="M-42-12a8 8 0 1 0 7 14a7 7 0 0 1-7-14Z" fill="#5d6548"/>
    <path d="M30 26q-5-12-13-6l3 6-6 6 10-1 7 4-2-8 5-1Z" fill="#5d6548"/>
    <path d="M0 7V-29" transform="rotate(${h*30 + m*.5})" stroke="#3d4230" stroke-width="4" stroke-linecap="round"/>
    <path d="M0 9V-43" transform="rotate(${m*6})" stroke="#3d4230" stroke-width="2" stroke-linecap="round"/>
    <circle r="4" fill="#3c4430"/>
    ${s.clockSolved?'<path d="M-38 103h76v20h-76Z" fill="#182b21"/><path d="M-2 107h20m-15-4v8m7-8v8" stroke="#c6ad72" stroke-width="2"/><circle cx="-9" cy="107" r="5" fill="none" stroke="#c6ad72" stroke-width="2"/>':''}
  </g>
  <g transform="translate(45 269)"><path d="M0 6q55-21 110 0v150q-55 21-110 0Z" fill="#76654a" stroke="#27372b" stroke-width="4"/><path d="M9 13q46-15 92 0v135q-46 16-92 0Z" fill="url(#glass)" stroke="#b3a177" stroke-width="2"/><path d="M16 134L83 17M23 140L90 23" stroke="#c5c4a3" opacity=".15" stroke-width="5"/><path d="M2 160q52 15 105 0" fill="none" stroke="#a99564" stroke-width="2"/></g>
  <g transform="translate(726 132) rotate(3)"><path d="M0 0h101v133H0Z" fill="#65553b" stroke="#223629" stroke-width="4"/><path d="M8 8h85v117H8Z" fill="#afa17b" stroke="#a28e60" stroke-width="2"/><path d="M17 17h67v95H17Z" fill="#657261"/><path d="M19 90q30-49 62 0v20H19" fill="#343f31"/><ellipse cx="51" cy="57" rx="16" ry="22" fill="#a89975"/><path d="M33 52q-1-31 21-23q20-1 14 33l-6-15-24 6Z" fill="#2d382d"/><path d="M44 71q9 5 15 0" stroke="#5e6049" fill="none"/></g>
  <g transform="translate(849 94)">
    <path d="M-10 0h135v458H-10Z" fill="#273c2d" stroke="#172a20" stroke-width="4"/>
    <path d="M0 10h115v437H0Z" fill="${s.escaped?'#c6c2a3':'#4c5842'}" stroke="#7c8060" stroke-width="3"/>
    ${s.escaped?'<path d="M8 16h101v425H8Z" fill="#c8c6a7"/><path d="M20 440L58 80l39 360" fill="#e1d8b4" opacity=".7"/>':`<path d="M14 27h86v126H14ZM14 174h86v109H14ZM14 301h86v115H14Z" fill="none" stroke="#293e2d" stroke-width="3"/><path d="M20 34h74v112H20ZM20 181h74v95H20ZM20 308h74v101H20Z" fill="none" stroke="#77805a" opacity=".5"/><circle cx="55" cy="102" r="8" fill="#263a2a" stroke="#8b8b62" stroke-width="2"/><path d="M55 90v24M43 102h24" stroke="#8b8b62" stroke-width="1"/><rect x="20" y="210" width="74" height="35" rx="2" fill="#313b2b" stroke="#8d8054" stroke-width="2"/><path d="M34 218v18m23-18v18m23-18v18" stroke="#aa996a" stroke-width="2"/><path d="M91 270h13" stroke="#c5ad70" stroke-width="4" stroke-linecap="round"/><path d="M97 274v11" stroke="#c5ad70" stroke-width="2"/>`}
    <path d="M-14 447h145v13H-14Z" fill="#202f23"/>
  </g>
  <g transform="translate(642 441)">
    <path d="M0 0h186l8 121H-8Z" fill="url(#wood)" stroke="#203326" stroke-width="4"/>
    <path d="M-10-9h204V3H-10Z" fill="#8a7652" stroke="#283a2a" stroke-width="3"/>
    <path d="M5 16h176v44H5ZM2 70h182v40H2Z" fill="${s.drawerOpen?'#292f23':'#665b3e'}" stroke="#2c3927" stroke-width="2"/>
    <path d="M8 20h168M5 75h174" stroke="#b29b69" opacity=".45"/>
    <path d="M82 41h23M82 93h23" stroke="#b7a372" stroke-width="4" stroke-linecap="round"/>
    <circle cx="94" cy="29" r="3" fill="#263225"/>
    <path d="M4 122v17h12l5-17m141 0 6 17h12v-17" fill="#544b34" stroke="#213327" stroke-width="2"/>
  </g>
  <g transform="translate(658 360)">
    <path d="M3 7q83-15 164 0v74H3Z" fill="#463e2d" stroke="#1c3124" stroke-width="4"/>
    <path d="M11 14q73-10 148 0v59H11Z" fill="#a29266" stroke="#6b6242" stroke-width="2"/>
    <path d="M19 24h67v40H19Z" fill="#3f4935"/>
    ${Array.from({length:10},(_,i)=>`<path d="M${23+i*6} 26v34" stroke="#8e8b60" opacity=".6"/>`).join('')}
    <path d="M97 23h53v13H97Z" fill="#343f2e" stroke="#4e5739"/>
    <path d="M102 29h44" stroke="#a3a471" stroke-width="1"/><path d="M${s.radioSolved?120:108} 24v10" stroke="#d4b578" stroke-width="1.5"/>
    <circle cx="110" cy="54" r="10" fill="#3a422e" stroke="#6c6c46" stroke-width="2"/><circle cx="140" cy="54" r="8" fill="#3a422e" stroke="#6c6c46" stroke-width="2"/>
    <path d="M23 77h120v6H23Z" fill="#262f22"/>
    ${s.radioSolved?'<circle cx="153" cy="24" r="3" fill="#dcc38a"/>':''}
    <path d="M129 1l23-46" stroke="#a9a081" stroke-width="2"/>
  </g>
  <path d="M548 496q7-10 61-6l16 24-83 3Z" fill="#55513a" stroke="#26372a" stroke-width="3"/>
  <path d="M549 513l-9 98m78-98 13 98M547 501l-11-96m73 91 5-91" fill="none" stroke="#2c3929" stroke-width="7"/>
  <path d="M534 408q39-17 82-1l-5 56q-34-10-71 1Z" fill="#6d6747" stroke="#2b3828" stroke-width="3"/><path d="M545 417q29-9 60 0m-60 10q29-9 60 0" stroke="#a39565" fill="none" opacity=".4"/>
  <g transform="translate(89 479)">
    <path d="M8 2L0 143h16L32 6m229-4 8 141h-16L238 6" fill="#493c29" stroke="#243226" stroke-width="3"/>
    <path d="M16 0h241v30H16Z" fill="#625337" stroke="#263627" stroke-width="3"/><path d="M24 29h224v6H24Z" fill="#3e3928"/>
    <path d="M-8-14q136-8 275 0l6 18H-12Z" fill="#8f7950" stroke="#293829" stroke-width="4"/>
    <path d="M2-10q128-7 253 0" stroke="#c1a575" stroke-width="2" fill="none"/>
  </g>
  <g transform="translate(160 451)">
    <ellipse cy="-1" rx="30" ry="7" fill="#a88c56" stroke="#3b3e29" stroke-width="2"/>
    <path d="M-7-9h14l-3-16h-8Z" fill="#9e8958" stroke="#41422c" stroke-width="2"/>
    <path d="M-10-23h20v-47q-10-7-20 0Z" fill="#c7b98a" stroke="#686349" stroke-width="2"/>
    <path d="M-9-58l6 13v-13l7 4 2-12" stroke="#e0cda2" stroke-width="2" fill="none"/>
    <path d="M0-73v-7" stroke="#2e3a27" stroke-width="2"/>
    ${s.candleLit?'<ellipse class="flame-glow" cy="-85" rx="20" ry="29" fill="#ffcf79" opacity=".4" filter="url(#glow)"/><path class="flame" d="M0-76q-16-10 1-30q13 24-1 30Z" fill="#e2b26b"/><path d="M0-77q-6-6 0-16q6 12 0 16Z" fill="#f6e5a6"/>':''}
  </g>
  ${!s.taken.includes('letter')?'<g transform="translate(244 452) rotate(-9)"><path d="M0-22h66l-3 40H-5Z" fill="#c9bc91" stroke="#645f42" stroke-width="1.5"/><path d="M8-11h42M7-5h25M5 9h45" stroke="#8e8c62" opacity=".5"/><path d="M49-18l13 1-2 11" fill="#a99f78"/></g>':''}
  <g transform="translate(316 450)"><ellipse cy="3" rx="18" ry="6" fill="#353e2b"/><path d="M-13-4h26v-20h-26Z" fill="#787956" stroke="#394630" stroke-width="2"/><path d="M13-22q20-1 14 12q-3 6-14 3" fill="none" stroke="#68724c" stroke-width="3"/></g>
  <g transform="translate(704 332)">${leaves(0,-130)}<path d="M-29-49h57l-9 49h-40Z" fill="#83654b" stroke="#2c3b2b" stroke-width="3"/><path d="M-33-54h65v9h-65Z" fill="#a57c53" stroke="#2b3d2b" stroke-width="2"/><path d="M-22-37h39l-5 30h-27Z" fill="none" stroke="#b08a5e" opacity=".4"/></g>
  <path d="M662 336h85" stroke="#9b9062" stroke-width="5"/>
  <path d="M667 340v14m75-14v14" stroke="#344632" stroke-width="4"/>
  ${!s.taken.includes('matches')?'<path d="M733 329h19v9h-19Z" fill="#af9b69" stroke="#534a31" stroke-width="1.5"/>':''}
  <g opacity=".5" stroke="#c5c3a0" fill="none"><path d="M0 68q17 9 0 17m0-17q25 9 20 29m-20-29q36 6 43 40M0 69l31 39" stroke-width=".5"/></g>
  ${s.candleLit?'<ellipse cx="161" cy="366" rx="200" ry="213" fill="url(#light)"/>':''}
  <path d="M0 0H1000V700H0Z" fill="url(#shade)"/>
  </g>
  <g class="dust" fill="#dacb9d" opacity=".25"><circle cx="320" cy="326" r="1.2"/><circle cx="290" cy="404" r="1"/><circle cx="439" cy="446" r="1"/><circle cx="617" cy="298" r="1.4"/><circle cx="507" cy="120" r="1"/><circle cx="338" cy="175" r="1"/></g>
  </svg>`;
}

const paths: Record<Item, string> = {
  matches: '<path d="M12 21l30-8 10 32-30 8Z" fill="#b59258"/><path d="M16 24l23-6 7 24-23 6Z" fill="#72533b"/><path d="M25 27l14 13m-17-8 12 11" stroke="#d6c08a" stroke-width="2"/><path d="M25 27l2 2m-5 3 2 2" stroke="#bb6f48" stroke-width="4"/>',
  letter: '<path d="M13 10h35l5 42-40 3Z" fill="#d0bf92" stroke="#796c4d" stroke-width="1.5"/><path d="M21 21h19m-18 7h22m-21 7h17m-15 8h18" stroke="#807958" stroke-width="1.5"/>',
  key: '<g transform="rotate(-35 32 32)"><circle cx="32" cy="19" r="11" fill="none" stroke="#c3a368" stroke-width="5"/><path d="M32 30v26m0-9h9m-9 8h9" stroke="#c3a368" stroke-width="5"/></g>',
  tape: '<rect x="7" y="15" width="50" height="34" rx="4" fill="#8d8e71" stroke="#c3b78b" stroke-width="1.5"/><path d="M12 20h40v17H12Z" fill="#c1b68e"/><circle cx="22" cy="28" r="5" fill="#36443a"/><circle cx="43" cy="28" r="5" fill="#36443a"/><path d="M24 28h16" stroke="#4a5443" stroke-width="3"/><path d="M18 49l4-9h20l4 9" fill="#455044"/>',
  photo: '<g transform="rotate(-7 32 32)"><path d="M11 6h42v51H11Z" fill="#c9bb94"/><path d="M15 10h34v36H15Z" fill="#5b6b57"/><path d="M16 43l10-19 10 13 7-11 6 17" fill="#314b3b"/><circle cx="37" cy="20" r="5" fill="#bcad7d"/></g>',
};
export function itemArt(item: Item): string {
  return `<svg viewBox="0 0 64 64" fill="none" aria-hidden="true">${paths[item]}</svg>`;
}

export function icon(name: string, size = 20): string {
  const p: Record<string, string> = {
    sound: '<path d="M11 4 6 8H2v8h4l5 4V4Zm4 4q4 4 0 8m3-11q7 7 0 14"/>',
    mute: '<path d="M11 4 6 8H2v8h4l5 4V4Zm5 5 6 6m0-6-6 6"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3q-1 .5-1 2.2M12 17h.01"/>',
    arrow: '<path d="m5 12h14m-6-6 6 6-6 6"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    book: '<path d="M3 4h7q2 0 2 2v15q0-3-3-3H3V4Zm18 0h-7q-2 0-2 2m0 15q0-3 3-3h6V4"/>',
    heart: '<path d="M12 20S1 13 3 7q3-6 9 0 6-6 9 0 2 6-9 13Z"/>',
    silence: '<path d="M17 3A9 9 0 1 0 21 17 9 9 0 0 1 17 3Z"/>',
    rain: '<path d="M7 12a4 4 0 0 1 0-8 6 6 0 0 1 11 1 4 4 0 0 1 0 8H7m0 3-1 3m6-3-1 3m6-3-1 3"/>',
    reset: '<path d="M4 10a8 8 0 1 1 1 7M4 4v6h6"/>',
    eye: '<path d="M2 12q10-15 20 0-10 15-20 0Z"/><circle cx="12" cy="12" r="3"/>',
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p[name] ?? p.eye}</svg>`;
}
