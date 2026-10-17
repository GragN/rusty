const $ = (selector) => document.querySelector(selector);
const STORAGE_KEY = 'reaktiv.lab.v1';
const categoryNames = { metal: 'Металл', nonmetal: 'Неметалл', metalloid: 'Полуметалл', 'noble-gas': 'Благородный газ', gas: 'Газ', liquid: 'Жидкость', acid: 'Кислота', base: 'Основание', salt: 'Соль', oxide: 'Оксид' };
const columns = ['elements', 'discoveries'];
let catalog = [], reactions = [], byId = new Map(), reactionByPair = new Map();
let discoveries = new Set(), history = [], selected = [null, null], activeSlot = 0, busy = false, loaded = false, toastTimer;
let possibleProducts = new Set();

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const chemistry = (text) => escapeHtml(text).replace(/([A-Za-z)])(\d+)/g, '$1<sub>$2</sub>');
const normalize = (text) => text.toLocaleLowerCase('ru').replace(/[₀₁₂₃₄₅₆₇₈₉]/g, (c) => String('₀₁₂₃₄₅₆₇₈₉'.indexOf(c))).replace(/\s+/g, '');
const pairKey = (ids) => [...ids].sort().join('|');
const available = (id) => byId.has(id) && (byId.get(id).column !== 'discoveries' || discoveries.has(id));

function toast(message) {
  clearTimeout(toastTimer);
  $('#toast').textContent = message;
  $('#toast').classList.add('visible');
  toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 3600);
}

function restore() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!saved || saved.version !== 1) return;
    if (Array.isArray(saved.discoveries)) discoveries = new Set(saved.discoveries.filter((id) => possibleProducts.has(id)));
    if (Array.isArray(saved.history)) {
      history = saved.history.filter((entry) => entry && Array.isArray(entry.reactants) && entry.reactants.length === 2
        && entry.reactants.every((id) => typeof id === 'string') && reactionByPair.has(pairKey(entry.reactants))
        && typeof entry.at === 'string' && Number.isFinite(Date.parse(entry.at))).slice(0, 50);
    }
  } catch { /* A missing, disabled or damaged browser store does not prevent experiments. */ }
}

function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, discoveries: [...discoveries], history })); return true; }
  catch { toast('Браузер не разрешил сохранение. Открытия доступны до перезагрузки страницы.'); return false; }
}

function updateConnection(online) {
  $('#connection').classList.toggle('offline', !online);
  $('#connection').innerHTML = `<span></span>${online ? 'Лаборатория готова' : 'Нет связи с сервером'}`;
}

function card(substance, index, newIds) {
  const isSelected = selected.includes(substance.id);
  const label = substance.atomicNumber
    ? `${substance.name}, ${substance.symbol}, атомный номер ${substance.atomicNumber}, простое вещество ${substance.formula}`
    : `${substance.name}, ${substance.formula}`;
  return `<button class="substance-card${isSelected ? ' selected' : ''}${newIds.has(substance.id) ? ' new-card' : ''}" data-id="${escapeHtml(substance.id)}" data-category="${escapeHtml(substance.category)}" draggable="true" aria-pressed="${isSelected}" aria-label="${escapeHtml(label)}">
    <span class="card-top"><span class="card-index">${substance.atomicNumber ?? String(index + 1).padStart(2, '0')}</span>${isSelected ? '<span class="card-check"><svg class="icon"><use href="#i-check"/></svg></span>' : '<span class="category-dot"></span>'}</span>
    <span class="card-formula">${chemistry(substance.symbol ?? substance.formula)}</span><span class="card-name">${escapeHtml(substance.name)}</span><span class="card-category">${categoryNames[substance.category]}${substance.symbol && substance.symbol !== substance.formula ? ` · ${chemistry(substance.formula)}` : ''}</span></button>`;
}

