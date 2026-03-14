import { google } from 'googleapis'

function getAuth() {
  const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, 'urn:ietf:wg:oauth:2.0:oob')
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN })
  return auth
}

export async function gdriveCreateDoc(title, content) {
  if (!process.env.GOOGLE_REFRESH_TOKEN) return 'Google Drive not connected yet.'
  try {
    const auth = getAuth()
    const docs = google.docs({ version: 'v1', auth })
    const drive = google.drive({ version: 'v3', auth })
    const doc = await docs.documents.create({ requestBody: { title } })
    const docId = doc.data.documentId
    await docs.documents.batchUpdate({ documentId: docId, requestBody: { requests: [{ insertText: { location: { index: 1 }, text: content } }] } })
    await drive.permissions.create({ fileId: docId, requestBody: { role: 'reader', type: 'anyone' } })
    return 'Doc created: https://docs.google.com/document/d/' + docId + '/edit'
  } catch(e) { return 'Drive error: ' + e.message }
}
