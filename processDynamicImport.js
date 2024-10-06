import { exec } from 'child_process'
import fs from 'fs/promises'
import path from 'path'

const paths = [
    {
        filePath: 'src/plugin.ts',
        importFilesDir: 'src/plugins'
    }
]

async function main() {
    for (const subPaths of paths) {
        console.log(`[Processing ${subPaths.filePath}]`)
        const fileParentDir = subPaths.filePath
            .split('/')
            .slice(0, -1)
            .join('/')
        const subDirName = subPaths.importFilesDir.replace(fileParentDir, '')
        const importFilesDir = subPaths.importFilesDir
        await processImports(subPaths.filePath, subDirName, importFilesDir)
    }

    // exec command 'yarn lint-fix‘
    await run('yarn', ['lint-fix'])

    console.log('done process dynamic import')

    process.exit(0)
}

export default async function run(exe, ...args) {
    return new Promise((resolve, reject) => {
        const env = Object.create(process.env)
        const child = exec([exe, ...args].join(' '), {
            env: {
                ...env
            }
        })
        child.stdout.setEncoding('utf8')
        child.stderr.setEncoding('utf8')
        child.stdout.on('data', (data) => console.log(data))
        child.stderr.on('data', (data) => console.error(data))
        child.on('error', (error) => reject(error))
        child.on('close', (exitCode) => {
            console.log(
                `run ${[exe, ...args].join(' ')} exit with code ${exitCode}`
            )
            resolve(exitCode)
        })
    })
}
/**
 *
 * @param {string} path
 * @param {string} subDirName
 * @param {string} importFilesDir
 */
async function processImports(path, subDirName, importFilesDir) {
    const allImportFiles = await getAllImportFiles(importFilesDir, subDirName)

    // step 1. replace all imports

    let originPathContent = await fs.readFile(path, 'utf-8')

    // match the comment from '// import start' to '// import end', remove the comment match
    const importFiles = originPathContent.match(
        /\/\/ import start([\s\S]*?)\/\/ import end/
    )
    if (!importFiles) {
        throw new Error('no import files')
    }
    const importFilesContent = importFiles[1]

    originPathContent = originPathContent.replace(
        importFilesContent,
        await generateImports(allImportFiles)
    )

    const middlewares = originPathContent.match(
        /\/\/ middleware start([\s\S]*?)\/\/ middleware end/
    )

    originPathContent = originPathContent.replace(
        middlewares[1],
        await generateMiddlewares(allImportFiles)
    )

    if (originPathContent.length > 0) {
        // console.log(originPathContent)
        await fs.writeFile(path, originPathContent)
    }
}

async function generateMiddlewares(allImportFiles) {
    const stats = ['', '[']

    for (const info of allImportFiles) {
        //  import { apply as lifecycle } from './middlewares/lifecycle'
        stats.push(`${info.name},`)
    }

    stats.push(']')

    return stats.join('\n')
}

/**
 *
 * @param {{path:string,name:string}[]} allImportFiles
 * @returns
 */
async function generateImports(allImportFiles) {
    const stats = ['']

    for (const info of allImportFiles) {
        //  import { apply as lifecycle } from './middlewares/lifecycle'
        stats.push(`import { apply as ${info.name} } from '${info.path}'`)
    }

    return stats.join('\n')
}

async function getAllImportFiles(importFilesDir, subDirName) {
    const files = await fs.readdir(importFilesDir)
    const allImportFiles = []
    for (const file of files) {
        const filePath = path.join(importFilesDir, file)
        const stat = await fs.stat(filePath)
        if (stat.isDirectory()) {
            throw new Error('not support dir')
        } else {
            const realName = path.basename(file, '.ts')
            allImportFiles.push({
                path: `.${subDirName}/${realName}`,
                name: realName
            })
        }
    }
    return allImportFiles
}

main()
