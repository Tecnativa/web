# Copyright 2023 Tecnativa - David Vidal
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
{
    "name": "Remote Measure Devices f501 protocol",
    "summary": "Allows to connect to remote devices with f501 protocol",
    "version": "15.0.1.0.0",
    "author": "Tecnativa, Odoo Community Association (OCA)",
    "website": "https://github.com/OCA/web",
    "maintainers": ["chienandalu"],
    "license": "AGPL-3",
    "category": "Stock",
    "depends": ["web_widget_remote_measure"],
    "data": [],
    "assets": {
        "web.assets_backend": [
            "web_widget_remote_measure_f501/static/src/**/*.js",
        ],
    },
}
