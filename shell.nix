{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = with pkgs; [
    git
    docker-compose
    nodejs_20
    python311
  ];

  shellHook = ''
    echo "--- Sol Invictus Infrastructure Shell ---"
  '';
}
