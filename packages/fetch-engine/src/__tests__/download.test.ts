import { enginesVersion } from '@prisma/engines-version'
import { getPlatform } from '@prisma/get-platform'
import del from 'del'
import fs from 'fs'
import path from 'path'
import stripAnsi from 'strip-ansi'
import { cleanupCache } from '../cleanupCache'
import {
  checkVersionCommand,
  download,
  getBinaryName,
  getVersion,
} from '../download'
import { getFiles } from './__utils__/getFiles'

const CURRENT_BINARIES_HASH = enginesVersion

// Commit after OpenSSL 3
// https://github.com/prisma/prisma-engines/commit/0cecbd5867319b25d3d5110c16c398af16082790
// const FIXED_BINARIES_HASH = '0cecbd5867319b25d3d5110c16c398af16082790'
// Commit just before OpenSSL 3
// https://github.com/prisma/prisma-engines/commit/0317ad013e33dcab239f637ba0bf0e00fda77c1d
// const FIXED_BINARIES_HASH = '0317ad013e33dcab239f637ba0bf0e00fda77c1d'
// Commit for 3.12.0
// https://github.com/prisma/prisma-engines/commit/22b822189f46ef0dc5c5b503368d1bee01213980
const FIXED_BINARIES_HASH = '22b822189f46ef0dc5c5b503368d1bee01213980'

jest.setTimeout(100_000)

