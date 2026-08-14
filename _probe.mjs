import { handleUpload, getPayloadFromClientToken } from '@vercel/blob';
try {
  const r = await handleUpload({
    token: 'vercel_blob_rw_demo_demo_demo',
    request: new Request('https://x'),
    body: { type: 'blob.generate-client-token', payload: { pathname: 'forum/admin/a.png', clientPayload: null, multipart: false } },
    onBeforeGenerateToken: async () => ({ maximumSizeInBytes: 1e7, allowedContentTypes: ['image/jpeg'], addRandomSuffix: true })
  });
  console.log('RESULT:', JSON.stringify(r).slice(0,200));
  const decoded = getPayloadFromClientToken(r.clientToken);
  console.log('PAYLOAD_KEYS:', Object.keys(decoded));
  console.log('PAYLOAD:', JSON.stringify(decoded));
} catch (e) {
  console.log('ERR:', e.message);
}
