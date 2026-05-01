import { getFullTwistURL } from '@doist/twist-sdk'
import { z } from 'zod'
import { getToolOutput } from '../mcp-helpers.js'
import type { TwistTool } from '../twist-tool.js'
import { CreateConversationOutputSchema } from '../utils/output-schemas.js'
import { ToolNames } from '../utils/tool-names.js'

const ArgsSchema = {
    workspaceId: z.coerce.number().describe('The ID of the workspace to create the conversation in.'),
    userIds: z
        .array(z.coerce.number())
        .min(1)
        .describe('Array of user IDs to include in the conversation.'),
    initialMessage: z
        .string()
        .min(1)
        .optional()
        .describe('Optional message to post immediately after opening the conversation.'),
}

type CreateConversationStructured = {
    type: 'create_conversation_result'
    success: boolean
    conversationId: number
    conversationUrl: string
    participants: number[]
    messageId?: number
    messageUrl?: string
}

const createConversation = {
    name: ToolNames.CREATE_CONVERSATION,
    description:
        'Open or retrieve a direct-message conversation with one or more users in a workspace. Optionally post an initial message immediately after opening it.',
    parameters: ArgsSchema,
    outputSchema: CreateConversationOutputSchema.shape,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    async execute(args, client) {
        const { workspaceId, userIds, initialMessage } = args

        const conversation = await client.conversations.getOrCreateConversation({
            workspaceId,
            userIds,
        })

        const conversationUrl =
            conversation.url ??
            getFullTwistURL({
                workspaceId: conversation.workspaceId,
                conversationId: conversation.id,
            })

        let messageId: number | undefined
        let messageUrl: string | undefined
        let posted: Date | undefined

        if (initialMessage) {
            const message = await client.conversationMessages.createMessage({
                conversationId: conversation.id,
                content: initialMessage,
            })
            messageId = message.id
            messageUrl =
                message.url ??
                getFullTwistURL({
                    workspaceId: message.workspaceId,
                    conversationId: message.conversationId,
                    messageId: message.id,
                })
            const postedValue = message.posted
            posted = postedValue
                ? typeof postedValue === 'string'
                    ? new Date(postedValue)
                    : postedValue
                : new Date()
        }

        const lines: string[] = [
            `# Conversation Opened`,
            '',
            `**Conversation ID:** ${conversation.id}`,
            `**Workspace ID:** ${workspaceId}`,
            `**Participants:** ${conversation.userIds.join(', ')}`,
            `**URL:** ${conversationUrl}`,
        ]

        if (initialMessage && messageId !== undefined && posted !== undefined) {
            lines.push('')
            lines.push(`## Message Posted`)
            lines.push('')
            lines.push(`**Message ID:** ${messageId}`)
            lines.push(`**Posted:** ${posted.toISOString()}`)
            lines.push('')
            lines.push(initialMessage)
        }

        const structuredContent: CreateConversationStructured = {
            type: 'create_conversation_result',
            success: true,
            conversationId: conversation.id,
            conversationUrl,
            participants: conversation.userIds,
            messageId,
            messageUrl,
        }

        return getToolOutput({
            textContent: lines.join('\n'),
            structuredContent,
        })
    },
} satisfies TwistTool<typeof ArgsSchema, typeof CreateConversationOutputSchema.shape>

export { createConversation, type CreateConversationStructured }