describe('download', () => {
  beforeEach(async () => {
    // completely clean up the cache and keep nothing
    await cleanupCache(0)
    await del(__dirname + '/**/*engine*')
    await del(__dirname + '/**/prisma-fmt*')
  })
  afterEach(() => delete process.env.PRISMA_QUERY_ENGINE_BINARY)
  test('basic download', async () => {
    const platform = await getPlatform()
    const queryEnginePath = path.join(
      __dirname,
      getBinaryName('query-engine', platform),
    )
    const introspectionEnginePath = path.join(
      __dirname,
      getBinaryName('introspection-engine', platform),
    )
    const migrationEnginePath = path.join(
      __dirname,
      getBinaryName('migration-engine', platform),
    )
    const prismafmtPath = path.join(
      __dirname,
      getBinaryName('prisma-fmt', platform),
    )

    await download({
      binaries: {
        'query-engine': __dirname,
        'introspection-engine': __dirname,
        'migration-engine': __dirname,
        'prisma-fmt': __dirname,
      },
      version: FIXED_BINARIES_HASH,
    })

    expect(await getVersion(queryEnginePath)).toMatchInlineSnapshot(
      `"query-engine 22b822189f46ef0dc5c5b503368d1bee01213980"`,
    )
    expect(await getVersion(introspectionEnginePath)).toMatchInlineSnapshot(
      `"introspection-core 22b822189f46ef0dc5c5b503368d1bee01213980"`,
    )
    expect(await getVersion(migrationEnginePath)).toMatchInlineSnapshot(
      `"migration-engine-cli 22b822189f46ef0dc5c5b503368d1bee01213980"`,
    )
    expect(await getVersion(prismafmtPath)).toMatchInlineSnapshot(
      `"prisma-fmt 22b822189f46ef0dc5c5b503368d1bee01213980"`,
    )
  })

  test('basic download all current binaries', async () => {
    const platform = await getPlatform()
    const queryEnginePath = path.join(
      __dirname,
      getBinaryName('query-engine', platform),
    )
    const introspectionEnginePath = path.join(
      __dirname,
      getBinaryName('introspection-engine', platform),
    )
    const migrationEnginePath = path.join(
      __dirname,
      getBinaryName('migration-engine', platform),
    )
    const prismafmtPath = path.join(
      __dirname,
      getBinaryName('prisma-fmt', platform),
    )

    await download({
      binaries: {
        'query-engine': __dirname,
        'introspection-engine': __dirname,
        'migration-engine': __dirname,
        'prisma-fmt': __dirname,
      },
      binaryTargets: [
        'darwin',
        'darwin-arm64',
        'debian-openssl-1.0.x',
        'debian-openssl-1.1.x',
        'linux-arm64-openssl-1.0.x',
        'linux-arm64-openssl-1.1.x',
        'rhel-openssl-1.0.x',
        'rhel-openssl-1.1.x',
        'windows',
        'linux-musl',
      ],
      version: CURRENT_BINARIES_HASH,
    })

    // Check that all binaries git hash are the same
    expect(await getVersion(queryEnginePath)).toContain(CURRENT_BINARIES_HASH)
    expect(await getVersion(introspectionEnginePath)).toContain(
      CURRENT_BINARIES_HASH,
    )
    expect(await getVersion(migrationEnginePath)).toContain(
      CURRENT_BINARIES_HASH,
    )
    expect(await getVersion(prismafmtPath)).toContain(CURRENT_BINARIES_HASH)
  })

  test('auto heal corrupt binary', async () => {
    const platform = await getPlatform()
    const baseDir = path.join(__dirname, 'corruption')
    const targetPath = path.join(
      baseDir,
      getBinaryName('query-engine', platform),
    )
    if (fs.existsSync(targetPath)) {
      try {
        fs.unlinkSync(targetPath)
      } catch (e) {
        console.error(e)
      }
    }

    await download({
      binaries: {
        'query-engine': baseDir,
      },
      version: FIXED_BINARIES_HASH,
    })

    fs.writeFileSync(targetPath, 'incorrect-binary')

    // please heal it
    await download({
      binaries: {
        'query-engine': baseDir,
      },
      version: FIXED_BINARIES_HASH,
    })

    expect(fs.existsSync(targetPath)).toBe(true)

    expect(await checkVersionCommand(targetPath)).toBe(true)
  })

  test('handle non-existent binary target', async () => {
    await expect(
      download({
        binaries: {
          'query-engine': __dirname,
        },
        version: FIXED_BINARIES_HASH,
        binaryTargets: ['darwin', 'marvin'] as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      }),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Unknown binaryTarget marvin and no custom binaries were provided"`,
    )
  })

  test('handle non-existent binary target with missing custom binaries', async () => {
    expect.assertions(1)
    process.env.PRISMA_QUERY_ENGINE_BINARY = '../query-engine'
    try {
      await download({
        binaries: {
          'query-engine': __dirname,
        },
        version: FIXED_BINARIES_HASH,
        binaryTargets: ['darwin', 'marvin'] as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      })
    } catch (err: any) {
      expect(stripAnsi(err.message)).toMatchInlineSnapshot(
        `"Env var PRISMA_QUERY_ENGINE_BINARY is provided but provided path ../query-engine can't be resolved."`,
      )
    }
  })

  test('handle non-existent binary target with custom binaries', async () => {
    const e = await download({
      binaries: {
        'query-engine': __dirname,
      },
    })
    const dummyPath = e['query-engine']![Object.keys(e['query-engine']!)[0]]!
    const targetPath = path.join(
      __dirname,
      // @ts-ignore
      getBinaryName('query-engine', 'marvin'),
    )
    fs.copyFileSync(dummyPath, targetPath)
    process.env.PRISMA_QUERY_ENGINE_BINARY = targetPath

    const testResult = await download({
      binaries: {
        'query-engine': path.join(__dirname, 'all'),
      },
      binaryTargets: ['marvin'] as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    })
    expect(testResult['query-engine']!['marvin']).toEqual(targetPath)
  })

  test('download all binaries & cache them', async () => {
    const baseDir = path.join(__dirname, 'all')
    await download({
      binaries: {
        'query-engine': baseDir,
        'introspection-engine': baseDir,
        'migration-engine': baseDir,
        'prisma-fmt': baseDir,
      },
      binaryTargets: [
        'darwin',
        'darwin-arm64',
        'debian-openssl-1.0.x',
        'debian-openssl-1.1.x',
        'linux-arm64-openssl-1.0.x',
        'linux-arm64-openssl-1.1.x',
        'rhel-openssl-1.0.x',
        'rhel-openssl-1.1.x',
        'windows',
        'linux-musl',
      ],
      version: FIXED_BINARIES_HASH,
    })
    const files = getFiles(baseDir)
    expect(files).toMatchInlineSnapshot(`
      Array [
        Object {
          "name": ".gitkeep",
          "size": 0,
        },
        Object {
          "name": "introspection-engine-darwin",
          "size": 24437544,
        },
        Object {
          "name": "introspection-engine-darwin-arm64",
          "size": 22381650,
        },
        Object {
          "name": "introspection-engine-debian-openssl-1.0.x",
          "size": 32321584,
        },
        Object {
          "name": "introspection-engine-debian-openssl-1.1.x",
          "size": 29587928,
        },
        Object {
          "name": "introspection-engine-linux-arm64-openssl-1.0.x",
          "size": 30197856,
        },
        Object {
          "name": "introspection-engine-linux-arm64-openssl-1.1.x",
          "size": 30748648,
        },
        Object {
          "name": "introspection-engine-linux-musl",
          "size": 31558736,
        },
        Object {
          "name": "introspection-engine-rhel-openssl-1.0.x",
          "size": 32296232,
        },
        Object {
          "name": "introspection-engine-rhel-openssl-1.1.x",
          "size": 29582576,
        },
        Object {
          "name": "introspection-engine-windows.exe",
          "size": 20715008,
        },
        Object {
          "name": "migration-engine-darwin",
          "size": 26951208,
        },
        Object {
          "name": "migration-engine-darwin-arm64",
          "size": 24579438,
        },
        Object {
          "name": "migration-engine-debian-openssl-1.0.x",
          "size": 32456568,
        },
        Object {
          "name": "migration-engine-debian-openssl-1.1.x",
          "size": 32444904,
        },
        Object {
          "name": "migration-engine-linux-arm64-openssl-1.0.x",
          "size": 32349352,
        },
        Object {
          "name": "migration-engine-linux-arm64-openssl-1.1.x",
          "size": 33082016,
        },
        Object {
          "name": "migration-engine-linux-musl",
          "size": 34240288,
        },
        Object {
          "name": "migration-engine-rhel-openssl-1.0.x",
          "size": 32437464,
        },
        Object {
          "name": "migration-engine-rhel-openssl-1.1.x",
          "size": 32439552,
        },
        Object {
          "name": "migration-engine-windows.exe",
          "size": 23255040,
        },
        Object {
          "name": "prisma-fmt-darwin",
          "size": 4836936,
        },
        Object {
          "name": "prisma-fmt-darwin-arm64",
          "size": 4476824,
        },
        Object {
          "name": "prisma-fmt-debian-openssl-1.0.x",
          "size": 9142544,
        },
        Object {
          "name": "prisma-fmt-debian-openssl-1.1.x",
          "size": 9142632,
        },
        Object {
          "name": "prisma-fmt-linux-arm64-openssl-1.0.x",
          "size": 8965000,
        },
        Object {
          "name": "prisma-fmt-linux-arm64-openssl-1.1.x",
          "size": 8965200,
        },
        Object {
          "name": "prisma-fmt-linux-musl",
          "size": 8749768,
        },
        Object {
          "name": "prisma-fmt-rhel-openssl-1.0.x",
          "size": 9142360,
        },
        Object {
          "name": "prisma-fmt-rhel-openssl-1.1.x",
          "size": 9142440,
        },
        Object {
          "name": "prisma-fmt-windows.exe",
          "size": 3850752,
        },
        Object {
          "name": "query-engine-darwin",
          "size": 36031616,
        },
        Object {
          "name": "query-engine-darwin-arm64",
          "size": 33042266,
        },
        Object {
          "name": "query-engine-debian-openssl-1.0.x",
          "size": 43404616,
        },
        Object {
          "name": "query-engine-debian-openssl-1.1.x",
          "size": 43380008,
        },
        Object {
          "name": "query-engine-linux-arm64-openssl-1.0.x",
          "size": 42594448,
        },
        Object {
          "name": "query-engine-linux-arm64-openssl-1.1.x",
          "size": 43321736,
        },
        Object {
          "name": "query-engine-linux-musl",
          "size": 44670744,
        },
        Object {
          "name": "query-engine-rhel-openssl-1.0.x",
          "size": 43377232,
        },
        Object {
          "name": "query-engine-rhel-openssl-1.1.x",
          "size": 43375048,
        },
        Object {
          "name": "query-engine-windows.exe",
          "size": 32592896,
        },
      ]
    `)
    await del(baseDir + '/*engine*')
    await del(baseDir + '/prisma-fmt*')
    const before = Date.now()
    await download({
      binaries: {
        'query-engine': baseDir,
        'introspection-engine': baseDir,
        'migration-engine': baseDir,
        'prisma-fmt': baseDir,
      },
      binaryTargets: [
        'darwin',
        'darwin-arm64',
        'debian-openssl-1.0.x',
        'debian-openssl-1.1.x',
        'linux-arm64-openssl-1.0.x',
        'linux-arm64-openssl-1.1.x',
        'rhel-openssl-1.0.x',
        'rhel-openssl-1.1.x',
        'windows',
        'linux-musl',
      ],
      version: FIXED_BINARIES_HASH,
    })
    const after = Date.now()
    // cache should take less than 2s
    // value on Mac: 1440
    // value on GH Actions: ~5812
    const took = after - before
    expect(took).toBeLessThan(20000)
    const before2 = Date.now()
    await download({
      binaries: {
        'query-engine': baseDir,
        'introspection-engine': baseDir,
        'migration-engine': baseDir,
        'prisma-fmt': baseDir,
      },
      binaryTargets: [
        'darwin',
        'darwin-arm64',
        'debian-openssl-1.0.x',
        'debian-openssl-1.1.x',
        'linux-arm64-openssl-1.0.x',
        'linux-arm64-openssl-1.1.x',
        'rhel-openssl-1.0.x',
        'rhel-openssl-1.1.x',
        'windows',
        'linux-musl',
      ],
      version: FIXED_BINARIES_HASH,
    })
    const after2 = Date.now()
    // value on Mac: 33ms
    // value on GH Actions: ?
    // https://github.com/prisma/prisma/runs/1176632754
    const took2 = after2 - before2
    expect(took2).toBeLessThan(10000)
  })
})
