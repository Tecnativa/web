# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import models


class IrActionsActWindow(models.Model):
    _inherit = 'ir.actions.act_window'

    def _compute_views(self):
        super()._compute_views()
        for act in self:
            act.views.append([False, 'formMobile'])
