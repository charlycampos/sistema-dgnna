"""Contrato minimo y barreras de configuracion del microservicio."""

import os
import subprocess
import sys
import unittest
from pathlib import Path


SERVICE_DIR = Path(__file__).resolve().parents[1]
os.environ["TESTING"] = "true"
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
sys.path.insert(0, str(SERVICE_DIR))

from main import app, root  # noqa: E402


class BasicContractTest(unittest.TestCase):
    def test_root_contract(self):
        self.assertEqual(
            {"servicio": "ayuda-memoria", "version": "1.0.0", "puerto": 8013},
            root(),
        )

    def test_required_routes_and_methods_are_exposed(self):
        schema = app.openapi()
        expected = {
            "/health": {"get"},
            "/api/ayuda-memoria/plantillas": {"get", "post"},
            "/api/ayuda-memoria/documentos": {"get", "post"},
            "/api/ayuda-memoria/documentos/{doc_id}": {"get", "put"},
            "/api/ayuda-memoria/documentos/{doc_id}/acciones": {"post"},
            "/api/ayuda-memoria/documentos/{doc_id}/exportar-docx": {"get"},
        }
        for path, methods in expected.items():
            self.assertTrue(methods.issubset(schema["paths"][path]), path)


class DatabasePolicyTest(unittest.TestCase):
    def _import_database(self, database_url, testing):
        env = os.environ.copy()
        env["DATABASE_URL"] = database_url
        env["TESTING"] = testing
        return subprocess.run(
            [sys.executable, "-c", "import infrastructure.db.database"],
            cwd=SERVICE_DIR,
            env=env,
            capture_output=True,
            text=True,
            timeout=15,
            check=False,
        )

    def test_sqlite_is_rejected_outside_testing(self):
        result = self._import_database("sqlite:///:memory:", "false")
        self.assertNotEqual(0, result.returncode)
        self.assertIn("SQLite solo se permite con TESTING=true", result.stderr)

    def test_sqlite_is_allowed_only_for_tests(self):
        result = self._import_database("sqlite:///:memory:", "true")
        self.assertEqual(0, result.returncode, result.stderr)

    def test_service_code_does_not_reference_legacy_schema(self):
        offenders = []
        for path in SERVICE_DIR.rglob("*.py"):
            if "tests" in path.parts:
                continue
            if "APELACIONES_DB" in path.read_text(encoding="utf-8"):
                offenders.append(str(path.relative_to(SERVICE_DIR)))
        self.assertEqual([], offenders)

    def test_oracle_connection_requires_own_user(self):
        source = (SERVICE_DIR / "infrastructure/db/database.py").read_text(
            encoding="utf-8"
        )
        self.assertIn('.username or "").upper() != "AYUDA_MEMORIA_DB"', source)
        self.assertNotIn("ALTER SESSION SET CURRENT_SCHEMA", source)
        self.assertNotIn("CURRENT_SCHEMA = APELACIONES_DB", source)


if __name__ == "__main__":
    unittest.main()
