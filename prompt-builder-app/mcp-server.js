import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { z } from 'zod'
import db from './lib/db.js'

function readPrompts() {
  try {
    const rows = db.prepare(
      'SELECT p.id, p.description, p.form_data, p.created_at, u.display_name FROM prompts p JOIN users u ON p.user_id = u.id ORDER BY p.created_at DESC'
    ).all()
    return rows.map(r => ({
      id: r.id,
      description: r.description,
      formData: JSON.parse(r.form_data),
      createdAt: r.created_at,
      owner: r.display_name
    }))
  } catch {
    return []
  }
}

function generateXML(formData) {
  let xml = '<prompt>\n'

  if (formData.usePromptingGuide) {
    xml += '  <instructions>\n'
    xml += '    Be specific and detailed in your response. Follow the task precisely.\n'
    xml += '    Use the provided context to inform your answer.\n'
    xml += '    Match the requested tone, audience, and format.\n'
    xml += '    If examples are provided, use them as a reference for style and quality.\n'
    xml += '    Respect all constraints — include what is required and exclude what is forbidden.\n'
    xml += '  </instructions>\n'
  }

  if (formData.useThinking) {
    xml += '  <thinking>\n'
    xml += '    Before responding, think step by step:\n'
    xml += '    1. What exactly is being asked in the task?\n'
    xml += '    2. What context and constraints apply?\n'
    xml += '    3. What is the best approach to fulfill this request?\n'
    xml += '    4. Draft your response, then review it before finalizing.\n'
    xml += '  </thinking>\n'
  }

  if (formData.task?.trim()) xml += `  <task>\n    ${formData.task.trim()}\n  </task>\n`
  if (formData.context?.trim()) xml += `  <context>\n    ${formData.context.trim()}\n  </context>\n`
  if (formData.audience?.trim()) xml += `  <audience>${formData.audience.trim()}</audience>\n`
  if (formData.tone?.trim()) xml += `  <tone>${formData.tone.trim()}</tone>\n`

  const hasFormat = formData.length?.trim() || formData.structure?.trim() || formData.style?.trim()
  if (hasFormat) {
    xml += '  <format>\n'
    if (formData.length?.trim()) xml += `    <length>${formData.length.trim()}</length>\n`
    if (formData.structure?.trim()) xml += `    <structure>${formData.structure.trim()}</structure>\n`
    if (formData.style?.trim()) xml += `    <style>${formData.style.trim()}</style>\n`
    xml += '  </format>\n'
  }

  const hasExamples = formData.exampleGood?.trim() || formData.exampleBad?.trim()
  if (hasExamples) {
    xml += '  <examples>\n'
    if (formData.exampleGood?.trim()) xml += `    <example type="good">\n      ${formData.exampleGood.trim()}\n    </example>\n`
    if (formData.exampleBad?.trim()) xml += `    <example type="bad">\n      ${formData.exampleBad.trim()}\n    </example>\n`
    xml += '  </examples>\n'
  }

  const hasConstraints = formData.include?.trim() || formData.exclude?.trim() || formData.requirements?.trim()
  if (hasConstraints) {
    xml += '  <constraints>\n'
    if (formData.include?.trim()) xml += `    <include>${formData.include.trim()}</include>\n`
    if (formData.exclude?.trim()) xml += `    <exclude>${formData.exclude.trim()}</exclude>\n`
    if (formData.requirements?.trim()) xml += `    <requirements>${formData.requirements.trim()}</requirements>\n`
    xml += '  </constraints>\n'
  }

  if (formData.inputData?.trim()) xml += `  <input_data>\n    ${formData.inputData.trim()}\n  </input_data>\n`

  if (formData.useCompletionCheck || formData.useContradictionCheck) {
    xml += '  <verification>\n'
    if (formData.useCompletionCheck) {
      xml += '    <completeness_check>\n'
      xml += '      Before outputting your final response, review it to ensure every point\n'
      xml += '      and requirement from the task has been fully addressed.\n'
      xml += '    </completeness_check>\n'
    }
    if (formData.useContradictionCheck) {
      xml += '    <contradiction_check>\n'
      xml += '      Before outputting your final response, verify that nothing in your\n'
      xml += '      response contradicts the original task description.\n'
      xml += '    </contradiction_check>\n'
    }
    xml += '  </verification>\n'
  }

  xml += '</prompt>'
  return xml
}

const server = new McpServer({
  name: 'ai-prompt-builder',
  version: '1.0.0'
})

server.tool(
  'list_prompts',
  'List all saved prompt templates with their descriptions and IDs',
  {},
  async () => {
    const prompts = readPrompts()
    if (prompts.length === 0) {
      return { content: [{ type: 'text', text: 'No saved prompts found. Use the Prompt Builder web app to create and save prompts.' }] }
    }
    const list = prompts.map(p => `- [${p.id}] ${p.description} by ${p.owner} (${new Date(p.createdAt).toLocaleDateString()})`).join('\n')
    return { content: [{ type: 'text', text: `Saved prompts:\n${list}` }] }
  }
)

server.tool(
  'get_prompt',
  'Get the full XML prompt for a saved template by its ID or description (partial match)',
  { query: z.string().describe('The prompt ID (number) or a search term to match against descriptions') },
  async ({ query }) => {
    const prompts = readPrompts()
    let match = prompts.find(p => String(p.id) === query)
    if (!match) {
      const lower = query.toLowerCase()
      match = prompts.find(p => p.description.toLowerCase().includes(lower))
    }
    if (!match) {
      return { content: [{ type: 'text', text: `No prompt found matching "${query}". Use list_prompts to see available prompts.` }] }
    }
    const xml = generateXML(match.formData)
    return { content: [{ type: 'text', text: `Prompt: ${match.description}\n\n${xml}` }] }
  }
)

server.tool(
  'build_prompt',
  'Build a new XML prompt from parameters. All fields except task are optional.',
  {
    task: z.string().describe('What you want the AI to do'),
    context: z.string().optional().describe('Background information'),
    audience: z.string().optional().describe('Target audience'),
    tone: z.string().optional().describe('Desired tone'),
    length: z.string().optional().describe('Desired length'),
    structure: z.string().optional().describe('Output structure'),
    style: z.string().optional().describe('Output style/format'),
    include: z.string().optional().describe('Things that must be included'),
    exclude: z.string().optional().describe('Things to exclude'),
    requirements: z.string().optional().describe('Specific rules or standards'),
    useThinking: z.boolean().optional().describe('Add thinking/reasoning block'),
    usePromptingGuide: z.boolean().optional().describe('Add general prompting instructions'),
    useCompletionCheck: z.boolean().optional().describe('Add completeness verification'),
    useContradictionCheck: z.boolean().optional().describe('Add contradiction verification')
  },
  async (params) => {
    const xml = generateXML(params)
    return { content: [{ type: 'text', text: xml }] }
  }
)

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

main().catch(console.error)
