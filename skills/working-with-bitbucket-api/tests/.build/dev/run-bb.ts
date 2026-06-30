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
    execFile('bash', [BB_PATH, ...argList], {
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
  })
}
