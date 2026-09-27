/** The supplied leaderboard illustration has precisely 10 fixed, pre-numbered rows.
 * Empty entries must remain empty slots; NEVER flex the number of rendered rows. */
export function leaderboardSlots(leaderboard) {
  const entries = Array.isArray(leaderboard) ? leaderboard : [];
  return Array.from({length:10},(_,index)=>entries[index]||null);
}
