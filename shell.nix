{ pkgs ? import <nixpkgs> {} }:
pkgs.mkShell {
  buildInputs = [
    pkgs.python311
    pkgs.python311Packages.pydantic
    pkgs.python311Packages.pydantic-core
    pkgs.python311Packages.playwright
    pkgs.python311Packages.beautifulsoup4
    pkgs.python311Packages.geopy
    pkgs.python311Packages.overpy
    pkgs.python311Packages.sqlmodel
    pkgs.python311Packages.alembic
    pkgs.python311Packages.pyyaml
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
