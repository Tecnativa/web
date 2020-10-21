/* Copyright 2020 Tecnativa - Alexandre D. Díaz
 * License AGPL-3.0 or later (https://www.gnu.org/licenses/agpl). */
"use strict";

PWA.include({
   /**
     * Launch all prefetch process
     *
     * @returns {Promise}
     */
    _prefetchDataPost: function () {
        return new Promise((resolve) => {
            this._dbLoadPromise.then(async () => {
                if (this._config.isOfflineMode()) {
                    return resolve();
                }
                this._start_prefetch_date = DateToOdooFormat(new Date());
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
                        // If have transactions to sync. tell it to the user
                        const records = this._sync.getSyncRecords();
                        if (records.length) {
                            this.postClientPageMessage({
                                type: "PWA_SYNC_NEED_ACTION",
                                count: records.length,
                            });
                        }
                    })
                );
            });
        });
    },

    /**
     * Prefetch model data:
     *  - Get records
     *  - Vacuum records
     *  - Get filters
     *
     * @returns {Promise}
     */
    _prefetchModelData: function () {
        return new Promise(async (resolve) => {
            const [response_pd, request_data_pd] = await this._rpc.sendJSonRpc(
                "/pwa/prefetch/model"
            );
            let response_data = await response_pd.json();
            const prefetched_models = response_data.result;
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
                        prefetch_last_update: this._start_prefetch_date,
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

    /**
     * Prefetch actions:
     *  - Get actions
     *  - Get views
     *  - Get model default values (per view)
     *
     * @returns {Promise}
     */
    _prefetchActionData: function () {
        return new Promise(async (resolve) => {
            const prefetch_last_update = await this._config.get("prefetch_action_last_update");
            this.postClientPageMessage({
                type: "PREFETCH_MODAL_TASK_INFO",
                id: "action_data",
                message: "Getting extra data...",
            });
            // Get prefetching metadata
            let [response, request_data] = await this._rpc.sendJSonRpc("/pwa/prefetch/action", {
                last_update: prefetch_last_update,
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
            await this._config.set("prefetch_action_last_update", this._start_prefetch_date);
            return resolve();
        });
    },

    /**
     * Prefetch generic defined post calls
     *
     * @returns {Promise}
     */
    _prefetchPostData: function () {
        return new Promise(async (resolve) => {
            const prefetch_last_update = await this._config.get("prefetch_post_last_update");
            this.postClientPageMessage({
                type: "PREFETCH_MODAL_TASK_INFO",
                id: "post_data",
                message: "Getting post's data...",
            });
            // Get prefetching metadata
            let [response, _] = await this._rpc.sendJSonRpc("/pwa/prefetch/post", {
                last_update: prefetch_last_update,
            });
            // Prefetch Posts
            const response_data = (await response.json()).result;
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
            await this._config.set("prefetch_post_last_update", this._start_prefetch_date);
            return resolve();
        });
    },

    /**
     * Prefetch onchange values
     *
     * @returns {Promise}
     */
    _prefetchOnchangeData: function () {
        return new Promise(async (resolve) => {
            const prefetch_last_update = await this._config.get("prefetch_onchange_last_update");
            this.postClientPageMessage({
                type: "PREFETCH_MODAL_TASK_INFO",
                id: "onchange_data",
                message: "Getting onchange data...",
            });
            // Get prefetching metadata
            let [response, _] = await this._rpc.sendJSonRpc("/pwa/prefetch/onchange");
            // Prefetch Onchange
            const response_data = (await response.json()).result;
            if (response_data) {
                this._importer.saveOnchanges(response_data);
            }

            this.postClientPageMessage({
                type: "PREFETCH_MODAL_TASK_INFO",
                id: "onchange_data",
                message: "Completed!",
                progress: 1,
            });
            await this._config.set("prefetch_onchange_last_update", this._start_prefetch_date);
            return resolve();
        });
    },

    /**
     * Prefect widgets views (clientqweb)
     *
     * @returns {Promise}
     */
    _prefetchViewData: function () {
        return new Promise(async (resolve) => {
            const prefetch_last_update = await this._config.get("prefetch_view_last_update");
            this.postClientPageMessage({
                type: "PREFETCH_MODAL_TASK_INFO",
                id: "view_data",
                message: "Getting independent views data...",
            });
            // Get prefetching metadata
            let [response] = await this._rpc.sendJSonRpc("/pwa/prefetch/view", {
                last_update: prefetch_last_update,
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
            await this._config.set("prefetch_view_last_update", this._start_prefetch_date);
            return resolve();
        });
    },

    /**
     * Prefetch User Data
     *
     * @returns {Promise}
     */
    _prefetchUserData: function () {
        return new Promise(async (resolve) => {
            const prefetch_last_update = await this._config.get("prefetch_userdata_last_update");
            this.postClientPageMessage({
                type: "PREFETCH_MODAL_TASK_INFO",
                id: "user_data",
                message: "Getting translations...",
                progress: 0,
            });
            let [response, request_data] = await this._rpc.sendJSonRpc("/pwa/prefetch/userdata", {
                last_update: prefetch_last_update,
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
            await this._config.set("prefetch_userdata_last_update", this._start_prefetch_date);
            return resolve();
        });
    },
});
