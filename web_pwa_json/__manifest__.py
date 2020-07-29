# Copyright 2020 Tecnativa - Alexandre D. Díaz
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

{
    'name': 'Web PWA JSON',
    'summary': 'Adds support to offline usage and mobile views improvements',
    'version': '12.0.1.0.0',
    'category': 'Website',
    'author': "Tecnativa, "
              "Odoo Community Association (OCA)",
    'website': 'https://www.tecnativa.com',
    'license': 'AGPL-3',
    'depends': [
        'sale_management',
        'web_pwa_oca',
    ],
    'data': [
        'templates/assets.xml',
        'views/sale_order_views.xml',
    ],
    'qweb': [
        'static/src/xml/base.xml',
        'static/src/xml/kanban.xml',
    ],
    'installable': True,
    'auto_install': False,
}
