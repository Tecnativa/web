# Copyright 2020 Tecnativa - Alexandre D. Díaz
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import json
from odoo.http import request, route
from odoo.tools import safe_eval
from odoo.addons.web_pwa_oca.controllers.main import PWA


class PWA(PWA):
    def _get_pwa_scripts(self):
        res = super()._get_pwa_scripts()
        res.insert(0, "/web/static/lib/moment/moment.js")
        to_insert = [
            "/web_pwa_cache/static/src/js/worker/base/tools.js",
            "/web_pwa_cache/static/src/js/worker/base/database_manager.js",
            "/web_pwa_cache/static/src/js/worker/base/rpc.js",
            "/web_pwa_cache/static/src/js/worker/components/shared/database.js",
            "/web_pwa_cache/static/src/js/worker/components/config.js",
            "/web_pwa_cache/static/src/js/worker/components/exporter.js",
            "/web_pwa_cache/static/src/js/worker/components/importer.js",
            "/web_pwa_cache/static/src/js/worker/components/sync.js",
        ]
        insert_pos = res.index("/web_pwa_oca/static/src/js/worker/libs/class.js") + 1
        for index, url in enumerate(to_insert):
            res.insert(insert_pos + index, url)
        to_insert = [
            "/web_pwa_cache/static/src/js/worker/pwa.js",
            "/web_pwa_cache/static/src/js/worker/prefetch.js",
            "/web_pwa_cache/static/src/js/worker/bus.js",
            "/web_pwa_cache/static/src/js/worker/routes.js",
        ]
        insert_pos = res.index("/web_pwa_oca/static/src/js/worker/pwa.js") + 1
        for index, url in enumerate(to_insert):
            res.insert(insert_pos + index, url)
        return res

    def _get_pwa_prefetched_models(self):
        return request.env["pwa.cache"].search([]).mapped("model_id.model")

    def _get_pwa_params(self):
        res = super()._get_pwa_params()
        # Add 'GET' resources
        res[1] += [
            "/web_pwa_cache/static/src/xml/base.xml",
        ] + request.env["pwa.cache"].get_client_qweb_urls()
        return res

    def _pwa_prefetch_action(self, last_update, **kwargs):
        records = request.env["pwa.cache"].search([("cache_type", "=", "model")])
        domain = [
            ("res_model", "in", records.mapped("model_id.model")),
        ]
        if last_update:
            domain.append(("write_date", ">=", last_update))
        actions = request.env["ir.actions.act_window"].search(domain)
        ir_model_obj = request.env["ir.model"]
        views = []
        for action in actions:
            model_id = ir_model_obj.search(
                [("model", "=", action.res_model)], limit=1
            )
            views.append(
                {
                    "model": action.res_model,
                    "model_name": model_id.name,
                    "views": action.views,
                }
            )
        return {"actions": actions.ids, "views": views}

    def _pwa_prefetch_model(self, **kwargs):
        records = request.env["pwa.cache"].search([("cache_type", "=", "model")])
        return records.mapped(
            lambda x: {
                "model": x.model_id.model,
                "model_name": x.model_id.name,
                "domain": safe_eval(x.model_domain),
                "orderby": x.model_orderby,
            }
        )

    def _pwa_prefetch_clientqweb(self, **kwargs):
        return request.env["pwa.cache"].get_client_qweb_refs()

    def _pwa_prefetch_post(self, **kwargs):
        records = request.env["pwa.cache"].search([("cache_type", "=", "post")])
        post_defs = []
        for record in records:
            e_context = record._get_eval_context()
            post_defs.append(
                {
                    "url": record.post_url,
                    "params": record.run_cache_code(eval_context=e_context),
                }
            )
        return post_defs

    def _pwa_prefetch_userdata(self, **kwargs):
        from odoo.addons.web.controllers.main import module_boot
        return {
            'list_modules': module_boot(),
            'lang': request.env.lang,
        }

    def _pwa_prefetch_onchange(self, **kwargs):
        records = request.env["pwa.cache"].search([("cache_type", "=", "onchange")])
        onchanges = []
        for record in records:
            e_context = record._get_eval_context()
            record_obj = request.env[record.model_id.model]
            defaults = record_obj.default_get(record_obj._fields)
            params_list = record.run_cache_code(eval_context=e_context)
            onchange_spec = record_obj._onchange_spec()
            for params in params_list:
                to_write = defaults.copy()
                to_write.update(params)
                changes = record_obj.onchange(to_write, record.onchange_field.name, onchange_spec)
                onchanges.append({
                    'model': record.model_id.model,
                    'field': record.onchange_field.name,
                    'params': params,
                    'changes': changes
                })
        return onchanges

    @route("/pwa/prefetch/<string:cache_type>", type="json", auth="public")
    def pwa_prefetch(self, cache_type, **kwargs):
        available_types = {opt[0] for opt in request.env['pwa.cache']._fields['cache_type'].selection}
        available_types.add('action')
        if cache_type in available_types:
            prefetch_method = getattr(self, "_pwa_prefetch_{}".format(cache_type))
            if prefetch_method:
                return prefetch_method(last_update=kwargs.get("last_update"))
        return []
