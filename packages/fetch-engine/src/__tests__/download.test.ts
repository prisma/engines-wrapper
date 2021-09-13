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

const FIXED_BINARIES_HASH = '0cecbd5867319b25d3d5110c16c398af16082790 '

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
      `"query-engine 0c2898954d761d1c92f304ff1b7917c601c2e3d8"`,
    )
    expect(await getVersion(introspectionEnginePath)).toMatchInlineSnapshot(
      `"introspection-core 0c2898954d761d1c92f304ff1b7917c601c2e3d8"`,
    )
    expect(await getVersion(migrationEnginePath)).toMatchInlineSnapshot(
      `"migration-engine-cli 0c2898954d761d1c92f304ff1b7917c601c2e3d8"`,
    )
    expect(await getVersion(prismafmtPath)).toMatchInlineSnapshot(
      `"prisma-fmt 0c2898954d761d1c92f304ff1b7917c601c2e3d8"`,
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
    } catch (err) {
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
          "size": 17484680,
        },
        Object {
          "name": "introspection-engine-darwin-arm64",
          "size": 15669185,
        },
        Object {
          "name": "introspection-engine-debian-openssl-1.0.x",
          "size": 21964304,
        },
        Object {
          "name": "introspection-engine-debian-openssl-1.1.x",
          "size": 19228728,
        },
        Object {
          "name": "introspection-engine-linux-arm-openssl-1.0.x",
          "size": 20702352,
        },
        Object {
          "name": "introspection-engine-linux-arm-openssl-1.1.x",
          "size": 21256544,
        },
        Object {
          "name": "introspection-engine-linux-musl",
          "size": 22177600,
        },
        Object {
          "name": "introspection-engine-rhel-openssl-1.0.x",
          "size": 21930088,
        },
        Object {
          "name": "introspection-engine-rhel-openssl-1.1.x",
          "size": 19223352,
        },
        Object {
          "name": "introspection-engine-windows.exe",
          "size": 12509184,
        },
        Object {
          "name": "migration-engine-darwin",
          "size": 29312704,
        },
        Object {
          "name": "migration-engine-darwin-arm64",
          "size": 26354589,
        },
        Object {
          "name": "migration-engine-debian-openssl-1.0.x",
          "size": 36103688,
        },
        Object {
          "name": "migration-engine-debian-openssl-1.1.x",
          "size": 33413696,
        },
        Object {
          "name": "migration-engine-linux-arm-openssl-1.0.x",
          "size": 33688880,
        },
        Object {
          "name": "migration-engine-linux-arm-openssl-1.1.x",
          "size": 34238648,
        },
        Object {
          "name": "migration-engine-linux-musl",
          "size": 35344024,
        },
        Object {
          "name": "migration-engine-rhel-openssl-1.0.x",
          "size": 36074272,
        },
        Object {
          "name": "migration-engine-rhel-openssl-1.1.x",
          "size": 33416816,
        },
        Object {
          "name": "migration-engine-windows.exe",
          "size": 23152640,
        },
        Object {
          "name": "prisma-fmt-darwin",
          "size": 4838536,
        },
        Object {
          "name": "prisma-fmt-darwin-arm64",
          "size": 4413767,
        },
        Object {
          "name": "prisma-fmt-debian-openssl-1.0.x",
          "size": 8537792,
        },
        Object {
          "name": "prisma-fmt-debian-openssl-1.1.x",
          "size": 8537912,
        },
        Object {
          "name": "prisma-fmt-linux-arm-openssl-1.0.x",
          "size": 8304856,
        },
        Object {
          "name": "prisma-fmt-linux-arm-openssl-1.1.x",
          "size": 8304696,
        },
        Object {
          "name": "prisma-fmt-linux-musl",
          "size": 8517824,
        },
        Object {
          "name": "prisma-fmt-rhel-openssl-1.0.x",
          "size": 8537720,
        },
        Object {
          "name": "prisma-fmt-rhel-openssl-1.1.x",
          "size": 8537848,
        },
        Object {
          "name": "prisma-fmt-windows.exe",
          "size": 3736064,
        },
        Object {
          "name": "query-engine-darwin",
          "size": 37549528,
        },
        Object {
          "name": "query-engine-darwin-arm64",
          "size": 33922873,
        },
        Object {
          "name": "query-engine-debian-openssl-1.0.x",
          "size": 45453392,
        },
        Object {
          "name": "query-engine-debian-openssl-1.1.x",
          "size": 42677856,
        },
        Object {
          "name": "query-engine-linux-arm-openssl-1.0.x",
          "size": 42594864,
        },
        Object {
          "name": "query-engine-linux-arm-openssl-1.1.x",
          "size": 43107904,
        },
        Object {
          "name": "query-engine-linux-musl",
          "size": 44323160,
        },
        Object {
          "name": "query-engine-rhel-openssl-1.0.x",
          "size": 45427976,
        },
        Object {
          "name": "query-engine-rhel-openssl-1.1.x",
          "size": 42673432,
        },
        Object {
          "name": "query-engine-windows.exe",
          "size": 30853120,
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
