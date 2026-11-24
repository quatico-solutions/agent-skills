import { createHash } from 'node:crypto'
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

// Helpers for the files `bb` keeps for its hourly request budget: the request
// log (`requests-<key>-<YYYYMMDDHH>.log`, one epoch-seconds line per request)
// and the pause file (`pause-<key>`, one line `<until-epoch> <length-s>`).

const PREFIX = 'bb-state-'

/**
 * A fresh state directory path with a space in its name, `<tmp>/bb state`.
 * The directory itself does not exist yet: `bb` creates it on first use, and
 * the space makes every test exercise quoting.
 */
export function makeStateDir(): string {
  return path.join(mkdtempSync(path.join(tmpdir(), PREFIX)), 'bb state')
}

/** Removes a directory made by `makeStateDir()`, together with its temporary parent. */
export function removeStateDir(dir: string): void {
  const parent = path.dirname(dir)
  rmSync(dir, { recursive: true, force: true })
  if (path.basename(parent).startsWith(PREFIX)) rmSync(parent, { recursive: true, force: true })
}

/**
 * The first 12 hex characters of the SHA-256 of the email with A-Z lowercased.
 * ASCII only, like bb's `LC_ALL=C tr` and Plot's fleetd.
 */
export function accountKey(email: string): string {
  const lower = email.replace(/[A-Z]/g, (c) => c.toLowerCase())
  return createHash('sha256').update(lower).digest('hex').slice(0, 12)
}

/** `YYYYMMDDHH` of the UTC hour that holds `epoch`. */
function hourStamp(epoch: number): string {
  return new Date(epoch * 1000).toISOString().slice(0, 13).replace(/[-T]/g, '')
}

/** The request file that holds the line for a request made at `epoch`. */
export function requestFile(dir: string, email: string, epoch: number): string {
  return path.join(dir, `requests-${accountKey(email)}-${hourStamp(epoch)}.log`)
}

/** Writes each epoch as one line into the request file of its UTC hour. */
export function seedRequests(dir: string, email: string, epochs: number[]): void {
  mkdirSync(dir, { recursive: true })
  for (const epoch of epochs) {
    appendFileSync(requestFile(dir, email, epoch), `${epoch}\n`)
  }
}

/** Every epoch recorded for the account, in every request file, in ascending order. */
export function readRequests(dir: string, email: string): number[] {
  if (!existsSync(dir)) return []
  const key = accountKey(email)
  return readdirSync(dir)
    .filter((name) => name.startsWith(`requests-${key}-`) && name.endsWith('.log'))
    .flatMap((name) => readFileSync(path.join(dir, name), 'utf8').split('\n'))
    .filter((line) => /^[0-9]+$/.test(line))
    .map(Number)
    .sort((a, b) => a - b)
}

/** Writes the account's pause file. */
export function seedPause(dir: string, email: string, until: number, length: number): void {
  mkdirSync(dir, { recursive: true })
  writeFileSync(path.join(dir, `pause-${accountKey(email)}`), `${until} ${length}\n`)
}

/**
 * The account's pause, or null when there is no pause file or the file does
 * not hold exactly two whitespace-separated integers: a half-written file never
 * reads as a pause with a NaN end.
 */
export function readPause(dir: string, email: string): { until: number, length: number } | null {
  const file = path.join(dir, `pause-${accountKey(email)}`)
  if (!existsSync(file)) return null
  const fields = readFileSync(file, 'utf8').trim().split(/\s+/)
  if (fields.length !== 2) return null
  const [until, length] = fields.map(Number)
  if (!Number.isInteger(until) || !Number.isInteger(length)) return null
  return { until, length }
}

/** `HH:MM:SSZ` in UTC, the form `bb` prints. */
export function utcHms(epoch: number): string {
  return `${new Date(epoch * 1000).toISOString().slice(11, 19)}Z`
}
