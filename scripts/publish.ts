import slugify from '@sindresorhus/slugify'
import arg from 'arg'
import { AssertionError } from 'assert'
import chalk from 'chalk'
import execa from 'execa'
import fs from 'fs'
import fetch from 'node-fetch'

/**
 * Turns a prisma-engines Git branch name (that got new engines published) into a
 * engines-wrapper Npm dist tag name (where the local packages will be published)
 */
function prismaEnginesBranchToNpmDistTag(branch: string): string {
  if (branch === 'master' || branch === 'main') {
    return 'latest'
  }

  if (isPatchBranch(branch)) {
    return 'patch'
  }

  return 'integration'
}

/** Is this a prisma-engines patch branch? (ends in .x) */
function isPatchBranch(branchName: string): boolean {
  return /^(\d+)\.(\d+)\.x/.test(branchName)
}

async function main(dryRun = false) {
  if (dryRun) {
    console.log(`Dry run`)
  }

  // Client Payload via GitHub Event (branch + commit)
  const githubEventClientPayload = JSON.parse(
    process.env.GITHUB_EVENT_CLIENT_PAYLOAD,
  )
  assertIsClientPayload(githubEventClientPayload)

  // Gather information for version string
  const npmDistTag = prismaEnginesBranchToNpmDistTag(
    githubEventClientPayload.branch,
  )
  const optionalNamePart =
    npmDistTag === 'integration'
      ? `${slugify(githubEventClientPayload.branch)}-`
      : ''
  const nextStable = await getNextPrismaStableVersion(npmDistTag === 'patch')
  const versionIncrement = await getNextVersionIncrement(nextStable)
  const newVersion = `${nextStable}-${versionIncrement}.${optionalNamePart}${githubEventClientPayload.commit}`

  // Output
  console.log(chalk.bold.greenBright('Going to publish:\n'))
  console.log(`${chalk.bold('New version')}   ${newVersion}`)
  console.log(`${chalk.bold('Npm Dist Tag')}  ${npmDistTag}\n`)

  // Publish Order
  // [engines-version, get-platform], fetch-engine, engines

  // @prisma/engines-version
  adjustPkgJson('packages/engines-version/package.json', (pkg) => {
    pkg.prisma.enginesVersion = githubEventClientPayload.commit
    pkg.version = newVersion
  })
  await run(
    'packages/engines-version',
    `pnpm publish --no-git-checks --tag ${npmDistTag}`,
    dryRun,
  )

  // @prisma/get-platform
  adjustPkgJson('packages/get-platform/package.json', (pkg) => {
    pkg.version = newVersion
  })

  await run('packages/get-platform', `pnpm run build`, dryRun)

  await run(
    'packages/get-platform',
    `pnpm publish --no-git-checks --tag ${npmDistTag}`,
    dryRun,
  )

  // @prisma/fetch-engine
  adjustPkgJson('packages/fetch-engine/package.json', (pkg) => {
    pkg.version = newVersion
  })

  await run(
    'packages/fetch-engine',
    `pnpm i @prisma/engines-version@${newVersion} @prisma/get-platform@${newVersion}`,
    dryRun,
  )

  await run('packages/fetch-engine', `pnpm run build`, dryRun)

  await run(
    'packages/fetch-engine',
    `pnpm publish --no-git-checks --tag ${npmDistTag}`,
    dryRun,
  )

  // @prisma/engines
  adjustPkgJson('packages/engines/package.json', (pkg) => {
    pkg.version = newVersion
  })

  await run(
    'packages/engines',
    `pnpm i @prisma/fetch-engine@${newVersion} @prisma/engines-version@${newVersion}`,
    dryRun,
  )

  await run('packages/engines', `pnpm run build`, dryRun)

  await run(
    'packages/engines',
    `pnpm publish --no-git-checks --tag ${npmDistTag}`,
    dryRun,
  )

  // Print out version for workflow dispatch if npmTag is latest
  if (npmDistTag === 'latest') {
    console.log(`Printing version for workflow dispatch: ${newVersion}`)
    // This special log makes new_prisma_version avaliable in github actions
    // Read: https://docs.github.com/en/actions/reference/workflow-commands-for-github-actions#using-workflow-commands-to-access-toolkit-functions
    console.log(`::set-output name=new_prisma_version::${newVersion}`)
  }
}