function renderLists(newIds = new Set()) {
  const query = normalize($('#search').value), category = $('#category').value;
  const matches = (s) => (!query || (/^\d+$/.test(query) ? String(s.atomicNumber) === query : normalize(s.name + s.formula + (s.symbol ?? '')).includes(query))) && (category === 'all' || s.category === category);
  for (const column of columns) {
    const all = column === 'discoveries' ? [...discoveries].map((id) => byId.get(id)) : catalog.filter((s) => s.column === column);
    const shown = all.filter(matches), list = $(`#${column}-list`), previousScroll = list.scrollTop;
    $(`#${column}-count`).textContent = query || category !== 'all' ? `${shown.length}/${all.length}` : all.length;
    if (column === 'discoveries' && !discoveries.size && !query && category === 'all') {
      list.innerHTML = '<div class="empty-state"><div class="empty-illustration"><svg class="icon"><use href="#i-flask"/></svg></div><strong>Здесь будут ваши открытия</strong><p>Смешайте первые два вещества.<br>Новый результат появится здесь —<br>и станет началом новой реакции.</p><button data-example>Начать с железа и кислорода →</button></div>';
    } else if (!shown.length) {
      list.innerHTML = `<div class="no-results">${column === 'discoveries' && !discoveries.size ? 'Сначала создайте новое вещество.' : 'Ничего не найдено.<br>Попробуйте другой запрос или тип.'}</div>`;
    } else {
      list.innerHTML = shown.map((s, index) => card(s, index, newIds)).join('');
    }
    list.scrollTop = previousScroll;
  }
  $('#total-count').textContent = `${catalog.filter((s) => s.column === 'elements').length} элементов`;
  const count = discoveries.size;
  $('#progress-label').textContent = count ? `Получено ${count} из ${possibleProducts.size} веществ` : 'Всё начинается с первого открытия';
  $('#progress-bar').style.width = `${possibleProducts.size ? count / possibleProducts.size * 100 : 0}%`;
  $('#history-badge').hidden = !history.length;
  $('#history-badge').textContent = history.length;
}

function renderSelection() {
  ['#slot-first', '#slot-second'].forEach((selector, index) => {
    const slot = $(selector), substance = byId.get(selected[index]);
    slot.classList.toggle('filled', Boolean(substance));
    slot.classList.toggle('active-slot', activeSlot === index && !substance);
    slot.disabled = busy;
    slot.setAttribute('aria-label', `${index === 0 ? 'Первое' : 'Второе'} вещество: ${substance ? substance.name + '. Нажмите, чтобы убрать' : 'не выбрано'}`);
    slot.innerHTML = substance
      ? `<span class="slot-number">${chemistry(substance.formula)}</span><span class="slot-content"><strong>${escapeHtml(substance.name)}</strong><small>${categoryNames[substance.category]}</small></span><span class="slot-add" aria-hidden="true">×</span>`
      : `<span class="slot-number">0${index + 1}</span><span class="slot-content"><strong>${index === 0 ? 'Первое' : 'Второе'} вещество</strong><small>Выберите в любом столбце</small></span><span class="slot-add" aria-hidden="true">+</span>`;
  });
  $('#mix').disabled = !loaded || busy || selected.some((id) => !id);
  $('#mix').classList.toggle('busy', busy);
  $('#mix span').textContent = busy ? 'Смешиваем…' : 'Смешать вещества';
  $('#clear-selection').disabled = busy || selected.every((id) => !id);
  $('#confirm-reset').disabled = busy;
  $('#reset-progress').disabled = busy;
}

function clearResult() {
  $('#reaction-result').className = 'reaction-result';
  $('#reaction-result').innerHTML = '<svg class="icon"><use href="#i-info"/></svg><span>Порядок не важен: выбирайте вещества из любых столбцов, в том числе из одного.</span>';
}

function selectSubstance(id) {
  if (!loaded || busy || !byId.has(id) || !available(id)) return;
  const existing = selected.indexOf(id);
  if (existing !== -1) { selected[existing] = null; activeSlot = existing; }
  else {
    const empty = selected.indexOf(null);
    const target = activeSlot ?? (empty !== -1 ? empty : 0);
    selected[target] = id;
    activeSlot = selected.includes(null) ? selected.indexOf(null) : null;
  }
  clearResult(); renderSelection(); renderLists();
}

function choosePair(ids) {
  if (!loaded || busy || ids.some((id) => !available(id))) return;
  selected = [...ids]; activeSlot = null;
  clearResult(); renderSelection(); renderLists();
  $('#mix').focus({ preventScroll: true });
}

