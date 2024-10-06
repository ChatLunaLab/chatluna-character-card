import extract from 'png-chunks-extract'
import PNGtext from 'png-chunk-text'
import { Context } from 'koishi'
import path from 'path'
import fs from 'fs/promises'
import { v2CharData } from './types'

function readRawCharacterDataFromPngBuffer(
    ctx: Context,
    buffer: Buffer,
    fileName: string = 'unknown'
) {
    const textChunks = extract(buffer)
        .filter((chunk) => chunk.name === 'tEXt')
        .map((chunk) => PNGtext.decode(chunk.data))

    if (textChunks.length === 0) {
        ctx.logger.error(`${fileName} does not contain any text chunks.`)
        return undefined
    }

    const findChunk = (keyword: string) =>
        textChunks.find(
            (chunk) => chunk.keyword.toLowerCase() === keyword.toLowerCase()
        )

    const ccv3Chunk = findChunk('ccv3')
    const charChunk = findChunk('chara')

    if (ccv3Chunk || charChunk) {
        const chunk = ccv3Chunk || charChunk
        return Buffer.from(chunk.text, 'base64').toString('utf8')
    }

    ctx.logger.error(`${fileName} does not contain any character data.`)
    return undefined
}

async function readRawCharacterData(ctx: Context, filePath: string) {
    const fileType = path.extname(filePath)

    switch (fileType) {
        case '.png':
            return readRawCharacterDataFromPngBuffer(
                ctx,
                await fs.readFile(filePath)
            )
        case '.json':
            return await fs.readFile(filePath, 'utf8')
        default:
            ctx.logger.error(`Unsupported file type: ${fileType}`)
            return undefined
    }
}

export async function readCharacterCard(ctx: Context, filePath: string) {
    const rawData = await readRawCharacterData(ctx, filePath)
    try {
        const jsonObject = JSON.parse(rawData)
        return getCharacterCardV2(ctx, jsonObject)
    } catch (error) {
        ctx.logger.error(`Failed to parse character card: ${error}`)
        return undefined
    }
}

export function getCharacterCardV2(
    ctx: Context,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jsonObject: Record<string, any>
) {
    if (jsonObject.spec === undefined) {
        jsonObject = convertCharacterCardToV2(ctx, jsonObject)
    } else {
        jsonObject = readCharacterCardFromV2(ctx, jsonObject)
    }
    return jsonObject as unknown as v2CharData
}

function convertCharacterCardToV2(
    ctx: Context,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    char: Record<string, any>
) {
    // Simulate incoming data from frontend form
    const result = characterCardFormatData({
        json_data: JSON.stringify(char),
        ch_name: char.name,
        description: char.description,
        personality: char.personality,
        scenario: char.scenario,
        first_mes: char.first_mes,
        mes_example: char.mes_example,
        creator_notes: char.creatorcomment,
        talkativeness: char.talkativeness,
        fav: char.fav,
        creator: char.creator,
        tags: char.tags,
        depth_prompt_prompt: char.depth_prompt_prompt,
        depth_prompt_depth: char.depth_prompt_depth,
        depth_prompt_role: char.depth_prompt_role
    })

    return result
}

function readCharacterCardFromV2(
    ctx: Context,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jsonObject: Record<string, any>
) {
    if (jsonObject.data === undefined) {
        ctx.logger.warn(`Character ${jsonObject.name} has missing Spec v2 data`)
        return jsonObject
    }

    const fieldMappings = {
        name: 'name',
        description: 'description',
        personality: 'personality',
        scenario: 'scenario',
        first_mes: 'first_mes',
        mes_example: 'mes_example',
        talkativeness: 'extensions.talkativeness'
    }

    for (const [charField, v2Path] of Object.entries(fieldMappings)) {
        const v2Value = v2Path
            .split('.')
            .reduce((obj, key) => obj && obj[key], jsonObject.data)

        if (v2Value === undefined) {
            let defaultValue: unknown

            if (defaultValue !== undefined) {
                jsonObject[charField] = defaultValue
            } else {
                console.debug(
                    `Character ${jsonObject.name} has missing Spec v2 data for unknown field: ${charField}`
                )
                continue
            }
        }

        if (
            jsonObject[charField] !== undefined &&
            v2Value !== undefined &&
            String(jsonObject[charField]) !== String(v2Value)
        ) {
            ctx.logger.warn(
                `Character ${jsonObject.name} has Spec v2 data mismatch with Spec v1 for field: ${charField}`,
                jsonObject[charField],
                v2Value
            )
        }
        jsonObject[charField] = v2Value
    }

    return jsonObject as unknown as v2CharData
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function characterCardFormatData(data: Record<string, any>): v2CharData {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const char: Record<string, any> = JSON.parse(data.json_data || '{}')
    // Spec V1 fields
    char.name = data.ch_name
    char.description = data.description || ''
    char.personality = data.personality || ''
    char.scenario = data.scenario || ''
    char.first_mes = data.first_mes || ''
    char.mes_example = data.mes_example || ''

    // Old ST extension fields
    char.creatorcomment = data.creator_notes
    char.avatar = 'none'
    char.chat = `${data.ch_name} - ${new Date().toISOString()}`
    char.talkativeness = data.talkativeness
    char.fav = data.fav === 'true'
    char.tags =
        typeof data.tags === 'string'
            ? data.tags
                  .split(',')
                  .map((x) => x.trim())
                  .filter(Boolean)
            : data.tags || []

    // Spec V2 fields
    char.spec = 'chara_card_v2'
    char.spec_version = '2.0'
    char.data = {
        name: data.ch_name,
        description: data.description || '',
        personality: data.personality || '',
        scenario: data.scenario || '',
        first_mes: data.first_mes || '',
        mes_example: data.mes_example || '',
        creator_notes: data.creator_notes || '',
        system_prompt: data.system_prompt || '',
        post_history_instructions: data.post_history_instructions || '',
        tags:
            typeof data.tags === 'string'
                ? data.tags
                      .split(',')
                      .map((x) => x.trim())
                      .filter(Boolean)
                : data.tags || [],
        creator: data.creator || '',
        character_version: data.character_version || ''
    }

    return char as unknown as v2CharData
}
