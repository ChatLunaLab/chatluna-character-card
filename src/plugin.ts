import { Context } from 'koishi'
import { Config } from '.'
// import start
import { apply as convert_chatluna_preset } from './plugins/convert_chatluna_preset'
import { apply as load_character_card } from './plugins/load_character_card'
import { apply as watch } from './plugins/watch' // import end

export async function plugins(ctx: Context, parent: Config) {
    type Command = (ctx: Context, config: Config) => PromiseLike<void> | void

    const middlewares: Command[] =
        // middleware start
        [convert_chatluna_preset, load_character_card, watch] // middleware end

    for (const middleware of middlewares) {
        await middleware(ctx, parent)
    }
}
