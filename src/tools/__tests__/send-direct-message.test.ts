import type { TwistApi } from '@doist/twist-sdk'
import { jest } from '@jest/globals'
import {
    createMockConversation,
    createMockConversationMessage,
    extractStructuredContent,
    extractTextContent,
    TEST_IDS,
} from '../../utils/test-helpers.js'
import { ToolNames } from '../../utils/tool-names.js'
import { sendDirectMessage } from '../send-direct-message.js'

const mockTwistApi = {
    conversations: {
        getOrCreateConversation: jest.fn(),
    },
    conversationMessages: {
        createMessage: jest.fn(),
    },
} as unknown as jest.Mocked<TwistApi>

const { SEND_DIRECT_MESSAGE } = ToolNames

describe(`${SEND_DIRECT_MESSAGE} tool`, () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('sending direct messages', () => {
        it('should open a 1:1 conversation and send a message to it', async () => {
            const mockConversation = createMockConversation({
                id: TEST_IDS.CONVERSATION_1,
                userIds: [TEST_IDS.USER_1, TEST_IDS.USER_2],
            })
            const mockMessage = createMockConversationMessage({
                id: TEST_IDS.MESSAGE_1,
                conversationId: TEST_IDS.CONVERSATION_1,
                content: 'Hello there',
            })
            mockTwistApi.conversations.getOrCreateConversation.mockResolvedValue(mockConversation)
            mockTwistApi.conversationMessages.createMessage.mockResolvedValue(mockMessage)

            const result = await sendDirectMessage.execute(
                {
                    workspaceId: TEST_IDS.WORKSPACE_1,
                    userIds: [TEST_IDS.USER_2],
                    content: 'Hello there',
                },
                mockTwistApi,
            )

            expect(mockTwistApi.conversations.getOrCreateConversation).toHaveBeenCalledWith({
                workspaceId: TEST_IDS.WORKSPACE_1,
                userIds: [TEST_IDS.USER_2],
            })
            expect(mockTwistApi.conversationMessages.createMessage).toHaveBeenCalledWith({
                conversationId: TEST_IDS.CONVERSATION_1,
                content: 'Hello there',
            })

            expect(extractTextContent(result)).toMatchSnapshot()

            const { structuredContent } = result
            expect(structuredContent).toEqual(
                expect.objectContaining({
                    type: 'send_direct_message_result',
                    success: true,
                    conversationId: TEST_IDS.CONVERSATION_1,
                    messageId: TEST_IDS.MESSAGE_1,
                    workspaceId: TEST_IDS.WORKSPACE_1,
                    userIds: [TEST_IDS.USER_2],
                    content: 'Hello there',
                    messageUrl: expect.stringContaining('twist.com'),
                }),
            )
        })

        it('should open a group conversation when multiple user IDs are passed', async () => {
            const mockConversation = createMockConversation({
                id: TEST_IDS.CONVERSATION_2,
                userIds: [TEST_IDS.USER_1, TEST_IDS.USER_2, TEST_IDS.USER_3],
            })
            const mockMessage = createMockConversationMessage({
                id: TEST_IDS.MESSAGE_2,
                conversationId: TEST_IDS.CONVERSATION_2,
                content: 'Group ping',
            })
            mockTwistApi.conversations.getOrCreateConversation.mockResolvedValue(mockConversation)
            mockTwistApi.conversationMessages.createMessage.mockResolvedValue(mockMessage)

            const result = await sendDirectMessage.execute(
                {
                    workspaceId: TEST_IDS.WORKSPACE_1,
                    userIds: [TEST_IDS.USER_2, TEST_IDS.USER_3],
                    content: 'Group ping',
                },
                mockTwistApi,
            )

            expect(mockTwistApi.conversations.getOrCreateConversation).toHaveBeenCalledWith({
                workspaceId: TEST_IDS.WORKSPACE_1,
                userIds: [TEST_IDS.USER_2, TEST_IDS.USER_3],
            })
            expect(mockTwistApi.conversationMessages.createMessage).toHaveBeenCalledWith({
                conversationId: TEST_IDS.CONVERSATION_2,
                content: 'Group ping',
            })

            const structuredContent = extractStructuredContent(result)
            expect(structuredContent.conversationId).toBe(TEST_IDS.CONVERSATION_2)
            expect(structuredContent.userIds).toEqual([TEST_IDS.USER_2, TEST_IDS.USER_3])
        })
    })

    describe('error handling', () => {
        it('should propagate conversation resolution errors', async () => {
            const apiError = new Error('Workspace not found')
            mockTwistApi.conversations.getOrCreateConversation.mockRejectedValue(apiError)

            await expect(
                sendDirectMessage.execute(
                    {
                        workspaceId: TEST_IDS.WORKSPACE_1,
                        userIds: [TEST_IDS.USER_2],
                        content: 'Test content',
                    },
                    mockTwistApi,
                ),
            ).rejects.toThrow('Workspace not found')

            expect(mockTwistApi.conversationMessages.createMessage).not.toHaveBeenCalled()
        })

        it('should propagate message creation errors', async () => {
            const mockConversation = createMockConversation({ id: TEST_IDS.CONVERSATION_1 })
            mockTwistApi.conversations.getOrCreateConversation.mockResolvedValue(mockConversation)
            mockTwistApi.conversationMessages.createMessage.mockRejectedValue(
                new Error('Message send failed'),
            )

            await expect(
                sendDirectMessage.execute(
                    {
                        workspaceId: TEST_IDS.WORKSPACE_1,
                        userIds: [TEST_IDS.USER_2],
                        content: 'Test content',
                    },
                    mockTwistApi,
                ),
            ).rejects.toThrow('Message send failed')
        })
    })
})