async function mix() {
  if (!loaded || busy || selected.some((id) => !id)) return;
  const ingredients = [...selected];
  busy = true; renderSelection();
  try {
    const response = await fetch('/api/react', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstId: ingredients[0], secondId: ingredients[1] }), signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const result = await response.json();
    updateConnection(true);
    if (!result.matched) {
      $('#reaction-result').className = 'reaction-result no-reaction';
      $('#reaction-result').innerHTML = `<svg class="icon"><use href="#i-info"/></svg><span>${escapeHtml(result.message)}</span><button class="example-button" data-book>Открыть справочник →</button>`;
      return;
    }
    const newIds = new Set(result.products.filter((s) => !discoveries.has(s.id)).map((s) => s.id));
    result.products.forEach((s) => discoveries.add(s.id));
    history.unshift({ reactants: ingredients, at: new Date().toISOString() });
    history = history.slice(0, 50);
    const saved = persist();
    $('#reaction-result').className = 'reaction-result success';
    $('#reaction-result').innerHTML = `<svg class="icon"><use href="#i-check"/></svg><div class="result-details"><div class="result-equation">${chemistry(result.reaction.equation)}</div><div class="result-condition">Условия: ${escapeHtml(result.reaction.condition)}</div><div class="result-description">${escapeHtml(result.reaction.description)}</div></div><span class="new-badge">${newIds.size ? `+${newIds.size} в коллекцию` : 'Уже в коллекции'}</span>`;
    renderLists(newIds);
    if (newIds.size) {
      $('#discoveries-list').scrollTop = $('#discoveries-list').scrollHeight;
      if (saved) toast(`Получено: ${result.products.map((s) => s.name.toLocaleLowerCase('ru')).join(', ')}`);
    }
  } catch {
    updateConnection(false);
    $('#reaction-result').className = 'reaction-result error';
    $('#reaction-result').innerHTML = '<svg class="icon"><use href="#i-info"/></svg><span>Не удалось связаться с сервером. Проверьте, что dotnet run работает, и повторите смешивание.</span>';
  } finally { busy = false; renderSelection(); }
}

function renderBook() {
  const query = normalize($('#book-search').value);
  const matches = reactions.filter((r) => !query || normalize(r.equation + [...r.reactants, ...r.products].map((id) => byId.get(id).name).join(' ')).includes(query));
  $('#book-list').innerHTML = matches.length ? matches.map((r) => {
    const ready = r.reactants.every(available);
    return `<article class="recipe"><div class="recipe-equation">${chemistry(r.equation)}</div><p>${escapeHtml(r.description)}</p><div class="recipe-footer"><span class="recipe-condition">${escapeHtml(r.condition)}</span><button data-pair="${escapeHtml(r.reactants.join('|'))}" ${ready && !busy ? '' : 'disabled'}>${ready ? 'Выбрать пару →' : 'Сначала получите реагенты'}</button></div></article>`;
  }).join('') : '<div class="no-results">Таких реакций не найдено.</div>';
}

function openBook() { renderBook(); $('#book-dialog').showModal(); }

function renderHistory() {
  $('#history-list').innerHTML = history.length ? history.map((entry) => {
    const reaction = reactionByPair.get(pairKey(entry.reactants));
    const ready = entry.reactants.every(available);
    const date = new Date(entry.at).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    return `<article class="recipe"><div class="recipe-equation">${chemistry(reaction.equation)}</div><p>${escapeHtml(reaction.description)}</p><div class="recipe-footer"><span class="history-time">${escapeHtml(date)}</span><button data-pair="${escapeHtml(entry.reactants.join('|'))}" ${ready && !busy ? '' : 'disabled'}>${ready ? 'Повторить →' : 'Сначала получите реагенты'}</button></div></article>`;
  }).join('') : '<div class="empty-state"><div class="empty-illustration"><svg class="icon"><use href="#i-clock"/></svg></div><strong>Первый эксперимент ещё впереди</strong><p>Смешайте два вещества — успешная реакция появится в вашем журнале.</p></div>';
}

for (const column of columns) {
  const list = $(`#${column}-list`);
  list.addEventListener('click', (event) => {
    const button = event.target.closest('[data-id]');
    if (button) selectSubstance(button.dataset.id);
    if (event.target.closest('[data-example]')) choosePair(['fe', 'o2']);
  });
  list.addEventListener('dragstart', (event) => {
    const target = event.target.closest('[data-id]');
    if (!target || busy) { event.preventDefault(); return; }
    event.dataTransfer.setData('text/plain', target.dataset.id);
    event.dataTransfer.effectAllowed = 'copy'; target.classList.add('dragging');
  });
}

