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

// This code is part of NX-Compiler: https://blog.risingstack.com/writing-a-javascript-framework-sandboxed-code-evaluation/#analternativeway
class JSSandbox {
    constructor() {
        this.sandboxProxies = new WeakMap();
        this.handler = {
            has: function (target, key) {
                return true;
            },

            get: function (target, key) {
                if (key === Symbol.unscopables) {
                    return undefined;
                }
                return target[key];
            },
        }
        this.compiledExec = false;
    }

    compile (src) {
        const self = this;
        const s_src = 'with (sandbox) {' + src + '}'
        const code = new Function('sandbox', s_src);

        this.compiledExec = function (sandbox) {
            if (!self.sandboxProxies.has(sandbox)) {
                const sandboxProxy = new Proxy(sandbox, self.handler);
                self.sandboxProxies.set(sandbox, sandboxProxy);
            }
            return code(self.sandboxProxies.get(sandbox))
        }
    }

    run (context) {
        return this.compiledExec(context || {});
    }
};
