import {test} from 'node:test';
import assert from 'node:assert/strict';
import {phaseForRoom,calculateLeaderboard} from '../lib/game.mjs';
import {QUESTIONS,publicQuestion} from '../lib/questions.mjs';
const start='2026-09-27T00:00:00.000Z',t=Date.parse(start);
test('three 30s questions and three 10s reveals, including boundaries',()=>{
 const specs=[[0,'question',1],[29_999,'question',1],[30_000,'reveal',1],[39_999,'reveal',1],[40_000,'question',2],[70_000,'reveal',2],[80_000,'question',3],[110_000,'reveal',3],[119_999,'reveal',3],[120_000,'final',3]];
 for(const [elapsed,kind,number] of specs){const p=phaseForRoom('started',start,t+elapsed);assert.equal(p.kind,kind,String(elapsed));assert.equal(p.questionNo,number);}
 assert.equal(phaseForRoom('lobby',null).kind,'lobby');
});
test('answers are not disclosed before reveal',()=>{assert.deepEqual(QUESTIONS.map(q=>q.correct),['Б','Г','В']);for(let i=0;i<3;i++){assert.equal('correct' in publicQuestion(i,false),false);assert.equal('answerImage' in publicQuestion(i,false),false);assert.equal(publicQuestion(i,true).correct,QUESTIONS[i].correct);}});
test('score then correct-answer time breaks ties deterministically',()=>{const p=[{id:'a',display_name:'Анна',joined_at:'2026-01-01'},{id:'b',display_name:'Борис',joined_at:'2026-01-02'}]; const a=[{player_id:'a',question_no:1,option_label:'Б',elapsed_ms:10000},{player_id:'b',question_no:1,option_label:'Б',elapsed_ms:3000},{player_id:'b',question_no:2,option_label:'А',elapsed_ms:1000}];const r=calculateLeaderboard(p,a,['Б','Г','В']);assert.equal(r[0].name,'Борис');assert.equal(r[1].score,1);});
