import { z } from 'zod'
import { getToolOutput } from '../mcp-helpers.js'
import type { TwistTool } from '../twist-tool.js'
import { DeleteOutputSchema } from '../utils/output-schemas.js'
import { type DeleteTargetType, DeleteTargetTypeSchema } from '../utils/target-types.js'
import { ToolNames } from '../utils/tool-names.js'

const ArgsSchema = {
    targetType: DeleteTargetTypeSchema.describe(
        'The type of item to delete: thread, comment (a reply in a thread), or message (a message in a conversation).',
    ),
    id: z.number().describe('The ID of the item to delete.'),
}

const deleteTool = {
    name: ToolNames.DELETE,
    description:
        'Permanently delete a thread, comment, or conversation message. This action cannot be undone. Use targetType to specify what to delete and id for the item ID.',
    parameters: ArgsSchema,
    outputSchema: DeleteOutputSchema.shape,
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    async execute(args, client) {
        const { targetType, id } = args

        if (targetType === 'thread') {
            await client.threads.deleteThread(id)
        } else if (targetType === 'comment') {
            await client.comments.deleteComment(id)
        } else {
            await client.conversationMessages.deleteMessage(id)
        }

        const lines: string[] = [
            `# Deleted`,
            '',
            `**Type:** ${targetType}`,
            `**ID:** ${id}`,
        ]

        return getToolOutput({
            textContent: lines.join('\n'),
            structuredContent: {
                type: 'delete_result' as const,
                success: true,
                targetType: targetType as DeleteTargetType,
                id,
            },
        })
    },
} satisfies TwistTool<typeof ArgsSchema, typeof DeleteOutputSchema.shape>

export { deleteTool }
