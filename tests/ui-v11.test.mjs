import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {leaderboardSlots} from '../lib/leaderboard-slots.mjs';
import {QUESTIONS} from '../lib/questions.mjs';

const css=readFileSync(new URL('../app/globals.css',import.meta.url),'utf8');
const host=readFileSync(new URL('../app/host/page.jsx',import.meta.url),'utf8');
const player=readFileSync(new URL('../app/play/[code]/page.jsx',import.meta.url),'utf8');

test('the third question has the exact requested question mark and no answer key changes',()=>{
 assert.equal(QUESTIONS[2].text,'Каким должно быть давление в верхней части колонны по отношению к давлению в рефлюксной ёмкости?');
 assert.deepEqual(QUESTIONS.map(q=>q.correct),['Б','Г','В']);
 assert.match(QUESTIONS[1].choices[0],/Z-005/); // This closed valve is intentional.
 assert.match(QUESTIONS[1].choices[3],/Z-006/);
});

test('the drawn TOP-10 keeps fixed slots at 1, 3, 10 and 15 real players',()=>{
 for(const n of [1,3,10,15]){
  const players=Array.from({length:n},(_,i)=>({id:String(i),name:'Участник '+(i+1),rank:i+1,score:3}));
  const rows=leaderboardSlots(players);
  assert.equal(rows.length,10);assert.equal(rows[0]?.rank,1);
  assert.equal(rows[Math.min(n,10)-1]?.rank,Math.min(n,10));
  if(n<10)assert.equal(rows[n],null);
  if(n===15)assert.equal(rows[9]?.rank,10);
 }
 assert.equal(leaderboardSlots(null).length,10);
});

test('the title and final overlays are image-relative; drawn rank numerals are not duplicated',()=>{
 assert.match(css,/\.lobby-board\s*\{[^}]*aspect-ratio:1431\s*\/\s*806/s);
 assert.match(css,/\.victory\s*\{[^}]*aspect-ratio:1431\s*\/\s*806/s);
 assert.match(css,/\.victory-ranking\s*\{[^}]*grid-template-rows:repeat\(10/s);
 assert.doesNotMatch(host,/className="ranking-number"/);
 assert.match(host,/slots\.map/);
 assert.match(host,/lobby-start/);
 assert.match(css,/\.diagram-viewport\s*\{[^}]*overflow:auto/s);
 assert.match(player,/ZoomableDiagram/);
});
