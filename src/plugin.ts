import { Context } from 'koishi'
import { Config } from '.'
// import start
// import end

export async function plugins(ctx: Context, parent: Config) {
    type Command = (ctx: Context, config: Config) => PromiseLike<void> | void

    const middlewares: Command[] =
        // middleware start
        []
    // middleware end

    for (const middleware of middlewares) {
        await middleware(ctx, parent)
    }
}
