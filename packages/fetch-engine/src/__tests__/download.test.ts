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
  getEngineName,
  getVersion,
} from '../download'
import { getFiles } from './__utils__/getFiles'

const CURRENT_ENGINES_VERSION_HASH = enginesVersion

const FIXED_ENGINES_VERSION_HASH = '0cecbd5867319b25d3d5110c16c398af16082790'

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
      getEngineName('query-engine', platform),
    )
    const introspectionEnginePath = path.join(
      __dirname,
      getEngineName('introspection-engine', platform),
    )
    const migrationEnginePath = path.join(
      __dirname,
      getEngineName('migration-engine', platform),
    )
    const prismafmtPath = path.join(
      __dirname,
      getEngineName('prisma-fmt', platform),
    )

    await download({
      engines: {
        'query-engine': __dirname,
        'introspection-engine': __dirname,
        'migration-engine': __dirname,
        'prisma-fmt': __dirname,
      },
      version: FIXED_ENGINES_VERSION_HASH,
    })

    expect(await getVersion(queryEnginePath)).toMatchInlineSnapshot(
      `"query-engine 0cecbd5867319b25d3d5110c16c398af16082790"`,
    )
    expect(await getVersion(introspectionEnginePath)).toMatchInlineSnapshot(
      `"introspection-core 0cecbd5867319b25d3d5110c16c398af16082790"`,
    )
    expect(await getVersion(migrationEnginePath)).toMatchInlineSnapshot(
      `"migration-engine-cli 0cecbd5867319b25d3d5110c16c398af16082790"`,
    )
    expect(await getVersion(prismafmtPath)).toMatchInlineSnapshot(
      `"prisma-fmt 0cecbd5867319b25d3d5110c16c398af16082790"`,
    )
  })

  test('basic download all current engines', async () => {
    const platform = await getPlatform()
    const queryEnginePath = path.join(
      __dirname,
      getEngineName('query-engine', platform),
    )
    const introspectionEnginePath = path.join(
      __dirname,
      getEngineName('introspection-engine', platform),
    )
    const migrationEnginePath = path.join(
      __dirname,
      getEngineName('migration-engine', platform),
    )
    const prismafmtPath = path.join(
      __dirname,
      getEngineName('prisma-fmt', platform),
    )

    await download({
      engines: {
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
      version: CURRENT_ENGINES_VERSION_HASH,
    })

    // Check that all engines git hash are the same
    expect(await getVersion(queryEnginePath)).toContain(CURRENT_ENGINES_VERSION_HASH)
    expect(await getVersion(introspectionEnginePath)).toContain(
      CURRENT_ENGINES_VERSION_HASH,
    )
    expect(await getVersion(migrationEnginePath)).toContain(
      CURRENT_ENGINES_VERSION_HASH,
    )
    expect(await getVersion(prismafmtPath)).toContain(CURRENT_ENGINES_VERSION_HASH)
  })

  test('auto heal corrupt engine file', async () => {
    const platform = await getPlatform()
    const baseDir = path.join(__dirname, 'corruption')
    const targetPath = path.join(
      baseDir,
      getEngineName('query-engine', platform),
    )
    if (fs.existsSync(targetPath)) {
      try {
        fs.unlinkSync(targetPath)
      } catch (e) {
        console.error(e)
      }
    }

    await download({
      engines: {
        'query-engine': baseDir,
      },
      version: FIXED_ENGINES_VERSION_HASH,
    })

    fs.writeFileSync(targetPath, 'incorrect-engine-file')

    // please heal it
    await download({
      engines: {
        'query-engine': baseDir,
      },
      version: FIXED_ENGINES_VERSION_HASH,
    })

    expect(fs.existsSync(targetPath)).toBe(true)

    expect(await checkVersionCommand(targetPath)).toBe(true)
  })

  test('handle non-existent binary target', async () => {
    await expect(
      download({
        engines: {
          'query-engine': __dirname,
        },
        version: FIXED_ENGINES_VERSION_HASH,
        binaryTargets: ['darwin', 'marvin'] as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      }),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Unknown binaryTarget marvin and no custom engines were provided"`,
    )
  })

  test('handle non-existent binary target with missing custom engines', async () => {
    expect.assertions(1)
    process.env.PRISMA_QUERY_ENGINE_BINARY = '../query-engine'
    try {
      await download({
        engines: {
          'query-engine': __dirname,
        },
        version: FIXED_ENGINES_VERSION_HASH,
        binaryTargets: ['darwin', 'marvin'] as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      })
    } catch (err: any) {
      expect(stripAnsi(err.message)).toMatchInlineSnapshot(
        `"Env var PRISMA_QUERY_ENGINE_BINARY is provided but provided path ../query-engine can't be resolved."`,
      )
    }
  })

  test('handle non-existent binary target with custom engines', async () => {
    const e = await download({
      engines: {
        'query-engine': __dirname,
      },
    })
    const dummyPath = e['query-engine']![Object.keys(e['query-engine']!)[0]]!
    const targetPath = path.join(
      __dirname,
      // @ts-ignore
      getEngineName('query-engine', 'marvin'),
    )
    fs.copyFileSync(dummyPath, targetPath)
    process.env.PRISMA_QUERY_ENGINE_BINARY = targetPath

    const testResult = await download({
      engines: {
        'query-engine': path.join(__dirname, 'all'),
      },
      binaryTargets: ['marvin'] as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    })
    expect(testResult['query-engine']!['marvin']).toEqual(targetPath)
  })

  test('download all engines & cache them', async () => {
    const baseDir = path.join(__dirname, 'all')
    await download({
      engines: {
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
      version: FIXED_ENGINES_VERSION_HASH,
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
    "size": 17617016,
  },
  Object {
    "name": "introspection-engine-darwin-arm64",
    "size": 15160465,
  },
  Object {
    "name": "introspection-engine-debian-openssl-1.0.x",
    "size": 22115480,
  },
  Object {
    "name": "introspection-engine-debian-openssl-1.1.x",
    "size": 19384392,
  },
  Object {
    "name": "introspection-engine-linux-arm64-openssl-1.0.x",
    "size": 20821472,
  },
  Object {
    "name": "introspection-engine-linux-arm64-openssl-1.1.x",
    "size": 21367104,
  },
  Object {
    "name": "introspection-engine-linux-musl",
    "size": 22339792,
  },
  Object {
    "name": "introspection-engine-rhel-openssl-1.0.x",
    "size": 22085320,
  },
  Object {
    "name": "introspection-engine-rhel-openssl-1.1.x",
    "size": 19378520,
  },
  Object {
    "name": "introspection-engine-windows.exe",
    "size": 12523008,
  },
  Object {
    "name": "migration-engine-darwin",
    "size": 21094696,
  },
  Object {
    "name": "migration-engine-darwin-arm64",
    "size": 25607309,
  },
  Object {
    "name": "migration-engine-debian-openssl-1.0.x",
    "size": 25912224,
  },
  Object {
    "name": "migration-engine-debian-openssl-1.1.x",
    "size": 23183128,
  },
  Object {
    "name": "migration-engine-linux-arm64-openssl-1.0.x",
    "size": 24282808,
  },
  Object {
    "name": "migration-engine-linux-arm64-openssl-1.1.x",
    "size": 24851968,
  },
  Object {
    "name": "migration-engine-linux-musl",
    "size": 25983216,
  },
  Object {
    "name": "migration-engine-rhel-openssl-1.0.x",
    "size": 25882064,
  },
  Object {
    "name": "migration-engine-rhel-openssl-1.1.x",
    "size": 23173568,
  },
  Object {
    "name": "migration-engine-windows.exe",
    "size": 23372288,
  },
  Object {
    "name": "prisma-fmt-darwin",
    "size": 4955008,
  },
  Object {
    "name": "prisma-fmt-darwin-arm64",
    "size": 4324199,
  },
  Object {
    "name": "prisma-fmt-debian-openssl-1.0.x",
    "size": 8654416,
  },
  Object {
    "name": "prisma-fmt-debian-openssl-1.1.x",
    "size": 8654520,
  },
  Object {
    "name": "prisma-fmt-linux-arm64-openssl-1.0.x",
    "size": 8411512,
  },
  Object {
    "name": "prisma-fmt-linux-arm64-openssl-1.1.x",
    "size": 8411448,
  },
  Object {
    "name": "prisma-fmt-linux-musl",
    "size": 8635408,
  },
  Object {
    "name": "prisma-fmt-rhel-openssl-1.0.x",
    "size": 8654344,
  },
  Object {
    "name": "prisma-fmt-rhel-openssl-1.1.x",
    "size": 8654448,
  },
  Object {
    "name": "prisma-fmt-windows.exe",
    "size": 3799552,
  },
  Object {
    "name": "query-engine-darwin",
    "size": 38297216,
  },
  Object {
    "name": "query-engine-darwin-arm64",
    "size": 32890761,
  },
  Object {
    "name": "query-engine-debian-openssl-1.0.x",
    "size": 46199640,
  },
  Object {
    "name": "query-engine-debian-openssl-1.1.x",
    "size": 43489912,
  },
  Object {
    "name": "query-engine-linux-arm64-openssl-1.0.x",
    "size": 43248576,
  },
  Object {
    "name": "query-engine-linux-arm64-openssl-1.1.x",
    "size": 43808608,
  },
  Object {
    "name": "query-engine-linux-musl",
    "size": 45035448,
  },
  Object {
    "name": "query-engine-rhel-openssl-1.0.x",
    "size": 46166096,
  },
  Object {
    "name": "query-engine-rhel-openssl-1.1.x",
    "size": 43485976,
  },
  Object {
    "name": "query-engine-windows.exe",
    "size": 31400448,
  },
]
`)
    await del(baseDir + '/*engine*')
    await del(baseDir + '/prisma-fmt*')
    const before = Date.now()
    await download({
      engines: {
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
      version: FIXED_ENGINES_VERSION_HASH,
    })
    const after = Date.now()
    // cache should take less than 2s
    // value on Mac: 1440
    // value on GH Actions: ~5812
    const took = after - before
    expect(took).toBeLessThan(20000)
    const before2 = Date.now()
    await download({
      engines: {
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
      version: FIXED_ENGINES_VERSION_HASH,
    })
    const after2 = Date.now()
    // value on Mac: 33ms
    // value on GH Actions: ?
    // https://github.com/prisma/prisma/runs/1176632754
    const took2 = after2 - before2
    expect(took2).toBeLessThan(10000)
  })
})
