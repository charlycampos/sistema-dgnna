"""Pruebas de la política Oracle obligatoria del backend."""

from __future__ import annotations

import os
import subprocess
import sys
import unittest
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]


def importar_database(database_url: str, testing: str | None = None) -> subprocess.CompletedProcess[str]:
    entorno = os.environ.copy()
    entorno["DATABASE_URL"] = database_url
    if testing is None:
        entorno.pop("TESTING", None)
    else:
        entorno["TESTING"] = testing
    return subprocess.run(
        [sys.executable, "-c", "import database; print(database.DATABASE_DIALECT)"],
        cwd=BACKEND_DIR,
        env=entorno,
        text=True,
        capture_output=True,
        check=False,
    )


class DatabasePolicyTest(unittest.TestCase):
    def test_sqlite_es_rechazado_en_runtime(self) -> None:
        resultado = importar_database("sqlite:///:memory:")
        self.assertNotEqual(resultado.returncode, 0)
        self.assertIn("SQLite no", resultado.stderr)

    def test_sqlite_solo_se_admite_con_testing_true(self) -> None:
        resultado = importar_database("sqlite:///:memory:", "true")
        self.assertEqual(resultado.returncode, 0, resultado.stderr)
        self.assertIn("sqlite", resultado.stdout)

    def test_otro_motor_se_rechaza_incluso_en_testing(self) -> None:
        resultado = importar_database("postgresql://usuario:clave@localhost/base", "true")
        self.assertNotEqual(resultado.returncode, 0)
        self.assertIn("Solo se admite Oracle", resultado.stderr)


if __name__ == "__main__":
    unittest.main()

