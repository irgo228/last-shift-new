import {test} from 'node:test';
import assert from 'node:assert/strict';
import {issueHostSession,validHostSession,checkHostPassword,hashToken,bearerToken} from '../lib/auth.mjs';
process.env.HOST_SESSION_SECRET='a'.repeat(64);
process.env.HOST_ACCESS_PASSWORD='extra-safe-host-passphrase';
test('host session is signed, expires and rejects tampering',()=>{
 const t=issueHostSession(123456);assert.equal(validHostSession(t,123456),true);
 assert.equal(validHostSession(t,123456+12*60*60*1000+1),false);
 assert.equal(validHostSession(t+'x',123456),false);
 assert.equal(validHostSession('',123456),false);
});
test('host password and 64-char hashed player token',()=>{
 assert.equal(checkHostPassword('extra-safe-host-passphrase'),true);
 assert.equal(checkHostPassword('wrong-password'),false);
 assert.match(hashToken('test'),/^[a-f0-9]{64}$/);
 const valid={headers:new Headers({authorization:'Bearer '+'a'.repeat(64)})};
 assert.equal(bearerToken(valid),'a'.repeat(64));
 assert.equal(bearerToken({headers:new Headers({authorization:'Bearer BAD'})}),null);
});
