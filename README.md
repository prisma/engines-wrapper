# Prisma Engines Version

<div>
  <h2>@prisma/engines-version
    <a href="https://www.npmjs.com/package/@prisma/engines-version">
      <img src="https://img.shields.io/npm/v/@prisma/engines-version.svg?style=flat" />
    </a>
  </h2>
</div>
  
It is used to get the hash of the [Prisma Rust Engines](https://github.com/prisma/prisma-engines) for downloading via the [Prisma CLI, the Client](https://github.com/prisma/prisma), and other tooling.

[The automated publish pipeline](https://github.com/prisma/engines-wrapper/actions/workflows/publish-engines.yml) is triggered during the publish process of [`prisma-engines`](https://github.com/prisma/prisma-engines) by the [engineer CLI](https://github.com/prisma/engineer/blob/main/src/trigger/mod.rs).
This `engines-version` GitHub Actions workflow informs other repositories (e.g. [`prisma/prisma`](https://github.com/prisma/prisma) and [`prisma/prisma-engines`](https://github.com/prisma/prisma-engines)) of these published npm packages.
