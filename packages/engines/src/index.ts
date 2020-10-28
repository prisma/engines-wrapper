import path from 'path'

export function getEnginesPath() {
  return path.join(__dirname, '../')
}

export { enginesVersion } from '@prisma/engines-version'

/**
 * This annotation is used for `node-file-trace`
 * See https://github.com/zeit/node-file-trace/issues/104
 * It's necessary to run this package standalone or within the sdk in Vercel
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
