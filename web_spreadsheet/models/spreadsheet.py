from odoo import fields, models


class Spreadsheet(models.Model):
    _name = "spreadsheet"
    _description = "Spreadsheet model"

    name = fields.Char()
    data = fields.Text()

    def action_open_spreadsheet(self):
        self.ensure_one()
        return {
            'name': self.name,
            'type': 'ir.actions.act_window',
            'res_model': 'spreadsheet',
            'view_mode': 'spreadsheet',
            'domain': [('id', '=', self.id)],
        }
