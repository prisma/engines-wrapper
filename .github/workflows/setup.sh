#!/bin/bash

echo "Adding token to ~/.npmrc"
echo "//registry.npmjs.org/:_authToken=$NPM_TOKEN" > ~/.npmrc

set -ex

npm i --silent -g pnpm@6.9.1 esbuild@0.8.53 --unsafe-perm

pnpm i --no-prefer-frozen-lockfile --ignore-scripts

pnpm recursive run build
