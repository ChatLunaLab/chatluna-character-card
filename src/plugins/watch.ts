import { Context } from 'koishi'
import { Config } from '..'
import { watch } from 'fs'
import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'
export async function apply(ctx: Context, config: Config) {
    let md5Previous: string = null
    let fsWait: NodeJS.Timeout | boolean = false

    let aborter: AbortController

    const logger = ctx.logger

    const characterCardDir = path.join(ctx.baseDir, 'data/chathub/sillytavern')

    const watchPreset = async () => {
        if (aborter != null) {
            aborter.abort()
        }

        aborter = new AbortController()

        // check the directory
        try {
            const fileStat = await fs.stat(characterCardDir)
            if (!fileStat.isDirectory()) {
                // create the directory
                await fs.mkdir(characterCardDir, { recursive: true })
            }
        } catch {
            await fs.mkdir(characterCardDir, { recursive: true })
        }

        watch(
            characterCardDir,
            {
                signal: aborter.signal
            },
            async (event, filename) => {
                if (filename) {
                    if (fsWait) return
                    fsWait = setTimeout(() => {
                        fsWait = false
                    }, 100)

                    const fileName = path.join(characterCardDir, filename)

                    // check the file or directory
                    const fileStat = await fs.stat(fileName)

                    if (fileStat.isDirectory()) {
                        return
                    }

                    const md5Current = sha256(await fs.readFile(fileName))
                    if (md5Current === md5Previous) {
                        return
                    }
                    md5Previous = md5Current
                    await ctx.parallel('chatluna-character-card/load-all')
                    logger.debug(`trigger full reload preset by ${filename}`)

                    return
                }

                await this.loadAllPreset()
                logger.debug(`trigger full reload preset`)
            }
        )
    }

    await watchPreset()

    ctx.parallel('chatluna-character-card/load-all')

    ctx.on('dispose', () => {
        aborter.abort()
    })
}

function sha256(data: Buffer) {
    return crypto.createHash('sha256').update(data).digest('hex')
}
