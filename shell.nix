{ pkgs ? import <nixpkgs> {} }:
let
  pythonEnv = pkgs.python311.withPackages (ps: with ps; [
    pydantic
    pydantic-core
    playwright
    beautifulsoup4
    geopy
    overpy
    sqlmodel
    alembic
    pyyaml
  ]);
in
pkgs.mkShell {
  buildInputs = [
    pythonEnv
    pkgs.postgresql
    pkgs.aider-chat
    pkgs.nodejs_20
    pkgs.git
  ];
  shellHook = ''
    export OPENROUTER_API_KEY='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'
    export PLAYWRIGHT_BROWSERS_PATH=${pkgs.playwright-driver.browsers}
    echo "--- ENVIRONNEMENT ANTIGRAVITY PRÊT ---"
  '';
}
