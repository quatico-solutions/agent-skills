import { execFile } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BB_PATH = path.resolve(__dirname, '../../../bin/bb')

export interface BbResult {
  stdout: string
  stderr: string
  exitCode: number
}

export async function bb(args: string | string[], opts: {
  port: number
  repo?: string
  env?: Record<string, string>
  /** Written to the subprocess's stdin (e.g. a token for `auth login`). */
  input?: string
}): Promise<BbResult> {
  const repo = opts.repo ?? 'testws/testrepo'
  const argList = Array.isArray(args) ? args : args.split(/\s+/).filter(Boolean)

  // Prepend -R unless already specified
  if (!argList.includes('-R')) {
    argList.unshift('-R', repo)
  }

  const env: Record<string, string> = {
    PATH: process.env.PATH ?? '',
    HOME: process.env.HOME ?? '',
    BB_API_URL: `http://localhost:${opts.port}/mockbb`,
    BB_TOKEN: 'fake-test-token',
    BB_EMAIL: 'test@example.com',
    ...opts.env,
  }

  return new Promise<BbResult>((resolve) => {
    const child = execFile('bash', [BB_PATH, ...argList], {
      env,
      timeout: 5_000,
      maxBuffer: 1024 * 1024,
    }, (error, stdout, stderr) => {
      resolve({
        stdout: stdout ?? '',
        stderr: stderr ?? '',
        exitCode: error?.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER' ? 1
          : typeof error?.code === 'number' ? error.code
          : error ? 1 : 0,
      })
    })
    // Always close stdin so commands that `read` from it (e.g. auth login in
    // non-interactive mode) get EOF instead of blocking until the timeout.
    //
    // Fast-exiting commands (unknown command, --version) can close their stdin
    // before this write lands. The write then raises EPIPE — which, without a
    // handler, surfaces as an uncaughtException and fails whichever test's
    // subprocess won the race (a flaky failure under parallel load). It is
    // harmless here: the command didn't consume stdin, and its real behavior is
    // captured via exitCode/stdout/stderr above. So swallow stdin write errors.
    child.stdin?.on('error', () => {})
    child.stdin?.end(opts.input ?? '')
  })
}
