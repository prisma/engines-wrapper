#!/bin/bash

echo $NPM_TOKEN > ~/.npmrc

set -ex

npm i --silent -g pnpm@5.15.1 esbuild@0.8.53 --unsafe-perm

pnpm i --ignore-scripts

pnpm recursive run build
