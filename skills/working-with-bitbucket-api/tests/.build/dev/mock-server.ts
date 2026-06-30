import express, { type Request, type Response } from 'express'
import { type Server } from 'node:http'

export interface RecordedCall {
  method: string
  url: string
  path: string
  query: Record<string, string>
  headers: Record<string, string>
  body: unknown
}

interface Stub {
  method: string
  pathPrefix: string
  status: number
  body: unknown
  contentType: string
  queryMatch?: Record<string, string>
}

export interface MockServer {
  port: number
  baseUrl: string
  stub: (method: string, pathPrefix: string, body: unknown, status?: number) => void
  stubRaw: (method: string, pathPrefix: string, body: string, status?: number) => void
  stubWithQuery: (method: string, pathPrefix: string, query: Record<string, string>, body: unknown, status?: number) => void
  getCalls: () => RecordedCall[]
  getLastCall: () => RecordedCall
  getCallsTo: (method: string, pathSubstring: string) => RecordedCall[]
  reset: () => void
  stop: () => Promise<void>
}

export async function createMockServer(): Promise<MockServer> {
  const app = express()
  app.use(express.json())

  let stubs: Stub[] = []
  let calls: RecordedCall[] = []

  // Catch-all: record request, match stub, respond
  app.use('/mockbb/*splat', (req: Request, res: Response) => {
    // Express 5 app.use() strips the mount path from req.path, so we
    // parse the real path from req.originalUrl to get the full API path.
    const urlPath = req.originalUrl.split('?')[0]
    const mockPath = urlPath.replace(/^\/mockbb/, '')

    const call: RecordedCall = {
      method: req.method,
      url: req.originalUrl.replace(/^\/mockbb/, ''),
      path: mockPath,
      query: req.query as Record<string, string>,
      headers: req.headers as Record<string, string>,
      body: req.body,
    }
    calls.push(call)

    // Match stubs LIFO (last registered wins).
    // Query-specific stubs are preferred over generic ones.
    const query = req.query as Record<string, string>
    const candidates = [...stubs].reverse().filter(
      s => s.method === req.method && mockPath.startsWith(s.pathPrefix)
    )
    const stub = candidates.find(s => {
      if (!s.queryMatch) return false
      return Object.entries(s.queryMatch).every(([k, v]) => query[k] === v)
    }) ?? candidates.find(s => !s.queryMatch)

    if (stub) {
      res.status(stub.status)
      res.set('Content-Type', stub.contentType)
      if (stub.contentType === 'application/json') {
        res.json(stub.body)
      } else {
        res.send(stub.body)
      }
    } else {
      res.status(404).json({ error: { message: `no stub for ${req.method} ${mockPath}` } })
    }
  })

  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s))
  })

  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Failed to get server address')
  const port = address.port

  return {
    port,
    baseUrl: `http://localhost:${port}/mockbb`,

    stub(method: string, pathPrefix: string, body: unknown, status = 200) {
      stubs.push({ method: method.toUpperCase(), pathPrefix, status, body, contentType: 'application/json' })
    },

    stubRaw(method: string, pathPrefix: string, body: string, status = 200) {
      stubs.push({ method: method.toUpperCase(), pathPrefix, status, body, contentType: 'text/plain' })
    },

    stubWithQuery(method: string, pathPrefix: string, query: Record<string, string>, body: unknown, status = 200) {
      stubs.push({ method: method.toUpperCase(), pathPrefix, status, body, contentType: 'application/json', queryMatch: query })
    },

    getCalls() {
      return [...calls]
    },

    getLastCall() {
      if (calls.length === 0) throw new Error('No calls recorded')
      return calls[calls.length - 1]
    },

    getCallsTo(method: string, pathSubstring: string) {
      return calls.filter(c => c.method === method.toUpperCase() && c.path.includes(pathSubstring))
    },

    reset() {
      stubs = []
      calls = []
    },

    async stop() {
      server.closeAllConnections()
      return new Promise<void>((resolve, reject) => {
        server.close((err) => err ? reject(err) : resolve())
      })
    },
  }
}
