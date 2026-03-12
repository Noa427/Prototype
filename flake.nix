{
  description = "Sol Invictus Real Estate Automation Infrastructure";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            git
            docker-compose
            nodejs_20
            python311
            (python311.withPackages (ps: with ps; [
              requests
              pandas
            ]))
          ];

          shellHook = ''
            echo "--- Sol Invictus Infrastructure Dev Shell ---"
            echo "Tools available: git, docker-compose, nodejs, python3"
          '';
        };
      });
}
