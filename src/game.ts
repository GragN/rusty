export type Item = 'matches' | 'letter' | 'key' | 'tape' | 'photo';
export type Place = 'letter' | 'plant' | 'candle' | 'clock' | 'drawer' | 'radio' | 'mirror' | 'door' | 'window' | 'portrait';

export interface GameState {
  version: 1;
  inventory: Item[];
  taken: Item[];
  candleLit: boolean;
  letterRead: boolean;
  clockSolved: boolean;
  drawerOpen: boolean;
  photoRead: boolean;
  tapeInserted: boolean;
  radioSolved: boolean;
  escaped: boolean;
  hour: number;
  minute: number;
  frequency: number;
  doorCode: number[];
}

export type Action =
  | { type: 'take'; item: Item }
  | { type: 'use'; item: Item; place: Place }
  | { type: 'clock'; hour: number; minute: number }
  | { type: 'frequency'; value: number }
  | { type: 'listen' }
  | { type: 'doorDigit'; index: number }
  | { type: 'openDoor' };

export interface Outcome { state: GameState; message: string; success: boolean }

export const itemNames: Record<Item, string> = {
  matches: 'Спички', letter: 'Письмо', key: 'Маленький ключ', tape: 'Кассета', photo: 'Фотография',
};

export function initialState(): GameState {
  return {
    version: 1, inventory: [], taken: [], candleLit: false, letterRead: false,
    clockSolved: false, drawerOpen: false, photoRead: false, tapeInserted: false,
    radioSolved: false, escaped: false, hour: 12, minute: 0, frequency: 880,
    doorCode: [0, 0, 0],
  };
}

export function progress(s: GameState): number {
  return [s.letterRead, s.clockSolved, s.radioSolved, s.escaped].filter(Boolean).length;
}

export function transition(current: GameState, action: Action): Outcome {
  const s: GameState = { ...current, inventory: [...current.inventory], taken: [...current.taken], doorCode: [...current.doorCode] };
  const result = (message: string, success = false): Outcome => ({ state: s, message, success });
  const remove = (item: Item) => { s.inventory = s.inventory.filter(i => i !== item); };
  if (s.escaped) return result('Комната уже отпустила вас. Иногда этого достаточно.');
  if (action.type === 'take') {
    if (s.taken.includes(action.item)) return result('Этот предмет уже у вас.');
    const available = action.item === 'matches' || action.item === 'letter'
      || (action.item === 'key' && s.clockSolved)
      || ((action.item === 'tape' || action.item === 'photo') && s.drawerOpen);
    if (!available) return result('Сначала нужно найти способ добраться до этого предмета.');
    s.taken.push(action.item); s.inventory.push(action.item);
    return result(`${itemNames[action.item]} теперь у вас.`, true);
  }
  if (action.type === 'use') {
    if (!s.inventory.includes(action.item)) return result('Этого предмета нет в карманах.');
    if (action.item === 'matches' && action.place === 'candle') {
      if (s.candleLit) return result('Свеча уже горит.');
      s.candleLit = true; remove('matches');
      return result('Огонёк дрогнул. В комнате стало чуть теплее.', true);
    }
    if (action.item === 'letter' && action.place === 'candle') {
      if (!s.candleLit) return result('Холодный воск не поможет. Сначала зажгите свечу.');
      s.letterRead = true;
      return result('Тепло проявило слова: «Короткая ищет птицу. Длинная — луну».', true);
    }
    if (action.item === 'key' && action.place === 'drawer') {
      s.drawerOpen = true; remove('key');
      return result('Замок щёлкнул. Внутри — кассета и старая фотография.', true);
    }
    if (action.item === 'photo' && action.place === 'mirror') {
      s.photoRead = true;
      return result('В отражении надпись читается правильно: «Наш голос — 96.4 FM».', true);
    }
    if (action.item === 'tape' && action.place === 'radio') {
      s.tapeInserted = true; remove('tape');
      return result('Лента на месте. Теперь найдите частоту, записанную на фотографии.', true);
    }
    return result('Кажется, у этого предмета другое назначение.');
  }
  if (action.type === 'clock') {
    if (s.clockSolved) return result('Часы уже отдали то, что берегли.');
    if (!Number.isInteger(action.hour) || action.hour < 1 || action.hour > 12
      || !Number.isInteger(action.minute) || action.minute < 0 || action.minute > 59) return result('Стрелки не могут показать такое время.');
    s.hour = action.hour; s.minute = action.minute;
    if (s.hour === 4 && s.minute === 45) {
      s.clockSolved = true;
      return result('Внутри часов что-то открылось. Под циферблатом лежит ключ.', true);
    }
    return result('Тиканье не вернулось. Птица и луна всё ещё ждут.');
  }
  if (action.type === 'frequency') {
    if (Number.isInteger(action.value) && action.value >= 880 && action.value <= 1080) s.frequency = action.value;
    return result('');
  }
  if (action.type === 'listen') {
    if (!s.tapeInserted) return result('Приёмник ловит только шум. В кассетном отсеке пусто.');
    if (s.frequency !== 964) return result('Сквозь шорох ленты не разобрать слов. Нужна точная частота.');
    s.radioSolved = true;
    return result('«Дождь стучал трижды. Сердце — дважды. А тишина отзывалась один раз. Дверь помнит порядок знаков».', true);
  }
  if (action.type === 'doorDigit') {
    if (Number.isInteger(action.index) && action.index >= 0 && action.index < 3) s.doorCode[action.index] = (s.doorCode[action.index] + 1) % 5;
    return result('');
  }
  if (action.type === 'openDoor') {
    if (!s.radioSolved) return result('За дверью тихо. Сначала верните комнате её голос.');
    if (s.doorCode.join('') !== '213') return result('Стук затих в дереве. Сопоставьте три знака на двери со словами из записи.');
    s.escaped = true;
    return result('Вы вспомнили. Теперь можно идти.', true);
  }
  return result('');
}

