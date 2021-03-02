import { enginesVersion } from '@prisma/engines-version'
import { download } from '@prisma/fetch-engine'
import path from 'path'

export function getEnginesPath() {
  return path.join(__dirname, '../')
}

export async function ensureBinariesExist() {
  const binaryDir = path.join(__dirname, '../')
  let binaryTargets = undefined
  if (process.env.PRISMA_CLI_BINARY_TARGETS) {
    binaryTargets = process.env.PRISMA_CLI_BINARY_TARGETS.split(',')
  }
  await download({
    binaries: {
      'query-engine': binaryDir,
      'migration-engine': binaryDir,
      'introspection-engine': binaryDir,
      'prisma-fmt': binaryDir,
    },
    showProgress: true,
    version: enginesVersion,
    failSilent: false,
    binaryTargets,
  })
}

export { enginesVersion } from '@prisma/engines-version'

/**
 * This annotation is used for `node-file-trace`
 * See https://github.com/zeit/node-file-trace/issues/104
 * It's necessary to run this package standalone or within the sdk in Vercel
 * And needed for https://github.com/vercel/pkg#detecting-assets-in-source-code
 */

path.join(__dirname, '../query-engine-darwin')
path.join(__dirname, '../introspection-engine-darwin')
path.join(__dirname, '../prisma-fmt-darwin')

path.join(__dirname, '../query-engine-debian-openssl-1.0.x')
path.join(__dirname, '../introspection-engine-debian-openssl-1.0.x')
path.join(__dirname, '../prisma-fmt-debian-openssl-1.0.x')

path.join(__dirname, '../query-engine-debian-openssl-1.1.x')
path.join(__dirname, '../introspection-engine-debian-openssl-1.1.x')
path.join(__dirname, '../prisma-fmt-debian-openssl-1.1.x')

path.join(__dirname, '../query-engine-rhel-openssl-1.0.x')
path.join(__dirname, '../introspection-engine-rhel-openssl-1.0.x')
path.join(__dirname, '../prisma-fmt-rhel-openssl-1.0.x')

path.join(__dirname, '../query-engine-rhel-openssl-1.1.x')
path.join(__dirname, '../introspection-engine-rhel-openssl-1.1.x')
path.join(__dirname, '../prisma-fmt-rhel-openssl-1.1.x')

// NAPI
path.join(__dirname, '../libquery_engine_napi-darwin.dylib.node')
path.join(__dirname, '../libquery_engine_napi-debian-openssl-1.0.x.so.node')
path.join(__dirname, '../libquery_engine_napi-debian-openssl-1.1.x.so.node')
path.join(__dirname, '../libquery_engine_napi-linux-arm-openssl-1.0.x.so.node')
path.join(__dirname, '../libquery_engine_napi-linux-arm-openssl-1.1.x.so.node')
path.join(__dirname, '../libquery_engine_napi-linux-musl.so.node')
path.join(__dirname, '../libquery_engine_napi-rhel-openssl-1.0.x.so.node')
path.join(__dirname, '../libquery_engine_napi-rhel-openssl-1.1.x.so.node')
path.join(__dirname, '../query_engine_napi-windows.dll.node')
