# Copyright 2020 Tecnactiva - Alexandre Díaz
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
from odoo import models
from odoo.exceptions import UserError

class Base(models.AbstractModel):
    _inherit = 'base'

    def _fields_view_get(self, view_id=None, view_type='form', toolbar=False, submenu=False):
        """If not exists a 'formMobile' view fallback to form view type"""
        if view_type != "formMobile":
            return super()._fields_view_get(view_id=view_id, view_type=view_type, toolbar=toolbar, submenu=submenu)
        try:
            res = super()._fields_view_get(view_id=view_id, view_type=view_type, toolbar=toolbar, submenu=submenu)
        except UserError:
            res = super()._fields_view_get(view_id=view_id, view_type='form', toolbar=toolbar, submenu=submenu)
        return res
