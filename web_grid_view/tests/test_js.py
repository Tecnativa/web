# Copyright 2026 Tecnativa - Juan Carlos Oñate
# License AGPL-3.0 or later (https://www.gnu.org/licenses/agpl.html)
from odoo.tests import HttpCase, tagged


@tagged("post_install", "-at_install")
class TestWebGridView(HttpCase):
    def test_js(self):
        self.browser_js(
            "/web/tests?headless&loglevel=2&preset=desktop&timeout=15000"
            "&filter=web_grid_view",
            "",
            "",
            login="admin",
            timeout=1800,
            success_signal="[HOOT] Test suite succeeded",
            error_checker=lambda x: "[HOOT]" not in x,
        )
