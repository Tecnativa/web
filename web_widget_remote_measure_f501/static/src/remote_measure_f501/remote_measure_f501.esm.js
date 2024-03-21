/** @odoo-module **/
import {RemoteMeasure} from "@web_widget_remote_measure/js/remote_measure_widget.esm";

export const RemoteMeasureF501 = RemoteMeasure.include({
    async _connect_to_webservices() {
        if (this.protocol !== ("f501")) {
            return this._super(...arguments);
        }
        var icon = "fa-thermometer-empty";
        var stream_success_counter = 20;
        this._unstableMeasure();
        while (stream_success_counter) {
            const msg =
                await this._rpc({
                    route: `/f501/${this.remote_device_data.id}` || [],
                });
            // We could try to convert it dinamically, but it can lead to weird behavior
            const different_uom = uom !== this.remote_device_data.uom_id[0];
            if (stable) {
                this._stableMeasure();
                --stream_success_counter;
            } else {
                this._unstableMeasure();
                stream_success_counter = 20;
            }
            icon = this._nextStateIcon(icon);
            this.amount = parseFloat(weight);
            if (!isNaN(this.amount) && !different_uom) {
                this._setMeasure();
            }
            if (different_uom) {
                console.log("Different UOM. Not retrieving data!");
            }
        }
        this._awaitingMeasure();
        this._recordMeasure();
    },
    }
});
