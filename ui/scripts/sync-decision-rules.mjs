import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const source=await readFile(new URL('../../麻将规则.md',import.meta.url));
const hash=createHash('sha256').update(source).digest('hex');
const target=new URL('../src/game/decision/rule-source.js',import.meta.url);
const content=`// Updated by scripts/sync-decision-rules.mjs before start/build.\nexport const RULE_SOURCE_SHA256='${hash}';\n`;
if(await readFile(target,'utf8').catch(()=>null)!==content)await writeFile(target,content);
const publicRules=new URL('../public/rules.md',import.meta.url);
if(!source.equals(await readFile(publicRules).catch(()=>Buffer.alloc(0))))await writeFile(publicRules,source);
