# Copyright 2020 Tecnactiva - Alexandre Díaz
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
from odoo import fields, models

class SaleOrderLine(models.Model):
    _inherit = 'sale.order.line'

    product_uom = fields.Many2one(domain=lambda
