(function(root){
  'use strict';
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const symbols={Delta:'Δ',Gamma:'Γ',rho:'ρ',lambda:'λ',eta:'η',nu:'ν',pi:'π',alpha:'α',beta:'β',gamma:'γ',approx:'≈',ne:'≠',le:'≤',ge:'≥',cdot:'·',times:'×',to:'→',infty:'∞',sum:'∑',circ:'°',pm:'±',perp:'⊥'};
  // A small, safe TeX-to-MathML subset. No HTML, remote scripts or fonts required.
  function expression(source){let i=0;
    function group(){while(source[i]===' ')i++;if(source[i]==='{'){i++;return row('}');}return atom();}
    function atom(){let c=source[i++];if(!c)return '';if(c==='{')return row('}');
      if(c==='\\'){const m=source.slice(i).match(/^[A-Za-z]+/),name=m?m[0]:source[i++]||'';if(m)i+=name.length;
        if(name==='frac'){const a=group(),b=group();return `<mfrac>${a}${b}</mfrac>`;}
        if(name==='sqrt')return `<msqrt>${group()}</msqrt>`;
        if(name==='vec')return `<mover accent="true">${group()}<mo stretchy="true">→</mo></mover>`;
        if(['mathrm','text','operatorname'].includes(name)){while(source[i]===' ')i++;if(source[i]==='{'){i++;let value='',depth=1;while(i<source.length&&depth){const ch=source[i++];if(ch==='{')depth++;if(ch==='}')depth--;if(depth)value+=ch;}return name==='text'?`<mtext>${escape(value)}</mtext>`:`<mi mathvariant="normal">${escape(value)}</mi>`;}return `<mstyle mathvariant="normal">${group()}</mstyle>`;}
        if(name===','||name===';'||name===' '||name==='quad')return `<mspace width="${name==='quad'?'1em':'.2em'}"/>`;
        if(name==='cos')return '<mspace width=".18em"/><mi mathvariant="normal">cos</mi><mspace width=".15em"/>';
        if(name==='left'||name==='right')return '';
        if(symbols[name])return `<${['Delta','Gamma','rho','lambda','eta','nu','pi','alpha','beta','gamma'].includes(name)?'mi':'mo'}>${symbols[name]}</${['Delta','Gamma','rho','lambda','eta','nu','pi','alpha','beta','gamma'].includes(name)?'mi':'mo'}>`;
        return `<mi mathvariant="normal">${escape(name)}</mi>`;
      }
      if(/[0-9]/.test(c)){while(/[0-9.,]/.test(source[i]||'')&&i<source.length)c+=source[i++];return `<mn>${escape(c)}</mn>`;}
      if(/[A-Za-zА-Яа-яЁёΔρληνπβ]/.test(c))return `<mi>${escape(c)}</mi>`;
      if(c===' ')return '';
      return `<mo>${escape(c)}</mo>`;
    }
    function row(end){let out='';while(i<source.length&&source[i]!==end){let base=atom(),sub=null,sup=null;while(source[i]==='_'||source[i]==='^'){const op=source[i++],value=group();if(op==='_')sub=value;else sup=value;}
      if(sub&&sup)base=`<msubsup>${base}${sub}${sup}</msubsup>`;else if(sub)base=`<msub>${base}${sub}</msub>`;else if(sup)base=`<msup>${base}${sup}</msup>`;out+=base;
    }if(end&&source[i]===end)i++;return `<mrow>${out}</mrow>`;}
    return row();
  }
  function render(tex,label){return `<math xmlns="http://www.w3.org/1998/Math/MathML" class="physics-math"${label?` aria-label="${escape(label)}"`:''}>${expression(tex)}</math>`;}
  const aliases={
    'F⃗рез = ma⃗':'\\vec{F}_{\\mathrm{рез}}=m\\vec{a}', 'a⃗ = F⃗рез/m':'\\vec{a}=\\frac{\\vec{F}_{\\mathrm{рез}}}{m}',
    'Δp⃗ = F⃗рез Δt':'\\Delta\\vec{p}=\\vec{F}_{\\mathrm{рез}}\\Delta t','p⃗ = mv⃗':'\\vec{p}=m\\vec{v}',
    'p⃗₁ + p⃗₂ + … = const':'\\vec{p}_1+\\vec{p}_2+\\cdots=\\mathrm{const}',
    'sₓ = (vₓ² − v₀ₓ²)/(2aₓ)':'s_x=\\frac{v_x^2-v_{0x}^2}{2a_x}',
    'sₓ = (vₓ − v₀ₓ)/(2aₓ)':'s_x=\\frac{v_x-v_{0x}}{2a_x}',
    'sₓ = (vₓ² + v₀ₓ²)/aₓ':'s_x=\\frac{v_x^2+v_{0x}^2}{a_x}',
    'sₓ = 2aₓ/(vₓ² − v₀ₓ²)':'s_x=\\frac{2a_x}{v_x^2-v_{0x}^2}',
    'vₓ² − v₀ₓ² = 2aₓsₓ':'v_x^2-v_{0x}^2=2a_xs_x',
    'vₓ = v₀ₓ + aₓt':'v_x=v_{0x}+a_xt','x = x₀ + v₀ₓt + aₓt²/2':'x=x_0+v_{0x}t+\\frac{a_xt^2}{2}',
    'vₓ = aₓ/t':'v_x=\\frac{a_x}{t}','x = x₀ + v₀ₓt':'x=x_0+v_{0x}t','vₓ = v₀ₓ + aₓt²':'v_x=v_{0x}+a_xt^2','x = x₀ + aₓt':'x=x_0+a_xt','vₓ = v₀ₓt':'v_x=v_{0x}t','x = v₀ₓ + aₓt²/2':'x=v_{0x}+\\frac{a_xt^2}{2}',
    'F = Gm₁m₂/r²':'F=G\\frac{m_1m_2}{r^2}','F = G(m₁ + m₂)/r':'F=G\\frac{m_1+m_2}{r}','F = Gm₁m₂r²':'F=Gm_1m_2r^2','F = mg/r':'F=\\frac{mg}{r}',
    'Q = I²Rt':'Q=I^2Rt','Q = I²R/t':'Q=\\frac{I^2R}{t}','Q = IRt':'Q=IRt','Q = U/R':'Q=\\frac{U}{R}',
    'I = U/R':'I=\\frac{U}{R}','I = R/U':'I=\\frac{R}{U}','I = U²/R':'I=\\frac{U^2}{R}','I = UR':'I=UR',
    'F = m/a':'F=\\frac{m}{a}','F = a/m':'F=\\frac{a}{m}','F = mv':'F=mv','p = F/t':'p=\\frac{F}{t}','Δp = m/Δt':'\\Delta p=\\frac{m}{\\Delta t}','F = pΔt':'F=p\\Delta t',
    '1/F = 1/d + 1/f':'\\frac{1}{F}=\\frac{1}{d}+\\frac{1}{f}','F = 1/d + 1/f':'F=\\frac{1}{d}+\\frac{1}{f}','1/F = d/f':'\\frac{1}{F}=\\frac{d}{f}','F = d + f':'F=d+f',
    'D = 1/F²':'D=\\frac{1}{F^2}','D = 1/F':'D=\\frac{1}{F}','D = F²':'D=F^2','D = F':'D=F',
    'c = Q/(mΔT)':'c=\\frac{Q}{m\\Delta T}',
    'Eк = mv²/2':'E_{\\mathrm{к}}=\\frac{mv^2}{2}','Eп = mgh':'E_{\\mathrm{п}}=mgh','Eп = kx²/2':'E_{\\mathrm{п}}=\\frac{kx^2}{2}',
    'Eк = mv²':'E_{\\mathrm{к}}=mv^2','Eк = mv':'E_{\\mathrm{к}}=mv','Eп = mg/h':'E_{\\mathrm{п}}=\\frac{mg}{h}','Eп = mgh/2':'E_{\\mathrm{п}}=\\frac{mgh}{2}','Eк = m/v²':'E_{\\mathrm{к}}=\\frac{m}{v^2}','Eп = gh/m':'E_{\\mathrm{п}}=\\frac{gh}{m}',
    'F₁l₁ = F₂l₂':'F_1l_1=F_2l_2','M = Fl':'M=Fl','FА = mg':'F_{\\mathrm{А}}=mg','P = m(g + a)':'P=m(g+a)','P = mg':'P=mg','P = 0':'P=0',
    'v = √(K/ρ)':'v=\\sqrt{\\frac{K}{\\rho}}','м/с²':'\\mathrm{м}/\\mathrm{с}^2','м⁻¹':'\\mathrm{м}^{-1}',
    'β⁻':'\\beta^-','F⃗рез':'\\vec{F}_{\\mathrm{рез}}','Δp⃗':'\\Delta\\vec{p}','v₀ₓ':'v_{0x}','aₓ ≠ 0':'a_x\\ne0',
    'Дж/(кг·К)':'\\frac{\\mathrm{Дж}}{\\mathrm{кг}\\cdot\\mathrm{К}}','Дж/(кг·°C)':'\\frac{\\mathrm{Дж}}{\\mathrm{кг}\\cdot{}^\\circ\\mathrm{C}}',
    'кг·м/с':'\\frac{\\mathrm{кг}\\cdot\\mathrm{м}}{\\mathrm{с}}','Н·м':'\\mathrm{Н}\\cdot\\mathrm{м}','Н/м':'\\frac{\\mathrm{Н}}{\\mathrm{м}}','Дж/с':'\\frac{\\mathrm{Дж}}{\\mathrm{с}}',
    'vₓ':'v_x','x₀':'x_0','aₓ':'a_x','sₓ':'s_x','a⃗':'\\vec{a}','p⃗':'\\vec{p}','v⃗':'\\vec{v}'
  };
  symbols.cdots='⋯';
  const keys=Object.keys(aliases).sort((a,b)=>b.length-a.length),aliasRE=new RegExp(keys.map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),'g');
  function rich(value){const text=String(value);return text.split(/(\$[^$\n]+\$)/g).map(part=>part.startsWith('$')&&part.endsWith('$')?render(part.slice(1,-1)):replaceAliases(part)).join('');}
  function replaceAliases(text){let result='',last=0;aliasRE.lastIndex=0;let m;while((m=aliasRE.exec(text))){result+=escape(text.slice(last,m.index))+render(aliases[m[0]],m[0]);last=m.index+m[0].length;}return result+escape(text.slice(last));}
  function typeset(container){if(typeof document==='undefined'||!container)return;const walker=document.createTreeWalker(container,NodeFilter.SHOW_TEXT),nodes=[];let node;while((node=walker.nextNode())){if(!node.parentElement||node.parentElement.closest('math,script,style,textarea,select,svg,[data-no-math]'))continue;aliasRE.lastIndex=0;if(/\$[^$\n]+\$/.test(node.nodeValue)||aliasRE.test(node.nodeValue))nodes.push(node);}
    for(const n of nodes){if(!n.isConnected)continue;const template=document.createElement('template');template.innerHTML=rich(n.nodeValue);n.replaceWith(template.content);}
  }
  root.FizMath={render,rich,typeset,expression};
  if(typeof document!=='undefined')document.addEventListener('DOMContentLoaded',()=>{let pending=false;const run=()=>{pending=false;typeset(document.querySelector('main'));typeset(document.querySelector('dialog'));};const observer=new MutationObserver(()=>{if(!pending){pending=true;queueMicrotask(run);}});for(const id of ['main','dialog']){const el=document.getElementById(id);if(el)observer.observe(el,{childList:true,subtree:true,characterData:true});}run();});
  if(typeof module!=='undefined'&&module.exports)module.exports=root.FizMath;
})(typeof globalThis!=='undefined'?globalThis:window);
