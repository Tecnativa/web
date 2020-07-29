# Copyright 2020 Tecnativa - Alexandre D. Díaz
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

from odoo.http import request, route
from odoo.tools import safe_eval
from odoo.addons.web_pwa_oca.controllers.main import PWA


class PWA(PWA):
    def _get_pwa_scripts(self):
        res = super()._get_pwa_scripts()
        to_insert = [
            '/web_pwa_json/static/src/js/worker/base/tools.js',
            '/web_pwa_json/static/src/js/worker/base/database_manager.js',
            '/web_pwa_json/static/src/js/worker/base/rpc.js',
            '/web_pwa_json/static/src/js/worker/components/database.js',
            '/web_pwa_json/static/src/js/worker/components/exporter.js',
            '/web_pwa_json/static/src/js/worker/components/importer.js',
        ]
        insert_pos = res.index('/web_pwa_oca/static/src/js/worker/libs/class.js') + 1
        for index, url in enumerate(to_insert):
            res.insert(insert_pos+index, url)
        to_insert = [
            '/web_pwa_json/static/src/js/worker/pwa.js',
            '/web_pwa_json/static/src/js/worker/routes.js',
        ]
        insert_pos = res.index('/web_pwa_oca/static/src/js/worker/pwa.js') + 1
        for index, url in enumerate(to_insert):
            res.insert(insert_pos+index, url)
        return res

    def _get_pwa_prefetched_models(self):
        config_param_sudo = request.env['ir.config_parameter'].sudo()
        prefetched_models = config_param_sudo.get_param("pwa.prefetched.models", "[]")
        return safe_eval(prefetched_models)

    def _get_pwa_params(self):
        res = super()._get_pwa_params()
        # Add 'GET' resources
        res[1] += [
            '/web_pwa_json/static/src/xml/base.xml',
            '/web_pwa_json/static/src/xml/kanban.xml',
            '/web_pwa_json/static/src/xml/kanban_search_quick_create.xml',
        ]
        res.append(self._get_pwa_prefetched_models())
        return res

    @route('/pwa/prefetch/metadata', type='json', auth="public")
    def pwa_prefetch_metadata(self):
        actions = request.env['ir.actions.act_window'].search([
            ('res_model', 'in', self._get_pwa_prefetched_models()),
        ])
        views = [[action.res_model, action.views] for action in actions]
        return [actions.ids, views]
