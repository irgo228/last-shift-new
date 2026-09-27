export const QUESTION_MS = 30_000;
export const REVEAL_MS = 10_000;
export const ROUND_MS = QUESTION_MS + REVEAL_MS;
export const QUESTION_COUNT = 3;
export const TOTAL_MS = ROUND_MS * QUESTION_COUNT;

/** Stateless calculation: nothing depends on a live server timer/process. */
export function phaseForRoom(status, startedAt, nowMs = Date.now()) {
  if (status === 'lobby' || !startedAt) return {kind:'lobby', questionNo:0, endsAt:null};
  const start = new Date(startedAt).getTime();
  if (!Number.isFinite(start)) throw new Error('Invalid room startedAt');
  const elapsed = Math.max(0, nowMs - start);
  if (elapsed >= TOTAL_MS) return {kind:'final',questionNo:3,endsAt:null};
  const index = Math.floor(elapsed / ROUND_MS);
  const position = elapsed - index * ROUND_MS;
  const reveal = position >= QUESTION_MS;
  return {
    kind: reveal ? 'reveal' : 'question',
    questionNo: index + 1,
    endsAt: new Date(start + index * ROUND_MS + (reveal ? ROUND_MS : QUESTION_MS)).toISOString(),
  };
}

export function calculateLeaderboard(players, answers, correctByQuestion) {
  const totals = new Map(players.map(p=>[p.id,{id:p.id,name:p.display_name,score:0,correctElapsedMs:0,joinedAt:p.joined_at||'',answered:0}]));
  for(const a of answers){
    const p=totals.get(a.player_id); if(!p) continue;
    p.answered++;
    if(a.option_label===correctByQuestion[a.question_no-1]){
      p.score++;
      p.correctElapsedMs += Math.max(0,a.elapsed_ms||0);
    }
  }
  return [...totals.values()].sort((a,b)=> b.score-a.score || a.correctElapsedMs-b.correctElapsedMs || a.joinedAt.localeCompare(b.joinedAt) || a.id.localeCompare(b.id)).map((p,i)=>({...p,rank:i+1}));
}
