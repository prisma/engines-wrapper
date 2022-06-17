# @prisma/get-platform

Platform detection used for Prisma 2 binaries.

⚠️ **Warning**: This package is intended for Prisma's internal use.
Its release cycle does not follow SemVer, which means might release breaking changes (change APIs, remove functionality) without any prior warning.

If you are using this package, it would be helpful if you could help us gain an understanding where, how and why you are using it. Your feedback will be valuable to us to define a better API. Please [open a new issue](https://github.com/prisma/prisma/issues/new) with this information. Thanks!

## Usage

```ts
import { getPlatform } from '@prisma/get-platform'

const platform = await getPlatform()
```
