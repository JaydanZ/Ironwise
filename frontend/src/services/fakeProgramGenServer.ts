import { ProgramJob, ProgranGenResult } from '@/types/programCreation'

// In-memory stand-in for the /programs/generate endpoints, swapped in for the axios client in tests

interface StoredJob extends ProgramJob {
  owner: string | undefined
}

type Request = { method: string; url: string; body?: unknown }

// Shaped like an AxiosError so isAxiosError and error.status work on it
export const httpError = (status: number) => ({
  isAxiosError: true,
  status,
  response: { status, data: {} }
})

const createServer = () => {
  const jobs = new Map<string, StoredJob>()
  const latestByUser = new Map<string, string>()
  const queuedGetErrors: unknown[] = []
  const requests: Request[] = []
  let nextId = 1
  let currentUser: string | undefined

  const visibleJob = (jobId: string) => {
    const job = jobs.get(jobId)
    if (!job || (job.owner && job.owner !== currentUser)) return undefined
    return job
  }

  const asResponse = ({ status, program }: StoredJob) =>
    program ? { status, program } : { status }

  const client = {
    interceptors: {
      request: { use: () => 0 },
      response: { use: () => 0 }
    },
    post: async (url: string, body: unknown) => {
      requests.push({ method: 'POST', url, body })
      const jobId = `job-${nextId++}`
      jobs.set(jobId, { status: 'pending', owner: currentUser })
      if (currentUser) latestByUser.set(currentUser, jobId)
      return { data: { job_id: jobId } }
    },
    get: async (url: string) => {
      requests.push({ method: 'GET', url })
      if (queuedGetErrors.length) throw queuedGetErrors.shift()

      if (url === '/latest') {
        const jobId = currentUser && latestByUser.get(currentUser)
        const job = jobId && visibleJob(jobId)
        if (!jobId || !job) throw httpError(404)
        return { data: { job_id: jobId, ...asResponse(job) } }
      }

      const job = visibleJob(decodeURIComponent(url.slice(1)))
      if (!job) throw httpError(404)
      return { data: asResponse(job) }
    },
    delete: async (url: string) => {
      requests.push({ method: 'DELETE', url })
      jobs.delete(decodeURIComponent(url.slice(1)))
      return { data: null }
    }
  }

  return {
    client,
    jobs,
    requests,
    reset() {
      jobs.clear()
      latestByUser.clear()
      queuedGetErrors.length = 0
      requests.length = 0
      nextId = 1
      currentUser = undefined
    },
    logIn(userId: string) {
      currentUser = userId
    },
    addJob(jobId: string, job: ProgramJob, owner?: string) {
      jobs.set(jobId, { ...job, owner })
      if (owner) latestByUser.set(owner, jobId)
    },
    finish(jobId: string, program: ProgranGenResult) {
      const job = jobs.get(jobId)
      if (job) jobs.set(jobId, { ...job, status: 'done', program })
    },
    fail(jobId: string) {
      const job = jobs.get(jobId)
      if (job) jobs.set(jobId, { ...job, status: 'failed' })
    },
    failNextGet(error: unknown) {
      queuedGetErrors.push(error)
    },
    requestsTo(method: string) {
      return requests.filter((request) => request.method === method)
    }
  }
}

export const fakeProgramGenServer = createServer()
