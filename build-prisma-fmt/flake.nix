{
  description = "The WASM package for prisma-fmt";

  inputs = {
    flake-utils.url = "github:numtide/flake-utils";
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    rust-overlay = {
      url = "github:oxalica/rust-overlay";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = { self, nixpkgs, flake-utils, rust-overlay }:
    flake-utils.lib.eachDefaultSystem (system:
      with builtins;
      let
        overlays = [ (import rust-overlay) ];
        pkgs = import nixpkgs { inherit system overlays; };
        rust = pkgs.rust-bin.fromRustupToolchainFile ./rust-toolchain;
        buildRustPackage = pkgs.rustPlatform.buildRustPackage;
        wasm-bindgen-cli = pkgs.wasm-bindgen-cli;
        fakeSha256 = pkgs.lib.fakeSha256;
      in
      {
        defaultPackage = buildRustPackage {
          buildPhase =
            "RUSTC=${rust}/bin/rustc ${rust}/bin/cargo build --release --target=wasm32-unknown-unknown";
          checkPhase = "echo 'checkPhase: do nothing'"; # TODO: we should check we have a non-empty .wasm file here
          name = "prisma-fmt-wasm";
          src = ./.;
          cargoSha256 = "sha256-fj0dmGS6/RFkOugH9zpTmlU+jXq6+EYoOGXeA9tr/Aw=";
          installPhase = ''
            echo 'creating out dir...'
            mkdir -p $out/src;

            echo 'copying package.json...'
            cp ${./package.json} $out/package.json;

            echo 'generating node module...'
            RUST_BACKTRACE=1 ${wasm-bindgen-cli}/bin/wasm-bindgen \
              --target nodejs \
              --out-dir $out/src \
              target/wasm32-unknown-unknown/release/prisma_fmt_build.wasm;
          '';
        };

        packages = {
          cargo = {
            type = "app";
            program = "${rust}/bin/cargo";
          };
          npm = {
            type = "app";
            program = "${pkgs.nodePackages.npm}/bin/npm";
          };
        };
      });
}
