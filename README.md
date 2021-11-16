# Prisma Engines Wrapper

<div>
  <h2>@prisma/engines
    <a href="https://www.npmjs.com/package/@prisma/engines">
      <img src="https://img.shields.io/npm/v/@prisma/engines.svg?style=flat" />
    </a>
  </h2>
  <h2>@prisma/engines-version
    <a href="https://www.npmjs.com/package/@prisma/engines-version">
      <img src="https://img.shields.io/npm/v/@prisma/engines-version.svg?style=flat" />
    </a>
  </h2>
  <h2>@prisma/fetch-engine
    <a href="https://www.npmjs.com/package/@prisma/fetch-engine">
      <img src="https://img.shields.io/npm/v/@prisma/fetch-engine.svg?style=flat" />
    </a>
  </h2>
  <h2>@prisma/get-platform
    <a href="https://www.npmjs.com/package/@prisma/get-platform">
      <img src="https://img.shields.io/npm/v/@prisma/get-platform.svg?style=flat" />
    </a>
  </h2>
</div>
  
This repository contains the code for packages `@prisma/engines`, `@prisma/engines-version`, `@prisma/fetch-engine` and `@prisma/get-platform`. They are wrapping the [Prisma Rust Engines](https://github.com/prisma/prisma-engines) in npm packages to be used by the [Prisma CLI, the Client](https://github.com/prisma/prisma), and other tooling. 

[The automated publish pipeline](https://github.com/prisma/engines-wrapper/actions/workflows/publish-engines.yml), triggered itself during the publish process of [`prisma-engines`](https://github.com/prisma/prisma-engines), also triggers use of these packages via GitHub Actions workflows in other repositories (e.g. [`prisma/prisma`](https://github.com/prisma/prisma) and [`prisma/prisma-fmt-wasm`](https://github.com/prisma/prisma-fmt-wasm)).
