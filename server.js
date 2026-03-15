import express from 'express'
import twilio from 'twilio'
import Anthropic from '@anthropic-ai/sdk'
import { handleToolCall } from './tools/index.js'
const app = express()
app.use(express.urlencoded({ extended: false }))
app.use(express.json())
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
const conversations = {}
const SYSTEM_PROMPT = 'You are Pablo Limon personal AI assistant. Pablo is Co-Founder of NNN Studio, a creative strategy studio. He also runs Discipline of Pain, a Muay Thai culture project. Reply via WhatsApp so keep it short. Confirm before sending emails.'
const TOOLS = [
 { name: 'gmail_read', description: 'Read emails from Gmail', input_schema: { type: 'object', properties: { query: { type: 'string' }, max_results: { type: 'number' } }, required: ['query'] } },
 { name: 'gmail_send', description: 'Send an email, always confirm first', input_schema: { type: 'object', properties: { to: { type: 'string' }, subject: { type: 'string' }, body: { type: 'string' } }, required: ['to','subject','body'] } },
 { name: 'gdrive_create_doc', description: 'Create a Google Doc, return link', input_schema: { type: 'object', properties: { title: { type: 'string' }, content: { type: 'string' } }, required: ['title','content'] } }
]
app.get('/', (req, res) => res.sendStatus(200))
app.post('/webhook', async (req, res) => {
 const from = req.body.From
 const body = req.body.Body?.trim()
 if (!body) return res.sendStatus(200)
 if (!conversations[from]) conversations[from] = []
 conversations[from].push({ role: 'user', content: body })
 if (conversations[from].length > 20) conversations[from] = conversations[from].slice(-20)
 try {
   let messages = [...conversations[from]]
   let finalText = ''
   while (true) {
     const response = await anthropic.messages.create({ model: 'claude-3-haiku-20240307', max_tokens: 1024, system: SYSTEM_PROMPT, tools: TOOLS, messages })
     if (response.stop_reason === 'end_turn') { finalText = response.content.find(b => b.type === 'text')?.text || ''; break }
     if (response.stop_reason === 'tool_use') {
       const toolUseBlocks = response.content.filter(b => b.type === 'tool_use')
       const toolResults = []
       for (const t of toolUseBlocks) {
         const result = await handleToolCall(t.name, t.input)
         toolResults.push({ type: 'tool_result', tool_use_id: t.id, content: typeof result === 'string' ? result : JSON.stringify(result) })
       }
       messages = [...messages, { role: 'assistant', content: response.content }, { role: 'user', content: toolResults }]
       continue
     }
     break
   }
   if (finalText) conversations[from].push({ role: 'assistant', content: finalText })
   await twilioClient.messages.create({ from: process.env.TWILIO_WHATSAPP_NUMBER, to: from, body: finalText || 'Done.' })
   res.sendStatus(200)
 } catch (err) { console.error(err); res.sendStatus(500) }
})
const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log('Agent running on port ' + PORT))
