import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const nextBin = path.join(root, 'node_modules', 'next', 'dist', 'bin', 'next')

const env = {
  ...process.env,
  NEXT_TELEMETRY_DISABLED: '1',
}

// Next 14 treats any DEBUG value as test mode and then performs a version
// check during `next dev`, which can stall or fail on locked-down networks.
delete env.DEBUG

const child = spawn(process.execPath, [nextBin, 'dev', ...process.argv.slice(2)], {
  cwd: root,
  env,
  stdio: 'inherit',
})

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }

  process.exit(code ?? 0)
})
