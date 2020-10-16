#!/bin/bash

echo $NPM_TOKEN > ~/.npmrc

set -ex
npm i --silent -g pnpm@5.1.7 --unsafe-perm
pnpm i --ignore-scripts --silent
pnpm recursive run build

