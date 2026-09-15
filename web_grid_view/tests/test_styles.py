# Copyright 2026 Tecnativa - Juan Carlos Oñate
# License AGPL-3.0 or later (https://www.gnu.org/licenses/agpl.html)
import pathlib

from odoo.tests import TransactionCase, tagged


@tagged("post_install", "-at_install")
class TestStyles(TransactionCase):
    def test_no_bootstrap_prefixed_css_variables(self):
        """Odoo defines --primary, not --bs-primary, and a var() pointing at
        an undefined variable silently drops the whole declaration."""
        styles = pathlib.Path(__file__).parent.parent / "static" / "src"
        offenders = [
            str(path) for path in styles.rglob("*.scss") if "--bs-" in path.read_text()
        ]
        self.assertFalse(offenders, f"Undefined CSS variables in: {offenders}")
