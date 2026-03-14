import { google } from 'googleapis'

function getAuth() {
  const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, 'urn:ietf:wg:oauth:2.0:oob')
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN })
  return auth
}

export async function gmailRead(query, maxResults = 5) {
  if (!process.env.GOOGLE_REFRESH_TOKEN) return 'Gmail not connected yet.'
  try {
    const gmail = google.gmail({ version: 'v1', auth: getAuth() })
    const list = await gmail.users.messages.list({ userId: 'me', q: query, maxResults })
    if (!list.data.messages?.length) return 'No emails found.'
    const emails = await Promise.all(list.data.messages.map(async ({ id }) => {
      const msg = await gmail.users.messages.get({ userId: 'me', id, format: 'full' })
      const headers = msg.data.payload.headers
      const get = n => headers.find(h => h.name === n)?.value || ''
      let body = ''
      if (msg.data.payload.body?.data) body = Buffer.from(msg.data.payload.body.data, 'base64').toString('utf-8')
      else if (msg.data.payload.parts) {
        const p = msg.data.payload.parts.find(p => p.mimeType === 'text/plain')
        if (p?.body?.data) body = Buffer.from(p.body.data, 'base64').toString('utf-8')
      }
      return 'FROM: ' + get('From') + '\nSUBJECT: ' + get('Subject') + '\n' + body.slice(0,300) + '\n---'
    }))
    return emails.join('\n')
  } catch(e) { return 'Gmail error: ' + e.message }
}

export async function gmailSend(to, subject, body) {
  if (!process.env.GOOGLE_REFRESH_TOKEN) return 'Gmail not connected yet.'
  try {
    const gmail = google.gmail({ version: 'v1', auth: getAuth() })
    const msg = `To: ${to}\r\nSubject: ${subject}\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${body}`
    const raw = Buffer.from(msg).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')
    await gmail.users.messages.send({ userId: 'me', requestBody: { raw } })
    return 'Email sent to ' + to
  } catch(e) { return 'Gmail send error: ' + e.message }
}
