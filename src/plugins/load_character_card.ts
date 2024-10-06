import { Context } from 'koishi'
import { Config } from '..'
import path from 'path'
import fs from 'fs/promises'
import { readCharacterCard } from '../character_card'
export function apply(ctx: Context, config: Config) {
    const characterCardDir = path.join(ctx.baseDir, 'data/chathub/sillytavern')

    ctx.on('chatluna-character-card/load-all', async () => {
        try {
            const fileStat = await fs.stat(characterCardDir)
            if (!fileStat.isDirectory()) {
                // create the directory
                await fs.mkdir(characterCardDir, { recursive: true })
            }
        } catch {
            await fs.mkdir(characterCardDir, { recursive: true })
        }

        // load all character cards
        const files = await fs
            .readdir(characterCardDir)
            .then((files) =>
                files.filter(
                    (file) => file.endsWith('.json') || file.endsWith('.png')
                )
            )

        for (const file of files) {
            const filePath = path.join(characterCardDir, file)

            ctx.logger.info(`Loading character card: ${filePath}`)

            const characterCard = await readCharacterCard(ctx, filePath)

            await ctx.parallel(
                'chatluna-character-card/load-character-card',
                characterCard
            )
        }
    })
}

declare module 'koishi' {
    interface Events {
        'chatluna-character-card/load-all': () => Promise<void>
    }
}
