To show a filter in the header of the views, it should have the a `context` attribute with the key `shown_in_panel`.

```xml
<filter
    string="My filter"
    name="my_filter"
    domain="[('active', '!=', False)]"
    context="{'shown_in_panel': True}"
>
```

This will show the filter in the header with its name. You can customize the button
adding an icon or with a custom name passing an object to that key. The icon is the
name of a Material Symbols icon, the icon set of Odoo since 20.0:

```python
{'shown_in_panel': {'icon': 'thumb_up', 'name': 'Ok'}}
```

You might be interested in leaving just the icon. In that case, set an empty string on
the `name` property:

```python
{'shown_in_panel': {'icon': 'thumb_up', 'name': ''}}
```

You could also want to add a hotkey. In such case add the `hotkey` property:

```python
{'shown_in_panel': {'icon': 'thumb_up', 'hotkey': 'F'}}
```

You can show filter, groups or even favorites.
