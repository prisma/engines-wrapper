#!/bin/bash

set -ex

npm i --silent -g pnpm@8 --unsafe-perm

pnpm i --no-prefer-frozen-lockfile --ignore-scripts

pnpm recursive run build