document.addEventListener('dragover', (event) => {
  const target = event.target.closest('.substance-card, .ingredient-slot');
  if (target && !busy) { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; target.classList.add('drag-over'); }
});
document.addEventListener('dragleave', (event) => event.target.closest('.drag-over')?.classList.remove('drag-over'));
document.addEventListener('dragend', () => document.querySelectorAll('.dragging, .drag-over').forEach((el) => el.classList.remove('dragging', 'drag-over')));
document.addEventListener('drop', (event) => {
  document.querySelectorAll('.dragging, .drag-over').forEach((el) => el.classList.remove('dragging', 'drag-over'));
  const target = event.target.closest('.substance-card, .ingredient-slot');
  if (!target) return;
  event.preventDefault();
  const source = event.dataTransfer.getData('text/plain');
  if (!loaded || busy || !byId.has(source) || !available(source)) return;
  if (target.matches('.ingredient-slot')) {
    const slot = Number(target.dataset.slot), other = 1 - slot;
    if (selected[other] === source) { toast('Выберите другое вещество для второй ячейки.'); return; }
    selected[slot] = source; activeSlot = selected.indexOf(null) === -1 ? null : selected.indexOf(null);
    clearResult(); renderSelection(); renderLists();
  } else if (target.dataset.id !== source) { choosePair([source, target.dataset.id]); mix(); }
});

$('#mix').addEventListener('click', mix);
$('#example').addEventListener('click', () => choosePair(['fe', 'o2']));
$('#clear-selection').addEventListener('click', () => { selected = [null, null]; activeSlot = 0; clearResult(); renderSelection(); renderLists(); });
document.querySelectorAll('[data-slot]').forEach((slot) => slot.addEventListener('click', () => {
  if (busy) return;
  const index = Number(slot.dataset.slot); selected[index] = null; activeSlot = index;
  clearResult(); renderSelection(); renderLists();
}));
$('#search').addEventListener('input', () => renderLists());
$('#category').addEventListener('change', () => renderLists());
$('#open-book').addEventListener('click', openBook);
$('#book-search').addEventListener('input', renderBook);
$('#open-history').addEventListener('click', () => { renderHistory(); $('#history-dialog').showModal(); });
$('#reset-progress').addEventListener('click', () => { if (!busy) $('#reset-dialog').showModal(); });
$('#confirm-reset').addEventListener('click', () => {
  if (busy) return;
  discoveries.clear(); history = []; selected = [null, null]; activeSlot = 0;
  const saved = persist(); clearResult(); renderSelection(); renderLists(); $('#reset-dialog').close();
  if (saved) toast('Лаборатория готова к новым открытиям');
});
document.addEventListener('click', (event) => {
  const close = event.target.closest('[data-close]');
  if (close) $(`#${close.dataset.close}`).close();
  if (event.target.closest('[data-book]')) openBook();
  const recipe = event.target.closest('[data-pair]');
  if (recipe && !recipe.disabled) { choosePair(recipe.dataset.pair.split('|')); recipe.closest('dialog').close(); $('#reactor-title').scrollIntoView({ behavior: 'smooth', block: 'center' }); }
});
document.querySelectorAll('dialog').forEach((dialog) => dialog.addEventListener('click', (event) => {
  if (event.target !== dialog) return;
  const bounds = dialog.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
}));
document.addEventListener('keydown', (event) => {
  if (event.key === '/' && !event.ctrlKey && !event.metaKey && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName) && !document.querySelector('dialog[open]')) {
    event.preventDefault(); $('#search').focus();
  }
});

async function initialize() {
  try {
    const response = await fetch('/api/catalog', { signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    catalog = data.substances; reactions = data.reactions;
    byId = new Map(catalog.map((s) => [s.id, s]));
    reactionByPair = new Map(reactions.map((r) => [pairKey(r.reactants), r]));
    possibleProducts = new Set(reactions.flatMap((r) => r.products));
    restore(); loaded = true; updateConnection(true); renderSelection(); renderLists();
  } catch {
    updateConnection(false);
    $('#reaction-result').className = 'reaction-result error';
    $('#reaction-result').innerHTML = '<svg class="icon"><use href="#i-info"/></svg><span>Не удалось загрузить каталог. Проверьте запуск сервера.</span><button class="example-button" id="retry-load">Повторить →</button>';
    $('#retry-load').addEventListener('click', initialize);
  }
}

initialize();
