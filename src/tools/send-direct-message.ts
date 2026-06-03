import { getFullTwistURL } from '@doist/twist-sdk'
import { z } from 'zod'
import { getToolOutput } from '../mcp-helpers.js'
import type { TwistTool } from '../twist-tool.js'
import {
    type SendDirectMessageOutput,
    SendDirectMessageOutputSchema,
} from '../utils/output-schemas.js'
import { ToolNames } from '../utils/tool-names.js'

const ArgsSchema = {
    workspaceId: z.number().describe('The workspace ID the conversation belongs to.'),
    userIds: z
        .array(z.number())
        .min(1)
        .describe(
            'User IDs to include in the direct-message conversation (excluding yourself). One ID = a 1:1 DM; multiple = a group DM. Use get-users to resolve names to IDs.',
        ),
    content: z.string().min(1).describe('The message body.'),
}

const sendDirectMessage = {
    name: ToolNames.SEND_DIRECT_MESSAGE,
    description:
        'Open (or get) a direct-message conversation in a workspace and send a message to it. One user ID creates a 1:1 DM; multiple IDs create a group DM. Use get-users to resolve names to IDs.',
    parameters: ArgsSchema,
    outputSchema: SendDirectMessageOutputSchema.shape,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    async execute(args, client) {
        const { workspaceId, userIds, content } = args

        const conversation = await client.conversations.getOrCreateConversation({
            workspaceId,
            userIds,
        })

        const message = await client.conversationMessages.createMessage({
            conversationId: conversation.id,
            content,
        })

        const postedValue = message.posted
        const created = postedValue
            ? typeof postedValue === 'string'
                ? new Date(postedValue)
                : postedValue
            : new Date()

        const messageUrl =
            message.url ??
            conversation.url ??
            getFullTwistURL({
                workspaceId,
                conversationId: conversation.id,
                messageId: message.id,
            })

        const lines: string[] = [
            `# Direct Message Sent`,
            '',
            `**Conversation ID:** ${conversation.id}`,
            `**Message ID:** ${message.id}`,
            `**Participants:** ${userIds.join(', ')}`,
            `**Created:** ${created.toISOString()}`,
            `**URL:** ${messageUrl}`,
            '',
            '## Content',
            '',
            content,
        ]

        const structuredContent: SendDirectMessageOutput = {
            type: 'send_direct_message_result',
            success: true,
            conversationId: conversation.id,
            messageId: message.id,
            workspaceId,
            userIds,
            content,
            created: created.toISOString(),
            messageUrl,
        }

        return getToolOutput({
            textContent: lines.join('\n'),
            structuredContent,
        })
    },
} satisfies TwistTool<typeof ArgsSchema, typeof SendDirectMessageOutputSchema.shape>

export { sendDirectMessage }
