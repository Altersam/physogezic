(()=>{
  'use strict';
  const tabs=[
    ['start','Быстрый старт'],
    ['host','Ведущий'],
    ['player','Участник'],
    ['controls','Управление']
  ];
  const content={
    start:`
      <div class="how-to-lead"><span>1 → 2 → 3</span><p><strong>Карта → ответ → движение.</strong><br>Вся игра строится на этих трёх действиях.</p></div>
      <section class="how-to-section"><h3>Игра на одном экране</h3><ol class="how-to-steps"><li><b>Выберите версию.</b> Веб-настолка запускается быстро и подходит для любого устройства. 3D-путешествие добавляет объёмный стол и 50 анимированных опытов.</li><li><b>Настройте партию.</b> Укажите игроков или команды. В 3D можно выбрать 1–4 участников кнопками внизу.</li><li><b>Откройте закрытую карту.</b> До выбора неизвестно, попадётся вопрос или опыт.</li><li><b>Ответьте и прочитайте объяснение.</b> Верный ответ двигает фишку на 1–3 клетки. Затем нажмите «Следующий ход» или «Продолжить путь».</li></ol></section>
      <div class="how-to-note"><strong>Очки и финиш</strong><p>Обычная цель — первым добраться до клетки 15. В веб-версии можно вместо этого пройти всю колоду. За ошибку в обычном вопросе фишка остаётся на месте; за ошибку в опыте она возвращается на 1 клетку, но не дальше старта.</p></div>`,
    host:`
      <div class="how-to-lead"><span>ПК + QR</span><p><strong>Большой экран — ведущему.</strong><br>Карты и ответы остаются на устройствах участников.</p></div>
      <section class="how-to-section"><h3>Запуск сетевого 3D-стола</h3><ol class="how-to-steps"><li><b>Запустите сервер на компьютере.</b> Откройте «Сетевая игра.cmd» или выполните <code>npm start</code> в папке проекта. Нужен Node.js 20 или новее.</li><li><b>Откройте 3D-стол.</b> Перейдите на <code>http://localhost:4173/godot/</code> и нажмите «Создать сетевой 3D-стол».</li><li><b>Покажите QR или код.</b> Телефоны должны быть подключены к той же Wi-Fi-сети. QR автоматически содержит сетевой адрес компьютера.</li><li><b>Начните путешествие.</b> Когда участники появятся в списке, нажмите «Начать сетевое путешествие». После ответа используйте «Продолжить путь →».</li></ol></section>
      <div class="how-to-note"><strong>Что видит класс</strong><p>На экране ведущего — стол, вопрос и лабораторная установка без вариантов и правильного ответа. Поэтому её можно демонстрировать всем. Для классической веб-настолки откройте <code>http://localhost:4173/#rooms</code> и выберите «Настолка: поле и карты».</p></div>`,
    player:`
      <div class="how-to-lead"><span>6 цифр</span><p><strong>Телефон — это ваша рука с картами.</strong><br>Видеть общий игровой стол необязательно.</p></div>
      <section class="how-to-section"><h3>Подключение и ход</h3><ol class="how-to-steps"><li><b>Подключитесь к комнате.</b> Отсканируйте QR ведущего или откройте адрес игры, нажмите «Войти по коду» и введите шесть цифр.</li><li><b>Представьтесь.</b> Напишите своё имя или название команды и дождитесь начала путешествия.</li><li><b>В свой ход выберите карту.</b> На телефоне появятся три закрытые рубашки. Вопрос и сложность открываются только после выбора.</li><li><b>Ответьте на своём экране.</b> Выберите вариант и нажмите «Ответить». Если открыт опыт, сначала рассмотрите установку на общем экране.</li><li><b>Прочитайте результат.</b> После проверки появятся объяснение и кнопка продолжения. Во время чужого хода телефон показывает ожидание и ваш счёт.</li></ol></section>
      <div class="how-to-note"><strong>Если страница обновилась</strong><p>Ничего заново настраивать не нужно: участник, открытая карта и счёт восстанавливаются автоматически, пока комната запущена.</p></div>`,
    controls:`
      <div class="how-to-lead"><span>1 / 2 / 3</span><p><strong>Мышь, касание или клавиатура.</strong><br>Используйте способ, который удобнее.</p></div>
      <section class="how-to-section"><h3>Основные действия</h3><div class="how-to-grid"><div><b>Выбор карты</b><p>Клик, касание или клавиши 1, 2, 3 в 3D-версии.</p></div><div><b>Ответ</b><p>Выберите вариант и подтвердите. В веб-настолке также работают 1–4 и Enter.</p></div><div><b>Большой экран</b><p>Нажмите «На весь экран ⛶». Для выхода используйте Esc.</p></div><div><b>Спокойный режим</b><p>Звук и усиленные эффекты можно отключить в игре.</p></div></div></section>
      <section class="how-to-section"><h3>Если что-то не работает</h3><ul class="how-to-list"><li>Для 3D используйте современный Chrome, Edge или Firefox и открывайте игру через сайт или <code>npm start</code>, а не двойным щелчком по файлу.</li><li>Если телефон не подключается, проверьте общую Wi-Fi-сеть и доступ к порту 4173 в брандмауэре компьютера.</li><li>Если WebGL недоступен, откройте лёгкую веб-настолку: в ней сохранены карты, опыты и общие правила.</li></ul></section>
      <div class="how-to-note"><strong>Сохранение</strong><p>Локальная веб-партия хранится в браузере. Сетевая комната дополнительно сохраняется сервером: ход, фишки и открытая лаборатория восстанавливаются после обновления страницы.</p></div>`
  };
  let dialog,panel,active='start';
  function render(key){
    active=content[key]?key:'start';
    panel.innerHTML=content[active];
    panel.setAttribute('aria-labelledby','how-to-tab-'+active);
    panel.scrollTop=0;
    for(const button of dialog.querySelectorAll('[data-guide-tab]')){
      const selected=button.dataset.guideTab===active;
      button.setAttribute('aria-selected',String(selected));
      button.tabIndex=selected?0:-1;
    }
  }
  function close(){if(dialog?.open)dialog.close();}
  function open(key='start'){
    if(!dialog)return;
    render(key);
    if(!dialog.open)dialog.showModal();
    document.documentElement.classList.add('how-to-open');
    dialog.querySelector(`[data-guide-tab="${active}"]`)?.focus({preventScroll:true});
  }
  function init(){
    const style=document.createElement('style');
    style.textContent=`
      .how-to-open,.how-to-open body{overflow:hidden!important}
      #how-to-dialog{width:min(860px,calc(100% - 32px));max-height:min(90dvh,900px);padding:0;border:1px solid #c9b5dc;border-radius:26px;background:#fcfbfe;color:#30263d;box-shadow:0 30px 100px #08051466;overflow:hidden}
      #how-to-dialog::backdrop{background:#0c0a18b8;backdrop-filter:blur(7px)}
      .how-to-frame{display:flex;flex-direction:column;max-height:min(90dvh,900px);font-family:"Segoe UI",Tahoma,Arial,sans-serif}
      .how-to-head{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;padding:26px 30px 20px;background:linear-gradient(135deg,#efe7f8,#f9f5fc);border-bottom:1px solid #e5daed}
      .how-to-kicker{display:block;color:#8a68a6;font-size:11px;font-weight:750;letter-spacing:1.7px;margin-bottom:7px}
      .how-to-head h2{font-size:30px;line-height:1.15;margin:0;letter-spacing:-1px}
      .how-to-head p{font-size:13px;line-height:1.55;color:#867590;margin:8px 0 0}
      .how-to-close{flex:0 0 42px;width:42px;height:42px;border:1px solid #cdbbdc;border-radius:50%;background:#fff;color:#725780;font-size:27px;line-height:1;cursor:pointer}
      .how-to-tabs{display:flex;gap:7px;padding:14px 30px;border-bottom:1px solid #e8dfed;background:#fff;overflow-x:auto;scrollbar-width:thin}
      .how-to-tabs button{flex:0 0 auto;border:1px solid transparent;border-radius:10px;background:transparent;color:#8a7796;padding:10px 14px;font-weight:650;font-size:13px;cursor:pointer}
      .how-to-tabs button[aria-selected="true"]{background:#765491;color:#fff;border-color:#765491;box-shadow:0 4px 12px #76549125}
      .how-to-panel{overflow-y:auto;overscroll-behavior:contain;padding:24px 30px 30px;min-height:0}
      .how-to-lead{display:flex;align-items:center;gap:18px;padding:18px 20px;border-radius:16px;background:#29213b;color:#f7efff;margin-bottom:23px}
      .how-to-lead>span{flex:0 0 auto;min-width:83px;color:#f2d18f;font-size:19px;font-weight:800;text-align:center}
      .how-to-lead p{margin:0;font-size:13px;line-height:1.6;color:#d8c8e6}
      .how-to-lead strong{color:#fff;font-size:15px}
      .how-to-section h3{font-size:18px;margin:0 0 13px;letter-spacing:-.3px}
      .how-to-section+ .how-to-section{margin-top:24px}
      .how-to-steps{margin:0;padding:0;list-style:none;counter-reset:how-to;display:grid;gap:13px}
      .how-to-steps li{position:relative;counter-increment:how-to;padding-left:42px;font-size:14px;line-height:1.65;color:#63546e}
      .how-to-steps li::before{content:counter(how-to);position:absolute;left:0;top:1px;width:27px;height:27px;display:grid;place-items:center;border-radius:9px;background:#eee5f5;color:#795594;font-weight:800;font-size:12px}
      .how-to-steps b{color:#392a46}
      .how-to-note{margin-top:23px;padding:17px 19px;border-left:4px solid #b38bcc;border-radius:0 13px 13px 0;background:#f2edf7}
      .how-to-note strong{font-size:14px}.how-to-note p{font-size:13px;line-height:1.65;color:#74637f;margin:5px 0 0}
      .how-to-panel code{font-family:Consolas,monospace;font-size:.91em;background:#e9e0f0;border-radius:5px;padding:2px 5px;color:#65437e;overflow-wrap:anywhere}
      .how-to-grid{display:grid;grid-template-columns:1fr 1fr;gap:11px}.how-to-grid>div{padding:15px 17px;border:1px solid #e4d9eb;border-radius:13px;background:#fff}.how-to-grid b{font-size:14px}.how-to-grid p{font-size:12px;line-height:1.6;color:#7b6b85;margin:5px 0 0}
      .how-to-list{margin:0;padding-left:21px;color:#65556f}.how-to-list li{font-size:13px;line-height:1.65;margin:9px 0;padding-left:4px}
      .how-to-footer{padding:11px 30px;border-top:1px solid #e7ddec;background:#faf7fc;color:#94839e;font-size:10px;text-align:right}
      button.how-to-entry{display:flex;align-items:center;gap:10px;margin-top:20px;padding:11px 15px;border:1px solid #d4c1e3;border-radius:11px;background:#fff;color:#795895;font:600 12px "Segoe UI",Tahoma,Arial,sans-serif;cursor:pointer;box-shadow:0 5px 18px #6743830c}
      button.how-to-entry>span{display:grid;place-items:center;width:22px;height:22px;border:1px solid #b79bca;border-radius:50%}button.how-to-entry>b{margin-left:8px;font-size:16px}
      button:focus-visible{outline-color:#a678d0}
      @media(max-width:650px){#how-to-dialog{width:calc(100% - 20px);max-height:92dvh;border-radius:20px}.how-to-frame{max-height:92dvh}.how-to-head{padding:21px 20px 16px;gap:12px}.how-to-head h2{font-size:25px}.how-to-head p{font-size:12px}.how-to-kicker{font-size:9px}.how-to-close{width:38px;height:38px;flex-basis:38px}.how-to-tabs{padding:11px 15px}.how-to-tabs button{font-size:12px;padding:9px 12px}.how-to-panel{padding:18px 18px 24px}.how-to-lead{padding:15px;gap:12px}.how-to-lead>span{min-width:63px;font-size:16px}.how-to-lead p{font-size:12px}.how-to-lead strong{font-size:13px}.how-to-steps li{font-size:13px;padding-left:37px}.how-to-grid{grid-template-columns:1fr}.how-to-note p{font-size:12px}.how-to-footer{display:none}button.how-to-entry{margin-top:15px;font-size:11px;padding:9px 12px}}
      @media(prefers-reduced-motion:reduce){#how-to-dialog::backdrop{backdrop-filter:none}}
    `;
    document.head.appendChild(style);
    dialog=document.createElement('dialog');
    dialog.id='how-to-dialog';
    dialog.setAttribute('aria-labelledby','how-to-title');
    dialog.innerHTML=`<div class="how-to-frame"><header class="how-to-head"><div><span class="how-to-kicker">ФИЗОГЭЗИК · ПОМОЩЬ</span><h2 id="how-to-title">Как пользоваться</h2><p>Выберите свой сценарий — и можно начинать.</p></div><button class="how-to-close" type="button" aria-label="Закрыть инструкцию">×</button></header><div class="how-to-tabs" role="tablist" aria-label="Разделы инструкции">${tabs.map(([key,label])=>`<button type="button" role="tab" id="how-to-tab-${key}" data-guide-tab="${key}" aria-controls="how-to-panel" aria-selected="false" tabindex="-1">${label}</button>`).join('')}</div><section class="how-to-panel" id="how-to-panel" role="tabpanel" tabindex="0"></section><footer class="how-to-footer">Esc — закрыть · стрелки — переключить раздел</footer></div>`;
    document.body.appendChild(dialog);
    panel=dialog.querySelector('#how-to-panel');
    dialog.querySelector('.how-to-close').addEventListener('click',close);
    dialog.addEventListener('close',()=>{
      document.documentElement.classList.remove('how-to-open');
      if(location.hash==='#how-to')history.replaceState(null,'',location.pathname+location.search);
    });
    dialog.addEventListener('click',event=>{
      if(event.target!==dialog)return;
      const rect=dialog.getBoundingClientRect();
      if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)close();
    });
    dialog.querySelector('[role="tablist"]').addEventListener('click',event=>{
      const trigger=event.target.closest('[data-guide-tab]');
      if(trigger)render(trigger.dataset.guideTab);
    });
    dialog.querySelector('[role="tablist"]').addEventListener('keydown',event=>{
      const keys=tabs.map(([key])=>key),index=keys.indexOf(active);let next=index;
      if(event.key==='ArrowRight')next=(index+1)%keys.length;
      else if(event.key==='ArrowLeft')next=(index-1+keys.length)%keys.length;
      else if(event.key==='Home')next=0;
      else if(event.key==='End')next=keys.length-1;
      else return;
      event.preventDefault();render(keys[next]);dialog.querySelector(`[data-guide-tab="${active}"]`).focus();
    });
    document.addEventListener('click',event=>{
      const trigger=event.target.closest('[data-how-to]');
      if(!trigger)return;
      event.preventDefault();open(trigger.dataset.howTo||'start');
    });
    if(location.hash==='#how-to')open();
  }
  window.FizHowTo={open,close};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
