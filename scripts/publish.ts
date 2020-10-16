import { AssertionError } from 'assert'
import chalk from 'chalk'
import fs from 'fs'
import fetch from 'node-fetch'
import execa from 'execa'

async function main(dryRun = false) {
  const clientPayload = JSON.parse(process.env.GITHUB_EVENT_CLIENT_PAYLOAD)
  assertIsClientPayload(clientPayload)

  const npmTag = clientPayload.branch === 'master' ? 'latest' : 'integration'
  const maybeName = clientPayload.branch === 'master' ? '' : `-${clientPayload.branch}`
  const newVersion = `${await getNextStableVersion()}${maybeName}-${clientPayload.commit}`

  console.log(chalk.bold.greenBright('Going to publish:\n'))
  console.log(`${chalk.bold('Version')}  ${newVersion}`)
  console.log(`${chalk.bold('Tag')}      ${npmTag}\n`)

  adjustPkgJson('packages/engines-version/package.json', pkg => {
    pkg.prisma.enginesVersion = clientPayload.commit
    pkg.version = newVersion
  })

  adjustPkgJson('packages/engines/package.json', pkg => {
    pkg.version = newVersion
  })


  await run('packages/engines-version', `pnpm publish --no-git-checks --tag ${npmTag}`, dryRun)
  await run('packages/engines', `pnpm i @prisma/engines-version@${newVersion}`, dryRun)
  await run('packages/engines', `pnpm publish --no-git-checks --tag ${npmTag}`, dryRun)
}

type ClientInput = {
  branch: string
  commit: string
}

function adjustPkgJson(pathToIt: string, cb: (pkg: any) => void) {
  const pkg = JSON.parse(fs.readFileSync(pathToIt, 'utf-8'))
  cb(pkg)
  fs.writeFileSync(pathToIt, JSON.stringify(pkg, null, 2))
}

async function getNextStableVersion(): Promise<string | null> {
  const data = await fetch('https://registry.npmjs.org/@prisma/cli').then(res => res.json())
  const currentLatest: string = data['dist-tags']?.latest
  return increaseMinor(currentLatest)
}

function assertIsClientPayload(val: any): asserts val is ClientInput {
  if (!val || typeof val !== 'object') {
    throw new AssertionError({ message: 'client_payload is not an object', actual: val })
  }
  if (!val.branch) {
    throw new AssertionError({ message: 'branch missing in client_payload', actual: val })
  }
  if (typeof val.branch !== 'string') {
    throw new AssertionError({ message: 'branch must be a string in client_payload', actual: val })
  }
  if (typeof val.commit !== 'string') {
    throw new AssertionError({ message: 'commit must be a string in client_payload', actual: val })
  }
  if (val.commit.length !== 'e078aa75c40550d826bc35aeee4f45582fb4165e'.length) {
    throw new AssertionError({ message: 'commit is not a valid hash in client_payload', actual: val })
  }
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})

const semverRegex = /^(?<major>0|[1-9]\d*)\.(?<minor>0|[1-9]\d*)\.(?<patch>0|[1-9]\d*)(?:-(?<prerelease>(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+(?<buildmetadata>[0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/

function increaseMinor(version: string): string | null {
  const match = semverRegex.exec(version)
  if (match) {
    return `${match.groups.major}.${Number(match.groups.minor) + 1}.${match.groups.patch
      }`
  }

  return null
}

/**
 * Runs a command and pipes the stdout & stderr to the current process.
 * @param cwd cwd for running the command
 * @param cmd command to run
 */
async function run(
  cwd: string,
  cmd: string,
  dry: boolean = false,
  hidden: boolean = false,
): Promise<void> {
  const args = [chalk.underline('./' + cwd).padEnd(20), chalk.bold(cmd)]
  if (dry) {
    args.push(chalk.dim('(dry)'))
  }
  if (!hidden) {
    console.log(...args)
  }
  if (dry) {
    return
  }

  try {
    await execa.command(cmd, {
      cwd,
      stdio: 'inherit',
      shell: true,
    })
  } catch (e) {
    throw new Error(
      chalk.red(
        `Error running ${chalk.bold(cmd)} in ${chalk.underline(cwd)}:`,
      ) + (e.stderr || e.stack || e.message),
    )
  }
}
