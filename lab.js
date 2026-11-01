(function(root){
  'use strict';
  /* Анимированные SVG-сцены для карт лаборатории. Движение — на CSS (lab.css),
     поэтому prefers-reduced-motion автоматически останавливает анимацию. */
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const B='<rect width="320" height="190" rx="14" fill="#f6f1fb"/>';
  const FLOOR='<rect x="18" y="150" width="284" height="7" rx="3.5" fill="#d9cbe9"/>';
  function arrow(x1,y1,x2,y2,color,w){return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${w||3}" stroke-linecap="round" marker-end="url(#xlab-none)"/>`;}
  function ray(x1,y1,x2,y2,color){return `<line class="xa-ray" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="3" stroke-linecap="round"/>`;}
  function bulb(x,y,on){return `<circle cx="${x}" cy="${y}" r="14" fill="${on?'#ffd982':'#e7e0ef'}" stroke="#b9a4cd" stroke-width="2.5" class="${on?'xa-glow':''}"/><path d="M${x-5} ${y+11} h10 v6 h-10 z" fill="#a99cbc"/>`;}
  function battery(x,y){return `<rect x="${x}" y="${y}" width="34" height="22" rx="4" fill="#7d6b99"/><rect x="${x+34}" y="${y+6}" width="5" height="10" rx="2" fill="#7d6b99"/><text x="${x+17}" y="${y+16}" text-anchor="middle" font-size="12" fill="#fff">+ −</text>`;}

  const scenes={
    pendulum(){return B+`<line x1="120" y1="22" x2="200" y2="22" stroke="#b9a4cd" stroke-width="5" stroke-linecap="round"/>
      <g class="xa-swing" style="transform-origin:160px 22px"><line x1="160" y1="22" x2="160" y2="112" stroke="#8d7a9e" stroke-width="2.5"/><circle cx="160" cy="120" r="15" fill="#9b7bd4"/><circle cx="155" cy="115" r="4" fill="#cdb4ec"/></g>
      <path d="M100 120 Q160 150 220 120" stroke="#cbb6e0" stroke-width="2" stroke-dasharray="4 6" fill="none"/>`;},
    freefall(){return B+FLOOR+`<line x1="60" y1="30" x2="60" y2="150" stroke="#e3d7ef" stroke-width="2" stroke-dasharray="3 6"/>
      <g class="xa-fall"><circle cx="115" cy="40" r="17" fill="#9b7bd4"/></g><g class="xa-fall"><circle cx="205" cy="40" r="10" fill="#e8a2b8"/></g>
      <text x="115" y="180" text-anchor="middle" font-size="11" fill="#8d7a9e">тяжёлый</text><text x="205" y="180" text-anchor="middle" font-size="11" fill="#8d7a9e">лёгкий</text>`;},
    incline(){return B+`<path d="M40 150 L260 150 L260 55 Z" fill="#e2d6ee"/><path d="M40 150 L260 55" stroke="#b9a4cd" stroke-width="4"/>
      <g class="xa-roll"><circle r="14" fill="#9b7bd4"/><circle r="6" fill="#cdb4ec"/></g>`;},
    spring(){return B+`<rect x="135" y="18" width="50" height="8" rx="3" fill="#b9a4cd"/>
      <g class="xa-bounce"><path d="M160 26 l-12 8 24 8 -24 8 24 8 -24 8 24 8 -12 8" stroke="#8d7a9e" stroke-width="3" fill="none"/><rect x="141" y="82" width="38" height="30" rx="5" fill="#9b7bd4"/></g>
      <line x1="215" y1="60" x2="215" y2="130" stroke="#e3d7ef" stroke-width="2" stroke-dasharray="3 6"/>`;},
    lever(){return B+`<path d="M160 128 L142 152 L178 152 Z" fill="#b9a4cd"/>
      <g class="xa-tilt" style="transform-origin:160px 120px"><rect x="60" y="114" width="200" height="8" rx="4" fill="#9b7bd4"/>
      <rect x="70" y="88" width="30" height="26" rx="4" fill="#7a5ab8"/><rect x="228" y="98" width="18" height="16" rx="3" fill="#d3a7c0"/></g>
      <text x="85" y="80" text-anchor="middle" font-size="11" fill="#8d7a9e">тяжёлый</text><text x="237" y="90" text-anchor="middle" font-size="11" fill="#8d7a9e">лёгкий</text>`;},
    pulley(){return B+`<circle cx="160" cy="45" r="17" fill="#e2d6ee" stroke="#b9a4cd" stroke-width="3"/>
      <path d="M143 45 v85 M177 45 v60" stroke="#8d7a9e" stroke-width="2.5"/>
      <g class="xa-bob"><rect x="163" y="105" width="28" height="24" rx="4" fill="#9b7bd4"/></g>
      <g class="xa-bob-rev"><rect x="131" y="130" width="24" height="20" rx="4" fill="#d3a7c0"/></g>
      <path d="M160 28 v-12" stroke="#b9a4cd" stroke-width="4"/>`;},
    collision(){return B+FLOOR+`<g class="xa-cart"><rect x="45" y="112" width="52" height="26" rx="6" fill="#9b7bd4"/><circle cx="58" cy="143" r="8" fill="#6b5290"/><circle cx="85" cy="143" r="8" fill="#6b5290"/></g>
      <g class="xa-cart-hit"><rect x="205" y="112" width="52" height="26" rx="6" fill="#e8a2b8"/><circle cx="218" cy="143" r="8" fill="#b97e96"/><circle cx="245" cy="143" r="8" fill="#b97e96"/></g>`;},
    friction(){return B+`<rect x="30" y="128" width="260" height="14" rx="4" fill="#cbb6e0"/><path d="M40 128 l8 -6 M65 128 l8 -6 M90 128 l8 -6 M115 128 l8 -6 M140 128 l8 -6 M165 128 l8 -6 M190 128 l8 -6 M215 128 l8 -6 M240 128 l8 -6 M265 128 l8 -6" stroke="#a98fc6" stroke-width="2"/>
      <g class="xa-slide"><rect x="120" y="96" width="56" height="32" rx="5" fill="#9b7bd4"/><path d="M176 104 h34 m-8 -6 8 6 -8 6" stroke="#ce7544" stroke-width="3" fill="none"/></g>`;},
    pressure(){return B+`<rect x="30" y="140" width="260" height="26" rx="6" fill="#eadfc8"/>
      <g class="xa-press"><rect x="60" y="112" width="70" height="24" rx="4" fill="#9b7bd4"/><rect x="62" y="132" width="66" height="8" rx="3" fill="#d8c6a8"/></g>
      <g class="xa-press deep"><rect x="185" y="96" width="22" height="40" rx="4" fill="#9b7bd4"/><rect x="183" y="132" width="26" height="16" rx="4" fill="#c9b295"/></g>
      <text x="95" y="104" text-anchor="middle" font-size="11" fill="#8d7a9e">широкая</text><text x="196" y="88" text-anchor="middle" font-size="11" fill="#8d7a9e">узкая</text>`;},
    floating(){return B+`<path d="M20 95 Q45 87 70 95 T120 95 T170 95 T220 95 T270 95 T300 95 V170 H20 Z" fill="#a9cbe4" opacity=".75"/>
      <g class="xa-bob"><rect x="130" y="62" width="62" height="42" rx="6" fill="#d3a7c0"/><rect x="130" y="62" width="62" height="12" rx="6" fill="#e5c3d4"/></g>
      <path d="M230 55 v30 m-7 -8 7 8 7 -8" stroke="#7d6b99" stroke-width="3" fill="none"/><text x="230" y="45" text-anchor="middle" font-size="11" fill="#8d7a9e">Fₐ = mg</text>`;},
    boiling(){return B+`<path d="M105 60 h110 v80 a20 20 0 0 1 -20 20 h-70 a20 20 0 0 1 -20 -20 z" fill="#d7e7f2" stroke="#a9b9cd" stroke-width="3"/>
      <path d="M110 95 h100 v45 a18 18 0 0 1 -18 18 h-64 a18 18 0 0 1 -18 -18 z" fill="#a9cbe4"/>
      <g class="xa-rise"><circle cx="140" cy="140" r="5" fill="#eef7fc"/></g><g class="xa-rise d1"><circle cx="170" cy="140" r="4" fill="#eef7fc"/></g><g class="xa-rise d2"><circle cx="195" cy="140" r="5" fill="#eef7fc"/></g>
      <g class="xa-wisp"><path d="M130 45 q6 -10 0 -20 M160 48 q6 -10 0 -20 M190 45 q6 -10 0 -20" stroke="#c5b6d6" stroke-width="3" fill="none" stroke-linecap="round"/></g>
      <path d="M100 168 h120" stroke="#ce7544" stroke-width="5" stroke-linecap="round" class="xa-glow"/>`;},
    melting(){return B+FLOOR+`<g class="xa-melt"><path d="M120 70 L185 70 L185 130 L120 130 Z" fill="#cfe6f5" stroke="#a9cbe4" stroke-width="3"/><path d="M120 70 l14 -12 h65 l-14 12 M185 70 l14 -12 v60 l-14 12" fill="#e3f1fa" stroke="#a9cbe4" stroke-width="2"/></g>
      <ellipse cx="153" cy="145" rx="52" ry="9" fill="#a9cbe4" opacity=".6" class="xa-puddle"/>
      <text x="153" y="45" text-anchor="middle" font-size="12" fill="#8d7a9e">0 °C</text>`;},
    evaporation(){return B+`<ellipse cx="150" cy="140" rx="80" ry="16" fill="#a9cbe4" class="xa-puddle-rev"/>
      <g class="xa-wisp"><path d="M110 105 q6 -10 0 -20 M150 108 q6 -10 0 -20 M190 105 q6 -10 0 -20" stroke="#b6c8dd" stroke-width="3" fill="none" stroke-linecap="round"/></g>
      <g class="xa-wind"><path d="M235 60 h45 m-10 -6 10 6 -10 6 M225 85 h55 m-10 -6 10 6 -10 6 M240 110 h40 m-10 -6 10 6 -10 6" stroke="#9db8d2" stroke-width="3" fill="none" stroke-linecap="round"/></g>`;},
    condensation(){return B+`<path d="M120 55 h80 v85 a16 16 0 0 1 -16 16 h-48 a16 16 0 0 1 -16 -16 z" fill="#e6eef5" stroke="#a9b9cd" stroke-width="3"/>
      <path d="M125 90 h70 v50 a14 14 0 0 1 -14 14 h-42 a14 14 0 0 0 -14 -14 z" fill="#a9cbe4"/>
      <rect x="140" y="98" width="16" height="16" rx="3" fill="#eef7fc" transform="rotate(12 148 106)"/><rect x="163" y="110" width="14" height="14" rx="3" fill="#eef7fc" transform="rotate(-14 170 117)"/>
      <g class="xa-drip"><circle cx="112" cy="90" r="4" fill="#8fb6d6"/></g><g class="xa-drip d1"><circle cx="208" cy="100" r="4" fill="#8fb6d6"/></g><g class="xa-drip d2"><circle cx="113" cy="120" r="3.5" fill="#8fb6d6"/></g>
      <text x="160" y="38" text-anchor="middle" font-size="11" fill="#8d7a9e">холодный стакан + воздух</text>`;},
    convection(){return B+`<rect x="85" y="40" width="150" height="115" rx="14" fill="#d7e7f2" stroke="#a9b9cd" stroke-width="3"/>
      <g class="xa-flow"><path d="M115 130 V70 q0 -12 12 -12 h70 q12 0 12 12 v60" stroke="#ce7544" stroke-width="4" fill="none" stroke-dasharray="7 7"/></g>
      <g class="xa-flow"><path d="M205 130 V75 M205 130 h-85 M120 130 V75" stroke="#397eaa" stroke-width="4" fill="none" stroke-dasharray="7 7" opacity=".6"/></g>
      <path d="M80 162 h160" stroke="#ce7544" stroke-width="5" stroke-linecap="round" class="xa-glow"/>
      <text x="160" y="30" text-anchor="middle" font-size="11" fill="#8d7a9e">тёплое вверх · холодное вниз</text>`;},
    conduction(){return B+`<path d="M40 95 h80 v45 a12 12 0 0 1 -12 12 h-56 a12 12 0 0 1 -12 -12 z" fill="#d7e7f2" stroke="#a9b9cd" stroke-width="3"/><path d="M45 110 h70 v30 a10 10 0 0 1 -10 10 h-50 a10 10 0 0 1 -10 -10 z" fill="#c98a6b"/>
      <g class="xa-heat"><path d="M120 128 L255 60" stroke="#9aa3b2" stroke-width="7" stroke-linecap="round"/><ellipse cx="120" cy="128" rx="14" ry="9" fill="#b9c2cf" transform="rotate(-28 120 128)"/></g>
      <path d="M120 128 L255 60" stroke="#ce7544" stroke-width="7" stroke-linecap="round" class="xa-heat-line" stroke-dasharray="160" stroke-dashoffset="160"/>
      <text x="205" y="110" text-anchor="middle" font-size="11" fill="#8d7a9e">ложка нагревается</text>`;},
    radiation(){return B+`<g class="xa-spin-slow" style="transform-origin:80px 70px"><circle cx="80" cy="70" r="26" fill="#ffcf6b"/><path d="M80 30 v-12 M80 110 v12 M40 70 h-12 M120 70 h12 M52 42 l-9 -9 M108 98 l9 9 M52 98 l-9 9 M108 42 l9 -9" stroke="#ffcf6b" stroke-width="5" stroke-linecap="round"/></g>
      <g class="xa-flow"><path d="M118 78 Q170 95 208 122" stroke="#eab55e" stroke-width="3" stroke-dasharray="6 8" fill="none"/><path d="M120 62 Q180 70 222 100" stroke="#eab55e" stroke-width="3" stroke-dasharray="6 8" fill="none"/></g>
      <circle cx="245" cy="140" r="24" fill="#7fb2d9"/><path d="M232 132 q10 -8 22 -2 M236 148 q12 6 20 -4" stroke="#a9d3b6" stroke-width="6" fill="none" stroke-linecap="round"/>`;},
    diffusion(){return B+`<path d="M110 40 h100 v105 a15 15 0 0 1 -15 15 h-70 a15 15 0 0 1 -15 -15 z" fill="#eef3f8" stroke="#a9b9cd" stroke-width="3"/>
      <path d="M115 60 h90 v85 a12 12 0 0 1 -12 12 h-66 a12 12 0 0 1 -12 -12 z" fill="#d7e7f2"/>
      <circle cx="160" cy="105" r="12" fill="#9b7bd4" opacity=".85" class="xa-spread"/>
      <circle cx="160" cy="105" r="30" fill="#9b7bd4" opacity=".4" class="xa-spread d1"/>
      <circle cx="160" cy="105" r="46" fill="#9b7bd4" opacity=".18" class="xa-spread d2"/>`;},
    expansion(){return B+`<circle cx="250" cy="105" r="34" fill="none" stroke="#9aa3b2" stroke-width="8"/>
      <g class="xa-expand"><circle cx="120" cy="105" r="24" fill="#ce8a5e"/><path d="M120 82 v-18" stroke="#ce8a5e" stroke-width="4"/></g>
      <path d="M150 105 h55 m-10 -7 10 7 -10 7" stroke="#8d7a9e" stroke-width="3" fill="none" stroke-dasharray="5 5"/>
      <text x="120" y="45" text-anchor="middle" font-size="11" fill="#8d7a9e">нагрели → не проходит</text>`;},
    steam(){return B+`<path d="M90 60 h85 v80 a15 15 0 0 1 -15 15 h-55 a15 15 0 0 1 -15 -15 z" fill="#d7e7f2" stroke="#a9b9cd" stroke-width="3"/>
      <path d="M175 75 h25 v18 h-25" fill="#e6eef5" stroke="#a9b9cd" stroke-width="3"/>
      <g class="xa-cork"><rect x="200" y="72" width="20" height="24" rx="5" fill="#c9a876"/></g>
      <g class="xa-rise"><circle cx="120" cy="130" r="5" fill="#eef7fc"/></g><g class="xa-rise d1"><circle cx="145" cy="130" r="4" fill="#eef7fc"/></g>
      <path d="M85 168 h95" stroke="#ce7544" stroke-width="5" stroke-linecap="round" class="xa-glow"/>
      <g class="xa-wind"><path d="M240 60 h35 m-8 -6 8 6 -8 6 M240 85 h40" stroke="#b6c8dd" stroke-width="3" fill="none" stroke-linecap="round"/></g>`;},
    circuit(){return B+`<path d="M70 140 V60 h180 v80" stroke="#8d7a9e" stroke-width="3.5" fill="none"/>
      ${battery(52,129)}${bulb(160,60,true)}
      <g class="xa-tilt" style="transform-origin:236px 140px"><line x1="212" y1="140" x2="258" y2="140" stroke="#8d7a9e" stroke-width="4" stroke-linecap="round"/></g>
      <circle cx="212" cy="140" r="4" fill="#7d6b99"/><circle cx="258" cy="140" r="4" fill="#7d6b99"/>
      <text x="160" y="172" text-anchor="middle" font-size="11" fill="#8d7a9e">ключ замкнут — лампа горит</text>`;},
    series(){return B+`<path d="M70 140 V55 h180 v85" stroke="#8d7a9e" stroke-width="3.5" fill="none"/>${battery(52,129)}
      ${bulb(125,55,false)}${bulb(195,55,false)}
      <path class="xa-glow" d="M188 48 l14 14 M202 48 l-14 14" stroke="#b65c96" stroke-width="3"/>
      <text x="160" y="172" text-anchor="middle" font-size="11" fill="#8d7a9e">одну выкрутили — цепь разомкнута</text>`;},
    parallel(){return B+`<path d="M70 140 V50 h180 v90 M70 105 h180" stroke="#8d7a9e" stroke-width="3.5" fill="none"/>${battery(52,129)}
      ${bulb(160,50,true)}${bulb(160,105,false)}
      <path d="M153 98 l14 14 M167 98 l-14 14" stroke="#b65c96" stroke-width="3"/>
      <text x="160" y="172" text-anchor="middle" font-size="11" fill="#8d7a9e">одна ветвь разорвана — другая горит</text>`;},
    electromagnet(){return B+`<rect x="140" y="40" width="40" height="80" rx="6" fill="#c9b295"/>
      <path d="M140 50 h40 M140 62 h40 M140 74 h40 M140 86 h40 M140 98 h40 M140 110 h40" stroke="#ce7544" stroke-width="5"/>
      <path d="M140 50 h-40 v100 h120 M180 120 h60" stroke="#8d7a9e" stroke-width="3" fill="none"/>${battery(85,139)}
      <g class="xa-bob"><path d="M215 150 q0 -10 8 -10 M228 152 q0 -10 8 -10 M241 150 q0 -10 8 -10" stroke="#7d6b99" stroke-width="3" fill="none"/></g>
      <text x="160" y="180" text-anchor="middle" font-size="11" fill="#8d7a9e">сердечник усиливает поле</text>`;},
    magnet(){return B+`<g class="xa-mag-left"><rect x="55" y="80" width="70" height="30" rx="5" fill="#ce7544"/><rect x="55" y="80" width="35" height="30" rx="5" fill="#397eaa"/><text x="72" y="100" font-size="13" fill="#fff">S</text><text x="102" y="100" font-size="13" fill="#fff">N</text></g>
      <g class="xa-mag-right"><rect x="195" y="80" width="70" height="30" rx="5" fill="#ce7544"/><rect x="230" y="80" width="35" height="30" rx="5" fill="#397eaa"/><text x="205" y="100" font-size="13" fill="#fff">N</text><text x="242" y="100" font-size="13" fill="#fff">S</text></g>
      <path d="M140 95 h-18 m5 -6 -5 6 5 6 M180 95 h18 m-5 -6 5 6 -5 6" stroke="#b65c96" stroke-width="3" fill="none"/>`;},
    electroscope(){return B+`<rect x="140" y="55" width="40" height="10" rx="4" fill="#9aa3b2"/><rect x="155" y="65" width="10" height="45" fill="#b9c2cf"/>
      <g class="xa-leaf-l" style="transform-origin:160px 110px"><path d="M160 110 l-22 38" stroke="#d9b84e" stroke-width="6" stroke-linecap="round"/></g>
      <g class="xa-leaf-r" style="transform-origin:160px 110px"><path d="M160 110 l22 38" stroke="#d9b84e" stroke-width="6" stroke-linecap="round"/></g>
      <g class="xa-bob"><rect x="110" y="18" width="60" height="12" rx="6" fill="#9b7bd4"/></g>
      <text x="200" y="40" font-size="16" fill="#b65c96">− − −</text>`;},
    meters(){return B+`<path d="M70 140 V70 h180 v70 M70 140 h180 M150 140 V105 H225 M255 105 H200 V140" stroke="#8d7a9e" stroke-width="3.5" fill="none"/>${battery(52,129)}
      <circle cx="130" cy="70" r="15" fill="#fff" stroke="#7d6b99" stroke-width="3"/><text x="130" y="76" text-anchor="middle" font-size="14" fill="#7d6b99">A</text>
      <circle cx="240" cy="105" r="15" fill="#fff" stroke="#7d6b99" stroke-width="3"/><text x="240" y="111" text-anchor="middle" font-size="14" fill="#7d6b99">V</text>
      <rect x="150" y="130" width="50" height="16" rx="4" fill="#b9a4cd"/><text x="175" y="142" text-anchor="middle" font-size="11" fill="#fff">R</text>
      <text x="130" y="42" text-anchor="middle" font-size="12" fill="#397eaa" class="xa-glow">I ×2</text><text x="240" y="75" text-anchor="middle" font-size="12" fill="#397eaa">U ×2</text>`;},
    coil(){return B+`<path d="M70 150 V70 h180 v80" stroke="#8d7a9e" stroke-width="3.5" fill="none"/>${battery(52,139)}
      <path d="M120 70 q10 -22 20 0 q10 22 20 0 q10 -22 20 0 q10 22 20 0 q10 -22 20 0" stroke="#ce7544" stroke-width="5" fill="none" class="xa-glow"/>
      <g class="xa-wisp"><path d="M140 30 q6 -10 0 -18 M175 32 q6 -10 0 -18 M205 30 q6 -10 0 -18" stroke="#d8a06e" stroke-width="3" fill="none" stroke-linecap="round"/></g>
      <text x="160" y="180" text-anchor="middle" font-size="11" fill="#8d7a9e">Q = I²Rt</text>`;},
    compass(){return B+`<path d="M40 70 h240" stroke="#8d7a9e" stroke-width="5" stroke-linecap="round"/>
      <circle cx="160" cy="125" r="38" fill="#fff" stroke="#b9a4cd" stroke-width="3"/>
      <g class="xa-needle" style="transform-origin:160px 125px"><path d="M160 100 L168 125 L160 150 L152 125 Z" fill="#ce7544"/><path d="M160 100 L168 125 L152 125 Z" fill="#397eaa"/></g>
      <text x="160" y="35" text-anchor="middle" font-size="12" fill="#8d7a9e">ток включён — стрелка повернулась</text>
      <g class="xa-flow"><circle cx="90" cy="70" r="14" fill="none" stroke="#b65c96" stroke-width="2" stroke-dasharray="4 5"/></g>`;},
    conductor(){return B+`<path d="M70 140 V60 h70 M250 60 h-70 M70 140 h180" stroke="#8d7a9e" stroke-width="3.5" fill="none"/>${battery(52,129)}${bulb(70,60,true)}
      <path d="M140 60 h40" stroke="#9aa3b2" stroke-width="8" stroke-linecap="round"/>
      <rect x="195" y="54" width="40" height="12" rx="6" fill="#d3a7c0"/>
      <text x="160" y="38" text-anchor="middle" font-size="11" fill="#8d7a9e">гвоздь ✓ · резина ✗</text>
      <text x="160" y="100" text-anchor="middle" font-size="12" fill="#8d7a9e">гвоздь → лампа горит</text>`;},
    lens(){return B+`<ellipse cx="160" cy="95" rx="14" ry="55" fill="#bcd9ee" stroke="#8fb6d6" stroke-width="2.5" opacity=".9"/>
      ${ray(40,55,160,55,'#eab55e')}${ray(160,55,290,95,'#eab55e')}${ray(40,95,160,95,'#eab55e')}${ray(160,95,290,95,'#eab55e')}${ray(40,135,160,135,'#eab55e')}${ray(160,135,290,95,'#eab55e')}
      <circle cx="275" cy="95" r="5" fill="#ce7544" class="xa-glow"/><text x="275" y="80" text-anchor="middle" font-size="11" fill="#8d7a9e">F</text>`;},
    diverge(){return B+`<path d="M160 40 q-16 55 0 110 q16 -55 0 -110" fill="#bcd9ee" stroke="#8fb6d6" stroke-width="2.5"/>
      ${ray(40,55,160,55,'#eab55e')}${ray(160,55,290,25,'#eab55e')}${ray(40,95,160,95,'#eab55e')}${ray(160,95,290,95,'#eab55e')}${ray(40,135,160,135,'#eab55e')}${ray(160,135,290,165,'#eab55e')}
      <path d="M100 95 h20 M290 25 l-18 4 M290 165 l-18 -4" stroke="#d8a06e" stroke-width="2" stroke-dasharray="4 4"/>
      <text x="160" y="180" text-anchor="middle" font-size="11" fill="#8d7a9e">лучи расходятся</text>`;},
    mirror(){return B+`<rect x="155" y="30" width="10" height="130" rx="3" fill="#9aa3b2"/><rect x="155" y="30" width="4" height="130" fill="#cfe0ee"/>
      <g class="xa-bob"><path d="M95 60 l18 30 h-36 z" fill="#9b7bd4"/><circle cx="95" cy="52" r="8" fill="#9b7bd4"/></g>
      <g class="xa-bob" opacity=".45"><path d="M225 60 l18 30 h-36 z" fill="#9b7bd4"/><circle cx="225" cy="52" r="8" fill="#9b7bd4"/></g>
      <path d="M95 100 h45 M225 100 h-45" stroke="#cbb6e0" stroke-width="2" stroke-dasharray="4 5"/>
      <text x="160" y="180" text-anchor="middle" font-size="11" fill="#8d7a9e">такое же · прямое · мнимое</text>`;},
    refraction(){return B+`<rect x="20" y="95" width="280" height="75" fill="#bcd9ee" opacity=".55"/><line x1="20" y1="95" x2="300" y2="95" stroke="#8fb6d6" stroke-width="2"/>
      ${ray(70,25,160,95,'#eab55e')}${ray(160,95,200,165,'#d8a06e')}
      <line x1="160" y1="35" x2="160" y2="160" stroke="#b9a4cd" stroke-width="2" stroke-dasharray="4 5"/>
      <text x="245" y="55" font-size="11" fill="#8d7a9e">воздух</text><text x="245" y="135" font-size="11" fill="#5d84a3">вода</text>`;},
    prism(){return B+`<path d="M140 45 L205 140 L75 140 Z" fill="#e3eef7" stroke="#a9b9cd" stroke-width="2.5" opacity=".9"/>
      ${ray(30,85,122,105,'#f5f0e8')}${ray(30,85,122,105,'#d8cba8')}
      <g class="xa-glow"><path d="M152 112 L275 60" stroke="#ce6b6b" stroke-width="4"/><path d="M154 116 L280 80" stroke="#eab55e" stroke-width="4"/><path d="M156 120 L285 100" stroke="#7fb2d9" stroke-width="4"/><path d="M157 124 L288 120" stroke="#9b7bd4" stroke-width="4"/></g>
      <text x="160" y="172" text-anchor="middle" font-size="11" fill="#8d7a9e">белый свет → спектр</text>`;},
    shadow(){return B+`<circle cx="55" cy="80" r="16" fill="#ffcf6b" class="xa-glow"/>
      ${ray(70,68,140,40,'#eab55e')}${ray(70,92,140,120,'#eab55e')}
      <rect x="140" y="40" width="12" height="80" rx="3" fill="#7d6b99"/>
      <rect x="245" y="25" width="10" height="140" fill="#cbb6e0"/>
      <path d="M152 40 L245 25 M152 120 L245 165" stroke="#d8cba8" stroke-width="2" stroke-dasharray="4 5"/>
      <rect x="243" y="25" width="6" height="140" fill="#8d7a9e" opacity=".35"/>
      <text x="160" y="180" text-anchor="middle" font-size="11" fill="#8d7a9e">свет идёт прямо → тень</text>`;},
    pinhole(){return B+`<path d="M60 45 l22 32 h-44 z" fill="#9b7bd4"/><circle cx="60" cy="38" r="8" fill="#9b7bd4"/>
      <rect x="150" y="35" width="8" height="60" fill="#7d6b99"/><rect x="150" y="115" width="8" height="45" fill="#7d6b99"/>
      ${ray(60,38,154,103,'#eab55e')}${ray(154,103,255,140,'#eab55e')}${ray(60,80,154,102,'#d8a06e')}
      <rect x="255" y="35" width="8" height="125" fill="#cbb6e0"/>
      <g class="xa-bob" opacity=".8"><path d="M235 155 l-18 -26 h36 z" fill="#9b7bd4"/></g>
      <text x="160" y="180" text-anchor="middle" font-size="11" fill="#8d7a9e">изображение перевёрнуто</text>`;},
    reflection(){return B+`<rect x="30" y="130" width="260" height="10" rx="3" fill="#9aa3b2"/><rect x="30" y="130" width="260" height="4" fill="#cfe0ee"/>
      ${ray(70,35,170,130,'#eab55e')}${ray(170,130,270,35,'#eab55e')}
      <line x1="170" y1="40" x2="170" y2="125" stroke="#b9a4cd" stroke-width="2" stroke-dasharray="4 5"/>
      <path d="M170 70 A45 45 0 0 0 143 65 M170 70 A45 45 0 0 1 197 65" stroke="#8d7a9e" stroke-width="2" fill="none"/>
      <text x="120" y="60" font-size="12" fill="#8d7a9e">30°</text><text x="205" y="60" font-size="12" fill="#8d7a9e">30°</text>`;},
    magnifier(){return B+`<ellipse cx="150" cy="75" rx="16" ry="48" fill="#bcd9ee" stroke="#8fb6d6" stroke-width="3" opacity=".9"/>
      <line x1="162" y1="115" x2="195" y2="155" stroke="#9b7bd4" stroke-width="10" stroke-linecap="round"/>
      <text x="70" y="95" font-size="18" fill="#8d7a9e">Ф = ma</text>
      <text x="205" y="70" font-size="26" fill="#9b7bd4" class="xa-glow">Ф = ma</text>
      <path d="M100 75 h25 M180 70 h15" stroke="#cbb6e0" stroke-width="2" stroke-dasharray="4 5"/>`;},
    lightspeed(){return B+`<rect x="40" y="45" width="100" height="100" rx="12" fill="#eef3f8" stroke="#a9b9cd" stroke-width="2.5"/><rect x="185" y="45" width="100" height="100" rx="12" fill="#bcd9ee" opacity=".6" stroke="#8fb6d6" stroke-width="2.5"/>
      <text x="90" y="65" text-anchor="middle" font-size="12" fill="#8d7a9e">воздух</text><text x="235" y="65" text-anchor="middle" font-size="12" fill="#5d84a3">вода</text>
      <g class="xa-light-fast"><circle cx="90" cy="105" r="9" fill="#eab55e"/></g><g class="xa-light-slow"><circle cx="235" cy="105" r="9" fill="#d8a06e"/></g>
      <text x="90" y="165" text-anchor="middle" font-size="11" fill="#8d7a9e">≈ 300 000 км/с</text><text x="235" y="165" text-anchor="middle" font-size="11" fill="#8d7a9e">≈ 225 000 км/с</text>`;},
    atom(){return atomScene(3,'ядро +','#9b7bd4');},
    nucleus(){return B+`<circle cx="160" cy="95" r="42" fill="#f3e9f8" stroke="#cbb6e0" stroke-width="2"/>
      <g class="xa-bob"><circle cx="145" cy="85" r="15" fill="#ce6b6b"/><circle cx="172" cy="92" r="15" fill="#ce6b6b"/><circle cx="152" cy="110" r="15" fill="#b9a4cd"/><circle cx="178" cy="72" r="13" fill="#b9a4cd"/></g>
      <text x="160" y="170" text-anchor="middle" font-size="12" fill="#8d7a9e">протоны + · нейтроны 0</text>`;},
    electrons(){return atomScene(4,'e⁻','#397eaa');},
    ion(){return B+atomScene(2,'','#9b7bd4').replace(B,'')+`<g class="xa-fly"><circle cx="230" cy="45" r="7" fill="#397eaa"/><text x="230" y="30" text-anchor="middle" font-size="11" fill="#397eaa">e⁻</text></g>
      <text x="160" y="180" text-anchor="middle" font-size="12" fill="#b65c96">атом → положительный ион +</text>`;},
    beta(){return decayScene('β⁻','#397eaa','A не меняется, Z +1');},
    alpha(){return decayScene('α','#ce7544','A −4 · Z −2');},
    isotopes(){return B+`<g class="xa-bob"><circle cx="105" cy="90" r="30" fill="#f3e9f8" stroke="#cbb6e0" stroke-width="2"/><circle cx="98" cy="85" r="9" fill="#ce6b6b"/><circle cx="114" cy="92" r="9" fill="#ce6b6b"/><circle cx="103" cy="99" r="8" fill="#b9a4cd"/></g>
      <g class="xa-bob"><circle cx="215" cy="90" r="30" fill="#f3e9f8" stroke="#cbb6e0" stroke-width="2"/><circle cx="205" cy="82" r="9" fill="#ce6b6b"/><circle cx="222" cy="88" r="9" fill="#ce6b6b"/><circle cx="212" cy="96" r="8" fill="#b9a4cd"/><circle cx="222" cy="103" r="8" fill="#b9a4cd"/><circle cx="200" cy="96" r="8" fill="#b9a4cd"/></g>
      <text x="105" y="145" text-anchor="middle" font-size="11" fill="#8d7a9e">2 протона · 1 нейтрон</text><text x="215" y="145" text-anchor="middle" font-size="11" fill="#8d7a9e">2 протона · 3 нейтрона</text>
      <text x="160" y="172" text-anchor="middle" font-size="11" fill="#b65c96">разное число нейтронов</text>`;},
    photoelectric(){return B+`<rect x="150" y="110" width="130" height="26" rx="5" fill="#9aa3b2"/>
      <g class="xa-flow"><path d="M60 35 L150 105 M85 25 L160 95 M40 55 L140 118" stroke="#eab55e" stroke-width="3" stroke-dasharray="7 7"/></g>
      <g class="xa-fly"><circle cx="200" cy="90" r="6" fill="#397eaa"/><text x="200" y="76" text-anchor="middle" font-size="11" fill="#397eaa">e⁻</text></g>
      <g class="xa-fly d2"><circle cx="240" cy="85" r="6" fill="#397eaa"/></g>
      <text x="160" y="170" text-anchor="middle" font-size="12" fill="#8d7a9e">фотон E = hν → электрон</text>`;},
    spectra(){return B+`<rect x="45" y="55" width="230" height="60" rx="8" fill="#2c2540"/>
      <g class="xa-glow"><path d="M80 55 v60 M115 55 v60 M150 55 v60 M205 55 v60 M240 55 v60" stroke-width="5" stroke-linecap="round"/><path d="M80 55 v60" stroke="#ce6b6b" stroke-width="5"/><path d="M115 55 v60" stroke="#eab55e" stroke-width="5"/><path d="M150 55 v60" stroke="#7fd0a8" stroke-width="5"/><path d="M205 55 v60" stroke="#7fb2d9" stroke-width="5"/><path d="M240 55 v60" stroke="#9b7bd4" stroke-width="5"/></g>
      <text x="160" y="145" text-anchor="middle" font-size="11" fill="#8d7a9e">отдельные линии = уровни энергии</text>`;},
    nuclear(){return B+`<g class="xa-split-l"><circle cx="150" cy="85" r="26" fill="#f3e9f8" stroke="#cbb6e0" stroke-width="2"/><circle cx="142" cy="80" r="9" fill="#ce6b6b"/><circle cx="158" cy="90" r="9" fill="#b9a4cd"/><circle cx="150" cy="75" r="8" fill="#ce6b6b"/></g>
      <g class="xa-split-r"><circle cx="185" cy="95" r="22" fill="#f3e9f8" stroke="#cbb6e0" stroke-width="2"/><circle cx="180" cy="90" r="8" fill="#ce6b6b"/><circle cx="192" cy="100" r="8" fill="#b9a4cd"/></g>
      <g class="xa-fly"><circle cx="160" cy="45" r="5" fill="#b9a4cd"/></g>
      <text x="160" y="160" text-anchor="middle" font-size="15" fill="#ce7544" class="xa-glow">E = mc²</text>
      <text x="160" y="180" text-anchor="middle" font-size="11" fill="#8d7a9e">дефект массы → энергия</text>`;}
  };
  function atomScene(n,label,color){
    let electrons='';
    for(let i=0;i<n;i++){const a=i*360/n;electrons+=`<g class="xa-spin" style="transform-origin:160px 95px;animation-delay:-${i*0.7}s"><circle cx="160" cy="45" r="6" fill="#397eaa"/></g>`;}
    return B+`<circle cx="160" cy="95" r="16" fill="#ce6b6b" class="xa-bob"/>
      <ellipse cx="160" cy="95" rx="70" ry="50" fill="none" stroke="#cbb6e0" stroke-width="2"/>
      <ellipse cx="160" cy="95" rx="45" ry="50" fill="none" stroke="#e3d7ef" stroke-width="1.5" transform="rotate(60 160 95)"/>
      ${electrons}<text x="160" y="180" text-anchor="middle" font-size="12" fill="${color}">${label||'электроны вокруг ядра'}</text>`;
  }
  function decayScene(particle,color,note){
    return B+`<g class="xa-bob"><circle cx="130" cy="95" r="34" fill="#f3e9f8" stroke="#cbb6e0" stroke-width="2"/><circle cx="120" cy="88" r="11" fill="#ce6b6b"/><circle cx="140" cy="100" r="11" fill="#b9a4cd"/><circle cx="133" cy="82" r="10" fill="#ce6b6b"/><circle cx="122" cy="106" r="9" fill="#b9a4cd"/></g>
      <g class="xa-fly"><circle cx="215" cy="70" r="9" fill="${color}"/><text x="215" y="52" text-anchor="middle" font-size="13" fill="${color}">${particle}</text></g>
      <path d="M170 90 h25 m-8 -6 8 6 -8 6" stroke="#b9a4cd" stroke-width="3" fill="none"/>
      <text x="160" y="170" text-anchor="middle" font-size="12" fill="#8d7a9e">${note}</text>`;
  }
  function scene(q){
    const build=scenes[q.anim]||scenes.atom;
    return `<svg class="xlab" viewBox="0 0 320 190" role="img" aria-label="${esc(q.title||'Опыт')}">${build()}</svg><div class="xlab-caption">${esc(q.title||'')}</div>`;
  }
  root.FizLab={scene,types:Object.keys(scenes)};
  if(typeof module!=='undefined' && module.exports)module.exports=root.FizLab;
})(typeof globalThis!=='undefined'?globalThis:window);
