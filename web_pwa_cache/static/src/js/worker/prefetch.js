/* Copyright 2020 Tecnativa - Alexandre D. Díaz
 * License AGPL-3.0 or later (https://www.gnu.org/licenses/agpl). */
"use strict";

PWA.include({
   /**
     * @override
     */
    _prefetchDataPost: function () {
        return new Promise((resolve) => {
            this._dbLoadPromise.then(async () => {
                if (this._config.isOfflineMode()) {
                    return resolve();
                }
                this._start_prefetch_date = new Date();
                this.postClientPageMessage({type: "PREFETCH_MODAL_SHOW"});
                return resolve(
                    Promise.all([
                        this._prefetchModelData(),
                        this._prefetchActionData(),
                        //this._prefetchViewData(),
                        this._prefetchPostData(),
                        this._prefetchUserData(),
                        this._prefetchOnchangeData(),
                    ]).then(() => {
                        this.postClientPageMessage({type: "PREFETCH_MODAL_HIDE"});
                    })
                );
            });
        });
    },

    _prefetchModelData: function () {
        return new Promise(async (resolve) => {
            let domain_forced = [];
            if (this._prefetch_last_update) {
                console.log(
                    `[ServiceWorker] Prefetching records from ${this._prefetch_last_update}`
                );
                domain_forced = [["write_date", ">=", this._prefetch_last_update]];
            }
            const [response_pd, request_data_pd] = await this._rpc.sendJSonRpc(
                "/pwa/prefetch/model"
            );
            let response_data = await response_pd.json();
            const prefetched_models = response_data.result;
            console.log("----------- PREFETCH MODEL");
            console.log(prefetched_models);
            const num_models = prefetched_models.length + 1;
            for (const index in prefetched_models) {
                const model_def = prefetched_models[index];
                this.postClientPageMessage({
                    type: "PREFETCH_MODAL_TASK_INFO",
                    id: "model_records",
                    message:
                        "Getting records of the model '" +
                        model_def.model_name +
                        "'...",
                    progress: index / num_models,
                });
                let domain_forced = [];
                // Get current records
                const cur_model_record = await this._importer._getModelRecords(model_def.model);
                if (cur_model_record?.prefetch_last_update) {
                    domain_forced = [["write_date", ">=", cur_model_record.prefetch_last_update]];
                }
                console.log("Domain Prefetch-------");
                console.log(domain_forced);
                // Update new records
                const [response, request_data] = await this._rpc.datasetJSonRpc(
                    "search_read",
                    {
                        domain: _.union(domain_forced, model_def.domain),
                        model: model_def.model,
                    }
                );
                this._processResponse(response, request_data).then(() => {
                    this._db.updateRecord("webclient", "records", "model", model_def.model, {
                        orderby: model_def.orderby,
                        prefetch_last_update: DateToOdooFormat(this._start_prefetch_date),
                    });
                });
                // Vacuum old records
                this.postClientPageMessage({
                    type: "PREFETCH_MODAL_TASK_INFO",
                    id: "model_records",
                    message:
                        "Vacuum records of the model '" + model_def.model_name + "'...",
                    progress: index / num_models,
                });
                const [
                    response_s,
                    request_data_s,
                ] = await this._rpc.callJSonRpc(model_def.model, "search", [
                    model_def.domain,
                ]);
                response_data = await response_s.json();
                await this._importer._vacuumRecords(
                    model_def.model,
                    response_data.result
                );

                // Get Filters
                this.postClientPageMessage({
                    type: "PREFETCH_MODAL_TASK_INFO",
                    id: "model_records",
                    message:
                        "Getting filters of the model '" + model_def.model_name + "'...",
                    progress: index / num_models,
                });
                const [
                    response_f,
                    request_data_f,
                ] = await this._rpc.callJSonRpc("ir.filters", "get_filters", [
                    model_def.model,
                ]);
                this._processResponse(response_f, request_data_f);
            }

            this.postClientPageMessage({
                type: "PREFETCH_MODAL_TASK_INFO",
                id: "model_records",
                message: "Completed!",
                progress: 1,
            });

            return resolve();
        });
    },

    _prefetchActionData: function () {
        return new Promise(async (resolve) => {
            this.postClientPageMessage({
                type: "PREFETCH_MODAL_TASK_INFO",
                id: "action_data",
                message: "Getting extra data...",
            });
            // Get prefetching metadata
            let [response, request_data] = await this._rpc.sendJSonRpc("/pwa/prefetch/action", {
                last_update: this._prefetch_last_update,
            });
            // Prefetch Actions
            const response_data = (await response.json()).result;
            if (response_data) {
                const num_actions = response_data.actions.length + 1;
                for (const index in response_data.actions) {
                    const action_id = response_data.actions[index];
                    this.postClientPageMessage({
                        type: "PREFETCH_MODAL_TASK_INFO",
                        id: "action_data",
                        message: "Getting info of the action #" + action_id + "...",
                        progress: index / num_actions,
                    });
                    const [response, request_data] = await this._rpc.sendJSonRpc(
                        "/web/action/load",
                        {
                            action_id: action_id,
                        }
                    );
                    this._processResponse(response, request_data);
                }
                this.postClientPageMessage({
                    type: "PREFETCH_MODAL_TASK_INFO",
                    id: "action_data",
                    message: "Completed!",
                    progress: 1,
                });

                // Prefetch Views
                this.postClientPageMessage({
                    type: "PREFETCH_MODAL_TASK_INFO",
                    id: "action_view_data",
                    message: "Getting extra data...",
                });
                const num_views = response_data.views.length + 1;
                for (const index in response_data.views) {
                    const model_view_def = response_data.views[index];
                    this.postClientPageMessage({
                        type: "PREFETCH_MODAL_TASK_INFO",
                        id: "action_view_data",
                        message:
                            "Getting action views of the model '" +
                            model_view_def.model_name +
                            "'...",
                        progress: index / num_views,
                    });
                    let [response, request_data] = await this._rpc.callJSonRpc(
                        model_view_def.model,
                        "load_views",
                        false,
                        {
                            views: _.union([
                                [false,"list"],
                                [false,"kanban"],
                                [false,"form"],
                                [false,"pivot"],
                                [false,"graph"],
                                [false,"activity"],
                                [false,"search"],
                            ], model_view_def.views),
                        }
                    );
                    this._processResponse(response, request_data);

                    // Prefetch View Defaults
                    this.postClientPageMessage({
                        type: "PREFETCH_MODAL_TASK_INFO",
                        id: "action_view_data",
                        message:
                            "Getting default values of the model '" +
                            model_view_def.model_name +
                            "'...",
                        progress: index / num_views,
                    });
                    const response_clone = response.clone();
                    const data = await response_clone.json();
                    [
                        response,
                        request_data,
                    ] = await this._rpc.callJSonRpc(
                        model_view_def.model,
                        "default_get",
                        [data.result.fields]
                    );
                    this._processResponse(response, request_data);
                }

                this.postClientPageMessage({
                    type: "PREFETCH_MODAL_TASK_INFO",
                    id: "action_view_data",
                    message: "Completed!",
                    progress: 1,
                });
            }

            this.postClientPageMessage({
                type: "PREFETCH_MODAL_TASK_INFO",
                id: "action_data",
                message: "Completed!",
                progress: 1,
            });
            return resolve();
        });
    },

    _prefetchPostData: function () {
        return new Promise(async (resolve) => {
            this.postClientPageMessage({
                type: "PREFETCH_MODAL_TASK_INFO",
                id: "post_data",
                message: "Getting post's data...",
            });
            // Get prefetching metadata
            let [response, _] = await this._rpc.sendJSonRpc("/pwa/prefetch/post", {
                last_update: this._prefetch_last_update,
            });
            // Prefetch Posts
            const response_data = (await response.json()).result;
            console.log("---------- PREFETCH POST DATA");
            console.log(response_data);
            if (response_data) {
                const num_posts = response_data.length + 1;
                for (const index in response_data) {
                    const post_def = response_data[index];
                    this.postClientPageMessage({
                        type: "PREFETCH_MODAL_TASK_INFO",
                        id: "post_data",
                        message:
                            "Getting post results of the endpoint '" +
                            post_def.url +
                            "'...",
                        progress: index / num_posts,
                    });
                    const num_params = post_def.params.length;
                    for (let i = 0; i < num_params; ++i) {
                        const [response, request_data] = await this._rpc.sendJSonRpc(
                            post_def.url,
                            post_def.params[i]
                        );
                        const response_cloned = response.clone();
                        const response_data = await response_cloned.json();
                        this._routeInGenericPost(
                            new URL(response_cloned.url),
                            response_data,
                            request_data
                        );
                    }
                }
            }

            this.postClientPageMessage({
                type: "PREFETCH_MODAL_TASK_INFO",
                id: "post_data",
                message: "Completed!",
                progress: 1,
            });
            return resolve();
        });
    },

    _prefetchOnchangeData: function () {
        return new Promise(async (resolve) => {
            this.postClientPageMessage({
                type: "PREFETCH_MODAL_TASK_INFO",
                id: "onchange_data",
                message: "Getting onchange data...",
            });
            // Get prefetching metadata
            let [response, _] = await this._rpc.sendJSonRpc("/pwa/prefetch/onchange");
            // Prefetch Onchange
            const response_data = (await response.json()).result;
            console.log("---------- PREFETCH ONCHANGE DATA");
            console.log(response_data);
            if (response_data) {
                this._importer.saveOnchanges(response_data);
            }

            this.postClientPageMessage({
                type: "PREFETCH_MODAL_TASK_INFO",
                id: "onchange_data",
                message: "Completed!",
                progress: 1,
            });
            return resolve();
        });
    },

    _prefetchViewData: function () {
        return new Promise(async (resolve) => {
            this.postClientPageMessage({
                type: "PREFETCH_MODAL_TASK_INFO",
                id: "view_data",
                message: "Getting independent views data...",
            });
            // Get prefetching metadata
            let [response] = await this._rpc.sendJSonRpc("/pwa/prefetch/view", {
                last_update: this._prefetch_last_update,
            });
            // Prefetch Actions
            const response_data = (await response.json()).result;
            if (response_data) {
                const num_views = response_data.length + 1;
                for (const index in response_data.actions) {
                    const action_id = response_data.actions[index];
                    this.postClientPageMessage({
                        type: "PREFETCH_MODAL_TASK_INFO",
                        id: "view_data",
                        message: "Getting info of the action #" + action_id + "...",
                        progress: index / num_views,
                    });
                    const [response, request_data] = await this._rpc.sendJSonRpc(
                        "/web/action/load",
                        {
                            action_id: action_id,
                        }
                    );
                    this._processResponse(response, request_data);
                }
            }

            this.postClientPageMessage({
                type: "PREFETCH_MODAL_TASK_INFO",
                id: "view_data",
                message: "Completed!",
                progress: 1,
            });
            return resolve();
        });
    },

    _prefetchUserData: function () {
        return new Promise(async (resolve) => {
            this.postClientPageMessage({
                type: "PREFETCH_MODAL_TASK_INFO",
                id: "user_data",
                message: "Getting translations...",
                progress: 0,
            });
            let [response, request_data] = await this._rpc.sendJSonRpc("/pwa/prefetch/userdata", {
                last_update: this._prefetch_last_update,
            });
            const response_data = (await response.json()).result;
            if (response_data) {
                const [response_s, request_data_s] = await this._rpc.sendJSonRpc(
                    '/web/webclient/translations',
                    {
                        "mods": response_data.list_modules || null,
                        "lang": response_data.lang || null
                    }
                );

                this._processResponse(response_s, request_data_s);
            }
            this.postClientPageMessage({
                type: "PREFETCH_MODAL_TASK_INFO",
                id: "user_data",
                message: "Getting menus...",
                progress: 0.5,
            });
            [response, request_data] = await this._rpc.callJSonRpc("ir.ui.menu", "load_menus", ["assets"]);
            this._processResponse(response, request_data);
            this.postClientPageMessage({
                type: "PREFETCH_MODAL_TASK_INFO",
                id: "user_data",
                message: "Completed!",
                progress: 1,
            });
            return resolve();
        });
    },
});
