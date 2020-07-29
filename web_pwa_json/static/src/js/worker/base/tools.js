/* Copyright 2020 Tecnativa - Alexandre D. Díaz
 * License AGPL-3.0 or later (https://www.gnu.org/licenses/agpl). */
"use strict";

function ResponseJSONRPC(data) {
    const blob = new Blob([
        JSON.stringify({
            id: new Date().getTime(),
            jsonrpc: '2.0',
            result: data,
        }, null, 2)
    ], {type : 'application/json'});
    return new Response(blob, {
        status: 200,
        statusText: 'OK',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
    });
}
