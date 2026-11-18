import { spawnSync } from 'node:child_process';

const suites = [
  {
    name: 'Firestore Rules Emulator Suite',
    cmd: 'npx',
    args: ['tsx', 'tests/firestore.rules.test.ts'],
  },
  {
    name: 'Storage Rules Emulator Suite',
    cmd: 'npx',
    args: ['tsx', 'tests/storage.rules.test.ts'],
  },
];

let hasFailure = false;

for (const suite of suites) {
  console.log(`\n=== Running ${suite.name} ===`);
  const result = spawnSync(suite.cmd, suite.args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.error) {
    console.error(`[FAIL] ${suite.name} failed to spawn: ${result.error.message}`);
    hasFailure = true;
  } else if (result.signal) {
    console.error(`[FAIL] ${suite.name} terminated by signal: ${result.signal}`);
    hasFailure = true;
  } else if (result.status === null || result.status !== 0) {
    console.error(`[FAIL] ${suite.name} exited with status: ${String(result.status)}`);
    hasFailure = true;
  } else {
    console.log(`[PASS] ${suite.name} exited with status: 0`);
  }
}

process.exit(hasFailure ? 1 : 0);
