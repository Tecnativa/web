# Copyright 2026 Tecnativa - Juan Carlos Oñate
# License AGPL-3.0 or later (https://www.gnu.org/licenses/agpl.html)
from datetime import timedelta

from odoo.tests import HttpCase, new_test_user, tagged


@tagged("post_install", "-at_install")
class TestGridUi(HttpCase):
    """Grid UI on a throwaway ir.cron view, which ships with base and needs
    no extra dependency. It has no grid_update_cell override, so committing
    an edit is tested elsewhere, against a model that implements it.
    """

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.view = cls.env["ir.ui.view"].create(
            {
                "name": "grid_view_ui_test",
                "model": "ir.cron",
                "type": "grid_view",
                "arch": """
                    <grid_view string="Grid UI test" editable="1">
                        <!-- A selection field as section keeps row ids
                             predictable ("code||days") for the tours. -->
                        <field name="state" type="row" section="1"/>
                        <field name="interval_type" type="row"/>
                        <field name="nextcall" type="col">
                            <range name="week" string="Week" span="week"
                                   step="day" default="1"/>
                        </field>
                        <field name="interval_number" type="measure"
                               operator="sum"/>
                    </grid_view>
                """,
            }
        )
        crons = cls.env["ir.cron"].create(
            [
                {
                    "name": f"Grid UI test cron {interval}",
                    "model_id": cls.env.ref("base.model_ir_cron").id,
                    "state": "code",
                    "code": "pass",
                    "interval_type": interval,
                    "interval_number": 2,
                    "nextcall": cls.env.cr.now(),
                }
                for interval in ("days", "hours")
            ]
        )
        cls.form_view = cls.env["ir.ui.view"].create(
            {
                "name": "grid_view_ui_test_form",
                "model": "ir.cron",
                "type": "form",
                "arch": """
                    <form>
                        <field name="name"/>
                        <field name="interval_number"/>
                    </form>
                """,
            }
        )
        cls.action = cls.env["ir.actions.act_window"].create(
            {
                "name": "Grid UI test",
                "res_model": "ir.cron",
                "view_mode": "grid_view,list,form",
                # Without this, real cron jobs show up as extra rows.
                "domain": [("id", "in", crons.ids)],
                "context": {"default_interval_number": 7},
                "view_ids": [
                    (0, 0, {"view_mode": "grid_view", "view_id": cls.view.id}),
                    (0, 0, {"view_mode": "form", "view_id": cls.form_view.id}),
                ],
            }
        )

    def _start(self, tour, login="admin"):
        self.start_tour(f"/odoo/action-{self.action.id}", tour, login=login)

    def test_add_line_button(self):
        """A single Add a Line button lives in the toolbar; no per-row links."""
        self._start("web_grid_view_add_line")

    def test_add_line_button_hidden_without_create(self):
        self.view.arch = self.view.arch.replace(
            'editable="1">', 'editable="1" create="false">'
        )
        self._start("web_grid_view_add_line_hidden")

    def test_row_label_without_empty_values(self):
        self.view.arch = self.view.arch.replace(
            '<field name="interval_type" type="row"/>',
            '<field name="interval_type" type="row"/>'
            '<field name="crud_model_id" type="row"/>',
        )
        self._start("web_grid_view_empty_row_label")

    def test_rows_render_without_user_timezone(self):
        new_test_user(
            self.env, login="grid_no_tz", groups="base.group_system", tz=False
        )
        self._start("web_grid_view_hover", login="grid_no_tz")

    def test_grid_scrolls_with_many_rows(self):
        self.env["ir.cron"].create(
            [
                {
                    "name": f"Grid UI scroll cron {i}",
                    "model_id": self.env.ref("base.model_ir_cron").id,
                    "state": "code",
                    "code": "pass",
                    "interval_type": "days",
                    "interval_number": 1,
                    "nextcall": self.env.cr.now(),
                }
                for i in range(40)
            ]
        )
        self.action.domain = [("name", "like", "Grid UI")]
        self.view.arch = self.view.arch.replace(
            '<field name="interval_type" type="row"/>',
            '<field name="cron_name" type="row"/>',
        )
        self._start("web_grid_view_scroll")

    def test_empty_period_keeps_the_grid(self):
        self._start("web_grid_view_empty_period")

    def test_period_is_kept_when_coming_back(self):
        self.env["ir.cron"].create(
            {
                "name": "Grid UI test cron last week",
                "model_id": self.env.ref("base.model_ir_cron").id,
                "state": "code",
                "code": "pass",
                "interval_type": "days",
                "interval_number": 3,
                "nextcall": self.env.cr.now() - timedelta(days=7),
            }
        )
        self.action.domain = [("name", "like", "Grid UI")]
        self._start("web_grid_view_keep_period")

    def test_tab_wraps_to_the_next_row(self):
        self._start("web_grid_view_tab_wraps_row")

    def test_hover_highlights_row_and_column(self):
        """Titles and totals highlight with the cells, and on their own."""
        self._start("web_grid_view_hover")
