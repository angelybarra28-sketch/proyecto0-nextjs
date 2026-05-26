import { spawnSync } from 'node:child_process';

function runNodeScript(scriptPath) {
  console.log(`[verify-production] Running node ${scriptPath}`);
  const result = spawnSync(process.execPath, [scriptPath], { stdio: 'inherit' });

  if (result.status !== 0) {
    process.exitCode = result.status ?? 1;
    return false;
  }

  return true;
}

const ok = runNodeScript('scripts/check-runtime.mjs');

if (ok) {
  console.log('[verify-production] Production verification passed');
}
