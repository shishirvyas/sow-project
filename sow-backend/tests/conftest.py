import sys
from pathlib import Path

# Ensure the repository `sow-backend` folder is on sys.path so tests can import the
# `src` package as `import src.*`. This runs before test collection.
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