/** Apply call back function to content of file and write it back */
function adjustPkgJson(pathToIt: string, cb: (pkg: any) => void) {
  const pkg = JSON.parse(fs.readFileSync(pathToIt, 'utf-8'))
  cb(pkg)
  fs.writeFileSync(pathToIt, JSON.stringify(pkg, null, 2))
}

/** Sets the last bit of the version, the patch, to 0 */
function setPatchZero(version: string): string {
  const [major, minor, patch] = version.split('.')
  return `${major}.${minor}.0`
}

/** Get next stable version of prisma CLI (using Npm) */
async function getNextPrismaStableVersion(
  isPatch: boolean,
): Promise<string | null> {
  const data = await fetch('https://registry.npmjs.org/prisma').then((res) =>
    res.json(),
  )
  // We want a version scheme of `2.12.0` if the latest version is `2.11.5`
  // we're not interested in the patch - .5. That's why we remove it from the version
  const currentLatest: string = setPatchZero(data['dist-tags']?.latest)
  if (isPatch) {
    return incrementPatch(currentLatest)
  }
  return incrementMinor(currentLatest)
}

/** Get next version increment of engines version (using Npm) */
async function getNextVersionIncrement(versionPrefix: string): Promise<number> {
  console.log('getting increment for prefix', versionPrefix)
  const data = await fetch(
    'https://registry.npmjs.org/@prisma/engines-version',
  ).then((res) => res.json())
  const versions: string[] = Object.keys(data.versions).filter((v) =>
    v.startsWith(versionPrefix),
  )

  // regex to match 2.10.0-123.asdasdasdja0s9dja0s9djas0d9j
  //                       ^^^ we are interested in this
  const regex = /\d\.\d+\.\d+-(\d+).\S+/

  let max = 0
  for (const version of versions) {
    const match = regex.exec(version)
    if (match) {
      const n = Number(match[1])
      max = Math.max(max, n)
    }
  }
  console.log('found current max', max)

  return max + 1
}

type ClientInput = {
  branch: string
  commit: string
}

/** Assert receivec payload is valid */
function assertIsClientPayload(val: any): asserts val is ClientInput {
  if (!val || typeof val !== 'object') {
    throw new AssertionError({
      message: 'client_payload is not an object',
      actual: val,
    })
  }
  if (!val.branch) {
    throw new AssertionError({
      message: 'branch missing in client_payload',
      actual: val,
    })
  }
  if (typeof val.branch !== 'string') {
    throw new AssertionError({
      message: 'branch must be a string in client_payload',
      actual: val,
    })
  }
  if (typeof val.commit !== 'string') {
    throw new AssertionError({
      message: 'commit must be a string in client_payload',
      actual: val,
    })
  }
  if (val.commit.length !== 'e078aa75c40550d826bc35aeee4f45582fb4165e'.length) {
    throw new AssertionError({
      message: 'commit is not a valid hash in client_payload',
      actual: val,
    })
  }
}

// TODO Figure out where this comes from
const semverRegex =
  /^(?<major>0|[1-9]\d*)\.(?<minor>0|[1-9]\d*)\.(?<patch>0|[1-9]\d*)(?:-(?<prerelease>(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+(?<buildmetadata>[0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/

function incrementMinor(version: string): string | null {
  const match = semverRegex.exec(version)
  if (match) {
    return `${match.groups.major}.${Number(match.groups.minor) + 1}.${
      match.groups.patch
    }`
  }

  return null
}

function incrementPatch(version: string): string | null {
  const match = semverRegex.exec(version)
  if (match) {
    return `${match.groups.major}.${match.groups.minor}.${
      Number(match.groups.patch) + 1
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

// useful for debugging
process.env.GITHUB_EVENT_CLIENT_PAYLOAD = JSON.stringify({
  branch: 'enabling-node-api',
  commit: '6287731616bd2e57d16f6b608f5bff40748ce13d',
})

const args = arg({
  '--dry': Boolean,
})

main(args['--dry']).catch((e) => {
  console.error(e)
  process.exit(1)
})
