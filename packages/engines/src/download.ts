import Debug from '@prisma/debug'
import { enginesVersion } from '@prisma/engines-version'
import {
  EngineDownloadConfiguration,
  EngineType,
  download,
} from '@prisma/fetch-engine'
import fs from 'fs'
import path from 'path'
import { getCliQueryEngineType } from '.'
const debug = Debug('prisma:download')

const engineDir = path.join(__dirname, '../')

const lockFile = path.join(engineDir, 'download-lock')

let createdLockFile = false
async function main() {
  if (
    fs.existsSync(lockFile) &&
    parseInt(fs.readFileSync(lockFile, 'utf-8'), 10) > Date.now() - 20000
  ) {
    debug(
      `Lock file already exists, so we're skipping the download of the Prisma engines`,
    )
  } else {
    createLockFile()
    let binaryTargets = undefined
    if (process.env.PRISMA_CLI_BINARY_TARGETS) {
      binaryTargets = process.env.PRISMA_CLI_BINARY_TARGETS.split(',')
    }
    const cliQueryEngineBinaryType = getCliQueryEngineType()

    const engines: EngineDownloadConfiguration = {
      [cliQueryEngineBinaryType]: engineDir,
      [EngineType.migrationEngine]: engineDir,
      [EngineType.introspectionEngine]: engineDir,
      [EngineType.prismaFmt]: engineDir,
    }

    await download({
      engines,
      showProgress: true,
      version: enginesVersion,
      failSilent: true,
      binaryTargets,
    }).catch((e) => debug(e))

    cleanupLockFile()
  }
}

function createLockFile() {
  createdLockFile = true
  fs.writeFileSync(lockFile, Date.now().toString())
}

function cleanupLockFile() {
  if (createdLockFile) {
    try {
      if (fs.existsSync(lockFile)) {
        fs.unlinkSync(lockFile)
      }
    } catch (e) {
      debug(e)
    }
  }
}

main().catch((e) => debug(e))

// if we are in a Now context, ensure that `prisma generate` is in the postinstall hook
process.on('beforeExit', () => {
  cleanupLockFile()
})

process.once('SIGINT', () => {
  cleanupLockFile()
  process.exit()
})
