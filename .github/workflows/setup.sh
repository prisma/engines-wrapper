#!/bin/bash

echo $NPM_TOKEN > ~/.npmrc

set -ex

npm i --silent -g pnpm@6.9.1 --unsafe-perm

pnpm i --no-prefer-frozen-lockfile --ignore-scripts

pnpm recursive run build
