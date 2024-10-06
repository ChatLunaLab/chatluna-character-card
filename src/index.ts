/* eslint-disable max-len */
import { Context, Schema } from 'koishi'

import { ChatLunaPlugin } from 'koishi-plugin-chatluna/services/chat'
import { plugins } from './plugin'

export function apply(ctx: Context, config: Config) {
    ctx.on('ready', async () => {
        await plugins(ctx, config)
    })
}

export const inject = {
    required: ['chatluna']
}

export const inject2 = {
    chatluna: {
        required: true
    },
    cache: {
        required: true
    },
    chatluna_character: {
        required: false
    },
    vits: {
        required: false
    }
}

export interface Config extends ChatLunaPlugin.Config {
    loadMode: string
}

export const Config = Schema.intersect([
    Schema.object({
        loadMode: Schema.union([
            Schema.const('memory').description('直接加载角色卡到内存。'),
            Schema.const('file').description(
                '将角色卡转换为 ChatLuna 的预设文件。'
            )
        ])
            .default('memory')
            .description('角色卡加载模式')
    }).description('基础配置')
]) as unknown as Schema<Config>

export const name = 'chatluna-character-card'
