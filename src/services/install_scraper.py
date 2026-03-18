#!/usr/bin/env python3
"""
Script d'installation et de configuration pour AEVUM SCANNER
"""

import subprocess
import sys
import os

def install_dependencies():
    """Installe les dépendances nécessaires"""
    print("🔧 Installation des dépendances AEVUM SCANNER...")
    
    try:
        # Installation de Playwright
        subprocess.check_call([sys.executable, "-m", "pip", "install", "playwright"])
        print("✅ Playwright installé")
        
        # Installation des navigateurs Playwright
        subprocess.check_call([sys.executable, "-m", "playwright", "install", "chromium"])
        print("✅ Navigateur Chromium installé")
        
        print("🚀 Installation terminée ! Vous pouvez maintenant lancer le scraper.")
        
    except subprocess.CalledProcessError as e:
        print(f"❌ Erreur lors de l'installation: {e}")
        return False
    
    return True

def run_scraper():
    """Lance le scraper"""
    try:
        script_path = os.path.join(os.path.dirname(__file__), "scraper.py")
        subprocess.check_call([sys.executable, script_path])
    except subprocess.CalledProcessError as e:
        print(f"❌ Erreur lors de l'exécution du scraper: {e}")

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "install":
        install_dependencies()
    else:
        print("Usage:")
        print("  python install_scraper.py install  # Installer les dépendances")
        print("  python scraper.py                  # Lancer le scraper")
