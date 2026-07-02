import { describe, it, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { writeFileSync, rmSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createMockServer, type MockServer } from './.build/dev/mock-server.ts'
import { bb } from './.build/dev/run-bb.ts'

describe('bb download upload', () => {
  let server: MockServer
  let tmpDir: string
  let imgPath: string

  before(async () => {
    server = await createMockServer()
    tmpDir = mkdtempSync(path.join(tmpdir(), 'bb-dl-'))
    imgPath = path.join(tmpDir, 'shot.png')
    writeFileSync(imgPath, 'PNGDATA')
  })
  after(async () => {
    await server.stop()
    rmSync(tmpDir, { recursive: true, force: true })
  })
  beforeEach(() => server.reset())

  it('POSTs multipart/form-data to the Downloads area and prints the URL', async () => {
    // Given the Downloads endpoint accepts the upload (201 Created, empty body)
    server.stub('POST', '/repositories/testws/testrepo/downloads', {}, 201)

    // When I upload a file
    const result = await bb(['download', 'upload', imgPath], { port: server.port })

    // Then it POSTs a multipart body (NOT application/json) to /downloads
    const call = server.getLastCall()
    assert.equal(call.method, 'POST')
    assert.match(call.path, /\/repositories\/testws\/testrepo\/downloads$/)
    assert.match(String(call.headers['content-type']), /multipart\/form-data/)
    // And prints the public bitbucket.org download URL (not the API host)
    assert.equal(result.exitCode, 0)
    assert.equal(result.stdout.trim(), 'https://bitbucket.org/testws/testrepo/downloads/shot.png')
  })

  it('stores under --name and reflects it in the URL', async () => {
    // Given the Downloads endpoint accepts the upload
    server.stub('POST', '/repositories/testws/testrepo/downloads', {}, 201)

    // When I pass an explicit --name
    const result = await bb(['download', 'upload', imgPath, '--name', 'pr9-diff.png'], { port: server.port })

    // Then the printed URL uses that name
    assert.equal(result.exitCode, 0)
    assert.equal(result.stdout.trim(), 'https://bitbucket.org/testws/testrepo/downloads/pr9-diff.png')
  })

  it('emits {name,url} with --json', async () => {
    // Given the Downloads endpoint accepts the upload
    server.stub('POST', '/repositories/testws/testrepo/downloads', {}, 201)

    // When I request JSON output
    const result = await bb(['download', 'upload', imgPath, '--json'], { port: server.port })

    // Then it prints a JSON object with name and url
    const out = JSON.parse(result.stdout)
    assert.equal(out.name, 'shot.png')
    assert.equal(out.url, 'https://bitbucket.org/testws/testrepo/downloads/shot.png')
    assert.equal(result.exitCode, 0)
  })

  it('errors on a missing file without sending a request', async () => {
    // When I point at a nonexistent file
    const result = await bb(['download', 'upload', '/no/such/file.png'], { port: server.port })

    // Then it fails locally and never hits the API
    assert.notEqual(result.exitCode, 0)
    assert.match(result.stderr, /file not found/)
    assert.equal(server.getCalls().length, 0)
  })

  it('surfaces the HTTP status when the upload fails', async () => {
    // Given the Downloads endpoint rejects the upload
    server.stub('POST', '/repositories/testws/testrepo/downloads', { error: { message: 'nope' } }, 403)

    // When I upload
    const result = await bb(['download', 'upload', imgPath], { port: server.port })

    // Then it reports the HTTP error
    assert.notEqual(result.exitCode, 0)
    assert.match(result.stderr, /HTTP 403/)
  })
})

describe('bb download list', () => {
  let server: MockServer
  before(async () => { server = await createMockServer() })
  after(() => server.stop())
  beforeEach(() => server.reset())

  it('GETs the Downloads area and formats entries', async () => {
    // Given the Downloads area has files
    server.stub('GET', '/repositories/testws/testrepo/downloads', {
      values: [{ name: 'a.png', size: 123, downloads: 4 }],
    })

    // When I list downloads
    const result = await bb('download list', { port: server.port })

    // Then it GETs /downloads and prints a formatted line
    const call = server.getLastCall()
    assert.equal(call.method, 'GET')
    assert.match(call.path, /\/downloads$/)
    assert.match(result.stdout, /a\.png/)
    assert.match(result.stdout, /123 bytes/)
    assert.match(result.stdout, /4 downloads/)
    assert.equal(result.exitCode, 0)
  })

  it('says "No downloads." when the area is empty', async () => {
    // Given no files
    server.stub('GET', '/repositories/testws/testrepo/downloads', { values: [] })

    // When I list downloads
    const result = await bb('download list', { port: server.port })

    // Then it says so
    assert.match(result.stdout, /No downloads\./)
    assert.equal(result.exitCode, 0)
  })

  it('outputs raw JSON with --json', async () => {
    // Given the Downloads area has files
    server.stub('GET', '/repositories/testws/testrepo/downloads', {
      values: [{ name: 'a.png', size: 1, downloads: 0 }],
    })

    // When I request JSON
    const result = await bb('download list --json', { port: server.port })

    // Then it prints the raw values array
    const out = JSON.parse(result.stdout)
    assert.equal(out[0].name, 'a.png')
    assert.equal(result.exitCode, 0)
  })
})
