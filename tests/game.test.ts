import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialState, transition, parseSave, progress, hints } from '../src/game.ts';
import type { Action, GameState } from '../src/game.ts';

function run(actions: Action[], start: GameState = initialState()): GameState {
  return actions.reduce((s,a)=>transition(s,a).state,start);
}
const setup: Action[] = [
  {type:'take',item:'letter'}, {type:'take',item:'matches'},
  {type:'use',item:'matches',place:'candle'}, {type:'use',item:'letter',place:'candle'},
  {type:'clock',hour:4,minute:45}, {type:'take',item:'key'},
  {type:'use',item:'key',place:'drawer'}, {type:'take',item:'photo'}, {type:'take',item:'tape'},
  {type:'use',item:'photo',place:'mirror'}, {type:'use',item:'tape',place:'radio'},
  {type:'frequency',value:964}, {type:'listen'},
];

test('all four puzzles can be completed in the intended order',()=>{
  const state=run([...setup,{type:'doorDigit',index:0},{type:'doorDigit',index:0},{type:'doorDigit',index:1},
    {type:'doorDigit',index:2},{type:'doorDigit',index:2},{type:'doorDigit',index:2},{type:'openDoor'}]);
  assert.equal(progress(state),4);
  assert.equal(state.escaped,true);
  assert.deepEqual(state.inventory,['letter','photo']);
  assert.deepEqual(parseSave(JSON.stringify(state)),state);
});
test('paper needs a flame and owned matches, and actions do not mutate their input',()=>{
  const start=initialState();
  assert.equal(transition(start,{type:'use',item:'matches',place:'candle'}).state.candleLit,false);
  assert.equal(transition(run([{type:'take',item:'letter'}]),{type:'use',item:'letter',place:'candle'}).state.letterRead,false);
  const owned=run([{type:'take',item:'matches'}]);
  const next=transition(owned,{type:'use',item:'matches',place:'candle'}).state;
  assert.deepEqual(owned.inventory,['matches']);
  assert.equal(owned.candleLit,false); assert.equal(next.candleLit,true);
  assert.deepEqual(next.inventory,[]); assert.deepEqual(start,initialState());
});
test('locked objects and duplicate collection cannot give extra items',()=>{
  for(const item of ['key','tape','photo'] as const) assert.equal(transition(initialState(),{type:'take',item}).success,false);
  const once=run([{type:'take',item:'matches'},{type:'take',item:'matches'}]);
  assert.deepEqual(once.inventory,['matches']);
  assert.equal(transition(once,{type:'use',item:'matches',place:'radio'}).success,false);
});
test('clock rejects wrong times and malformed values',()=>{
  for(const [hour,minute] of [[4,40],[12,45],[0,45],[4,60],[NaN,45],[4,1.5]]) {
    const state=transition(initialState(),{type:'clock',hour,minute}).state;
    assert.equal(state.clockSolved,false);
  }
  assert.equal(transition(initialState(),{type:'clock',hour:4,minute:45}).state.clockSolved,true);
});
test('radio needs both cassette and exact frequency',()=>{
  assert.equal(transition(run([{type:'frequency',value:964}]),{type:'listen'}).success,false);
  const ready=run(setup.slice(0,-2));
  assert.equal(transition(run([{type:'frequency',value:963}],ready),{type:'listen'}).success,false);
  assert.equal(transition(run([{type:'frequency',value:964}],ready),{type:'listen'}).success,true);
  for(const value of [879,1081,NaN,964.5]) assert.equal(transition(initialState(),{type:'frequency',value}).state.frequency,880);
});
test('door requires the memory and the symbol order, and counters wrap',()=>{
  assert.equal(transition({...initialState(),doorCode:[2,1,3]},{type:'openDoor'}).state.escaped,false);
  const ready=run(setup);
  assert.equal(transition({...ready,doorCode:[3,2,1]},{type:'openDoor'}).state.escaped,false);
  assert.equal(transition({...ready,doorCode:[2,1,3]},{type:'openDoor'}).state.escaped,true);
  assert.deepEqual(run(Array.from({length:5},()=>({type:'doorDigit',index:0}))),initialState());
  assert.deepEqual(transition(ready,{type:'doorDigit',index:99}).state,ready);
});
test('save parser rejects malformed, out of range, and inconsistent saves',()=>{
  assert.deepEqual(parseSave(JSON.stringify(initialState())),initialState());
  for(const raw of [null,'broken','null','{}','[]']) assert.equal(parseSave(raw),null);
  for(const partial of [
    {version:2},{hour:0},{minute:60},{frequency:964.5},{doorCode:[1,2]},
    {inventory:['unknown']},{inventory:['letter'],taken:[]},{taken:['matches','matches']},
    {escaped:true},{radioSolved:true},{letterRead:true},{drawerOpen:true},{photoRead:true},
    {tapeInserted:true},
  ]) assert.equal(parseSave(JSON.stringify({...initialState(),...partial})),null);
});
test('all save checkpoints restore and contextual hints advance with play',()=>{
  let s=initialState(); const first=hints(s);
  for(const action of setup){s=transition(s,action).state;assert.deepEqual(parseSave(JSON.stringify(s)),s);assert.ok(hints(s).length>0);}
  assert.notDeepEqual(hints(s),first);
  assert.match(hints(s)[2],/2 · 1 · 3/);
});
