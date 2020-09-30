/* Copyright 2020 Tecnativa - Alexandre D. Díaz
 * License AGPL-3.0 or later (https://www.gnu.org/licenses/agpl). */
"use strict";

const ODOO_DATE_FORMAT = 'YYYY-MM-DD';
const ODOO_TIME_FORMAT = 'HH:mm:ss';
const ODOO_DATETIME_FORMAT = `${ODOO_DATE_FORMAT} ${ODOO_TIME_FORMAT}`;

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

function MakePost(url, data) {
    fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    })
}

function DateToOdooFormat(date) {
    return (new moment(date)).utc().format(ODOO_DATETIME_FORMAT);
}
