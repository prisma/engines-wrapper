#!/bin/bash

echo $NPM_TOKEN > ~/.npmrc

set -ex
npm i --silent -g pnpm@5.1.7 esbuild@0.7.17 --unsafe-perm
pnpm i --ignore-scripts
pnpm recursive run build

