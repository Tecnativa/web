# License LGPL-3.0 or later (http://www.gnu.org/licenses/lgpl).

{
    "name": "Spreadsheet",
    "summary": "Spreadsheet",
    "version": "15.0.1.0.0",
    "category": "Web",
    "website": "https://github.com/OCA/web",
    "author": "Tecnativa, Odoo Community Association (OCA)",
    "license": "LGPL-3",
    "application": False,
    "installable": True,
    "depends": ["web"],
    "data": [
        "security/ir.model.access.csv",
        "views/spreadsheet_views.xml",
    ],
    "demo": [],
    "assets": {
        "web.assets_backend": [
            # js
            "/web_spreadsheet/static/src/libs/xspreadsheet/xspreadsheet.js",
            "/web_spreadsheet/static/src/js/pivot.js",
            "/web_spreadsheet/static/src/js/spreadsheet/spreadsheet_model.js",
            "/web_spreadsheet/static/src/js/spreadsheet/spreadsheet_renderer.js",
            "/web_spreadsheet/static/src/js/spreadsheet/spreadsheet_view.js",
            # css
            "/web_spreadsheet/static/src/libs/xspreadsheet/xspreadsheet.css",
        ],
        "web.assets_qweb": [
            "/web_spreadsheet/static/src/xml/pivot.xml",
            "/web_spreadsheet/static/src/js/spreadsheet/spreadsheet_renderer.xml",
            "/web_spreadsheet/static/src/js/spreadsheet/spreadsheet_view.xml",
        ],
    },
}
