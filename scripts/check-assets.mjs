import fs from 'node:fs';
import path from 'node:path';
const expected=['title.jpg','q1-question.png','q1-answer.png','q2-question.png','q2-answer.png','q3-question.png','q3-answer.png','final.jpg'];
for(const name of expected){const p=path.join('public','assets',name);if(!fs.existsSync(p)||fs.statSync(p).size<10000)throw new Error(`Missing/unexpectedly small image: ${p}`);}
console.log('ASSETS PASS: 8 images extracted from the provided DOCX');
