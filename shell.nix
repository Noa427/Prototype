{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = with pkgs; [
    python311
    python311Packages.playwright
    python311Packages.beautifulsoup4
    python311Packages.fastapi
    python311Packages.uvicorn
    python311Packages.sqlmodel
    python311Packages.python-jose
    python311Packages.passlib
    python311Packages.bcrypt
    python311Packages.python-multipart
    python311Packages.httpx
    python311Packages.playwright-stealth
    playwright-driver.browsers
  ];

  shellHook = ''
    export PLAYWRIGHT_BROWSERS_PATH=${pkgs.playwright-driver.browsers}
    export PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=true
    echo "🚀 Environnement AEVUM SCANNER prêt (NixOS Optimisé)."
  '';
}