export function parseSave(raw: string | null): GameState | null {
  if (!raw) return null;
  try {
    const candidate = JSON.parse(raw) as Record<string, unknown>;
    const base = initialState();
    if (candidate.version !== 1) return null;
    const flags = ['candleLit', 'letterRead', 'clockSolved', 'drawerOpen', 'photoRead', 'tapeInserted', 'radioSolved', 'escaped'] as const;
    if (flags.some(k => typeof candidate[k] !== 'boolean')) return null;
    const validItems = Object.keys(itemNames);
    for (const k of ['inventory', 'taken'] as const) {
      if (!Array.isArray(candidate[k]) || candidate[k].some(i => !validItems.includes(i)) || new Set(candidate[k]).size !== candidate[k].length) return null;
    }
    const inventory = candidate.inventory as Item[], taken = candidate.taken as Item[];
    if (inventory.some(i => !taken.includes(i))) return null;
    const hour = candidate.hour as number, minute = candidate.minute as number, frequency = candidate.frequency as number;
    if (!Number.isInteger(hour) || hour < 1 || hour > 12 || !Number.isInteger(minute) || minute < 0 || minute > 59
      || !Number.isInteger(frequency) || frequency < 880 || frequency > 1080) return null;
    if (!Array.isArray(candidate.doorCode) || candidate.doorCode.length !== 3 || candidate.doorCode.some(n => !Number.isInteger(n) || n < 0 || n > 4)) return null;
    if ((candidate.letterRead && !candidate.candleLit) || (candidate.drawerOpen && !candidate.clockSolved)
      || (candidate.photoRead && !taken.includes('photo')) || (candidate.tapeInserted && (!candidate.drawerOpen || !taken.includes('tape')))
      || (candidate.radioSolved && !candidate.tapeInserted) || (candidate.escaped && !candidate.radioSolved)) return null;
    return { ...base, ...Object.fromEntries(flags.map(k => [k, candidate[k]])), inventory: [...inventory], taken: [...taken], hour, minute, frequency, doorCode: [...candidate.doorCode] as number[] };
  } catch { return null; }
}

export function hints(s: GameState): string[] {
  if (!s.candleLit) return ['В комнате есть вещи, которым не хватает тепла.', 'Посмотрите под горшок. Письмо со стола стоит поднести к огню.', 'Возьмите спички у растения, выберите их в карманах и нажмите на свечу.'];
  if (!s.letterRead) return ['На бумаге почти ничего нет. Возможно, чернила ждут тепла.', 'Возьмите письмо со стола и выберите его в карманах.', 'Примените письмо к горящей свече.'];
  if (!s.clockSolved) return ['На часах есть два необычных знака.', 'Птица отмечает четвёртый час. Луна стоит на месте девятки.', 'Установите часы на 04:45. Короткая стрелка — часы, длинная — минуты.'];
  if (!s.drawerOpen) return ['В часах открылось маленькое отделение.', 'Заберите ключ и осмотрите комод под приёмником.', 'Выберите маленький ключ в карманах и нажмите на ящик комода.'];
  if (!s.photoRead) return ['В комоде остались два следа прошлого.', 'Оборот фотографии трудно прочесть. В комнате есть зеркало.', 'Возьмите фотографию, выберите её в карманах и нажмите на зеркало.'];
  if (!s.radioSolved) return ['У приёмника есть и кассетный отсек, и настройка FM.', 'Вставьте кассету из комода и вспомните надпись на фотографии.', 'Выберите кассету и нажмите на приёмник. Установите 96.4 FM, затем нажмите «Слушать».'];
  if (!s.escaped) return ['Запись связывает каждый звук с числом. А знаки на двери задают порядок.', 'На двери слева направо: сердце, тишина, дождь.', 'Сердце — 2, тишина — 1, дождь — 3. Установите 2 · 1 · 3 и откройте дверь.'];
  return ['Вы уже нашли дорогу домой.'];
}
