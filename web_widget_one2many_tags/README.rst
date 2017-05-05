.. image:: https://img.shields.io/badge/licence-AGPL--3-blue.svg
   :target: http://www.gnu.org/licenses/agpl-3.0-standalone.html
   :alt: License: AGPL-3

===============================
Tags widget for one2many fields
===============================

This module adds a widget ``one2many_tags`` that looks and behaves like
``many2many_tags``, but works for one2many fields.

Usage
=====

To use this module, use ``widget="one2many_tags"`` on your field element.

.. image:: https://odoo-community.org/website/image/ir.attachment/5784_f2813bd/datas
    :alt: Try me on Runbot
    :target: https://runbot.odoo-community.org/runbot/162/9.0


Bug Tracker
===========

Bugs are tracked on `GitHub Issues <https://github.com/OCA/web/issues>`_. In
case of trouble, please check there if your issue has already been reported.
If you spotted it first, help us smash it by providing detailed and welcomed
feedback.

Known issues / Roadmap
======================

* as one2many fields are cached on the client side until the user hits `Save`
  on the main form, no ``name_get`` can be called on those records, which is
  why changes that update the display name are not reflected until saving, and
  new records are displayed as `New record` until then. If you don't like this,
  add the field `display_name` to your form and have it recomputed in an
  @onchange handler.

Credits
=======

Contributors
------------

* Holger Brunn <hbrunn@therp.nl>
* Iván Todorovich <ivan.todorovich@gmail.com>
* Peter Hahn <peter.hahn@initos.com>
* Vicent Cubells <vicent.cubells@tecnativa.com>

Maintainer
----------

.. image:: https://odoo-community.org/logo.png
   :alt: Odoo Community Association
   :target: https://odoo-community.org

This module is maintained by the OCA.

OCA, or the Odoo Community Association, is a nonprofit organization whose
mission is to support the collaborative development of Odoo features and
promote its widespread use.

To contribute to this module, please visit https://odoo-community.org.
