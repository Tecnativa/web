# Copyright 2020 Tecnativa - Alexandre D. Díaz
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

{
    "name": "Web Widget One2Many Product Picker",
    "summary": "Widget to select products on one2many fields",
    "version": "15.0.1.0.0",
    "category": "Website",
    "author": "Tecnativa, Odoo Community Association (OCA)",
    "website": "https://github.com/OCA/web",
    "license": "AGPL-3",
    "depends": ["product"],
    "data": [],
    "qweb": ["static/src/xml/one2many_product_picker.xml"],
    "installable": True,
    "auto_install": False,
    "assets": {
        "web._assets_backend_helpers": [
            "/web_widget_one2many_product_picker/static/src/scss/_variables.scss"
        ],
        "web._assets_bootstrap": [
            "/web_widget_one2many_product_picker/static/src/scss/main_variables.scss"
        ],
        "web.assets_backend": [
            "/web_widget_one2many_product_picker/static/src/scss/one2many_product_picker.scss",
            "/web_widget_one2many_product_picker/static/src/js/tools.js",
            "/web_widget_one2many_product_picker/static/src/js/views/One2ManyProductPicker/record.js",
            "/web_widget_one2many_product_picker/static/src/js/views/One2ManyProductPicker/renderer.js",
            "/web_widget_one2many_product_picker/static/src/js/views/One2ManyProductPicker/quick_create_form_view.js",
            "/web_widget_one2many_product_picker/static/src/js/views/One2ManyProductPicker/quick_create_form.js",
            "/web_widget_one2many_product_picker/static/src/js/views/One2ManyProductPicker/quick_modif_price_form_view.js",
            "/web_widget_one2many_product_picker/static/src/js/views/One2ManyProductPicker/quick_modif_price_form.js",
            "/web_widget_one2many_product_picker/static/src/js/views/basic_model.js",
            "/web_widget_one2many_product_picker/static/src/js/views/form_view.js",
            "/web_widget_one2many_product_picker/static/src/js/views/form_controller.js",
            "/web_widget_one2many_product_picker/static/src/js/views/form_renderer.js",
            "/web_widget_one2many_product_picker/static/src/js/widgets/field_one2many_product_picker.js",
        ],
        "web.assets_qweb": [
            "/web_widget_one2many_product_picker/static/src/xml/one2many_product_picker.xml"
        ],
        "web.qunit_suite": [
            "/web_widget_one2many_product_picker/static/tests/widget_tests.js",
        ],
    }
}
