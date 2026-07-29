import { AwsClient } from 'aws4fetch'

// Hands the browser a URL it can PUT to directly. Two reasons the audio must
// not travel through the Worker instead: the free plan allows 10ms of CPU per
// request, and request bodies stop at 100MB — a lossless master breaches both.
// Signing is a couple of HMACs, which costs a fraction of a millisecond.
//
// UNTESTED against real R2 as of writing: presigning needs an S3 endpoint, and
// the local emulator has none, so this path is exercised for the first time
// once the buckets exist. Get one hand-made round trip working under
// `wrangler dev --remote` before trusting it — a Content-Type that differs by
// so much as a character between signing and upload produces
// SignatureDoesNotMatch, which says nothing about the cause.

export async function presignPut({ env, bucketName, key, contentType, expiresIn = 3600 }) {
  const client = new AwsClient({
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    service: 's3',
    region: 'auto',
  })

  const endpoint = `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${bucketName}/${key}`

  const signed = await client.sign(
    new Request(endpoint, {
      method: 'PUT',
      // Signed here, so the browser must send exactly this back.
      headers: { 'content-type': contentType },
    }),
    { aws: { signQuery: true }, expiresIn },
  )

  return signed.url
}
