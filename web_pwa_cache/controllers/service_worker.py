# Copyright 2021 Tecnativa - Alexandre D. Díaz
# License LGPL-3.0 or later (https://www.gnu.org/licenses/lgpl).
from odoo.addons.web_pwa_oca.controllers.service_worker import ServiceWorker


class ServiceWorker(ServiceWorker):
    def _get_js_pwa_requires(self):
        res = """
            require('web_pwa_cache.PWA');
        """
        res += super()._get_js_pwa_requires()
        return res

    def _get_js_pwa_core_event_fetch_impl(self):
        res = super()._get_js_pwa_core_event_fetch_impl()
        res += """
        console.log("FETCH EVENT INTERCEPTER");
            evt.respondWith(oca_pwa.processRequest(evt.request));
        """
        return res
