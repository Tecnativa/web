# Copyright 2023 Tecnativa - David Vidal
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
import socket
from socket import timeout

from odoo.http import Controller, request, route


class F501Scale(Controller):
    """F501 Scale Controller"""

    def _retrieve_f501_weight(self, data, host, port, time_out=1):
        """Direct tcp connection to the remote device"""
        response = None
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as device:
            device.settimeout(time_out)
            device.connect((host, port))
            device.sendall(data)
            response = device.recv(16)
        return response

    def _format_response(self, response, protocol):
        """Retrieve weight, status and uom depending on the protocols"""
        if not response:
            return (None, "no_response", None)
        return getattr(self, f"_format_response_{protocol}")(response)

    def _format_response_f501(self, response):
        """F501 F16 formatting"""
        response = response.decode("ascii")
        if response == "timeout":
            return (None, response, None)
        status, _mode, weight = response.split(",")
        weight, uom = weight[:-2], weight[-2:]
        return (
            status == "ST",
            weight,
            request.env.ref(F501_UOM[uom]).id,
        )

    @route("/f501/<int:device>", type="json", auth="user", sitemap=False)
    def request_f501_weight(self, device=None):
        """Meant be called from the remote scale widget js code"""
        device = request.env["remote.measure.device"].browse(device)
        response = b""
        if device.protocol != "f501" and device.connection_mode != "webservices":
            return (None, response, None)
        host, port = device.host.split(":")
        try:
            response = self._retrieve_f501_weight(
                F501_COMMANDS[device.protocol], host, int(port)
            )
        except timeout:
            response = b"timeout"
        return self._format_response(response, device.protocol)
