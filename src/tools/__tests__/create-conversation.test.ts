import type { TwistApi } from '@doist/twist-sdk'
import { jest } from '@jest/globals'
import {
    createMockConversation,
    createMockConversationMessage,
    extractTextContent,
    TEST_IDS,
} from '../../utils/test-helpers.js'
import { ToolNames } from '../../utils/tool-names.js'
import { createConversation } from '../create-conversation.js'

// Mock the Twist API
const mockTwistApi = {
    conversations: {
        getOrCreateConversation: jest.fn(),
    },
    conversationMessages: {
        createMessage: jest.fn(),
    },
} as unknown as jest.Mocked<TwistApi>

const { CREATE_CONVERSATION } = ToolNames

describe(`${CREATE_CONVERSATION} tool`, () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('opening a conversation', () => {
        it('should get or create a conversation without an initial message', async () => {
            const mockConv = createMockConversation()
            mockTwistApi.conversations.getOrCreateConversation.mockResolvedValue(mockConv)

            const result = await createConversation.execute(
                {
                    workspaceId: TEST_IDS.WORKSPACE_1,
                    userIds: [TEST_IDS.USER_1, TEST_IDS.USER_2],
                },
                mockTwistApi,
            )

            expect(mockTwistApi.conversations.getOrCreateConversation).toHaveBeenCalledWith({
                workspaceId: TEST_IDS.WORKSPACE_1,
                userIds: [TEST_IDS.USER_1, TEST_IDS.USER_2],
            })
            expect(mockTwistApi.conversationMessages.createMessage).not.toHaveBeenCalled()

            expect(extractTextContent(result)).toMatchSnapshot()

            const { structuredContent } = result
            expect(structuredContent).toEqual(
                expect.objectContaining({
                    type: 'create_conversation_result',
                    success: true,
                    conversationId: mockConv.id,
                    conversationUrl: expect.stringContaining('twist.com'),
                    participants: mockConv.userIds,
                }),
            )
            expect(structuredContent?.messageId).toBeUndefined()
            expect(structuredContent?.messageUrl).toBeUndefined()
        })

        it('should post an initial message when provided', async () => {
            const mockConv = createMockConversation()
            const mockMessage = createMockConversationMessage()
            mockTwistApi.conversations.getOrCreateConversation.mockResolvedValue(mockConv)
            mockTwistApi.conversationMessages.createMessage.mockResolvedValue(mockMessage)

            const result = await createConversation.execute(
                {
                    workspaceId: TEST_IDS.WORKSPACE_1,
                    userIds: [TEST_IDS.USER_1, TEST_IDS.USER_2],
                    initialMessage: 'Hello, let us chat!',
                },
                mockTwistApi,
            )

            expect(mockTwistApi.conversations.getOrCreateConversation).toHaveBeenCalledWith({
                workspaceId: TEST_IDS.WORKSPACE_1,
                userIds: [TEST_IDS.USER_1, TEST_IDS.USER_2],
            })
            expect(mockTwistApi.conversationMessages.createMessage).toHaveBeenCalledWith({
                conversationId: mockConv.id,
                content: 'Hello, let us chat!',
            })

            expect(extractTextContent(result)).toMatchSnapshot()

            const { structuredContent } = result
            expect(structuredContent).toEqual(
                expect.objectContaining({
                    type: 'create_conversation_result',
                    success: true,
                    conversationId: mockConv.id,
                    conversationUrl: expect.stringContaining('twist.com'),
                    participants: mockConv.userIds,
                    messageId: mockMessage.id,
                    messageUrl: expect.stringContaining('twist.com'),
                }),
            )
        })
    })

    describe('error handling', () => {
        it('should propagate errors from getOrCreateConversation', async () => {
            const apiError = new Error('Workspace not found')
            mockTwistApi.conversations.getOrCreateConversation.mockRejectedValue(apiError)

            await expect(
                createConversation.execute(
                    {
                        workspaceId: TEST_IDS.WORKSPACE_1,
                        userIds: [TEST_IDS.USER_1],
                    },
                    mockTwistApi,
                ),
            ).rejects.toThrow('Workspace not found')
        })

        it('should propagate errors from createMessage', async () => {
            const mockConv = createMockConversation()
            mockTwistApi.conversations.getOrCreateConversation.mockResolvedValue(mockConv)
            const apiError = new Error('Message send failed')
            mockTwistApi.conversationMessages.createMessage.mockRejectedValue(apiError)

            await expect(
                createConversation.execute(
                    {
                        workspaceId: TEST_IDS.WORKSPACE_1,
                        userIds: [TEST_IDS.USER_1],
                        initialMessage: 'This will fail',
                    },
                    mockTwistApi,
                ),
            ).rejects.toThrow('Message send failed')
        })
    })
})
