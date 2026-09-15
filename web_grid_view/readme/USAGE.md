To add a grid view to a model, define a \<grid_view\> view in XML and add
grid_view to the action's view_mode.

``` xml
<record id="my_grid_view" model="ir.ui.view">
    <field name="name">my.model.grid</field>
    <field name="model">my.model</field>
    <field name="arch" type="xml">
        <grid_view string="My Grid" editable="1">
            <field name="my_row_field" type="row" section="1"/>
            <field name="my_date_field" type="col">
                <range name="day" string="Day" span="day" step="day"/>
                <range name="week" string="Week" span="week" step="day" default="1"/>
                <range name="month" string="Month" span="month" step="day"/>
            </field>
            <field name="my_measure_field" type="measure" widget="float"/>
        </grid_view>
    </field>
</record>
```
