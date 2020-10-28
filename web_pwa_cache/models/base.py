# Copyright 2019 Camptocamp SA
# License AGPL-3.0 or later (https://www.gnu.org/licenses/agpl)
from odoo import models, api


class BaseModel(models.BaseModel):

    _inherit = 'base'

    @api.model
    def _get_default_formPWA_view(self):
        """ Generates a default single-line formPWA view using all fields
        of the current model.

        :returns: a form view as an lxml document
        :rtype: etree._Element
        """
        return self._get_default_form_view()
