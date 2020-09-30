Odoo Client Proxy

This module is used to add support to cache POST requests. Can handle Odoo requests and responses to give an offline experience.

Cache Types
~~~~~~~~~~~

- Model -> Gets records, related actions, views, default values and filters
- QWeb -> Gets indepent views (used by widgets)
- Client QWeb -> Gets indepent client views (used by widgets)
- function -> Cache function calls
- Onchange -> Cache onchange calls
- Post -> Cache indepent POST requests (used by widgets)

How Works
~~~~~~~~~

The module handle two modes:

- Normal: You can run Odoo as normal but can enable "offline" mode any time using the user menu.
- Standalone: When the app starts you will request to set the mode (offline or online).

When the user change to offline mode the module will start to prefetch all data and only recent records will be requested (write_date > last_cache_date)
