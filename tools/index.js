import { gmailRead, gmailSend } from './gmail.js'
import { gdriveCreateDoc } from './gdrive.js'

export async function handleToolCall(name, input) {
  switch (name) {
    case 'gmail_read': return gmailRead(input.query, input.max_results || 5)
    case 'gmail_send': return gmailSend(input.to, input.subject, input.body)
    case 'gdrive_create_doc': return gdriveCreateDoc(input.title, input.content)
    default: return 'Unknown tool: ' + name
  }
}
