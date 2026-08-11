const SLOT_API = '/api/slots'


async function errorMessage(response) {
  try {
    const payload = await response.json()
    if (typeof payload?.detail === 'string' && payload.detail) return payload.detail
    if (Array.isArray(payload?.detail)) {
      const details = payload.detail
        .map(item => typeof item?.msg === 'string' ? item.msg : String(item))
        .filter(Boolean)
      if (details.length) return details.join(', ')
    }
  } catch {
    // Some error responses do not have a JSON body.
  }
  return `HTTP ${response.status}`
}


export function createSlotClient({ getToken, fetchImpl = fetch }) {
  async function request(path, {
    method = 'GET', body, protected: needsToken = false, responseType = 'json', signal,
  } = {}) {
    const headers = {}
    if (body !== undefined) headers['Content-Type'] = 'application/json'
    if (needsToken) headers['X-Token'] = getToken?.() ?? ''

    const response = await fetchImpl(`${SLOT_API}${path}`, {
      method,
      ...(signal ? { signal } : {}),
      ...(Object.keys(headers).length ? { headers } : {}),
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    })
    if (!response.ok) {
      const error = new Error(await errorMessage(response))
      error.status = response.status
      throw error
    }
    return responseType === 'blob' ? response.blob() : response.json()
  }

  return {
    listSlots(day, options = {}) {
      return request(`?date=${encodeURIComponent(day)}`, {
        protected: true, signal: options.signal,
      })
    },
    getSlot(runId, options = {}) {
      return request(`/${encodeURIComponent(runId)}`, {
        protected: true, signal: options.signal,
      })
    },
    checkTopic(runId, topic) {
      return request(`/${encodeURIComponent(runId)}/check-topic`, {
        method: 'POST', body: topic, protected: true,
      })
    },
    selectCandidate(runId, candidateId) {
      return request(`/${encodeURIComponent(runId)}/select-candidate`, {
        method: 'POST', body: { candidate_id: candidateId }, protected: true,
      })
    },
    reserve(runId) {
      return request(`/${encodeURIComponent(runId)}/reservation`, {
        method: 'PUT', body: { checked: true }, protected: true,
      })
    },
    cancel(runId) {
      return request(`/${encodeURIComponent(runId)}/reservation`, {
        method: 'DELETE', protected: true,
      })
    },
    events(runId, afterId = 0, limit = 100, options = {}) {
      return request(`/${encodeURIComponent(runId)}/events?after_id=${encodeURIComponent(afterId)}&limit=${encodeURIComponent(limit)}`, {
        signal: options.signal,
      })
    },
    fetchVideoBlob(runId, options = {}) {
      return request(`/${encodeURIComponent(runId)}/video`, {
        protected: true, responseType: 'blob', signal: options.signal,
      })
    },
    approve(runId) {
      return request(`/${encodeURIComponent(runId)}/approve`, {
        method: 'POST', protected: true,
      })
    },
    reject(runId, reason) {
      return request(`/${encodeURIComponent(runId)}/reject`, {
        method: 'POST', body: { reason }, protected: true,
      })
    },
    retry(runId, mode) {
      return request(`/${encodeURIComponent(runId)}/retry`, {
        method: 'POST', body: { mode }, protected: true,
      })
    },
    skip(runId) {
      return request(`/${encodeURIComponent(runId)}/skip`, {
        method: 'POST', protected: true,
      })
    },
  }
}
