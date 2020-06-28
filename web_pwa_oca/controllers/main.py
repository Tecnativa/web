# Copyright 2020 Lorenzo Battistini @ TAKOBI
# Copyright 2020 Tecnativa - Alexandre D. Díaz
# License LGPL-3.0 or later (https://www.gnu.org/licenses/lgpl).
from odoo.http import request, Controller, route


class PWA(Controller):

    def _get_pwa_scripts(self):
        """ Scripts to be imported in the service worker (Order is important) """
        return [
            '/web/static/lib/underscore/underscore.js',
            '/web_pwa_oca/static/src/js/worker/libs/class.js',
            '/web_pwa_oca/static/src/js/worker/pwa.js',
        ]

    def _get_asset_urls(self, asset_xml_id):
        """ Get all url's that have 'asset_xml_id' """
        qweb_sudo = request.env['ir.qweb'].sudo()
        assets = qweb_sudo._get_asset_nodes(asset_xml_id, {}, True, True)
        urls = []
        for asset in assets:
            if asset[0] == 'link':
                urls.append(asset[1]['href'])
            if asset[0] == 'script':
                urls.append(asset[1]['src'])
        return urls

    def _get_pwa_params(self):
        """ Get javascript PWA class initialzation params """
        urls = []
        urls.extend(self._get_asset_urls("web.assets_common"))
        urls.extend(self._get_asset_urls("web.assets_backend"))
        version_list = []
        for url in urls:
            version_list.append(url.split('/')[3])
        cache_version = '-'.join(version_list)
        return [
            cache_version,
            urls
        ]

    @route('/service-worker.js', type='http', auth="public")
    def render_service_worker(self):
        """ Route to register the service worker in the 'main' scope ('/') """
        return request.render('web_pwa_oca.service_worker', {
            'pwa_scripts': self._get_pwa_scripts(),
            'pwa_params': self._get_pwa_params(),
        }, headers=[('Content-Type', 'text/javascript;charset=utf-8')])

    @route('/web_pwa_oca/manifest.json', type='http', auth="public")
    def render_manifest(self):
        """ Render the manifest used to install the page as app """
        config_param_sudo = request.env['ir.config_parameter'].sudo()
        pwa_name = config_param_sudo.get_param("pwa.manifest.name", "Odoo PWA")
        pwa_short_name = config_param_sudo.get_param(
            "pwa.manifest.short_name", "Odoo PWA")
        icon128x128 = config_param_sudo.get_param(
            "pwa.manifest.icon128x128",
            "/web_pwa_oca/static/img/icons/icon-128x128.png")
        icon144x144 = config_param_sudo.get_param(
            "pwa.manifest.icon144x144",
            "/web_pwa_oca/static/img/icons/icon-144x144.png")
        icon152x152 = config_param_sudo.get_param(
            "pwa.manifest.icon152x152",
            "/web_pwa_oca/static/img/icons/icon-152x152.png")
        icon192x192 = config_param_sudo.get_param(
            "pwa.manifest.icon192x192",
            "/web_pwa_oca/static/img/icons/icon-192x192.png")
        icon256x256 = config_param_sudo.get_param(
            "pwa.manifest.icon256x256",
            "/web_pwa_oca/static/img/icons/icon-256x256.png")
        icon512x512 = config_param_sudo.get_param(
            "pwa.manifest.icon512x512",
            "/web_pwa_oca/static/img/icons/icon-512x512.png")
        background_color = config_param_sudo.get_param(
            "pwa.manifest.background_color", "#2E69B5")
        theme_color = config_param_sudo.get_param(
            "pwa.manifest.theme_color", "#2E69B5")
        return request.render('web_pwa_oca.manifest', {
            'pwa_name': pwa_name,
            'pwa_short_name': pwa_short_name,
            'icon128x128': icon128x128,
            'icon144x144': icon144x144,
            'icon152x152': icon152x152,
            'icon192x192': icon192x192,
            'icon256x256': icon256x256,
            'icon512x512': icon512x512,
            'background_color': background_color,
            'theme_color': theme_color,
        }, headers=[('Content-Type', 'text/javascript;charset=utf-8')])
