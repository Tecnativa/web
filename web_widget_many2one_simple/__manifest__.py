# Copyright 2020 Tecnativa - Alexandre D. Díaz
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

{
    "name": "Simple many2one widget",
    "version": "16.0.1.0.0",
    "license": "AGPL-3",
    "author": "Tecnativa, Odoo Community Association (OCA)",
    "website": "https://github.com/OCA/web",
    "depends": ["web"],
    "installable": True,
    "maintainers": ["Tardo"],
    "demo": [
        "demo/res_partner_view.xml",
    ],
    "assets": {
        "web.assets_backend": [
            "web_widget_many2one_simple/static/src/many2one_simple/*",
        ],
    },
}
