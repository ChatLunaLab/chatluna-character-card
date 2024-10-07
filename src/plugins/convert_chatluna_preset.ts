import { Context } from 'koishi'
import { Config } from '..'
import path from 'path'
import fs from 'fs/promises'
import yaml from 'js-yaml'
import { v2CharData } from '../types'
import {
    AuthorsNote,
    PresetTemplate,
    RawPreset,
    RoleBook
} from 'koishi-plugin-chatluna/llm-core/prompt'
import { AIMessage, BaseMessage, SystemMessage } from '@langchain/core/messages'
import { parseExampleMessage } from '../example_message'
export function apply(ctx: Context, config: Config) {
    const chatlunaPresetDir = path.join(ctx.baseDir, 'data/chathub/presets')

    ctx.on(
        'chatluna-character-card/load-character-card',
        async (card: v2CharData) => {
            const presetTemplate = convertToChatlunaPreset(card, config)

            // console.log(JSON.stringify(presetTemplate, null, 2))

            if (config.loadMode === 'memory') {
                const existingPreset = await ctx.chatluna.preset.getPreset(
                    presetTemplate.triggerKeyword[0],
                    false,
                    false
                )

                if (
                    !existingPreset ||
                    existingPreset.version !== presetTemplate.version
                ) {
                    await ctx.chatluna.preset.addPreset(presetTemplate)
                }

                return
            }

            const presetFile = path.join(
                chatlunaPresetDir,
                `${presetTemplate.triggerKeyword[0]}.yml`
            )

            try {
                await fs.access(presetFile)
                ctx.logger.warn(
                    `The preset from ${card.name} already exists, skipping...`
                )
            } catch {
                await fs.writeFile(presetFile, presetToYAML(presetTemplate))
            }
        }
    )
}

function convertToChatlunaPreset(
    card: v2CharData,
    config: Config
): PresetTemplate {
    const messages: BaseMessage[] = [
        new SystemMessage(card.system_prompt || config.systemMainPrompt, {
            type: 'main'
        }),
        new SystemMessage(config.jailbreakPrompt, {
            type: 'jailbreak'
        }),
        new SystemMessage(`{{description}}`, {
            type: 'description'
        }),
        new SystemMessage(config.personalityPrompt, {
            type: 'personality'
        })
    ]

    if (!config.jailbreak) {
        // remove jailbreak prompt
        messages.splice(1, 1)
    }

    if (card.scenario && card.scenario.length > 0) {
        messages.push(
            new SystemMessage(config.scenarioPrompt, {
                type: 'scenario'
            })
        )
    }

    if (card.mes_example && card.mes_example.length > 0) {
        parseExampleMessage(card, messages)
    }

    if (card.first_mes) {
        messages.push(
            new AIMessage(card.first_mes, {
                type: 'first_message'
            })
        )
    }

    // first format
    formatMessages(messages, {
        scenario: card.scenario,
        personality: card.personality,
        description: card.description,
        char: card.name
    })

    const hasStartMessage = messages.some(
        (message) => message.additional_kwargs.type === 'start_chat'
    )

    if (!hasStartMessage) {
        const scenarioIndex = messages.findIndex(
            (message) => message.additional_kwargs.type === 'scenario'
        )
        if (scenarioIndex !== -1) {
            messages.splice(
                scenarioIndex,
                0,
                new SystemMessage('[Start a new chat]', {
                    type: 'start_chat'
                })
            )
        }
    }

    // final format
    const formattedMessages = formatMessages(messages, {
        scenario: card.scenario,
        personality: card.personality,
        description: card.description,
        char: card.name
    })

    return {
        rawText: JSON.stringify(formattedMessages),
        triggerKeyword: [card.name],
        messages: formattedMessages,
        loreBooks: {
            items: getLoreBooks(card)
        },
        authorsNote: getAuthorsNote(card),
        config: {}
    } satisfies PresetTemplate
}

function getLoreBooks(card: v2CharData): RoleBook[] {
    return card.character_book.entries.map((entry) => {
        const keywords = entry.keys.concat(entry.secondary_keys).map((key) => {
            // try regex
            try {
                return new RegExp(key)
            } catch {
                return key
            }
        })

        return {
            keywords,
            enabled: entry.enabled,
            content: entry.content,
            order: entry.insertion_order,
            scanDepth: entry.extensions?.depth || 1,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            insertPosition: entry.position as any,
            matchWholeWord: entry.extensions?.match_whole_words || false,
            recursiveScan: entry.extensions?.exclude_recursion || false,
            maxRecursionDepth: 3
        } satisfies RoleBook
    })
}

function getAuthorsNote(card: v2CharData): AuthorsNote {
    if (!card.creator_notes || card.creator_notes.length === 0) {
        return undefined
    }

    return {
        content: card.creator_notes,
        insertDepth: 1,
        insertFrequency: 1
    } satisfies AuthorsNote
}

function formatMessages(
    messages: BaseMessage[],
    variables: Record<string, string>
) {
    const regex = /\{\{(.*?)\}\}/g

    for (let i = 0; i < messages.length; i++) {
        let content = messages[i].content as string

        // replace {{xx}} => {xx}
        content = content.replaceAll(regex, (_, p1) => {
            return variables[p1] || `{${p1}}`
        })

        messages[i].content = content
    }

    return messages
}

function presetToYAML(preset: PresetTemplate) {
    const rawPreset = {
        keywords: preset.triggerKeyword,
        prompts: preset.messages.map((message) => ({
            role: ((role) => {
                if (role === 'system') {
                    return 'system'
                } else if (role === 'human') {
                    return 'user'
                } else if (role === 'ai') {
                    return 'assistant'
                } else {
                    throw new Error(`Unknown role: ${role}`)
                }
            })(message._getType()),
            content: message.content as string,
            type: message.additional_kwargs.type as
                | 'personality'
                | 'description'
                | 'first_message'
                | 'scenario'
        }))
    } as RawPreset

    if (preset.authorsNote) {
        rawPreset.authors_note = preset.authorsNote
    }

    if (preset.loreBooks) {
        rawPreset.world_lores = preset.loreBooks.items.map(
            (book) =>
                ({
                    keywords: book.keywords,
                    content: book.content,
                    insertPosition: book.insertPosition,
                    scanDepth: book.scanDepth,
                    recursiveScan: book.recursiveScan,
                    maxRecursionDepth: book.maxRecursionDepth,
                    matchWholeWord: book.matchWholeWord,
                    caseSensitive: book.caseSensitive,
                    enabled: book.enabled,
                    order: book.order
                }) satisfies RawPreset['world_lores'][0]
        )
    }

    return yaml.dump(rawPreset)
}

declare module 'koishi' {
    interface Events {
        'chatluna-character-card/load-character-card': (
            card: v2CharData
        ) => Promise<void>
    }
}
