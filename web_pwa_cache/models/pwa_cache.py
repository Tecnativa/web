# Copyright 2020 Tecnactiva - Alexandre Díaz
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
from odoo import api, fields, models
from odoo.exceptions import ValidationError
from odoo.tools.safe_eval import safe_eval, test_python_expr

import base64
import datetime
import time
from pytz import timezone
import dateutil


class PWACache(models.Model):
    _name = "pwa.cache"
    _description = "PWA Cache"

    DEFAULT_PYTHON_CODE = """# Available variables:
#  - env: Odoo Environment on which the request is triggered
#  - user, uid: The user that trigger the request
#  - record: This record
#  - time, datetime, dateutil, timezone: useful Python libraries
#  - b64encode, b64decode: To work with base64
# To return an params, assign: params = [...]\n\n\n\n"""

    name = fields.Char("Name", required=True)
    cache_type = fields.Selection(
        [
            ("model", "Model"),
            ("qweb", "Server QWeb"),
            ("clientqweb", "Client QWeb"),
            ("function", "Function"),
            ("onchange", "Onchange"),
            ("post", "Post"),
        ],
        string="Type",
        required=True,
    )

    model_id = fields.Many2one("ir.model", string="Model")
    model_name = fields.Char(
        related="model_id.model", string="Model Name", readonly=True, store=True
    )
    model_domain = fields.Char("Domain", default="[]")
    model_orderby = fields.Char(string="OrderBy", default="id")

    xml_urls = fields.Text(string="XML URL's")
    xml_refs = fields.Text(string="XML Ref's")

    code = fields.Text(string="Python code", default=DEFAULT_PYTHON_CODE)

    post_url = fields.Char(string="Post URL")

    onchange_field = fields.Many2one(
        "ir.model.fields",
        string="Onchage field",
        domain="[['model_id', '=', model_id]]",
    )

    @api.constrains("code")
    def _check_python_code(self):
        for cache in self.filtered("code"):
            msg = test_python_expr(expr=cache.code.strip(), mode="exec")
            if msg:
                raise ValidationError(msg)

    def run_cache_code(self, eval_context=None):
        self.ensure_one()
        if self.code:
            safe_eval(self.code.strip(), eval_context, mode="exec", nocopy=True)
            if "params" in eval_context:
                return eval_context["params"]
        return [False]

    @api.multi
    def _get_eval_context(self, action=None):
        """ evaluation context to pass to safe_eval """
        self.ensure_one()
        return {
            "env": self.env,
            "uid": self._uid,
            "user": self.env.user,
            "record": self,
            "time": time,
            "datetime": datetime,
            "dateutil": dateutil,
            "timezone": timezone,
            "b64encode": base64.b64encode,
            "b64decode": base64.b64decode,
        }

    def _get_text_field_lines(self, records, field_name):
        return list(
            {url for xml_urls in records.mapped(field_name) for url in xml_urls.split()}
        )

    @api.model
    def get_client_qweb_urls(self):
        records = self.search([("cache_type", "=", "clientqweb")])
        return self._get_text_field_lines(records, "xml_urls")

    @api.model
    def get_client_qweb_refs(self):
        records = self.search([("cache_type", "=", "qweb")])
        return self._get_text_field_lines(records, "xml_refs")
