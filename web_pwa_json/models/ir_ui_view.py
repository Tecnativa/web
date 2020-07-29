# Copyright 2020 Tecnactiva - Alexandre Díaz
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
from odoo import models, fields

class View(models.Model):
    _inherit = 'ir.ui.view'

    type = fields.Selection(selection_add=[('formMobile', "Form Mobile")])
