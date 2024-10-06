// https://github.com/kwaroran/RisuAI/blob/92e4aa312f065e4ccad536cda7aeaea2daae192b/src/ts/process/exampleMessages.ts

import {
    AIMessage,
    BaseMessage,
    HumanMessage,
    SystemMessage
} from '@langchain/core/messages'
import { v2CharData } from './types'

export function parseExampleMessage(
    card: v2CharData,
    messages: BaseMessage[]
): BaseMessage[] {
    if (!card.mes_example) {
        return []
    }

    let currentMessage: BaseMessage | null = null
    let isFirstMessage = true

    function addMessage() {
        if (currentMessage) {
            if (isFirstMessage) {
                currentMessage.additional_kwargs.type = 'example_message_first'
                isFirstMessage = false
            }
            messages.push(currentMessage)
        }
    }

    const exampleMessages = card.mes_example.split('\n')
    for (const mes of exampleMessages) {
        const trimmed = mes.trim()
        const lowered = trimmed.toLowerCase()

        if (lowered === '<start>') {
            addMessage()
            messages.push(
                new SystemMessage('[Start a new chat]', {
                    type: 'start_chat'
                })
            )
            currentMessage = null
        } else if (
            lowered.startsWith('{{char}}:') ||
            lowered.startsWith('<bot>:') ||
            lowered.startsWith(`${card.name}:`)
        ) {
            addMessage()
            currentMessage = new AIMessage(trimmed.split(':', 2)[1].trimStart())
        } else if (
            lowered.startsWith('{{user}}:') ||
            lowered.startsWith('<user>:')
        ) {
            addMessage()
            currentMessage = new HumanMessage(
                trimmed.split(':', 2)[1].trimStart()
            )
        } else if (currentMessage) {
            currentMessage.content += '\n' + trimmed
        }
    }

    addMessage()

    const lastMessage = messages[messages.length - 1]

    if (lastMessage.additional_kwargs.type !== 'example_message_start') {
        lastMessage.additional_kwargs.type = 'example_message_last'
    }
}
