import './style.css';
import { initialState, parseSave, transition, progress, hints, itemNames } from './game.ts';
import type { Action, Item, Place } from './game.ts';
import { roomArt, itemArt, icon } from './art.ts';

const SAVE_KEY = 'quiet-hour:v1';
let storageAvailable = true;
let saved = null;
try { saved = parseSave(localStorage.getItem(SAVE_KEY)); } catch { storageAvailable = false; }
let state = saved ?? initialState();
let selected: Item | null = null;
let modal: string | null = null;
let hintIndex = -1;
let lastHintStage = '';
let lastFocus: HTMLElement | null = null;
let soundOn = false;
let context: AudioContext | null = null;
let ambience: GainNode | null = null;
let toastTimer: ReturnType<typeof setTimeout>;

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <div class="page-shell">
    <header class="masthead">
      <a class="wordmark" href="./" aria-label="Тихий час, главная">${icon('eye', 34)}<span>ТИХИЙ ЧАС<small>ИНТЕРАКТИВНАЯ ИСТОРИЯ</small></span></a>
      <div class="header-center"><span class="tiny-star">✦</span> НЕ ВСЁ ЗАБЫТОЕ ИСЧЕЗАЕТ</div>
      <nav aria-label="Настройки игры"><button class="icon-button" id="sound" aria-label="Включить звук" aria-pressed="false">${icon('mute')}</button><button class="icon-button" data-action="help" aria-label="Как играть">${icon('help')}</button><button class="icon-button reset-button" data-action="reset" aria-label="Начать заново">${icon('reset')}</button></nav>
    </header>
    <main>
      <div class="chapter-line"><span><i></i> ГЛАВА ПЕРВАЯ</span><span>КВАРТИРА № 17</span></div>
      <div class="game-layout">
        <section class="room-column" aria-label="Игровая комната">
          <div class="scene-frame">
            <div id="scene" class="scene"></div>
            <div class="scene-caption"><span class="scene-dot"></span><span id="scene-label">Осмотрите комнату. Она ждала вас.</span><span class="room-number">01 / 01</span></div>
          </div>
          <section class="inventory" aria-label="Инвентарь">
            <div class="inventory-heading"><span>ВАШИ КАРМАНЫ</span><span id="inventory-count">0 ПРЕДМЕТОВ</span></div>
            <div id="inventory-slots" class="inventory-slots"></div>
            <div id="inventory-note" class="inventory-note"></div>
          </section>
        </section>
        <aside class="story-panel">
          <div class="eyebrow">17 ОКТЯБРЯ, 1987</div>
          <h1>Комната,<br>которая <em>помнит.</em></h1>
          <p class="intro">Вас не было здесь много лет.<br>Но на столе всё ещё стоит ваша чашка.<br>И кто-то оставил письмо.</p>
          <div class="fine-rule"><span>✦</span></div>
          <div class="memory-heading"><span>ВОССТАНОВИТЕ ВОСПОМИНАНИЕ</span><span id="progress-count">0 / 4</span></div>
          <div id="progress" class="memory-progress"></div>
          <div id="objective" class="objective"></div>
          <button class="journal-button" data-action="journal">${icon('book', 23)}<span>Мой дневник<small>Находки и обрывки памяти</small></span>${icon('arrow')}</button>
          <div class="hint-section"><button class="hint-button" data-action="hint">${icon('help', 17)}<span>Нужна подсказка?</span><span id="hint-counter">+</span></button><p id="hint-text" class="hint-text" aria-live="polite"></p></div>
          <div class="aside-bottom"><span class="small-moon">☾</span><p>Некоторые двери открываются<br>только изнутри.</p></div>
        </aside>
      </div>
    </main>
    <footer><span>ИССЛЕДУЙТЕ. СОЕДИНЯЙТЕ. ВСПОМИНАЙТЕ.</span><span id="save-status">${saved ? 'ПРОГРЕСС ВОССТАНОВЛЕН' : 'ПРОГРЕСС СОХРАНЯЕТСЯ АВТОМАТИЧЕСКИ'}</span></footer>
  </div>
  <div id="toast" class="toast" role="status" aria-live="polite"></div>
  <div id="modal-root"></div>`;

const places: { id: Place; label: string; x: number; y: number; w: number; h: number }[] = [
  { id: 'clock', label: 'Часы', x: 12.4, y: 12, w: 14.5, h: 29.5 },
  { id: 'mirror', label: 'Зеркало', x: 4.4, y: 38.2, w: 11.5, h: 24 },
  { id: 'window', label: 'Окно', x: 36.7, y: 12.8, w: 24, h: 43 },
  { id: 'portrait', label: 'Портрет', x: 73, y: 18, w: 10, h: 20 },
  { id: 'letter', label: 'Письмо на столе', x: 22.8, y: 59.5, w: 9.3, h: 8.5 },
  { id: 'candle', label: 'Свеча', x: 12.6, y: 50.3, w: 7.2, h: 15 },
  { id: 'plant', label: 'Растение', x: 65.8, y: 27, w: 10.3, h: 22 },
  { id: 'radio', label: 'Приёмник', x: 65.3, y: 50.7, w: 17.8, h: 13 },
  { id: 'drawer', label: 'Ящик комода', x: 64.2, y: 65, w: 18.3, h: 16 },
  { id: 'door', label: 'Дверь', x: 84.7, y: 14, w: 12.8, h: 64.5 },
];

function renderScene() {
  document.querySelector('#scene')!.innerHTML = roomArt(state) + places.map(p => `<button class="hotspot ${selected ? 'using-item' : ''}" data-place="${p.id}" aria-label="${selected ? `Применить ${itemNames[selected].toLowerCase()} к объекту: ` : 'Осмотреть: '}${p.label}" style="left:${p.x}%;top:${p.y}%;width:${p.w}%;height:${p.h}%"><span class="hotspot-ring"></span><span class="hotspot-label">${p.label}</span></button>`).join('');
}

function renderInventory() {
  const slots = state.inventory.map(item => `<button class="inventory-item ${selected === item ? 'selected' : ''}" data-item="${item}" aria-label="${itemNames[item]}" aria-pressed="${selected === item}">${itemArt(item)}<span>${itemNames[item]}</span></button>`);
  while (slots.length < 6) slots.push(`<div class="inventory-empty" aria-hidden="true"><span>·</span></div>`);
  document.querySelector('#inventory-slots')!.innerHTML = slots.join('');
  document.querySelector('#inventory-count')!.textContent = `${state.inventory.length} / 6`;
  document.querySelector('#inventory-note')!.innerHTML = selected
    ? `<span><span class="selection-dot"></span>${itemNames[selected]} выбраны. Нажмите на объект в комнате.</span><button data-action="inspect">Рассмотреть ${icon('eye', 15)}</button><button class="deselect" data-action="deselect" aria-label="Отложить предмет">${icon('close', 14)}</button>`
    : `<span>Выберите предмет, затем место, где его можно применить.</span>`;
}

function renderSidebar() {
  const steps = ['Тепло', 'Время', 'Голос', 'Дорога'];
  const done = [state.letterRead, state.clockSolved, state.radioSolved, state.escaped];
  document.querySelector('#progress-count')!.textContent = `${progress(state)} / 4`;
  document.querySelector('#progress')!.innerHTML = steps.map((label, i) => `<div class="memory-step ${done[i] ? 'complete' : ''}"><span>${done[i] ? '✦' : `0${i+1}`}</span><small>${label}</small></div>`).join('');
  let title = 'Начните с малого.', text = 'Осмотрите письмо на столе. Знакомые вещи могут скрывать больше, чем кажется.';
  if (state.taken.includes('letter')) { title = 'Бумага хранит секрет.'; text = 'Бледные строки почти исчезли. Найдите способ вернуть им прежнюю яркость.'; }
  if (state.letterRead) { title = 'У времени свои знаки.'; text = 'Короткая ищет птицу. Длинная — луну. Что пытаются сказать старые часы?'; }
  if (state.clockSolved) { title = 'Откройте прошлое.'; text = 'Под циферблатом открылся тайник. Возможно, его содержимое поможет с запертым ящиком.'; }
  if (state.drawerOpen) { title = 'Где-то остался голос.'; text = 'Кассета и фотография. Один предмет хранит запись, другой подскажет, как её услышать.'; }
  if (state.photoRead) { title = 'Поймайте свою волну.'; text = 'Надпись в отражении: «Наш голос — 96.4 FM». Приёмник всё ещё ждёт свою кассету.'; }
  if (state.radioSolved) { title = 'Дом вас услышал.'; text = 'Сердце, тишина, дождь. На двери три знака. В записи есть ответ для каждого.'; }
  if (state.escaped) { title = 'Можно идти.'; text = 'Вы вернули комнате её воспоминание. Теперь она вернула вам дорогу домой.'; }
  document.querySelector('#objective')!.innerHTML = `<span class="eyebrow">СЕЙЧАС</span><h2>${title}</h2><p>${text}</p>`;
  const hintStage = hints(state).join('|');
  if (hintStage !== lastHintStage) { lastHintStage = hintStage; hintIndex = -1; document.querySelector('#hint-text')!.textContent = ''; document.querySelector('#hint-counter')!.textContent = '+'; }
}

function save() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    document.querySelector('#save-status')!.textContent = 'ПРОГРЕСС СОХРАНЁН';
  } catch {
    storageAvailable = false;
    document.querySelector('#save-status')!.textContent = 'СОХРАНЕНИЕ НЕДОСТУПНО — ОСТАВЬТЕ ВКЛАДКУ ОТКРЫТОЙ';
  }
}

function dispatch(action: Action) {
  const outcome = transition(state, action);
  state = outcome.state;
  if (selected && !state.inventory.includes(selected)) selected = null;
  save();
  renderScene(); renderInventory(); renderSidebar();
  if (outcome.message) toast(outcome.message, outcome.success);
  if (outcome.success) tone(392, .15);
  return outcome;
}

function toast(message: string, success = false) {
  const el = document.querySelector<HTMLDivElement>('#toast')!;
  el.textContent = message;
  el.classList.toggle('success', success);
  el.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('visible'), 6500);
}

function clockFace() {
  return `<svg class="clock-detail" viewBox="0 0 240 240" aria-label="Птица на четвёртом часе, луна на девятом">
    <circle cx="120" cy="120" r="113" fill="#474533" stroke="#aa9160" stroke-width="2"/><circle cx="120" cy="120" r="103" fill="#c7b990" stroke="#746441" stroke-width="2"/>
    ${Array.from({length:60},(_,i)=>`<path d="M120 25v${i%5===0?10:4}" transform="rotate(${i*6} 120 120)" stroke="#665f43" stroke-width="${i%5===0?2:1}"/>`).join('')}
    <g fill="#4b503b" font-size="19" font-family="Georgia" text-anchor="middle"><text x="120" y="57">XII</text><text x="191" y="127">III</text><text x="120" y="198">VI</text></g>
    <path d="M46 105a14 14 0 1 0 12 25 13 13 0 0 1-12-25Z" fill="#506047"/>
    <path d="M178 152q-9-18-23-9l5 11-10 10 18-2 12 7-4-14 10-1Z" fill="#506047"/>
    <path id="hour-hand" d="M120 130V65" transform="rotate(${state.hour*30 + state.minute*.5} 120 120)" stroke="#374932" stroke-width="6" stroke-linecap="round"/>
    <path id="minute-hand" d="M120 135V40" transform="rotate(${state.minute*6} 120 120)" stroke="#374932" stroke-width="3" stroke-linecap="round"/><circle cx="120" cy="120" r="6" fill="#374932"/>
  </svg>`;
}

function journalContent() {
  const entries = [
    ['01', 'Возвращение', 'Квартира № 17. Всё на своих местах. Только часы стоят, а за дверью нет звуков. Кто-то положил на стол письмо.'],
  ];
  if (state.taken.includes('letter')) entries.push(['02', 'Бледные чернила', state.letterRead ? 'Над огнём проступили слова: «Короткая ищет птицу. Длинная — луну». На циферблате есть оба знака.' : 'На бумаге виден только оттиск: «Тепло возвращает то, что исчезло».']);
  if (state.clockSolved) entries.push(['03', 'Остановившийся час', '04:45. Часы открыли тайник с ключом. Будто берегли его специально для меня.']);
  if (state.drawerOpen) entries.push(['04', 'Чей-то октябрь', 'В комоде — фотография и кассета с надписью «Дом». На обороте снимка что-то написано задом наперёд.']);
  if (state.photoRead) entries.push(['05', 'Зеркальная надпись', 'В зеркале прочиталось: «Наш голос — 96.4 FM». У приёмника необычный режим: кассета звучит только на своей частоте.']);
  if (state.radioSolved) entries.push(['06', 'Голос дома', '«Дождь стучал трижды. Сердце — дважды. А тишина отзывалась один раз. Дверь помнит порядок знаков». На двери: сердце, полумесяц, дождь.']);
  if (state.escaped) entries.push(['07', 'Дорога', 'Иногда, чтобы выйти, нужно сперва вернуться.']);
  return entries.map(([num, title, text])=>`<article class="journal-entry"><span>${num}</span><div><h3>${title}</h3><p>${text}</p></div></article>`).join('');
}

function modalContent(which: string): { tag: string; title: string; content: string } {
  switch (which) {
    case 'letter': case 'item-letter': return { tag: 'СЛЕДЫ НА БУМАГЕ', title: 'Письмо без подписи', content: `<div class="paper-art"><span class="paper-date">17 октября</span>${state.letterRead ? '<p>Короткая ищет птицу.<br>Длинная — луну.</p><small>Когда время вернётся,<br>ты найдёшь то, что я спрятал.</small>' : '<p class="faded-ink">Тепло возвращает то,<br>что исчезло.</p><small class="faded-ink">Остальные строки почти не видны…</small>'}<span class="paper-signature">До скорого. Я.</span></div><p>${state.letterRead ? 'Слова снова побледнели, но вы записали их в дневник.' : 'Лист сухой и холодный. Кажется, когда-то здесь было больше слов.'}</p>${!state.taken.includes('letter')?'<button class="primary-button" data-take="letter">Взять письмо '+icon('arrow')+'</button>':'<p class="object-note">Письмо у вас в карманах. Выберите его, чтобы применить к другому предмету.</p>'}` };
    case 'plant': return { tag: 'НА ПОЛКЕ', title: 'Живое среди забытого', content: `<div class="plant-detail"><span class="plant-leaf">❧</span>${!state.taken.includes('matches')?itemArt('matches'):''}</div><p>Земля ещё влажная. Кто же поливал цветок всё это время?</p>${!state.taken.includes('matches')?'<p>За горшком прячется коробок спичек. Внутри что-то шуршит.</p><button class="primary-button" data-take="matches">Взять спички '+icon('arrow')+'</button>':'<p class="object-note">Там, где лежали спички, остался светлый прямоугольник.</p>'}` };
    case 'candle': return { tag: 'МАЛЕНЬКИЙ ИСТОЧНИК ТЕПЛА', title: state.candleLit ? 'Огонёк помнит' : 'Холодный воск', content: `<div class="candle-detail ${state.candleLit?'lit':''}"><span class="detail-flame"></span><span class="candle-wax"></span><span class="candle-base"></span></div><p>${state.candleLit?'Над пламенем поднимается тёплый воздух. Когда-то вы так читали тайные письма.':'Фитиль потемнел, но свеча ещё может гореть. Нужен только один маленький огонёк.'}</p><p class="object-note">${state.candleLit?'Чтобы поднести письмо к теплу, выберите его в карманах и нажмите на свечу в комнате.':'Выберите спички в карманах и нажмите на свечу в комнате.'}</p>` };
    case 'clock': return { tag: 'ВРЕМЯ ОСТАНОВИЛОСЬ', title: state.clockSolved ? 'Маленький тайник' : 'Куда смотрят стрелки?', content: `${clockFace()}${state.clockSolved ? `<p>В деревянном корпусе открылось отделение.</p>${!state.taken.includes('key')?'<div class="found-item">'+itemArt('key')+'</div><button class="primary-button" data-take="key">Забрать ключ '+icon('arrow')+'</button>':'<p class="object-note">Ключ уже у вас. Интересно, к какому замку он подходит?</p>'}` : `<p>На месте четвёрки сидит птица. На месте девятки — полумесяц. Стрелки поддаются, если повернуть их осторожно.</p><form id="clock-form"><div class="time-controls"><label>КОРОТКАЯ · ЧАСЫ<select name="hour" aria-label="Часы">${Array.from({length:12},(_,i)=>`<option value="${i+1}" ${state.hour===i+1?'selected':''}>${String(i+1).padStart(2,'0')}</option>`).join('')}</select></label><span>:</span><label>ДЛИННАЯ · МИНУТЫ<select name="minute" aria-label="Минуты">${Array.from({length:12},(_,i)=>`<option value="${i*5}" ${state.minute===i*5?'selected':''}>${String(i*5).padStart(2,'0')}</option>`).join('')}</select></label></div><button class="primary-button" type="submit">Перевести стрелки ${icon('arrow')}</button></form>`}` };
    case 'drawer': return { tag: 'КОМОД ПОД ПРИЁМНИКОМ', title: state.drawerOpen ? 'Вещи, которые остались' : 'Ящик заперт', content: state.drawerOpen ? `<div class="drawer-contents">${(['tape','photo'] as Item[]).filter(i=>!state.taken.includes(i)).map(i=>`<button data-take="${i}">${itemArt(i)}<span>Взять: ${itemNames[i]}</span>${icon('arrow', 18)}</button>`).join('') || '<span class="empty-drawer">В ящике остался только запах старого дерева.</span>'}</div><p>Кассета подписана одним словом: «Дом». На фотографии — озеро и тёмные деревья. Снимок почему-то тёплый.</p><p class="object-note">У фотографии исписан оборот. Рассмотрите её в карманах.</p>` : `<div class="lock-detail">${icon('eye', 70)}<span>·</span></div><p>На ручке потёрта позолота. Замочная скважина совсем маленькая.</p><p class="object-note">Если найдёте ключ, выберите его в карманах и нажмите на ящик в комнате.</p>` };
    case 'mirror': return { tag: 'ОТРАЖЕНИЕ', title: state.photoRead ? 'Теперь всё на своих местах' : 'Вы смотрите чуть дольше', content: `<div class="mirror-detail">${state.photoRead?'<span class="mirror-writing">Наш голос<br><strong>96.4 FM</strong></span>':'<span class="mirror-writing muted">Отражение<br>почти успевает за вами.</span>'}</div><p>${state.photoRead?'Зеркало исправило надпись на обороте снимка. Эта частота теперь есть в вашем дневнике.':'В серебре под стеклом проступают тёмные пятна. А всё написанное справа налево здесь стало бы обычным.'}</p>` };
    case 'item-photo': return { tag: 'СТАРЫЙ СНИМОК', title: 'Фотография озера', content: `<div class="photo-detail">${itemArt('photo')}<div class="photo-back"><span>На обороте:</span><strong class="mirrored">Наш голос — 96.4 FM</strong></div></div><p>Человек, оставивший надпись, писал зеркально. На стене есть кое-что, что поможет её прочесть.</p>${state.photoRead?'<p class="object-note">Вы уже прочли надпись в зеркале: 96.4 FM.</p>':''}` };
    case 'item-matches': return { tag: 'НАХОДКА', title: 'Коробок спичек', content: `<div class="found-item large">${itemArt('matches')}</div><p>Осталось несколько сухих спичек. Их хватит, чтобы вернуть комнате немного тепла.</p>` };
    case 'item-key': return { tag: 'НАХОДКА', title: 'Ключ из часов', content: `<div class="found-item large">${itemArt('key')}</div><p>Небольшой латунный ключ. На нём выгравирован прямоугольник с двумя ручками.</p>` };
    case 'item-tape': return { tag: 'НАХОДКА', title: 'Кассета «Дом»', content: `<div class="found-item large">${itemArt('tape')}</div><p>На наклейке: «Дом. Только на нашей волне». Лента цела. У приёмника на комоде как раз есть кассетный отсек.</p>` };
    case 'radio': return { tag: 'КАССЕТНЫЙ ПРИЁМНИК', title: 'По ту сторону шума', content: `<div class="radio-detail"><div class="radio-brand">ВОЛНА <span>FM / TAPE</span></div><div class="frequency-display"><span id="frequency-value">${(state.frequency/10).toFixed(1)}</span><small>MHz</small><i class="${state.frequency===964&&state.tapeInserted?'tuned':''}"></i></div><div class="tuner-marks"><span>88</span><span>92</span><span>96</span><span>100</span><span>104</span><span>108</span></div><input id="frequency" type="range" min="880" max="1080" step="1" value="${state.frequency}" aria-label="Частота FM в десятых долях мегагерца" aria-valuetext="${(state.frequency/10).toFixed(1)} FM"><div class="tuning-buttons"><button data-action="tune-down" aria-label="Уменьшить частоту на 0.1">−</button><span>ТОЧНАЯ НАСТРОЙКА</span><button data-action="tune-up" aria-label="Увеличить частоту на 0.1">+</button></div><div class="tape-slot">${state.tapeInserted?icon('sound',16)+' КАССЕТА «ДОМ» ВНУТРИ':'КАССЕТНЫЙ ОТСЕК ПУСТ'}</div></div><button class="primary-button" data-action="listen">${icon('sound',18)} Слушать запись</button>${state.radioSolved?'<blockquote class="transcript">«Дождь стучал трижды. Сердце — дважды. А тишина отзывалась один раз.<br><br>Дверь помнит порядок знаков».</blockquote>':`<p class="object-note">${state.tapeInserted?'Настройтесь на частоту, которую оставили на фотографии.':'Чтобы вставить кассету, выберите её в карманах и нажмите на приёмник в комнате.'}</p>`}` };
    case 'door': return { tag: 'НА ДРУГОЙ СТОРОНЕ', title: state.escaped ? 'Вы можете идти' : 'Три знака на дереве', content: state.escaped ? '<p>Дверь открыта. Воздух за ней пахнет дождём и чаем.</p><button class="primary-button" data-action="ending">Вспомнить этот момент '+icon('arrow')+'</button>' : `<p>Под каждым знаком — счётчик ударов. Сердце. Тишина. Дождь. У каждого свой ответ.</p><div class="door-lock">${['heart','silence','rain'].map((name,i)=>`<div>${icon(name,30)}<button data-digit="${i}" aria-label="${['Сердце','Тишина','Дождь'][i]}: ${state.doorCode[i]} ударов">${state.doorCode[i]}</button><small>${['СЕРДЦЕ','ТИШИНА','ДОЖДЬ'][i]}</small></div>`).join('')}</div><p class="object-note">Нажимайте на числа, чтобы менять количество ударов от 0 до 4.</p><button class="primary-button" data-action="open-door">Постучать и открыть ${icon('arrow')}</button>` };
    case 'window': return { tag: 'ТАМ ВСЁ ЕЩЁ ОСЕНЬ', title: 'Дождь за стеклом', content: `<div class="window-detail"><span>☾</span><i></i><i></i><i></i><i></i></div><p>Капли стекают вверх? Нет. Показалось. За стеклом то же озеро, которое вы рисовали в детстве.</p><p class="object-note">Здесь нет предметов. Только маленькая передышка.</p>` };
    case 'portrait': return { tag: 'ЧЬЯ-ТО ПАМЯТЬ', title: 'Знакомое лицо', content: `<div class="ending-eye">${icon('eye',80)}</div><p>Вы не помните её имени. Но помните, как она ставила вторую чашку. И говорила: «Когда забудешь дорогу — слушай дом».</p><p class="object-note">Краска выцвела. Вы оставляете портрет на стене.</p>` };
    case 'journal': return { tag: 'ТО, ЧТО УДАЛОСЬ СОБРАТЬ', title: 'Мой дневник', content: journalContent() };
    case 'help': return { tag: 'НЕ ТОРОПИТЕСЬ', title: 'Присмотритесь к вещам', content: `<ol class="help-list"><li><span>01</span><div><h3>Исследуйте комнату</h3><p>Нажимайте на часы, стол, растение и другие вещи. Они расскажут, с чего начать.</p></div></li><li><span>02</span><div><h3>Соединяйте находки</h3><p>Выберите предмет в карманах, закройте окно осмотра и нажмите на объект в комнате. Повторное нажатие на предмет отменяет выбор.</p></div></li><li><span>03</span><div><h3>Доверяйте памяти</h3><p>Дневник сохраняет все найденные подсказки. Если застряли, справа есть три постепенные подсказки для текущего шага.</p></div></li></ol><p class="object-note">Игра рассчитана примерно на 10–15 минут. Звук необязателен: все важные сведения доступны в тексте. Прогресс сохраняется в этом браузере. Клавиша Esc закрывает окно или отменяет выбор предмета.</p><button class="primary-button" data-action="close">Я готов вспомнить ${icon('arrow')}</button>` };
    case 'reset': return { tag: 'НОВЫЙ КРУГ', title: 'Вернуться в начало?', content: `<p>Все найденные предметы, решения и записи дневника будут сброшены. Вы снова окажетесь перед нетронутым письмом.</p><div class="button-row"><button class="secondary-button" data-action="close">Остаться здесь</button><button class="primary-button" data-action="confirm-reset">Начать заново</button></div>` };
    case 'ending': return { tag: 'ГЛАВА ПЕРВАЯ · КОНЕЦ', title: 'Вы вспомнили дорогу.', content: `<div class="ending-eye">${icon('eye',100)}</div><p class="ending-prose">Тот вечер не был последним.<br>Последним было ваше молчание.</p><p>За дверью пахнет дождём.<br>Кто-то ставит на стол вторую чашку.</p><div class="ending-rule">✦</div><p class="object-note">Воспоминание восстановлено · 4 из 4</p><button class="primary-button" data-action="close">Остаться ещё на минуту ${icon('arrow')}</button><button class="text-button" data-action="reset">Пройти ещё раз</button>` };
    default: return { tag: '', title: '', content: '' };
  }
}

function openModal(which: string, preserveFocus = false) {
  if (!modal) lastFocus = document.activeElement as HTMLElement;
  const previousAction = preserveFocus ? (document.activeElement as HTMLElement)?.dataset : null;
  modal = which;
  const { tag, title, content } = modalContent(which);
  document.querySelector('#modal-root')!.innerHTML = `<div class="modal-backdrop" data-backdrop="true"><section class="dialog ${which==='ending'?'ending-dialog':''}" role="dialog" aria-modal="true" aria-labelledby="dialog-title" tabindex="-1"><button class="dialog-close icon-button" data-action="close" aria-label="Закрыть">${icon('close',22)}</button><div class="eyebrow">${tag}</div><h2 id="dialog-title">${title}</h2><div class="dialog-content">${content}</div></section></div>`;
  document.body.classList.add('modal-open');
  (document.querySelector('.page-shell') as HTMLElement).inert = true;
  if (previousAction?.digit) (document.querySelector(`[data-digit="${previousAction.digit}"]`) as HTMLElement)?.focus();
  else (document.querySelector('.dialog') as HTMLElement).focus();
}

function closeModal() {
  modal = null;
  document.querySelector('#modal-root')!.innerHTML = '';
  document.body.classList.remove('modal-open');
  (document.querySelector('.page-shell') as HTMLElement).inert = false;
  if (lastFocus?.isConnected) lastFocus.focus();
  else (document.querySelector(selected ? `[data-item="${selected}"]` : '[data-place="letter"]') as HTMLElement)?.focus();
}

function usePlace(place: Place) {
  tone(180, .03);
  if (selected) {
    const item = selected;
    const outcome = dispatch({ type: 'use', item, place });
    if (outcome.success) {
      selected = null; renderInventory(); renderScene();
      if (item==='letter') openModal('letter');
      if (place==='drawer' || place==='mirror' || place==='radio') openModal(place);
    }
  } else openModal(place);
}

function setFrequency(value: number) {
  dispatch({ type:'frequency', value: Math.min(1080, Math.max(880, value)) });
  const input = document.querySelector<HTMLInputElement>('#frequency');
  if (input) { input.value=String(state.frequency); input.setAttribute('aria-valuetext', `${(state.frequency/10).toFixed(1)} FM`); }
  const output = document.querySelector('#frequency-value');
  if (output) output.textContent=(state.frequency/10).toFixed(1);
  document.querySelector('.frequency-display i')?.classList.toggle('tuned', state.frequency===964 && state.tapeInserted);
}

document.addEventListener('click', event => {
  const el = (event.target as Element).closest<HTMLElement>('button, [data-backdrop]');
  if (!el) return;
  if (el.dataset.backdrop && event.target === el) { closeModal(); return; }
  if (el.id==='sound') { void toggleSound(); return; }
  if (el.dataset.place) { usePlace(el.dataset.place as Place); return; }
  if (el.dataset.item) {
    selected = selected === el.dataset.item ? null : el.dataset.item as Item;
    renderInventory(); renderScene();
    (document.querySelector(`[data-item="${el.dataset.item}"]`) as HTMLElement)?.focus();
    return;
  }
  if (el.dataset.take) {
    const item = el.dataset.take as Item;
    dispatch({ type:'take', item });
    if (modal==='drawer') openModal('drawer'); else closeModal();
    return;
  }
  if (el.dataset.digit !== undefined) { dispatch({type:'doorDigit',index:Number(el.dataset.digit)}); openModal('door',true); return; }
  switch (el.dataset.action) {
    case 'help': case 'journal': case 'reset': case 'ending': openModal(el.dataset.action); break;
    case 'close': closeModal(); break;
    case 'inspect': if (selected) openModal(`item-${selected}`); break;
    case 'deselect': selected=null; renderInventory(); renderScene(); break;
    case 'hint': {
      const list=hints(state); hintIndex=Math.min(hintIndex+1,list.length-1);
      document.querySelector('#hint-text')!.textContent=list[hintIndex];
      document.querySelector('#hint-counter')!.textContent=`${hintIndex+1} / ${list.length}`;
      break;
    }
    case 'tune-down': setFrequency(state.frequency-1); break;
    case 'tune-up': setFrequency(state.frequency+1); break;
    case 'listen': {
      const outcome=dispatch({type:'listen'});
      if (outcome.success) { openModal('radio'); [0,.65,1.3].forEach((delay,i)=>setTimeout(()=>tone([293.66,349.23,440][i],.45),delay*1000)); }
      break;
    }
    case 'open-door': if (dispatch({type:'openDoor'}).success) openModal('ending'); else openModal('door'); break;
    case 'confirm-reset':
      state=initialState(); selected=null; hintIndex=-1; save(); closeModal(); renderScene(); renderInventory(); renderSidebar(); toast('Вы снова здесь. На столе ждёт письмо.'); break;
  }
});

document.addEventListener('submit', event => {
  if ((event.target as HTMLElement).id!=='clock-form') return;
  event.preventDefault();
  const data = new FormData(event.target as HTMLFormElement);
  dispatch({type:'clock', hour:Number(data.get('hour')), minute:Number(data.get('minute'))});
  openModal('clock');
});
document.addEventListener('input', event => {
  const input=event.target as HTMLInputElement;
  if (input.id==='frequency') setFrequency(Number(input.value));
});
document.addEventListener('change', event => {
  if (!(event.target as HTMLElement).closest('#clock-form')) return;
  const form=document.querySelector<HTMLFormElement>('#clock-form')!, data=new FormData(form);
  const h=Number(data.get('hour')), m=Number(data.get('minute'));
  document.querySelector('#hour-hand')?.setAttribute('transform',`rotate(${h*30+m*.5} 120 120)`);
  document.querySelector('#minute-hand')?.setAttribute('transform',`rotate(${m*6} 120 120)`);
});
document.addEventListener('keydown', event => {
  if (event.key==='Escape') {
    if (modal) closeModal(); else { selected=null; renderInventory(); renderScene(); }
  }
  if (event.key==='Tab' && modal) {
    const controls=Array.from(document.querySelectorAll<HTMLElement>('.dialog button, .dialog input, .dialog select, .dialog [href]')).filter(e=>!(e as HTMLButtonElement).disabled);
    const first=controls[0],last=controls[controls.length-1];
    if (event.shiftKey && (document.activeElement===first || document.activeElement===document.querySelector('.dialog'))) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement===last) { event.preventDefault(); first?.focus(); }
  }
});

function tone(frequency: number, duration: number) {
  if (!soundOn || !context) return;
  const oscillator=context.createOscillator(), gain=context.createGain();
  oscillator.type='sine'; oscillator.frequency.value=frequency;
  gain.gain.setValueAtTime(.0001,context.currentTime); gain.gain.exponentialRampToValueAtTime(.045,context.currentTime+.015); gain.gain.exponentialRampToValueAtTime(.0001,context.currentTime+duration+.1);
  oscillator.connect(gain); gain.connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime+duration+.2);
}
async function toggleSound() {
  try {
    if (!context) {
      context=new AudioContext();
      ambience=context.createGain(); ambience.gain.value=0; ambience.connect(context.destination);
      const drone=context.createOscillator(),droneGain=context.createGain();
      drone.type='sine'; drone.frequency.value=65.41; droneGain.gain.value=.16; drone.connect(droneGain); droneGain.connect(ambience); drone.start();
      const buffer=context.createBuffer(1,context.sampleRate*4,context.sampleRate),channel=buffer.getChannelData(0);
      let brown=0;
      for(let i=0;i<channel.length;i++){brown=(brown+Math.random()*.04-.02)/1.02;channel[i]=brown*5;}
      const rain=context.createBufferSource(); rain.buffer=buffer; rain.loop=true;
      const filter=context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=700;
      rain.connect(filter);filter.connect(ambience);rain.start();
    }
    await context.resume(); soundOn=!soundOn;
    ambience!.gain.setTargetAtTime(soundOn ? .16 : 0,context.currentTime,.6);
    const button=document.querySelector('#sound')!;
    button.innerHTML=icon(soundOn?'sound':'mute'); button.setAttribute('aria-label',soundOn?'Выключить звук':'Включить звук'); button.setAttribute('aria-pressed',String(soundOn));
    if (soundOn) toast('Дождь за окном. Тихий гул. Важные подсказки всегда доступны в тексте.');
  } catch { toast('В этом браузере звук недоступен. Все загадки можно решить по тексту.'); }
}

renderScene(); renderInventory(); renderSidebar();
if (!storageAvailable) document.querySelector('#save-status')!.textContent='СОХРАНЕНИЕ НЕДОСТУПНО — ОСТАВЬТЕ ВКЛАДКУ ОТКРЫТОЙ';
