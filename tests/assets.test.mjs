import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';
const dir=path.resolve('public/assets');
const expected={
 'title.jpg':'ffd8ff','q1-question.png':'89504e470d0a1a0a','q1-answer.png':'89504e470d0a1a0a',
 'q2-question.png':'89504e470d0a1a0a','q2-answer.png':'89504e470d0a1a0a',
 'q3-question.png':'89504e470d0a1a0a','q3-answer.png':'89504e470d0a1a0a','final.jpg':'ffd8ff'
};
test('all 8 original images are present and valid PNG/JPEG signatures',()=>{
 for(const [name,magic] of Object.entries(expected)){
  const bytes=fs.readFileSync(path.join(dir,name));
  assert.ok(bytes.length>20000,name);
  assert.equal(bytes.subarray(0,magic.length/2).toString('hex'),magic,name);
 }
});
