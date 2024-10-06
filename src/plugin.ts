import { Context } from 'koishi'
import { Config } from '.'
// import start
import { apply as load } from './plugins/load'
import { apply as watch } from './plugins/watch' // import end

export async function plugins(ctx: Context, parent: Config) {
    type Command = (ctx: Context, config: Config) => PromiseLike<void> | void

    const middlewares: Command[] =
        // middleware start
        [load, watch] // middleware end

    for (const middleware of middlewares) {
        await middleware(ctx, parent)
    }
}
