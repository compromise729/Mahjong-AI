import { existsSync } from 'node:fs';
import { get } from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const uiRoot = fileURLToPath(new URL('../', import.meta.url));
const vite = fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url));
const port = Number(process.argv[2] ?? 4173);
if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  console.error('端口应为1024至65535之间的整数。');
  process.exit(1);
}
const url = `http://127.0.0.1:${port}/`;
const alreadyRunning = await new Promise(resolve => {
  const request = get(url, response => {
    let html = '';
    response.setEncoding('utf8');
    response.on('data', chunk => {
      html += chunk;
      if (html.length > 65536) request.destroy();
    });
    response.on('end', () => resolve(response.statusCode === 200 && /<title>川麻 · 决策助手<\/title>/.test(html)));
    response.on('error', () => resolve(false));
  });
  request.setTimeout(1500, () => request.destroy());
  request.on('error', () => resolve(false));
});
if (alreadyRunning) {
  console.log(`牌桌已经在运行，直接打开：${url}`);
} else if (!existsSync(vite)) {
  console.error('缺少前端依赖。请先安装项目依赖，再运行 start.cmd。');
  process.exitCode = 1;
} else {
  console.log(`正在启动牌桌：${url}\n保持此终端打开，按 Ctrl+C 停止。`);
  const child = spawn(process.execPath, [vite, '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
    cwd: uiRoot,
    stdio: 'inherit',
  });
  child.on('error', error => {
    console.error(`启动失败：${error.message}`);
    process.exitCode = 1;
  });
  child.on('exit', code => { process.exitCode = code ?? 1; });
}
