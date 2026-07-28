// Every response this Worker sends is JSON — it only ever answers /api/*, and
// the pages themselves are static assets it never sees.

export function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...init.headers,
    },
  })
}

export function fail(status, message) {
  return json({ error: message }, { status })
}
